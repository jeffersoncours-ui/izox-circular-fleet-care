-- =============================================================
-- Avis clients (landing B2C) : table admin-manageable
-- Carrousel "Avis clients" alimenté depuis l'admin, RLS publique
-- en lecture (avis publiés uniquement). Source = 'manuel' pour
-- l'instant, 'google' prévu pour une future synchro Google Reviews
-- (non implémentée).
-- =============================================================

CREATE TABLE public.avis_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auteur_nom text NOT NULL,
  auteur_role text,
  texte text NOT NULL,
  note smallint CHECK (note BETWEEN 1 AND 5),
  photo_url text,
  source text NOT NULL DEFAULT 'manuel' CHECK (source IN ('manuel', 'google')),
  google_review_id text UNIQUE,
  publie boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.avis_clients IS
  'Avis clients affichés sur la landing B2C (carrousel "Avis clients"). publie=false par défaut : un admin/staff doit valider avant publication.';

ALTER TABLE public.avis_clients ENABLE ROW LEVEL SECURITY;

-- Lecture publique : uniquement les avis publiés (landing non authentifiée)
CREATE POLICY "avis_clients_public_select"
ON public.avis_clients FOR SELECT TO anon, authenticated
USING (publie = true);

-- Gestion complète : admin/staff (y compris les avis non publiés)
CREATE POLICY "avis_clients_admin_all"
ON public.avis_clients FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'staff'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'staff'::app_role)
);
