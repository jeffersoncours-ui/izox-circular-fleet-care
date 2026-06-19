-- ============================================================================
-- Migration 20260605020000 — Security fixes (audit 2026-06-05)
-- ============================================================================

-- ── 1. assigner_rdv (5-param): add role guard ─────────────────────────────

CREATE OR REPLACE FUNCTION public.assigner_rdv(
  p_demande_id   uuid,
  p_operator_id  uuid,
  p_date         date,
  p_time_slot    text,
  p_heure        time without time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid              uuid := auth.uid();
  v_demande          RECORD;
  v_nb_interventions int;
  v_nb_vehicules     int;
  v_vehicule_id      uuid;
  v_type_pack        text;
  v_contrat_ligne_id uuid;
  v_intervention_id  uuid;
  v_intervention_ids uuid[] := ARRAY[]::uuid[];
  v_client_uid       uuid;
BEGIN
  -- Role guard: admin and staff only
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_uid AND role IN ('admin', 'staff')
  ) THEN
    RAISE EXCEPTION 'Accès refusé : rôle admin ou staff requis';
  END IF;

  IF p_time_slot NOT IN ('morning', 'afternoon') THEN RAISE EXCEPTION 'time_slot invalide : %', p_time_slot; END IF;
  SELECT * INTO v_demande FROM public.demandes_rdv WHERE id = p_demande_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF v_demande.statut != 'en_attente' THEN RAISE EXCEPTION 'La demande n''est plus en attente (statut: %)', v_demande.statut; END IF;
  v_nb_vehicules := COALESCE(array_length(v_demande.vehicule_ids, 1), 0);
  IF v_nb_vehicules = 0 THEN RAISE EXCEPTION 'Aucun véhicule associé à cette demande'; END IF;
  SELECT COUNT(*) INTO v_nb_interventions FROM public.interventions WHERE operator_id = p_operator_id AND date_intervention = p_date AND time_slot = p_time_slot;
  IF v_nb_interventions + v_nb_vehicules > 2 THEN
    RAISE EXCEPTION 'Créneau saturé : % intervention(s) déjà planifiée(s), +% demandée(s) (max 2 par demi-journée)', v_nb_interventions, v_nb_vehicules;
  END IF;

  FOREACH v_vehicule_id IN ARRAY v_demande.vehicule_ids LOOP
    SELECT type_pack_souhaite INTO v_type_pack FROM public.vehicules WHERE id = v_vehicule_id AND statut = 'actif';
    SELECT cl.id INTO v_contrat_ligne_id FROM contrat_lignes cl JOIN contrats c ON c.id = cl.contrat_id
    WHERE c.entreprise_id = v_demande.entreprise_id AND cl.type_pack = v_type_pack AND cl.statut_ligne = 'actif' AND c.statut = 'actif' LIMIT 1;

    INSERT INTO public.interventions (
      entreprise_id, vehicule_id, operator_id, date_intervention,
      time_slot, heure_intervention, statut, type_prestation, demande_rdv_id, contrat_ligne_id,
      adresse_intervention, ville_intervention, code_postal_intervention,
      latitude, longitude, telephone_intervention
    ) VALUES (
      v_demande.entreprise_id, v_vehicule_id, p_operator_id, p_date,
      p_time_slot, p_heure, 'planifiee', COALESCE(v_type_pack, 'complet'), p_demande_id, v_contrat_ligne_id,
      v_demande.adresse_intervention, v_demande.ville_intervention, v_demande.code_postal_intervention,
      v_demande.latitude, v_demande.longitude, v_demande.telephone_intervention
    ) RETURNING id INTO v_intervention_id;
    v_intervention_ids := array_append(v_intervention_ids, v_intervention_id);
  END LOOP;

  UPDATE public.demandes_rdv SET
    statut = 'confirmee', assigned_operator_id = p_operator_id,
    assigned_date = p_date, assigned_time_slot = p_time_slot,
    assigned_heure = p_heure, date_confirmee = p_date::timestamptz, updated_at = now()
  WHERE id = p_demande_id;

  INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'rdv_assigne', jsonb_build_object(
    'demande_id', p_demande_id, 'operator_id', p_operator_id,
    'date', p_date, 'time_slot', p_time_slot, 'heure', p_heure::text,
    'intervention_ids', to_jsonb(v_intervention_ids)
  ), array_length(v_intervention_ids, 1));

  SELECT p.id INTO v_client_uid
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.entreprise_id = v_demande.entreprise_id AND ur.role = 'client'
  LIMIT 1;

  IF v_client_uid IS NOT NULL THEN
    INSERT INTO public.notifications_internes (user_id, source_action, titre, severite, link_url, details, statut, action_requise)
    VALUES (v_client_uid, 'rdv_confirme',
      'RDV confirmé — ' || to_char(p_date, 'DD/MM/YYYY'),
      'info', '/client/prestations',
      jsonb_build_object('demande_id', p_demande_id, 'date', p_date::text, 'time_slot', p_time_slot, 'heure', p_heure::text),
      'non_lu'::notification_statut_enum, false);
  END IF;

  RETURN json_build_object('success', true, 'intervention_ids', v_intervention_ids, 'nb_interventions', array_length(v_intervention_ids, 1));
