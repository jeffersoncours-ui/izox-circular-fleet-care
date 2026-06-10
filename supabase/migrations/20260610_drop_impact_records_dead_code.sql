-- impact_records : table morte — l'impact RSE est calculé on-the-fly (src/lib/impact.ts),
-- aucune fonction/trigger/frontend ne la consomme. Suppression avec l'edge function compute-impact
-- (IDOR latent sur get_summary/get_client_records). Appliqué en prod le 2026-06-10.
DROP TABLE IF EXISTS public.impact_records;
