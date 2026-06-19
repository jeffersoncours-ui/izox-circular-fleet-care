BEGIN;

TRUNCATE TABLE
  public.intervention_photos,
  public.factures_lignes,
  public.avoirs,
  public.factures,
  public.interventions,
  public.notifications_internes,
  public.admin_actions_log
RESTART IDENTITY CASCADE;

TRUNCATE TABLE
  public.contrat_avenants,
  public.contrat_lignes,
  public.creneaux_recurrents_garantis,
  public.demandes_rdv,
  public.demandes_gel,
  public.parrainages,
  public.entreprise_acces_commerciaux,
  public.vehicules,
  public.contrats
RESTART IDENTITY CASCADE;

TRUNCATE TABLE public.entreprises RESTART IDENTITY CASCADE;

UPDATE public.profiles SET entreprise_id = NULL WHERE role = 'client';

DELETE FROM public.contrat_sequences;

CREATE SEQUENCE IF NOT EXISTS public.seq_facture_b2b_2027 START 1 INCREMENT 1 MINVALUE 1 MAXVALUE 999999 NO CYCLE;
ALTER SEQUENCE public.seq_facture_b2b_2026 RESTART WITH 1;
ALTER SEQUENCE public.seq_facture_b2b_2027 RESTART WITH 1;
ALTER SEQUENCE public.seq_facture_b2c_2026 RESTART WITH 1;
ALTER SEQUENCE public.seq_avoir_b2b_2026   RESTART WITH 1;
ALTER SEQUENCE public.seq_avoir_b2c_2026   RESTART WITH 1;

COMMIT;