END;
$$;

-- ── 2. Drop 4-param overload (superseded by 5-param with heure) ────────────

DROP FUNCTION IF EXISTS public.assigner_rdv(uuid, uuid, date, text);

-- ── 3. calculer_palier_remise: fix thresholds to match frontend ─────────────
-- Frontend: starter ≤4, pro 5-9, business 10-19, premium ≥20
-- Old DB:   starter 0-2, pro 3-5, business 6-10, premium ≥11 (wrong)

CREATE OR REPLACE FUNCTION public.calculer_palier_remise(p_nb_vehicules integer)
RETURNS TABLE(palier text, taux_remise numeric)
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_nb_vehicules >= 20 THEN
    RETURN QUERY SELECT 'premium'::TEXT, 0.20::NUMERIC;
  ELSIF p_nb_vehicules >= 10 THEN
    RETURN QUERY SELECT 'business'::TEXT, 0.12::NUMERIC;
  ELSIF p_nb_vehicules >= 5 THEN
    RETURN QUERY SELECT 'pro'::TEXT, 0.05::NUMERIC;
  ELSE
    RETURN QUERY SELECT 'starter'::TEXT, 0.00::NUMERIC;
  END IF;
END;
$$;

-- ── 4. impact_records: remove open INSERT / UPDATE policies ─────────────────
-- These allowed ANY authenticated user to insert/update impact records.
-- compute-impact edge function uses service role key → bypasses RLS anyway.

DROP POLICY IF EXISTS impact_records_insert ON public.impact_records;
DROP POLICY IF EXISTS impact_records_update ON public.impact_records;

-- ── 5. generer_facture: add SECURITY DEFINER + SET search_path ─────────────

