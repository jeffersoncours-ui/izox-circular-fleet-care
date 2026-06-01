-- ===========================================================================
-- FEATURE 2 & 3 — Operators table + colonnes planning sur interventions
-- Deploy: 2026-06-01
-- ===========================================================================

-- Table opérateurs planning (distincte de profiles/auth.users)
-- Raison : profiles contient les comptes Supabase Auth avec role=operateur.
-- operators est une entité légère pour le planning admin (couleur, initiales).
CREATE TABLE IF NOT EXISTS public.operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  initials text NOT NULL,
  color_hex text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY operators_admin_staff_all ON public.operators
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY operators_authenticated_select ON public.operators
  FOR SELECT TO authenticated USING (true);

-- Seed des 3 opérateurs de base
INSERT INTO public.operators (name, initials, color_hex)
VALUES
  ('Karim B.', 'KB', '#3B82F6'),
  ('Sofia T.', 'ST', '#10B981'),
  ('Yann L.',  'YL', '#8B5CF6')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Ajout colonnes planning sur interventions
-- Note : operateur_id (auth.users) existe déjà pour le workflow terrain.
--        operator_id (operators) est la nouvelle FK pour le planning admin.
--        date_intervention (date) existe déjà — NE PAS ajouter intervention_date.
--        time_slot : nouveau (morning/afternoon)
--        latitude/longitude : nouveau (pour la carte des routes)
-- ---------------------------------------------------------------------------
ALTER TABLE public.interventions
  ADD COLUMN IF NOT EXISTS operator_id uuid REFERENCES public.operators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS time_slot text CHECK (time_slot IN ('morning', 'afternoon')),
  ADD COLUMN IF NOT EXISTS latitude float,
  ADD COLUMN IF NOT EXISTS longitude float;

CREATE INDEX IF NOT EXISTS idx_interventions_operator_id
  ON public.interventions(operator_id)
  WHERE operator_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interventions_time_slot
  ON public.interventions(time_slot)
  WHERE time_slot IS NOT NULL;

COMMENT ON COLUMN public.interventions.operator_id IS
  'FK vers operators (planning admin). Distinct de operateur_id (FK auth.users, workflow terrain).';
COMMENT ON COLUMN public.interventions.time_slot IS
  'Créneau de la journée : morning (08h-12h) ou afternoon (14h-18h).';
COMMENT ON COLUMN public.interventions.latitude IS
  'Latitude du lieu d''intervention (WGS-84). Utilisée pour la carte des routes.';
COMMENT ON COLUMN public.interventions.longitude IS
  'Longitude du lieu d''intervention (WGS-84). Utilisée pour la carte des routes.';
