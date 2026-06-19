-- ============================================================
-- reservations_b2c : tunnel de vente B2C public (pré-Stripe)
-- ============================================================

-- 1. Table principale
CREATE TABLE IF NOT EXISTS public.reservations_b2c (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),

  -- Infos client
  prenom              text NOT NULL,
  nom                 text NOT NULL,
  email               text NOT NULL,
  telephone           text NOT NULL,
  adresse             text NOT NULL,
  ville               text NOT NULL,
  code_postal         text NOT NULL,

  -- Prestation
  vehicule            text NOT NULL,  -- citadine | berline | suv | utilitaire
  formule             text NOT NULL,  -- interieur | interieur_exterieur
  options             jsonb NOT NULL DEFAULT '[]'::jsonb,  -- ["puzzi","ozone"]

  -- Tarif calculé côté client (valeur informative, admin doit re-vérifier)
  montant_ttc         numeric(10,2) NOT NULL,

  -- Créneaux préférés (min 2 dates différentes)
  -- [{ "date": "2026-06-20", "heure": "08:00" }, ...]
  creneaux_preferes   jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Statut
  statut              text NOT NULL DEFAULT 'en_attente_paiement'
                        CHECK (statut IN ('en_attente_paiement','confirmee','annulee')),

  -- Liaison vers l'intervention créée lors de la confirmation admin
  intervention_id     uuid REFERENCES public.interventions(id) ON DELETE SET NULL,

  -- Notes admin
  notes_admin         text
);

-- Index pour la liste admin
CREATE INDEX IF NOT EXISTS reservations_b2c_statut_idx ON public.reservations_b2c(statut);
CREATE INDEX IF NOT EXISTS reservations_b2c_created_at_idx ON public.reservations_b2c(created_at DESC);

-- 2. Ajout colonnes sur interventions pour traçabilité B2C
ALTER TABLE public.interventions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'b2b'
    CHECK (source IN ('b2b','b2c')),
  ADD COLUMN IF NOT EXISTS reservation_b2c_id uuid
    REFERENCES public.reservations_b2c(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS interventions_source_idx ON public.interventions(source);
CREATE INDEX IF NOT EXISTS interventions_reservation_b2c_id_idx ON public.interventions(reservation_b2c_id);

-- 3. RLS sur reservations_b2c
ALTER TABLE public.reservations_b2c ENABLE ROW LEVEL SECURITY;

-- Lecture : admin/staff/commercial uniquement
CREATE POLICY "reservations_b2c_select_admin"
  ON public.reservations_b2c FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin','staff','commercial')
    )
  );

-- Update : admin/staff uniquement
CREATE POLICY "reservations_b2c_update_admin"
  ON public.reservations_b2c FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin','staff')
    )
  );

-- 4. GRANT anon sur get_creneaux_disponibles (pour le tunnel public)
GRANT EXECUTE ON FUNCTION public.get_creneaux_disponibles(date, date) TO anon;

-- 5. RPC : confirmer_reservation_b2c (admin/staff only)
CREATE OR REPLACE FUNCTION public.confirmer_reservation_b2c(
  p_reservation_id uuid,
  p_operator_id    uuid,
  p_date           date,
  p_time_slot      text,
  p_heure          time
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res          reservations_b2c%ROWTYPE;
  v_intervention_id uuid;
  v_caller_role  text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','staff') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT * INTO v_res FROM reservations_b2c WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Réservation introuvable';
  END IF;
  IF v_res.statut <> 'en_attente_paiement' THEN
    RAISE EXCEPTION 'Réservation déjà traitée (statut : %)', v_res.statut;
  END IF;

  INSERT INTO interventions (
    source, reservation_b2c_id,
    operator_id,
    date_intervention, time_slot, heure_intervention,
    adresse_intervention, ville_intervention, code_postal_intervention,
    type_prestation,
    statut,
    notes_intervention
  ) VALUES (
    'b2c', p_reservation_id,
    p_operator_id,
    p_date, p_time_slot, p_heure,
    v_res.adresse, v_res.ville, v_res.code_postal,
    CASE v_res.formule
      WHEN 'interieur_exterieur' THEN 'pack_standard'
      ELSE 'pack_interieur'
    END,
    'planifiee',
    CONCAT(
      'B2C — ', v_res.prenom, ' ', v_res.nom, ' — ', v_res.vehicule,
      CASE WHEN v_res.options <> '[]'::jsonb THEN ' + options: ' || v_res.options::text ELSE '' END
    )
  )
  RETURNING id INTO v_intervention_id;

  UPDATE reservations_b2c
  SET statut = 'confirmee', intervention_id = v_intervention_id
  WHERE id = p_reservation_id;

  INSERT INTO admin_actions_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'reservation_b2c_confirmee', 'reservation_b2c', p_reservation_id,
    jsonb_build_object('intervention_id', v_intervention_id, 'date', p_date, 'heure', p_heure));

  RETURN v_intervention_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirmer_reservation_b2c(uuid,uuid,date,text,time) TO authenticated;

-- 6. RPC : annuler_reservation_b2c (admin/staff only)
CREATE OR REPLACE FUNCTION public.annuler_reservation_b2c(
  p_reservation_id uuid,
  p_motif          text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','staff') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  UPDATE reservations_b2c
  SET statut = 'annulee',
      notes_admin = COALESCE(p_motif, notes_admin)
  WHERE id = p_reservation_id
    AND statut = 'en_attente_paiement';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Réservation introuvable ou déjà traitée';
  END IF;

  INSERT INTO admin_actions_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'reservation_b2c_annulee', 'reservation_b2c', p_reservation_id,
    jsonb_build_object('motif', p_motif));
END;
$$;

GRANT EXECUTE ON FUNCTION public.annuler_reservation_b2c(uuid,text) TO authenticated;