CREATE OR REPLACE FUNCTION public.generer_facture(
  p_contrat_id uuid,
  p_mois       integer,
  p_annee      integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_facture_id                  uuid;
  v_periode_debut               date;
  v_periode_fin                 date;
  v_contrat                     record;
  v_facture_existante           uuid;
  v_palier                      text;
  v_taux_palier                 numeric(5,4);
  v_remise_commerciale          numeric(5,4);
  v_nb_vehicules_total          integer;
  v_montant_ht                  numeric(12,2) := 0;
  v_remise_palier               numeric(12,2) := 0;
  v_facteur_palier              numeric;
  v_facteur_commercial          numeric;
  v_facteur_combine             numeric;
  v_facteur_commercial_effectif numeric;
  v_montant_apres_remises       numeric(12,2);
  v_remise_commerciale_montant  numeric(12,2) := 0;
  v_sous_total                  numeric(12,2) := 0;
  v_tva_taux                    numeric(5,2);
  v_tva_montant                 numeric(12,2);
  v_montant_ttc                 numeric(12,2);
  v_snapshot_prestations        jsonb;
  v_snapshot_contrat            jsonb;
  v_snapshot_client             jsonb;
  v_snapshot_izox               jsonb;
  v_serie                       serie_facture_enum := 'B2B';
  v_ordre                       integer := 0;
  v_ligne                       record;
  v_prix_unitaire_ajuste        numeric(10,2);
BEGIN
  IF p_mois < 1 OR p_mois > 12 THEN RAISE EXCEPTION 'Mois invalide : %', p_mois; END IF;
  IF p_annee < 2026 OR p_annee > 2099 THEN RAISE EXCEPTION 'Annee invalide : %', p_annee; END IF;

  v_periode_debut := make_date(p_annee, p_mois, 1);
  v_periode_fin   := (v_periode_debut + INTERVAL '1 month' - INTERVAL '1 day')::date;

  SELECT id INTO v_facture_existante
  FROM factures
  WHERE contrat_id = p_contrat_id
    AND periode_debut = v_periode_debut AND periode_fin = v_periode_fin
    AND statut != 'annulee';
  IF v_facture_existante IS NOT NULL THEN RETURN v_facture_existante; END IF;

  SELECT c.*, e.id AS ent_id, e.nom AS raison_sociale, e.siret,
         e.adresse, e.code_postal, e.ville
  INTO v_contrat
  FROM contrats c JOIN entreprises e ON e.id = c.entreprise_id
  WHERE c.id = p_contrat_id;

  IF v_contrat IS NULL THEN RAISE EXCEPTION 'Contrat introuvable : %', p_contrat_id; END IF;
  IF v_contrat.statut NOT IN ('actif', 'en_cours_gel', 'resilie') THEN
    RAISE EXCEPTION 'Contrat % non facturable (statut = %).', v_contrat.numero_contrat, v_contrat.statut;
  END IF;

  v_snapshot_prestations := COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'intervention_id', i.id, 'date_intervention', i.date_intervention,
      'vehicule_id', i.vehicule_id, 'vehicule_immatriculation', v.immatriculation,
      'vehicule_marque_modele', COALESCE(v.marque, '') || ' ' || COALESCE(v.modele, ''),
      'contrat_ligne_id', i.contrat_ligne_id
     ))
     FROM interventions i
     JOIN vehicules v ON v.id = i.vehicule_id
     WHERE v.entreprise_id = v_contrat.entreprise_id
       AND i.statut = 'validee'
       AND i.date_intervention >= v_periode_debut
       AND i.date_intervention <= v_periode_fin
    ), '[]'::jsonb);

  IF jsonb_array_length(v_snapshot_prestations) = 0 THEN RETURN NULL; END IF;

  SELECT COUNT(*) INTO v_nb_vehicules_total
  FROM vehicules WHERE entreprise_id = v_contrat.entreprise_id AND statut = 'actif';

  v_palier := CASE
    WHEN v_nb_vehicules_total <= 4  THEN 'starter'
    WHEN v_nb_vehicules_total <= 9  THEN 'pro'
    WHEN v_nb_vehicules_total <= 19 THEN 'business'
    ELSE 'premium' END;

  v_taux_palier := CASE v_palier
    WHEN 'starter'  THEN 0
    WHEN 'pro'      THEN 0.05
    WHEN 'business' THEN 0.12
    WHEN 'premium'  THEN 0.20 END;

  v_remise_commerciale := COALESCE(v_contrat.remise_commerciale_pct, 0);

  FOR v_ligne IN
    SELECT cl.id AS cl_id, cl.type_pack, cl.prix_unitaire_ht, pc.passages_mois,
           COUNT(i.id) AS nb_passages_effectifs
    FROM contrat_lignes cl
    JOIN prestations_catalogue pc ON pc.code = cl.type_pack
    LEFT JOIN interventions i
      ON i.contrat_ligne_id = cl.id
      AND i.statut = 'validee'
      AND i.date_intervention >= v_periode_debut
      AND i.date_intervention <= v_periode_fin
    WHERE cl.contrat_id = p_contrat_id AND cl.statut_ligne = 'actif'
    GROUP BY cl.id, cl.type_pack, cl.prix_unitaire_ht, pc.passages_mois
  LOOP
    v_prix_unitaire_ajuste := ROUND(
      (v_ligne.prix_unitaire_ht / NULLIF(v_ligne.passages_mois, 0))
      * COALESCE(v_contrat.multiplicateur_prix, 1.0), 2);
    v_montant_ht := v_montant_ht + (v_prix_unitaire_ajuste * v_ligne.nb_passages_effectifs);
  END LOOP;

  v_remise_palier := ROUND(v_montant_ht * v_taux_palier, 2);
  v_sous_total    := v_montant_ht - v_remise_palier;

  v_facteur_palier              := 1 - v_taux_palier;
  v_facteur_commercial          := 1 - v_remise_commerciale;
  v_facteur_combine             := GREATEST(0.70, v_facteur_palier * v_facteur_commercial);
  v_facteur_commercial_effectif := CASE WHEN v_facteur_palier > 0
    THEN v_facteur_combine / v_facteur_palier ELSE 1 END;
  v_montant_apres_remises       := ROUND(v_sous_total * v_facteur_commercial_effectif, 2);
  v_remise_commerciale_montant  := v_sous_total - v_montant_apres_remises;
  v_sous_total                  := v_montant_apres_remises;

  v_tva_taux    := 0;
  v_tva_montant := ROUND(v_sous_total * (v_tva_taux / 100), 2);
  v_montant_ttc := v_sous_total + v_tva_montant;

  v_snapshot_client := jsonb_build_object(
    'entreprise_id', v_contrat.ent_id, 'raison_sociale', v_contrat.raison_sociale,
    'siret', v_contrat.siret, 'adresse', v_contrat.adresse,
    'code_postal', v_contrat.code_postal, 'ville', v_contrat.ville);

  v_snapshot_izox := jsonb_build_object(
    'raison_sociale', 'IZOX', 'mention_tva', 'TVA non applicable, art. 293 B du CGI');

  v_snapshot_contrat := jsonb_build_object(
    'contrat_id', p_contrat_id, 'numero_contrat', v_contrat.numero_contrat,
    'engagement_type', v_contrat.engagement_type,
    'multiplicateur_prix', v_contrat.multiplicateur_prix,
    'palier_applique', v_palier, 'taux_palier', v_taux_palier,
    'remise_commerciale_pct', v_remise_commerciale,
    'facteur_commercial_effectif', v_facteur_commercial_effectif,
    'nb_vehicules_total_entreprise', v_nb_vehicules_total);

  INSERT INTO factures (
    contrat_id, entreprise_id, serie, annee_fiscale,
    periode_debut, periode_fin, statut,
    montant_ht, tva_taux, tva_montant, montant_ttc,
    devise, regime_tva, mention_tva_speciale,
    snapshot_client, snapshot_izox, snapshot_contrat, snapshot_prestations,
    created_by
  ) VALUES (
    p_contrat_id, v_contrat.entreprise_id, v_serie, p_annee,
    v_periode_debut, v_periode_fin, 'brouillon',
    v_sous_total, v_tva_taux, v_tva_montant, v_montant_ttc,
    'EUR', 'franchise_base', 'TVA non applicable, art. 293 B du CGI',
    v_snapshot_client, v_snapshot_izox, v_snapshot_contrat, v_snapshot_prestations,
    auth.uid()
  ) RETURNING id INTO v_facture_id;

  v_ordre := 0;

  FOR v_ligne IN
    SELECT cl.id AS cl_id, cl.type_pack, cl.prix_unitaire_ht, pc.passages_mois,
           pc.nom AS pack_nom, COUNT(i.id) AS nb_passages_effectifs
    FROM contrat_lignes cl
    JOIN prestations_catalogue pc ON pc.code = cl.type_pack
    LEFT JOIN interventions i
      ON i.contrat_ligne_id = cl.id
      AND i.statut = 'validee'
      AND i.date_intervention >= v_periode_debut
      AND i.date_intervention <= v_periode_fin
    WHERE cl.contrat_id = p_contrat_id AND cl.statut_ligne = 'actif'
    GROUP BY cl.id, cl.type_pack, cl.prix_unitaire_ht, pc.passages_mois, pc.nom
    HAVING COUNT(i.id) > 0
  LOOP
    v_prix_unitaire_ajuste := ROUND(
      (v_ligne.prix_unitaire_ht / NULLIF(v_ligne.passages_mois, 0))
      * COALESCE(v_contrat.multiplicateur_prix, 1.0), 2);

    v_ordre := v_ordre + 1;
    INSERT INTO factures_lignes (facture_id, ordre_affichage, type_ligne, libelle,
      quantite, prix_unitaire_ht, montant_ht, tva_taux)
    VALUES (v_facture_id, v_ordre, 'prestation',
      v_ligne.pack_nom || ' - ' || v_ligne.nb_passages_effectifs || ' passage(s)',
      v_ligne.nb_passages_effectifs, v_prix_unitaire_ajuste,
      v_prix_unitaire_ajuste * v_ligne.nb_passages_effectifs, v_tva_taux);
  END LOOP;

  IF v_remise_palier > 0 THEN
    v_ordre := v_ordre + 1;
    INSERT INTO factures_lignes (facture_id, ordre_affichage, type_ligne, libelle,
      quantite, prix_unitaire_ht, montant_ht, tva_taux)
    VALUES (v_facture_id, v_ordre, 'remise_palier',
      'Remise palier ' || v_palier || ' (-' || (v_taux_palier * 100)::text || '%)',
      NULL, NULL, -v_remise_palier, v_tva_taux);
  END IF;

  IF v_remise_commerciale_montant > 0 THEN
    v_ordre := v_ordre + 1;
    INSERT INTO factures_lignes (facture_id, ordre_affichage, type_ligne, libelle,
      quantite, prix_unitaire_ht, montant_ht, tva_taux)
    VALUES (v_facture_id, v_ordre, 'remise_commerciale',
      'Remise commerciale -' || ROUND(v_remise_commerciale * 100, 1)::text
        || '% (effective: -' || ROUND((1 - v_facteur_commercial_effectif) * 100, 2)::text || '%)',
      NULL, NULL, -v_remise_commerciale_montant, v_tva_taux);
  END IF;

  v_ordre := v_ordre + 1;
  INSERT INTO factures_lignes (facture_id, ordre_affichage, type_ligne, libelle,
    quantite, prix_unitaire_ht, montant_ht, tva_taux)
  VALUES (v_facture_id, v_ordre, 'total', 'Total HT', NULL, NULL, v_sous_total, v_tva_taux);

  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (auth.uid(), 'generation_facture_brouillon',
    jsonb_build_object(
      'facture_id', v_facture_id, 'contrat_id', p_contrat_id,
      'numero_contrat', v_contrat.numero_contrat,
      'periode_debut', v_periode_debut, 'periode_fin', v_periode_fin,
      'montant_ttc', v_montant_ttc,
      'nb_prestations', jsonb_array_length(v_snapshot_prestations),
      'palier', v_palier, 'taux_palier', v_taux_palier,
      'remise_commerciale_pct', v_remise_commerciale,
      'facteur_commercial_effectif', v_facteur_commercial_effectif,
      'multiplicateur_engagement', v_contrat.multiplicateur_prix), 1);

  RETURN v_facture_id;
END;
$$;

-- ── 6. v_contrats_passages_restants: count all non-cancelled statuts ─────────
-- Include planifiee/en_cours/en_revision so booked slots count against quota.

CREATE OR REPLACE VIEW public.v_contrats_passages_restants AS
SELECT
  c.id              AS contrat_id,
  c.numero_contrat,
  c.entreprise_id,
  cl.id             AS contrat_ligne_id,
  cl.type_pack,
  cl.nb_vehicules,
  pc.passages_mois  AS passages_mois_pack,
  (cl.nb_vehicules * COALESCE(pc.passages_mois, 0)) AS passages_mois_total,
  COALESCE((
    SELECT COUNT(*) FROM interventions i
    WHERE i.contrat_ligne_id = cl.id
      AND i.statut IN ('planifiee', 'en_cours', 'en_revision', 'validee')
      AND date_trunc('month', i.date_intervention::timestamptz) = date_trunc('month', now())
  ), 0) AS passages_effectues_mois,
  GREATEST(0, (cl.nb_vehicules * COALESCE(pc.passages_mois, 0)) - COALESCE((
    SELECT COUNT(*) FROM interventions i
    WHERE i.contrat_ligne_id = cl.id
      AND i.statut IN ('planifiee', 'en_cours', 'en_revision', 'validee')
      AND date_trunc('month', i.date_intervention::timestamptz) = date_trunc('month', now())
  ), 0)) AS passages_restants_mois
FROM contrats c
JOIN contrat_lignes cl ON cl.contrat_id = c.id
JOIN prestations_catalogue pc ON pc.code = cl.type_pack
WHERE c.statut IN ('actif', 'en_attente_validation')
  AND cl.statut_ligne = 'actif';

-- ── 7. v_entreprises_vehicules_resume: security_invoker=true ────────────────
-- Allows RLS on underlying tables to apply based on caller's role.

CREATE OR REPLACE VIEW public.v_entreprises_vehicules_resume
WITH (security_invoker = true) AS
SELECT
  e.id AS entreprise_id,
  e.nom,
  e.ville,
  e.type_client,
  e.commercial_id,
  (SELECT COALESCE(p.prenom, '') || ' ' || COALESCE(p.nom, '')
   FROM profiles p WHERE p.id = e.commercial_id) AS commercial_nom,
  COUNT(DISTINCT v.id) FILTER (WHERE v.statut::text = 'actif')               AS nb_vehicules_actifs,
  COUNT(DISTINCT v.id) FILTER (WHERE v.statut::text = 'en_attente_validation') AS nb_vehicules_en_attente,
  COUNT(DISTINCT v.id) FILTER (WHERE v.statut::text = 'gele')                AS nb_vehicules_gele,
  COUNT(DISTINCT v.id)                                                         AS nb_vehicules_total,
  c.id              AS contrat_actif_id,
  c.numero_contrat,
  c.statut::text    AS contrat_statut,
  c.palier,
  c.montant_brut_mensuel,
  c.montant_net_mensuel,
  c.remise_commerciale_pct
FROM entreprises e
LEFT JOIN vehicules v ON v.entreprise_id = e.id
LEFT JOIN contrats c ON c.entreprise_id = e.id
  AND c.statut::text = ANY(ARRAY['actif', 'en_attente_validation', 'en_cours_gel'])
WHERE e.archived_at IS NULL
GROUP BY e.id, e.nom, e.ville, e.type_client, e.commercial_id,
         c.id, c.numero_contrat, c.statut, c.palier, c.montant_brut_mensuel, c.montant_net_mensuel, c.remise_commerciale_pct
HAVING COUNT(v.id) > 0;

-- ── 8. v_demandes_gel_with_quota: security_invoker=true ────────────────────

CREATE OR REPLACE VIEW public.v_demandes_gel_with_quota
WITH (security_invoker = true) AS
SELECT
  dg.id,
  dg.entreprise_id,
  dg.contrat_id,
  dg.type_demande,
  dg.vehicule_ids,
  dg.date_debut,
  dg.date_fin_prevue,
  dg.date_fin_effective,
  dg.motif,
  dg.statut,
  dg.refus_motif,
  dg.created_by,
  dg.validated_by,
  dg.validated_at,
  dg.created_at,
  dg.updated_at,
  e.nom                                          AS entreprise_nom,
  c.numero_contrat,
  c.commercial_signataire_id,
  calculer_quota_gel_consomme(dg.entreprise_id)  AS quota_consomme_actuel,
  (dg.date_fin_prevue - dg.date_debut + 1)       AS duree_jours_demandee
FROM demandes_gel dg
JOIN entreprises e ON e.id = dg.entreprise_id
JOIN contrats    c ON c.id = dg.contrat_id;

-- ── 9. dispatcher_notification: add SET search_path ────────────────────────

CREATE OR REPLACE FUNCTION public.dispatcher_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action          text;
  v_details         jsonb;
  v_log_id          uuid;
  v_titre           text;
  v_severite        text;
  v_action_requise  boolean;
  v_link_url        text;
  v_roles_cibles    app_role[];
  v_user            record;
  v_nb_erreurs      integer;
  v_nb_dormants     integer;
  v_nb_preavis      integer;
  v_numero_contrat  text;
  v_role_initiateur text;
  v_contrat_cree    boolean;
  v_immat           text;
  v_entreprise_nom  text;
  v_entreprise_id   text;
BEGIN
  BEGIN
    v_action  := NEW.action;
    v_details := COALESCE(NEW.details, '{}'::jsonb);
    v_log_id  := NEW.id;

    IF v_action LIKE 'test%' THEN
      RETURN NEW;
    END IF;

    v_numero_contrat := COALESCE(
      v_details->>'numero_contrat',
      v_details->>'numero_facture',
      v_details->>'numero_avoir',
      ''
    );

    CASE v_action

      WHEN 'creation_contrat' THEN
        v_titre          := 'Nouveau contrat — ' || v_numero_contrat;
        v_roles_cibles   := ARRAY['admin', 'staff', 'commercial']::app_role[];
        v_severite       := 'info';
        v_action_requise := false;
        v_link_url       := '/admin/contrats/' || COALESCE(v_details->>'contrat_id', '');

      WHEN 'modification_contrat' THEN
        v_titre          := 'Ajustement de flotte — ' || v_numero_contrat;
        v_roles_cibles   := ARRAY['admin', 'staff', 'commercial']::app_role[];
        v_severite       := 'info';
        v_action_requise := false;
        v_link_url       := '/admin/contrats/' || COALESCE(v_details->>'contrat_id', '');

      WHEN 'gel_contrat' THEN
        v_titre          := 'Mise en veille — ' || v_numero_contrat;
        v_roles_cibles   := ARRAY['admin', 'staff', 'commercial']::app_role[];
        v_severite       := 'info';
        v_action_requise := false;
        v_link_url       := '/admin/contrats/' || COALESCE(v_details->>'contrat_id', '');

      WHEN 'reactivation_contrat' THEN
        v_titre          := 'Reprise du contrat — ' || v_numero_contrat;
        v_roles_cibles   := ARRAY['admin', 'staff', 'commercial']::app_role[];
        v_severite       := 'info';
        v_action_requise := false;
        v_link_url       := '/admin/contrats/' || COALESCE(v_details->>'contrat_id', '');

      WHEN 'resiliation_contrat' THEN
        v_titre          := 'Clôture du contrat — ' || v_numero_contrat;
        v_roles_cibles   := ARRAY['admin', 'staff', 'commercial']::app_role[];
        v_severite       := 'warning';
        v_action_requise := false;
        v_link_url       := '/admin/contrats/' || COALESCE(v_details->>'contrat_id', '');

      WHEN 'validation_vehicule_attente' THEN
        v_titre          := 'Véhicule validé — ' || COALESCE(v_details->>'immatriculation', '');
        v_roles_cibles   := ARRAY['admin', 'staff', 'commercial']::app_role[];
        v_severite       := 'info';
        v_action_requise := false;
        v_link_url       := '/admin/vehicules';

      WHEN 'ajout_vehicule' THEN
        v_role_initiateur := COALESCE(v_details->>'role_initiateur', 'client');
        v_contrat_cree    := COALESCE((v_details->>'contrat_cree')::boolean, false);
        v_immat           := COALESCE(v_details->>'immatriculation', '');
        v_entreprise_nom  := COALESCE(v_details->>'entreprise_nom', '');
        v_entreprise_id   := COALESCE(v_details->>'entreprise_id', '');

        IF v_role_initiateur IN ('admin', 'staff') THEN
          IF v_contrat_cree THEN
            v_titre := 'Nouveau contrat créé — ' || v_entreprise_nom;
          ELSE
            v_titre := 'Véhicule ajouté — ' || v_entreprise_nom || ' (' || v_immat || ')';
          END IF;
          v_severite       := 'info';
          v_action_requise := false;
        ELSE
          IF v_contrat_cree THEN
            v_titre := 'Nouvelle demande contrat — ' || v_entreprise_nom;
          ELSE
            v_titre := 'Véhicule à valider — ' || v_entreprise_nom || ' (' || v_immat || ')';
          END IF;
          v_severite       := 'warning';
          v_action_requise := true;
        END IF;

        v_roles_cibles := ARRAY['admin', 'staff']::app_role[];
        v_link_url     := '/admin/clients/' || v_entreprise_id;

      WHEN 'cron_cloture_mensuelle' THEN
        v_nb_erreurs := COALESCE((v_details->>'nb_erreurs')::integer, 0);
        IF v_nb_erreurs > 0 THEN
          v_titre          := '⚠ Clôture mensuelle — ' || v_nb_erreurs || ' erreur(s)';
          v_severite       := 'critical';
          v_action_requise := true;
        ELSE
          v_titre          := 'Clôture mensuelle — ' || COALESCE(v_details->>'nb_factures_creees', '0') || ' facture(s) créée(s)';
          v_severite       := 'info';
          v_action_requise := false;
        END IF;
        v_roles_cibles := ARRAY['admin', 'staff']::app_role[];
        v_link_url     := '/admin';

      WHEN 'cron_maintenance_quotidienne' THEN
        v_nb_dormants := COALESCE((v_details->>'nb_dormants_detectes')::integer, 0);
        v_nb_preavis  := COALESCE((v_details->>'nb_preavis_echus')::integer, 0);

        IF v_nb_dormants > 0 THEN
          FOR v_user IN
            SELECT DISTINCT ur.user_id FROM user_roles ur WHERE ur.role IN ('admin', 'commercial')
          LOOP
            INSERT INTO notifications_internes (
              user_id, source_action, source_log_id, titre, details, link_url, statut, action_requise, severite
            ) VALUES (
              v_user.user_id, v_action, v_log_id,
              v_nb_dormants || ' contrat(s) dormant(s) détecté(s)',
              v_details, '/admin/contrats', 'non_lu', true, 'warning'
            )
            ON CONFLICT (user_id, source_log_id, source_action) WHERE source_log_id IS NOT NULL DO NOTHING;
          END LOOP;
        END IF;

        IF v_nb_preavis > 0 THEN
          FOR v_user IN
            SELECT DISTINCT ur.user_id FROM user_roles ur WHERE ur.role IN ('admin', 'staff', 'commercial')
          LOOP
            INSERT INTO notifications_internes (
              user_id, source_action, source_log_id, titre, details, link_url, statut, action_requise, severite
            ) VALUES (
              v_user.user_id, v_action || '_preavis', v_log_id,
              v_nb_preavis || ' préavis échu(s) aujourd''hui',
              v_details, '/admin/contrats', 'non_lu', true, 'warning'
            )
            ON CONFLICT (user_id, source_log_id, source_action) WHERE source_log_id IS NOT NULL DO NOTHING;
          END LOOP;
        END IF;

        RETURN NEW;

      WHEN 'generation_facture_brouillon' THEN
        v_titre          := 'Facture brouillon générée — ' || v_numero_contrat;
        v_roles_cibles   := ARRAY['admin', 'staff']::app_role[];
        v_severite       := 'info';
        v_action_requise := false;
        v_link_url       := '/admin/contrats/' || COALESCE(v_details->>'contrat_id', '');

      WHEN 'emission_facture' THEN
        v_titre          := 'Facture émise — ' || COALESCE(v_details->>'numero_facture', '');
        v_roles_cibles   := ARRAY['admin', 'staff']::app_role[];
        v_severite       := 'info';
        v_action_requise := false;
        v_link_url       := '/admin/contrats/' || COALESCE(v_details->>'contrat_id', '');

      WHEN 'annulation_facture_via_avoir' THEN
        v_titre          := 'Avoir émis — ' || COALESCE(v_details->>'numero_avoir', '');
        v_roles_cibles   := ARRAY['admin', 'staff', 'commercial']::app_role[];
        v_severite       := 'warning';
        v_action_requise := false;
        v_link_url       := '/admin/contrats/' || COALESCE(v_details->>'contrat_id', '');

      ELSE
        RETURN NEW;

    END CASE;

    FOR v_user IN
      SELECT DISTINCT ur.user_id FROM user_roles ur
      WHERE ur.role = ANY(v_roles_cibles)
        AND ur.user_id <> COALESCE(NEW.user_id, '00000000-0000-0000-0000-000000000000'::uuid)
    LOOP
      INSERT INTO notifications_internes (
        user_id, source_action, source_log_id, titre, details, link_url, statut, action_requise, severite
      ) VALUES (
        v_user.user_id, v_action, v_log_id, v_titre, v_details, v_link_url,
        'non_lu', v_action_requise, v_severite
      )
      ON CONFLICT (user_id, source_log_id, source_action) WHERE source_log_id IS NOT NULL DO NOTHING;
    END LOOP;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'dispatcher_notification ECHEC pour log % (action=%): %', NEW.id, NEW.action, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- ── 10. get_max_vehicules_par_demande: add SECURITY DEFINER + search_path ───

CREATE OR REPLACE FUNCTION public.get_max_vehicules_par_demande()
RETURNS integer
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT 2
$$;
