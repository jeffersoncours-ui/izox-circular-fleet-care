# Todo — IZOX

---

## Session 2026-06-10 (27c) — Bug critique véhicule + audit complet app

### Bug bloquant corrigé

**Problème** : ajout de véhicule impossible côté client ET admin (RPC retournait 400)
**Cause** : `ajouter_vehicule` et `supprimer_vehicule` lisaient `remise_pct` au lieu de `taux_remise` depuis `calculer_palier_remise`
**Fix** : migration `20260610_fix_calculer_palier_remise_column.sql` → redéploiement immédiat en prod
**Preuve** : 5 erreurs PostgreSQL "column remise_pct does not exist" dans les logs avant la fix

### Audit complet application — résultats (3 agents parallèles + vérif DB)

#### 🔴 CRITIQUE — corrigés cette session (migration `20260610_security_fixes_idor_guards`)

- [x] **IDOR `ajouter_vehicule`** : un client pouvait créer véhicules/contrats chez n'importe quelle entreprise (RPC SECURITY DEFINER appelable en direct avec un `p_entreprise_id` arbitraire, aucun check d'appartenance). → garde `get_user_entreprise(uid) = p_entreprise_id` pour les clients. Vérifié en DB.
- [x] **RLS `vehicules_operateur_select` grande ouverte** : la policy filtrait uniquement `has_role(operateur)` → tout opérateur voyait les véhicules de TOUTES les entreprises (immat, marques, notes, pricing). → ajout filtre `EXISTS interventions liées (operateur_id OU operator_id)`. Vérifié en DB.
- [x] **`generer_facture` sans guard de rôle** : SECURITY DEFINER appelable par tout authenticated → un client pouvait générer des brouillons de facture pour n'importe quel contrat. → guard admin/staff en tête de fonction. Vérifié en DB.

#### 🟠 IMPORTANT

- [x] **`supprimer_vehicule` — commercial sans contrôle d'appartenance** : corrigé (migration `20260610_supprimer_vehicule_commercial_guard`) — commercial limité aux entreprises qu'il gère (signataire / commercial_id / accès délégué). Client et admin/staff inchangés.
- [ ] **IDOR `compute-impact` (get_summary / get_client_records)** : acceptent `entreprise_id` sans check d'appartenance ni rôle. **MAIS code mort** : le frontend n'appelle jamais `compute-impact` (l'impact est calculé on-the-fly via `src/lib/impact.ts`, pas de table `impact_records` consommée — cf CLAUDE.md). L'edge function reste néanmoins déployée et appelable en direct. → **Recommandation : supprimer l'edge function `compute-impact` + la table `impact_records`** (nettoyage + suppression du risque latent). À valider avec l'utilisateur avant suppression.
- [ ] **22 requêtes Supabase sans capture d'`error`** (`const { data } = await ...`) : échecs DB silencieux → listes vides sans feedback (ex. `admin.clients.$id.tsx:106,145`, `admin.contrats.$id.tsx:204`, `client.flotte.tsx:49`). Pattern à corriger : `const { data, error }` + `if (error) toast.error(...)`. Candidat idéal pour un hook `useSupabaseQuery` (voir simplifications).
- [ ] **`compute-impact` fuite `error.message` au client** (catch ligne 220) : révèle la structure SQL. Sans objet si la fonction est supprimée ; sinon → message générique.

#### 🟡 MINEUR

- [ ] **`admin.facturation.tsx` — RoleGuard au rendu mais pas en `beforeLoad`** : un staff/commercial peut atteindre l'URL et voir un chargement avant masquage. Aligner sur un middleware `beforeLoad` (cohérence avec les autres routes admin-only).
- [ ] **Casts `(supabase as any).rpc(...)`** dans `terrain.index.tsx` (158,170,818,838), `terrain.intervention.$id.tsx:191`, `TwoFactorSetup.tsx:265` : dette post-regen types. Régénérer types + retirer les casts.
- [ ] **`compute-impact` / `send-email` CORS statique** (pas de `corsFor()` dynamique) : OK en prod, KO pour previews Vercel. Aligner si besoin de previews.
- [ ] **"XSS `rdvDateLabel`" signalé par l'audit → NON exploitable** : `assigned_heure` (TIME) et `assigned_date` (DATE) sont des colonnes typées, pas du texte libre. Pas de fix nécessaire (noté pour mémoire).
- [ ] **Enum `interventions.statut` en CHECK text** (vs type PG) : ajout de `annulee` a nécessité une redéf. Migrer vers un vrai ENUM PG un jour pour discipline.

#### 🔧 SIMPLIFICATIONS (refactor sans changement de comportement, classées gain/risque)

- [ ] **RoleGuard `beforeLoad` unifié** (gain 8 / risque 1) : middleware unique pour toutes les routes `/admin/*` au lieu de 2 patterns incohérents.
- [ ] **Dialogs de gel factorisés** (gain 8 / risque 2) : `GelContratDialog` + `GelerVehiculeAdminDialog` + `DemanderGelDialog` + `LeverGelAnticipeDialog` partagent date_debut/fin/motif/submit → `<GelFormDialog>` commun (~-400 LOC).
- [ ] **Hook `useSupabaseQuery<T>`** (gain 6 / risque 4) : centralise loading + error toast + `data ?? []` → corrige d'un coup les 22 erreurs non capturées.
- [ ] **`useRdvSelection` + `<DateSlotPicker>`** (gain 7 / risque 2) : `CreerDemandeRdvDialog` + `ReplaceVehiculeDialog` + `GererRdvConfirmeDialog` dupliquent la logique calendrier/créneaux.
- [ ] **`<FormDialog<T>>` générique** (gain 7 / risque 3) : pattern form+submitting+lookup répété sur 4 gros dialogs admin. Abstraction plus risquée — à faire en dernier.

### Reste à faire (suite session)

- [ ] Décision utilisateur : supprimer `compute-impact` + `impact_records` (code mort + IDOR latent) ?
- [ ] Implémenter les simplifications validées (proposer par ordre gain/risque)
- [ ] Corriger les 22 erreurs Supabase non capturées (via hook ou au cas par cas)
- [ ] Build TS + commit + push

---

## Session 2026-06-10 (27b) — Fix liens email reset/invite MDP

### Contexte (bug remonté en test manuel)

Cliquer sur le lien d'un email d'invitation ("Définir mon mot de passe") ou de reset
("Mot de passe oublié") atterrissait sur `/login` avec les identifiants admin pré-remplis
(autofill navigateur) au lieu de `/reset-password`.

### Causes racines identifiées

1. **Edge functions** : les 3 fonctions (`create-client-account`, `admin-reset-password`,
   `request-password-reset`) définissaient `safeRedirectTo()` mais ne l'appelaient JAMAIS.
   `generateLink` utilisait `${siteUrl}/reset-password` avec `siteUrl = SITE_URL ?? "https://izox.fr"`.
   Si cette URL n'est pas dans l'allowlist Supabase, Supabase ignore silencieusement le
   `redirect_to` et retombe sur la Site URL (racine de l'app) → `/login`.
2. **`reset-password.tsx`** : lecture des params URL dans `useEffect` (après commit React).
   Supabase-js peut nettoyer l'URL (`history.replaceState`) avant → `hasCode/hasToken = false`
   → `navigate("/login")`.
3. **`auth-context.tsx`** : `SIGNED_OUT` (déclenché quand la session admin existante est
   remplacée par la session recovery) remettait `isRecovery = false` avant que
   `PASSWORD_RECOVERY` n'arrive.

### Plan

- [x] Fix 1 — les 3 edge functions appellent réellement `safeRedirectTo(redirect_to)` du payload frontend
- [x] Fix 2 — `reset-password.tsx` : capture des params URL en `useState` lazy (synchrone, avant tout nettoyage)
- [x] Fix 3 — `auth-context.tsx` : `SIGNED_OUT` ne reset plus `isRecovery` si un callback recovery était présent au chargement (`recoveryInProgress` ref)
- [x] Déploiement edge functions : `create-client-account` v23, `admin-reset-password` v21, `request-password-reset` v8
- [x] `npm run build` → 0 erreur
- [x] Commit + push branche session

### À vérifier côté Supabase Dashboard (action utilisateur)

- Auth → URL Configuration → Redirect URLs doit contenir
  `https://izox-circular-fleet-care.vercel.app/reset-password` (et idéalement
  `https://*.vercel.app/reset-password` pour les previews).
- Retester : 1) création compte client → email invitation → lien → `/reset-password` ;
  2) "Mot de passe oublié" → email reset → lien → `/reset-password` ;
  3) reset depuis fiche client admin → idem.

---

## Session 2026-06-06 (27) — Exports CSV + Alertes dashboard + Rapport B3

### Plan

- [x] B1. `src/lib/csv.ts` — utilitaire `downloadCSV(rows, filename)` partagé (BOM UTF-8 Excel)
- [x] B1. `admin.facturation.tsx` — bouton "Exporter CSV" dans la barre de filtres (respecte filtre actif)
- [x] B1. `admin.clients.tsx` — bouton "CSV" dans le PageHeader (respecte filtre actif)
- [x] B1. `InterventionsListPanel.tsx` — bouton "CSV" inline dans la Card filtres
- [x] B2. `admin.index.tsx` — section "À traiter" : 4 alertes calculées au chargement (en_revision > 24h, RDV sans réponse > 48h, brouillons factures > 30j, contrats expirant dans 30j)
- [x] B3. Rapport disponibilites_operateurs — audit schéma + get_creneaux_disponibles → reporter
- [x] Guide tests manuels complet (client/admin/opérateur) fourni à l'utilisateur
- [x] Build 0 erreur tsc + npm run build
- [x] Purge DB (toutes tables à 0, auth.users = 4)
- [x] Commit + push + merge main

### Review session 27

**Livré :**
- **B1 — Exports CSV** : 3 points d'export admin. `src/lib/csv.ts` : utilitaire partagé avec BOM UTF-8 (compatible Excel/LibreOffice), séparateur `;`, échappement des guillemets. Boutons désactivés si liste vide. Nommage automatique `{type}-izox-{date}.csv`.
- **B2 — Alertes dashboard** : section "À traiter" sur `/admin` — rouge si critique (fiches en_revision > 24h, demandes RDV sans réponse > 48h), ambre si warning (brouillons > 30j, contrats expirant dans 30j). N'apparaît que si ≥ 1 alerte active. Chaque alerte est un lien direct vers la section concernée.
- **B3 — Rapport** : `disponibilites_operateurs` bien structurée (7 colonnes, FK operateur_id → auth.users, actif + dates_validite). Bloquant : `get_creneaux_disponibles` ne l'utilise pas du tout (capacité = `COUNT(operators)*2`). UI inutile avant migration de la RPC. À reporter quand 2e opérateur recruté.

**Validation empirique :**
- tsc 0 erreur, npm run build 0 erreur ✓
- Purge DB : 9 tables à 0, auth.users = 4 ✓

---

## Session 2026-06-06 (26) — Corrections UX + sécurité auth + suppression /legal

### Plan

- [x] 1. `reset-password.tsx` + `login.tsx` — `signOut()` obligatoire après `updateUser` pour détruire la session de récupération avant redirect `/login` (faille critique)
- [x] 2. `login.tsx` — retirer `border-b` du brandHeader + resserrer `py-10` pour remonter la carte vers le texte
- [x] 3. `admin.contrats.tsx` + `admin.clients.tsx` — pills filtres sur une seule ligne (overflow-x-auto nowrap)
- [x] 4. Suppression complète `/legal` + liens (AdminSidebar, ClientNav, terrain.index.tsx) + nettoyage CLAUDE.md
- [x] 5. `npx tsc --noEmit --skipLibCheck` + `npm run build` → 0 erreur
- [x] 6. Commit + push sur `claude/izox-fleet-care-planning-RJ00W`
- [x] 7. Fix CORS `create-client-account` — accepter `*.vercel.app` (CORS bloquait depuis les previews Vercel)
- [x] 8. Fix `redirectTo` toutes les edge functions — hardcoder `${siteUrl}/reset-password` (URL dans l'allowlist Supabase) au lieu du `redirect_to` du frontend (non whitelisté → Supabase ignorait → SSR perdait le hash)
- [x] 9. Fix `isRecovery` non remis à `false` au `SIGNED_OUT` → boucle set-password après soumission. Fix : `onAuthStateChange` SIGNED_OUT → `setIsRecovery(false)` dans `auth-context.tsx`

### Review session 26

**Livré :**
- Faille sécurité auth : session recovery non détruite après `updateUser` → `signOut()` ajouté dans `reset-password.tsx` et `login.tsx`. L'utilisateur doit se ré-authentifier explicitement.
- Login page : retrait `border-b` + espacement resserré entre hero et carte auth.
- Pills filtres : `flex-wrap` → `flex-nowrap overflow-x-auto` sur contrats et clients.
- Suppression complète de `/legal` (route, liens sidebar admin, nav client, terrain profil).
- CORS dynamique `create-client-account` : accepte tous `*.vercel.app`.
- `redirectTo` toutes edge functions : toujours `${siteUrl}/reset-password` (URL dans l'allowlist Supabase) — le `redirect_to` du frontend n'est plus utilisé pour le lien Supabase.
- `isRecovery` remis à `false` sur `SIGNED_OUT` — empêche la boucle où `/login` re-affichait le formulaire de changement de MDP après soumission.

**Versions edge functions déployées :**
- `create-client-account` v21
- `admin-reset-password` v19
- `request-password-reset` v7

---

## Session 2026-06-06 (25) — Lier opérateurs + messagerie V1 admin↔terrain

### Plan

- [x] B. Nettoyage backlog — retirer item stale `client/factures/$id` (déjà livré session 19)
- [x] A1. `admin.equipe.tsx` — charger operators + profiles opérateurs, cards état liaison + unread count
- [x] A2. Dialog "Lier un compte terrain" — dropdown profiles.role=operateur non liés + UPDATE operators.user_id
- [x] C1. Migration `20260605030000_operateur_messages` — table + index + RLS (5 policies) + trigger SECURITY DEFINER `tg_message_notify_fn` → notifications_internes
- [x] C2. Régénérer types Supabase
- [x] C3. `src/lib/messaging.ts` — types OperateurMessage/LocalMessage/MessageStatus + fetchConversation + sendMessage + markReadAdmin + markReadOperator + subscribeToConversation (INSERT only) + loadPendingMessages + savePendingMessages
- [x] C4. `src/hooks/useMessaging.ts` — hook optimiste avec inFlightIds + sentLocalIds + localStorage pending + retry on 'online' event + realtime INSERT only (anti-boucle)
- [x] C5. `src/components/messaging/MessageBubble.tsx` — bulle message (gauche/droite selon sender) + indicateurs status (⏳ pending / ✓ sent / ⚠️ failed + retry)
- [x] C6. `src/components/messaging/ChatWindow.tsx` — liste messages auto-scroll + input + envoi Enter/clic
- [x] C7. `admin.equipe.tsx` — intégrer ChatWindow dans split view desktop / full mobile + badge unread par opérateur
- [x] C8. `terrain.index.tsx` — sous-onglet "Messages" dans Suivi + ChatWindow + badge unread bottom nav Suivi
- [x] C9. `npx tsc --noEmit --skipLibCheck` + `npm run build` → 0 erreur
- [x] C10. Validation empirique : table schema + RLS + trigger SECURITY DEFINER + assigner_rdv restauré + types régénérés + build 0 erreur
- [x] Fix hors-plan : `assigner_rdv` accidentellement supprimé par session 24 → migration `20260606010000_fix_assigner_rdv_restore.sql`

### Review session 25

**Livré — Messagerie V1 admin↔terrain + liaison opérateurs :**

**DB (migration 20260605030000) :**
- Table `operateur_messages` : `id`, `conversation_operator_id` (FK → auth.users), `sender_id`, `content`, `image_url`, `client_local_id UUID` (déduplication Realtime), `created_at`, `read_at_admin`, `read_at_operator`
- Contrainte `chk_om_has_content` : content OR image_url requis
- 5 RLS policies : INSERT open authenticated, SELECT admin/staff, SELECT own conversation (operateur), UPDATE admin/staff, UPDATE own conversation (operateur)
- Trigger `tg_message_notify` → `tg_message_notify_fn()` SECURITY DEFINER + `search_path=public` : notifie tous les admin/staff si opérateur envoie, notifie l'opérateur si admin/staff envoie

**Fix (migration 20260606010000) :**
- `assigner_rdv` restauré avec signature correcte : `DEFAULT NULL` sur `p_heure` + role guard admin/staff + notification client RDV confirmé + SECURITY DEFINER SET search_path = public

**Frontend :**
- `src/lib/messaging.ts` : fetch, send (avec client_local_id), markRead, subscribe INSERT-only, localStorage pending
- `src/hooks/useMessaging.ts` : optimistic UI, inFlightIds (StrictMode), sentLocalIds (Realtime dedup), retry on 'online'
- `src/components/messaging/MessageBubble.tsx` : bulles gauche/droite, états pending/failed+retry
- `src/components/messaging/ChatWindow.tsx` : auto-scroll, Enter/Shift+Enter, empty state
- `admin.equipe.tsx` : split view desktop 320px/reste, mobile full, cards opérateur avec badge unread, LinkOperatorDialog + UnlinkOperatorDialog
- `terrain.index.tsx` : sous-onglet "Messages IZOX" dans Suivi, ChatWindow, badge unread bottom nav

**Validation empirique :**
- `assigner_rdv` : présent en DB, SECURITY DEFINER, signature 5 params ✓
- `operateur_messages` : 9 colonnes dont `client_local_id` ✓
- RLS : 5 policies correctes ✓
- Trigger `tg_message_notify` : SECURITY DEFINER + search_path ✓
- `operators.user_id` : colonne présente (nullable) ✓
- `npx tsc --noEmit --skipLibCheck` : 0 erreur ✓
- `npm run build` : 0 erreur ✓

---

## Session 2026-06-05 (24) — Audit sécurité complet + hardening

### Plan

- [x] 1. Audit multi-agents (SQL, edge functions, frontend) — 3 agents parallèles
- [x] 2. Migration DB `20260605020000_security_fixes.sql` — search_path injection, views security_invoker, RLS impact_records, v_contrats_passages_restants fix, assigner_rdv role guard + search_path, calculer_palier_remise thresholds + SECURITY DEFINER, generer_facture SECURITY DEFINER SET search_path, get_max_vehicules_par_demande SECURITY DEFINER
- [x] 3. `compute-impact/index.ts` — `getCallerRole()` helper + role guards sur `generate` / `validate_intervention` / `get_estimated` (admin/staff only)
- [x] 4. `update-client-info/index.ts` — CORS wildcard `"*"` → `corsFor(req)` dynamique
- [x] 5. `admin-reset-password/index.ts` — CORS pattern regex étendu + token exposure (`link: emailSent ? null : actionLink`)
- [x] 6. `create-client-account/index.ts` — `esc()` helper + `${esc(prenom)}` dans le template HTML
- [x] 7. `send-email/index.ts` — `.select("role, entreprise_id")` + ownership checks IDOR dans `rdv_annule_client` et `staff_notification`
- [x] 8. `AssignerRdvDialog.tsx` — double-submit prevention `disabled={!canConfirm || submitting}`
- [x] 9. `client.flotte.tsx` — React Rules of Hooks : split `MaFlotte` (layout) + `MaFlotteList` (hooks)
- [x] 10. `terrain.index.tsx` — stale async setState : `let alive = true` + `if (!alive) return` + cleanup `return () => { alive = false }`
- [x] 11. Déploiement edge functions (compute-impact v6, admin-reset-password v17, update-client-info v2, create-client-account v18, send-email v15)
- [x] 12. Commit + push branche `claude/izox-fleet-care-resume-yXUX9`

### Review session 24

**Livré — Sécurité hardening complet :**

**DB (migration 20260605020000) :**
- `search_path` injection éliminé : `assigner_rdv`, `calculer_palier_remise`, `generer_facture`, `get_max_vehicules_par_demande` tous avec `SET search_path = public`
- `dispatcher_notification` : `CREATE OR REPLACE` (signature préservée, trigger intact) + `search_path`
- Views avec `security_invoker = true` : `v_entreprises_vehicules_resume`, `v_demandes_gel_with_quota` → RLS s'applique per-caller
- `v_contrats_passages_restants` : comptait uniquement `validee`, corrigé pour inclure `planifiee|en_cours|en_revision`
- `calculer_palier_remise` : seuils corrects (5/10/20 interventions, 3%/5%/8%) + SECURITY DEFINER
- RLS `impact_records` : policies INSERT/UPDATE publiques supprimées

**Edge functions :**
- `compute-impact` : `getCallerRole()` + guards sur actions sensibles (generate, validate_intervention, get_estimated)
- `update-client-info` : CORS `"*"` → `corsFor(req)` dynamique (était la seule fonction avec wildcard)
- `admin-reset-password` : CORS regex durci + token non exposé si email envoyé avec succès
- `create-client-account` : `esc()` appliqué sur le prénom dans le template HTML
- `send-email` : ownership checks IDOR sur `rdv_annule_client` et `staff_notification` (client ne peut notifier que sa propre demande)

**Frontend :**
- `AssignerRdvDialog` : double-submit bloqué par `submitting` state
- `client.flotte.tsx` : React Rules of Hooks corrigé (split layout/content)
- `terrain.index.tsx` : cancellation flag `alive` sur async useEffect

---

## Session 2026-06-05 (23) — Onglet Factures contrat + notifications client complètes

### Plan

- [x] 1. `admin.contrats.$id.tsx` — onglet Factures : remplace placeholder par `FacturesTab` (filtre `contrat_id`, copie pattern `admin.clients.$id`) — build 0 erreur (`e062687`)
- [x] 2. Audit notifications : `valider_vehicule`/`valider_gel`/`refuser_gel` ✅ déjà faits ; `assigner_rdv`/`annuler_rdv_admin`/`modifier_heure_rdv`/`emettre_facture` ❌ manquants
- [x] 3. Migration `20260605010000` — notifications client dans les 4 RPCs manquants, validé en DB (`46eb300`)
- [x] 4. Push branche `claude/izox-fleet-care-resume-yXUX9`

### Review session 23

**Livré :**
- Onglet Factures dans `/admin/contrats/$id` : liste réelle + dialog détail imprimable (FactureDocument). Admin voit tous statuts (brouillons inclus). Filtre `contrat_id`.
- Notifications client complètes : les 4 RPCs (`assigner_rdv`, `annuler_rdv_admin`, `modifier_heure_rdv`, `emettre_facture`) insèrent désormais une `notification_interne` pour le `user_id` client de l'entreprise concernée — exactement comme `valider_vehicule`.

**État notifications client après cette session :**
| Événement | Notification client |
|-----------|---------------------|
| Véhicule validé | ✅ `valider_vehicule` |
| Gel approuvé | ✅ `valider_gel` |
| Gel refusé | ✅ `refuser_gel` |
| RDV confirmé | ✅ `assigner_rdv` (session 23) |
| RDV annulé par IZOX | ✅ `annuler_rdv_admin` (session 23) |
| Horaire RDV modifié | ✅ `modifier_heure_rdv` (session 23) |
| Facture émise | ✅ `emettre_facture` (session 23) |

**Validation empirique :**
- Colonnes SQL `factures.contrat_id` validées en base
- 4 RPCs vérifiés via `pg_get_functiondef` : tous `has_notification=true`, `has_client_uid=true`
- DB vierge (4 comptes tech, 0 client) → test RLS ignoré normalement ; pattern identique à `valider_vehicule` déjà validé en prod

**Reste à faire :**
- [ ] Merge sur `main` + purge DB si besoin

---

## Session 2026-06-05 (22 suite) — Cookies + RSE charts

### Plan

- [x] 1. `legal.tsx` — retrait banner cookie (état, fonctions, JSX), mise à jour section RGPD "Cookies" (seul cookie session Supabase, pas de Matomo, aucun consentement requis)
- [x] 2. `client.impact.tsx` — 4ème hero card CO₂ évité (Zap icon, violet), grille 2×2, équivalences (douches économisées, km voiture évités), CO₂ ajouté à l'AreaChart
- [x] 3. `admin.impact.tsx` — nouvel onglet "Vue globale" (défaut) : 4 KPI cards (interventions, eau, CO₂, clients actifs) + BarChart mensuel interventions + BarChart horizontal eau par client
- [x] 4. `impact.ts` — `fetchGlobalImpactSummary()` + type `GlobalImpactSummary` exportés
- [x] 5. Build 0 erreur + tsc 0 erreur + commit + push (`15e8ab6`)

### Review session 22 suite

**Livré :**
- Cookie banner retiré de tous les portails (était sans objet sur un CRM B2B privé n'utilisant que des cookies techniques essentiels). Section RGPD "Cookies" mise à jour pour refléter la réalité (pas de Matomo, pas d'analytics).
- RSE client : 4ème carte CO₂ (grille 2×2), section équivalences concrètes (X douches, X km voiture), CO₂ dans le graphe AreaChart.
- RSE admin : "Vue globale" avec 4 KPIs + 2 BarCharts (tendance mensuelle + répartition par client). Tab actif par défaut.
- `fetchGlobalImpactSummary()` : agrège toutes les interventions validées tous clients, calcule totaux, timeline mensuelle, top 6 clients par eau économisée.

---

## Session 2026-06-05 (22) — Module facturation admin + liens /legal

### Plan

- [x] 1. `admin.facturation.tsx` — page complète (KPIs brouillons/émises/payées/CA mois, filtres statut+recherche, liste cross-client avec actions Émettre/Payée/Supprimer brouillon, dialog Clôture mensuelle, dialog détail imprimable)
- [x] 2. `AdminSidebar.tsx` — lien "CGV & Confidentialité" dans le footer (avant Déconnexion)
- [x] 3. `ClientNav.tsx` — lien légal discret au-dessus de la bottom nav mobile
- [x] 4. `terrain.index.tsx` — lien légal en bas du tab Profil opérateur
- [x] 5. `izox-legal.ts` — retrait `tvaIntracom` (inutilisé, N/A franchise de base) + marqueurs `TODO_LEGAL` clairs
- [x] 6. Build 0 erreur + tsc 0 erreur + commit + push (`3744c2e`)

### Review session 22

**Livré :**
- Module facturation admin `/admin/facturation` : liste globale toutes factures, 4 KPIs, filtres pills + recherche, actions par statut (Émettre → `emettre_facture` RPC, Payée → UPDATE direct permis par la machine d'états, Supprimer brouillon), dialog Clôture mensuelle (sélection mois/année, liste contrats actifs, `generer_facture` idempotent, rapport résultats créé/vide/erreur), dialog détail/impression réutilisant `FactureDocument`.
- Lien `/legal` dans les 3 portails : AdminSidebar footer, ClientBottomNav (barre discrète au-dessus des tabs), tab Profil terrain.
- `izox-legal.ts` : `tvaIntracom` retiré (franchise de base = pas de N° TVA), marqueurs `TODO_LEGAL` uniformisés.

**Décisions techniques :**
- UPDATE direct `statut='payee' + date_paiement` sur facture émise : permis par `trg_protect_facture_immuable` (seuls les champs métier sont figés, pas statut/date_paiement) + validé par `trg_factures_machine_etats` (emise→payee autorisé si date_paiement non null).
- `snapshot_client.raison_sociale` pour le nom client en liste (pas de join, toujours disponible depuis le snapshot immuable).
- `generer_facture` idempotent : retourne null si 0 prestation validée, UUID si créée ou existante.

**À faire avant production :**
- Remplacer les `TODO_LEGAL` dans `izox-legal.ts` par les vraies valeurs SIRET/adresse/IBAN une fois la société créée.

---

## Session 2026-06-05 (21) — Correctifs UI (lot 3) + fix CORS reset MDP

### Plan

- [x] 1. `login.tsx` — texte titre/sous-titre aligné à gauche + flèche verte `CornerDownLeft` après "sans friction." ; logo **recentré** (`mx-auto`) et agrandi (`h-[72px]/sm:h-24`)
- [x] 2. `admin-reset-password` (edge function) — **CORS dynamique** (`corsFor(req)`) reflétant `izox.fr` + tout `*.vercel.app`. Déployé v15.
- [x] 3. `admin.clients.$id.tsx` + `EditEntrepriseDialog.tsx` — bouton MDP retiré du header (corrige le débordement horizontal) → déplacé dans le dialog "Modifier" (section "Mot de passe du client → Réinitialiser")
- [x] 4. `admin.clients.$id.tsx` — boutons d'action sortis du `PageHeader` vers le conteneur de contenu → mêmes bords gauche/droit que les cartes. Mobile : grille `[1.6fr_1fr]` (Ajouter + Modifier) + Archiver pleine largeur. Desktop : ligne alignée à droite.
- [x] 5. Build 0 erreur + commits + push (`d5bdabc`, `4c1a1cb`)

### Contexte décisions / cause racine
- **Cause racine bouton MDP en erreur** : `admin-reset-password` utilisait un CORS statique `Access-Control-Allow-Origin: SITE_URL` (= `izox.fr`). Servie depuis un domaine `*.vercel.app`, l'OPTIONS preflight passait (200) mais le navigateur **bloquait le POST** (origine non concordante). Preuve dans les logs edge : que des OPTIONS, jamais de POST. Fix mirror du pattern `request-password-reset`. **Confirmé fonctionnel par l'utilisateur** (email reçu côté client).
- **Logo login** : seul le texte devait être à gauche, le logo reste centré (correction du lot précédent qui avait tout aligné à gauche).

---

## Session 2026-06-05 (20) — Correctifs UI (lot 2)

### Plan

- [x] 1. `login.tsx` — hero blanc (bg-background) + tagline "Une flotte propre, sans friction." sous le logo
- [x] 2. `admin.index.tsx` + `page-header.tsx` — StatTile `h-full` pour égaliser la hauteur des 4 KPI cards
- [x] 3. `admin.clients.$id.tsx` — boutons : 3 en ligne (Ajouter / Modifier / MDP toujours visible) + Archiver en barre pleine largeur dessous ; explication disabled quand contrat actif
- [x] 4. `PlanningCalendar.tsx` — `goToday()` bascule aussi en vue "Jour" pour rendre le clic visible
- [x] 5. Build + commit + push

### Contexte décisions
- **Archiver désactivé** : volontaire — `disabled={nbContratsActifs > 0}` → résilier le contrat d'abord. Info affichée dans le titre du bouton.
- **Bouton MDP** : envoie un email via edge function `admin-reset-password`. Le texte "MDP" était caché sur mobile → toujours visible (puis déplacé dans le dialog Modifier en session 21).
- **Planning "Aujourd'hui"** : bug UX — si déjà sur la semaine courante en vue Semaine, le clic ne changeait rien visuellement. Fix : bascule en vue Jour pour que la journée soit bien visible.

---

## Session 2026-06-05 (19) — Phase C : Factures & Documents (B3)

**Constat audit** : aucun bouton "télécharger facture" n'existe (mémoire user erronée).
Seulement des onglets "Factures" placeholder "Bientôt disponible" (admin.clients.$id,
admin.contrats.$id). Backend prêt (RPC generer_facture/emettre_facture, snapshots, RLS client).
**Décision archi** : fusionner Factures dans Documents côté client (Option B validée user).
**Décision légale IZOX** : placeholders marqués TODO (Option A validée user).
**Point fiscal** : franchise de base (art. 293 B CGI) → TVA non applicable, HT = TTC. Ne pas suivre le mockup (20%).

### Plan

- [x] 1. `src/lib/izox-legal.ts` — constante IZOX_LEGAL (placeholder SIRET/adresse/IBAN, marqué TODO)
- [x] 2. `src/lib/factures.ts` — types snapshots + helpers (formatEuro, formatPeriode, formatDateFr, STATUT_FACTURE config)
- [x] 3. `src/components/factures/FactureDocument.tsx` — facture imprimable partagée (client + admin)
- [x] 4. `src/routes/client.factures.$id.tsx` — page détail (fetch RLS-scoped + lignes, bouton Imprimer → window.print)
- [x] 5. `src/routes/client.factures.tsx` → layout pur `<Outlet/>` (éviter le bug redirect parent→enfant)
- [x] 6. `src/routes/client.factures.index.tsx` — redirect /client/factures → /client/documents
- [x] 7. `src/routes/client.documents.tsx` — refonte : sous-onglets Factures | Autres docs (liste réelle DB)
- [x] 8. `src/components/client/ClientNav.tsx` — retirer "Factures" → grid-cols-4
- [x] 9. `src/routes/admin.clients.$id.tsx` — onglet Factures = liste réelle + détail en Dialog (FactureDocument)
- [x] 10. `src/styles.css` — `@media print` (n'imprimer que la facture)
- [x] 11. `npm run build` (régénère routeTree.gen.ts) → 0 erreur TS · tsc --noEmit 0 erreur
- [x] 12. Validation empirique : fixture (entreprise + contrat pro 5% + remise commerciale 10% + 4 interventions validées), générer + émettre → FA-B2B-2026-000001, RLS client (1 émise visible, 0 brouillon) + admin (2 dont brouillon), puis purge complète (tout à 0, users=4, triggers réactivés)
- [ ] 13. Commit + push

### Review session 19

**Livré (B3 — Factures & Documents) :**
- Page détail facture client `/client/factures/$id` (mockup invoice.jsx adapté au régime réel).
- Fusion Factures → Documents côté client (Option B) : `/client/documents` avec sous-onglets Factures | Autres docs. `/client/factures` redirige (layout+index pour ne pas casser `$id`). Nav client 5→4 items.
- Onglet Factures admin (`/admin/clients/$id`) : liste réelle + détail imprimable en Dialog (réutilise `FactureDocument`).
- Impression : `window.print()` + `@media print` (n'imprime que `.facture-print-root`). Pas de dépendance PDF (le navigateur fait "Enregistrer en PDF").

**Décisions :**
- Régime fiscal **franchise de base** (art. 293 B CGI) respecté : TVA non applicable, HT=TTC. Le mockup (TVA 20%) volontairement ignoré.
- Infos légales IZOX = placeholders marqués TODO dans `src/lib/izox-legal.ts` (Option A user) → **à remplacer par les vraies valeurs avant émission réelle**.

**Preuves empiriques :** facture FA-B2B-2026-000001 générée (334,31 € TTC), lignes prestation/remise palier/remise commerciale conformes, snapshots cohérents avec les types TS, RLS client/admin validés positif+négatif, purge vérifiée.

---

## Session 2026-06-04 (18) — Audit sécurité complet + Phase B

### Audit & correctifs sécurité ✅ TERMINÉ

- [x] **CRITIQUE** : `seed-users` — endpoint public `verify_jwt=false` avec mot de passe admin hardcodé `Izox2026!` → désactivé (410 Gone), redéployé v4 immédiatement. DB vérifiée : 4 comptes légitimes seulement, zéro exploitation.
- [x] **CORS `*`** sur 6 edge functions → remplacé par `SITE_URL` (statique pour les fonctions authentifiées, dynamique + validation `Origin` pour `request-password-reset`)
- [x] **XSS email templates** — `send-email` : ajout `esc()` (HTML-escape) sur toutes les valeurs user-controlled injectées dans les templates HTML
- [x] **Open redirect** — `redirect_to` dans 3 fonctions (`request-password-reset`, `admin-reset-password`, `create-client-account`) → validé par `safeRedirectTo()` (whitelist origin)
- [x] **robots.txt** — créé avec blocage complet : `Disallow: /` global + blocage explicite de 20 crawlers IA (GPTBot, Claude, CCBot, etc.)
- [x] **vercel.json** — ajout headers sécurité : `X-Robots-Tag`, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-XSS-Protection`
- [x] **`__root.tsx`** — meta robots : `noindex, nofollow, noarchive, nosnippet` + blocage crawlers IA en meta tags
- [x] Déploiement 6 edge functions sécurisées (send-email v13, request-password-reset v6, admin-reset-password v13, create-client-account v16, geocode-address v2, compute-impact v4)
- [x] `npm install` + `npx tsc --noEmit` → 0 erreur

### Phase B — Code nouveau ✅ TERMINÉ (commit `65de7d0`)

- [x] **B1. RGPD/CGV** `/legal` — route créée, 2 onglets, sidebar 220px smooth-scroll, 8 sections CGV + 8 RGPD, bloc acceptation localStorage `izox_cgv_accepted`, bannière cookies localStorage `izox_cookie_consent`
- [x] **B2. Demandes RDV split view** — `DemandesRdvList.tsx` refactorisé : filter pills, split 40%/60%, `DemandesRdvMap.tsx` (Leaflet markers colorés par statut, hover → pin actif + zoom + popup), logique métier/dialogs intacts

### Review session 18

**Sécurité :** 1 faille critique neutralisée (`seed-users` public + mdp hardcodé), CORS hardened sur 6 fonctions, XSS email templates corrigé, open redirect bloqué, triple défense anti-crawlers IA.

**Phase B :** B1 + B2 livrés, build 0 erreur, TS 0 erreur. `routeTree.gen.ts` régénéré par le build (pattern confirmé : créer la route, lancer le build, TS passe).

---

## Session 2026-06-04 (17) — Handoff v2 : 5 nouveaux écrans

**Handoff reçu** : `IZOX-handoff-v2/` (commité). 5 écrans : Planning board, Carte, Demandes RDV split view, 2FA, RGPD/CGV.

**Stratégie décidée avec l'utilisateur** : d'abord **finir le correctif visuel** (refonte des pages déjà fonctionnelles), PUIS le **code nouveau** (pages/features inédites).

### Classification des 5 écrans

| Écran | Nature | Existant | Phase |
|-------|--------|----------|-------|
| **2FA** `/settings/security/2fa` | Refonte visuelle pure (logique TOTP intacte) | `TwoFactorSetup.tsx` (523 l, otpauth+qrcode fonctionnels) | **Visuel** |
| **Planning board** `/admin/planning` | Refonte visuelle + states (dnd-kit déjà là) | `PlanningCalendar` | **Visuel** |
| **Carte** `/admin/planning/map` | Refonte layout tripartite (Leaflet déjà là) | `RouteMap.tsx` (268 l) | **Visuel** (+ panel léger) |
| **RGPD/CGV** `/legal` | Page nouvelle (statique, contenu fourni) | ❌ n'existe pas | **Code nouveau** |
| **Demandes RDV** split view | Page + 2e Leaflet + modal refondu | redirection seule | **Code nouveau** (le + lourd) |

### Phase A — Correctif visuel ✅ TERMINÉ (commit `dbfa00e`)

- [x] **Cartographie fine** (agents parallèles) : PlanningCalendar, RouteMap, TwoFactorSetup, design tokens styles.css
- [x] **A1. 2FA** — refonte visuelle `TwoFactorSetup.tsx` : cartes méthode radio, QR cadre blanc, OTP 14×12 mono, animations checkPop/drawCheck/shake, AnimatedCheck SVG, grille codes de secours 2 colonnes, note sécurité. Logique TOTP intacte.
- [x] **A2. Planning board** — refonte `PlanningCalendar` : HalfDayBlock (matin/après-midi), InterventionCard border-left 3px couleur opérateur, EmptySlot dashed, OperatorColumn header avatar+barre de charge, vue semaine/jour, statut pills + pack labels. Business logic intacte.
- [x] **A3. Carte** — layout tripartite `RouteMap` : drawer gauche 220px (opérateur + légende + km), map flex-1 (pins teardrop, polylines pointillées, opacité sélection), panel droit 280px (liste défilante + KM total + bouton "Valider la tournée" UI-only). Business logic intacte.
- [x] `styles.css` : soft tints (success/warning/info/destructive-soft) + keyframes checkPop/drawCheck/shake/stripeMove/pulseDot
- [x] Build TS 0 erreur · `npm run build` OK
- [x] Commit + push

### Données de test générées ✅ (2026-06-04)

- [x] Opérateur : `adfda534` color_hex=#2A6FDB, linked user_id operateur.test@izox.fr
- [x] Client : auth user `client.test@izox.fr` (id: `b1000000`) · profile Jean Dupont
- [x] Entreprise : Cabify Paris (`e1000000`)
- [x] Contrat : CTR-2026-001 (`c1000000`)
- [x] Véhicules : AB-123-CD, DE-456-FG, GH-789-IJ, KL-012-MN
- [x] Interventions : 8 sur la semaine (2026-06-02→05) avec GPS Paris · 4 statuts différents · tous types de pack
- [x] Demandes RDV : 2 en_attente + 1 confirmee (liée intervention) + 1 refusee avec motif
- [x] RPC `get_creneaux_disponibles` validé : slots 04/06 saturés (2/2), slots 05/06 disponibles (1/2)

### Phase B — Code nouveau (APRÈS validation Phase A)

- [ ] **B1. RGPD/CGV** `/legal` — nouvelle route, 2 onglets, sidebar sections smooth-scroll, contenu CGV/RGPD fourni, bloc acceptation, bannière cookies localStorage
- [ ] **B2. Demandes RDV split view** — décision archi (sous-onglet vs page dédiée), table + Leaflet temps réel hover, modal assignation rapide

### Décisions en suspens (à trancher avec l'utilisateur avant Phase B)

- Demandes RDV : sous-onglet `/admin/planning` (cohérent fusion session 3) **vs** vraie page `/admin/demandes-rdv` (fidèle handoff)
- « Valider la tournée » : état UI local **vs** persistance `interventions.ordre` (migration)
- Acceptation CGV : `localStorage` **vs** colonne `profiles.cgv_accepted_at`
- Backlog #1 (factures `/client/factures/$id`) : avant ou après le handoff v2 ?

---

## Session 2026-06-04 (16) — Complétion refonte visuelle (pages admin oubliées)

**Constat** : audit empirique du code (pas du todo) → 3 pages admin majeures jamais refondues
lors des sessions 14-15 (jamais listées dans la Phase 2). Client ✅ et terrain ✅ étaient bien faits
(faux positifs grep = chiffres de stats / logos PDF). Designs présents dans le handoff :
`admin-ops.jsx → A_Contrats` + `impact-admin.jsx`.

- [x] `admin.contrats.tsx` → `PageHeader` + 4 `StatTile` (actifs, MRR, gel, résiliés calculés depuis données) + filtres pills + table redesign (raw table, statut en pills tokens) + cards mobiles restylées
- [x] `admin.contrats.$id.tsx` → `PageHeader` (crumbs + numéro + entreprise) + statut pill + Retour, wrapper contenu `p-6 lg:p-8`, lien client préservé
- [x] `admin.impact.tsx` → `PageHeader` + layout `flex flex-col min-h-full` + table coeff header uppercase/tracking + shadow-card (Tabs conservés — KPIs eau/CO₂ non ajoutés car nécessiteraient nouvelles requêtes = hors périmètre CSS-only)
- [x] `login.tsx` → titres `font-semibold` → `font-bold tracking-tight` (poids display tokens ; Outfit déjà via `@layer base`)
- [x] `settings.*` → vérifié : déjà cohérent (h1 Outfit via base layer + Card tokens + layout cross-rôle intentionnel) → pas de churn
- [x] `npx tsc --noEmit --skipLibCheck` → 0 erreur · `npm run build` → OK
- [x] Commit + push

### Review session 16

**Périmètre** : refonte purement visuelle des pages admin restantes. **Zéro logique métier touchée** —
RPCs, appels Supabase, handlers (gel, résiliation, validation impact, dialogs) intacts. Uniquement
classes CSS / structure JSX de présentation.

**Méthode** : mirroring des patterns déjà éprouvés (`admin.clients.tsx` pour la liste, `admin.clients.$id.tsx`
+ `admin.interventions.$id.tsx` pour les fiches détail) + fidélité aux maquettes handoff.

**Leçon clé** : les heuristiques grep (`font-display`, `text-3xl font-bold`) donnent des faux
signaux car `@layer base` applique déjà Outfit à tous les `h1-h4`. Vraie rupture = absence de
`PageHeader` parmi des pages sœurs qui l'utilisent (contrats + impact), pas le poids de police.

---

## Session 2026-06-03 (13) — Audit complet + correctifs sécurité + inventaire design

- [x] Audit code complet (79 points : 5 critiques, 28 importants, 46 mineurs)
- [x] Inventaire pages/fonctions/boutons 3 portails (brief Claude Design)
- [x] Fix CRITIQUE : `rdv_modifie` absent de `send-email` edge function (email replanification silencieusement cassé)
- [x] Fix SÉCURITÉ : `send-email` sans vérification de rôle → client peut spammer staff
- [x] Fix IMPORTANT : upload photo terrain sans validation MIME
- [x] Régénérer types Supabase (éliminer `as any` casts sur `operators`, RPCs typés)
- [x] Deploy edge function `send-email` v11
- [x] Commit + push

### Review session 13 — Merge sur main

**Commits :**
- `1f9e967` fix: audit sécurité — rdv_modifie email, rôle send-email, MIME photos, casts as any
- `3bb6ff1` docs: inventaire complet pages + brief Claude Design + lessons session 13

**Résumé corrections :**
- Bug critique `rdv_modifie` : email replanification absent du switch send-email depuis session 8 → silence fallback default error
- Sécurité : vérification `profiles.role` dans send-email, client limité à 2 types autorisés
- Important : validation MIME `file.type.startsWith("image/")` avant upload photo terrain
- Casts `as any` éliminés : operators + 3 RPCs (AssignerRdvDialog, PlanningCalendar, RouteMap, admin.interventions.$id)
- `routeTree.gen.ts` régénéré : route `terrain.index` était manquante localement
- Brief complet pour Claude Design : `tasks/inventory-design-brief.md` (3 portails, matrices miroirs, statuts visuels)

**État merge :** build TS 0 erreur, tests edge function déployée, codebase prête refonte

---

## Session 2026-06-03 (12) — Refonte onglets opérateur terrain

- [x] 1. Migration DB `20260603050000` : colonne `telephone_intervention` + table `operateur_observations` + RPCs mis à jour
- [x] 2. Régénérer types TypeScript Supabase
- [x] 3. `CreerDemandeRdvDialog` : champ téléphone obligatoire pré-rempli
- [x] 4. `terrain.tsx` : refonte complète 4 onglets (Planning / Interventions / Suivi / Profil)
- [x] 5. `AssignerRdvDialog` : afficher téléphone dans la section lieu
- [x] 6. Validation empirique DB + build TS
- [x] 7. Commit + push + deploy

---

## Session 2026-06-03 (12b) — Correctifs post-tests manuels (audit liaisons)

- [x] Audit complet des 8 points signalés + preuve par timestamps en base
- [x] **Quota (P1)** : faux bug confirmé (annulation #2 → 59 s avant #3). Durci quand même : `creer_demande_rdv` vérifie le quota sur le **mois des créneaux demandés** (au lieu de `NOW()`)
- [x] **Verrou heure (P2)** : `modifier_heure_rdv` bloque si RDV daté jour J/passé OU intervention `en_cours`. Bouton admin masqué sauf `planifiee` future
- [x] **Fiche admin (P4)** : compte-rendu (contrôle/photos/checklists/notes/signature) masqué tant que la prestation n'est pas faite (`en_revision`/`validee`/`refusee`)
- [x] **Suivi vide (P8)** : cause racine = pas de policy RLS `operateur` sur `entreprises`. Policy ajoutée (entreprises liées à ses interventions)
- [x] **Verrou serveur (P5)** : `prendre_en_charge_intervention` refuse le démarrage avant l'heure de déverrouillage (date+heure, fuseau Europe/Paris)
- [x] Tests DB empiriques (impersonation admin/operateur/client) : 6 scénarios validés, données restaurées
- [~] **P3 (email annulation)** : déjà envoyé — retravail global des mails reporté (décision user)
- [x] **P7 (clic onglet Interventions)** : cause racine trouvée — même bug que admin.interventions (session 8). `terrain.tsx` = page pleine sans `<Outlet/>`. Fix : `terrain.tsx` → layout pur, contenu → `terrain.index.tsx`
- [x] P6 (photos/observations opérateur) : déjà présent dans le stepper terrain — rien à faire

---

## Session 2026-06-03 (12c) — Fix routing terrain + purge DB

- [x] Cause root bug clic interventions : `terrain.tsx` sans `<Outlet/>` → fiches `terrain.intervention.$id` ne s'affichaient pas
- [x] Fix : `terrain.tsx` → layout `<Outlet/>` pur, `terrain.index.tsx` → contenu du dashboard opérateur (même pattern admin.interventions)
- [x] Purge DB : 0 demandes_rdv, 0 interventions, 0 logs (5 comptes + 1 entreprise + 1 véhicule + 1 contrat conservés)
- [x] Commit + push
- [x] todos.md + lessons.md mis à jour
- [ ] **Merge branch** `claude/izox-fleet-care-dev-h1D0G` → `main`

---

## 🎨 PROCHAINE SESSION — Refonte visuelle complète (design handoff disponible)

**Fichiers de référence :** `refonte design izox/IZOX-handoff/` (28 fichiers JSX dans le repo main)

### Ordre d'implémentation recommandé

#### Phase 1 — Design system (tokens + composants atomiques) ✅ SESSION 14
- [x] Lire `izox2/tokens.jsx` → extraire les variables CSS (couleurs, typo, espacements, radius)
- [x] Lire `izox2/brand.jsx` → vérifier cohérence avec `tailwind.config` et CSS variables actuelles
- [x] Lire `izox2/atoms.jsx` + `izox2/shell.jsx` + `izox2/system.jsx` → composants Button, Badge, Card, Layout
- [x] Mettre à jour `src/styles.css` (CSS variables) pour matcher les tokens du design
  - Palette complète hex (#F9FAFB paper, #1B4332 brand, sémantiques ok/warn/danger/info)
  - Sidebar blanche (bg white, accents verts, item actif #E7EFEA)
  - Shadows design (elegant/card/strong)
  - Radius : r4=8px(md) / r6=10px(lg) / r10=14px(xl)
  - Ajout info color (#2A6FDB)
- [x] Google Fonts : ajout Outfit (700/800 headings)
- [x] `@layer base` : h1-h4 → Outfit, `.font-display`, `.font-mono`
- [x] `AdminSidebar` : indicateur barre gauche item actif + opacités nav alignées
- [x] `Card` : rounded-xl → rounded-lg (r6=10px) + shadow-card

#### Phase 2 — Portail Admin ✅ SESSION 15
- [x] `admin.index` → Dashboard `PageHeader` + `StatTile` (KPIs live)
- [x] `admin.clients` + `admin.clients.$id` → PageHeader, filtres pills, table redesign
- [x] `admin.planning.index` → PageHeader + sous-onglets recalibrés
- [x] `admin.vehicules` + `admin.vehicules.$id` → PageHeader
- [x] `admin.demandes-gel` → PageHeader + filtre statut en right slot
- [x] `admin.equipe` + `admin.facturation` → PageHeader + empty states stylisés
- [x] `admin.interventions.$id` → PageHeader (immat + contexte) + Retour
- [x] Composant `PageHeader` + `StatTile` créé (`src/components/ui/page-header.tsx`)

#### Phase 3 — Portail Client (desktop + mobile) ✅ SESSION 15
- [x] `client.index` → date header, hero sombre, StatCards, PalierCard
- [x] `client.flotte` + `client.flotte.$id` → filtres pills, MFleetRow cards, gel tokens
- [x] `client.factures` + `client.documents` → empty states icon-block
- [x] `MesPrestationsPage` → header + RDV en right slot
- [x] `ClientNav` (header + bottom nav) → fond clair, accents verts

#### Phase 4 — Portail Terrain ✅ SESSION 15
- [x] `terrain.index` → hero `bg-foreground`, typo Outfit, badges design tokens

#### Phase 5 — Composants transversaux ✅ SESSION 15
- [x] `client.impact` → header redesign, hero cards
- [x] États vides homogénéisés (icon-block + texte descriptif)

### Règles impératives pour la refonte
- **Ne jamais modifier la logique métier** : uniquement CSS classes, layout, composants UI. Les RPCs, Supabase calls, et hooks restent intacts.
- **Vérifier le build TS après chaque phase** : `npx tsc --noEmit --skipLibCheck`
- **Toujours garder la responsivité** : mobile-first, breakpoint `md:` pour desktop
- **Pas de régression fonctionnelle** : tester visuellement chaque page modifiée avant de passer à la suivante

### Review — Refonte visuelle (Sessions 14-15)

**Périmètre :** refonte purement visuelle des 3 portails (admin / client / terrain) à partir du
handoff `refonte design izox/IZOX-handoff/izox2/`. **Zéro modification de logique métier** —
uniquement classes CSS, layout et composants UI. RPCs, appels Supabase et hooks intacts.

**Livré :**
- Phase 1 (design system) : tokens CSS, fonts Outfit/Inter/JetBrains Mono, sidebar claire, shadows, radius
- Phase 2 (admin) : `PageHeader` + `StatTile` généralisés sur 10 pages admin
- Phase 3 (client) : dashboard, flotte, prestations, factures, documents — mobile-first
- Phase 4 (terrain) : hero + typo alignés tokens
- Phase 5 (transversal) : impact RSE, états vides homogènes

**Vérifications :**
- `npx tsc --noEmit --skipLibCheck` → 0 erreur à chaque phase
- Commits incrémentaux par phase sur `claude/izox-visual-redesign-QRnfC`
- Aucun appel DB / RPC touché → pas de validation empirique base requise (CSS/UI uniquement)

**Commits clés :** `058dcb9`, `b116f54`, `1850c97`, `dac2c24`, `5f49754`

---

## Backlog actif

- [ ] **#TechDebt — Nominatim → API cartographique SLA** : Nominatim (OSM) sans garantie de SLA, limité à 1 req/s. Prévoir migration vers Mapbox Geocoding API ou Google Maps Geocoding API quand le volume le justifie.
- [ ] **Carte interactive** : optimisation tournée (nearest-neighbor + bouton « Optimiser ») à faire quand plusieurs opérateurs.
- [ ] **Migration domaine `izox.fr`** : mettre à jour `SITE_URL` env var Supabase + vérifier que `/reset-password` reste dans les redirect URLs.
- [ ] **Lier nouveaux opérateurs** : quand un 2e opérateur est créé, ajouter `user_id` dans `operators` via migration ou UI admin.

---

## Historique sessions

### Session 2026-06-03 (12c) — Fix routing terrain + purge DB
- Bug racine clic interventions : `terrain.tsx` pleine page sans `<Outlet/>` → pattern identique au bug admin.interventions (session 8)
- Fix : split `terrain.tsx` (layout pur) + `terrain.index.tsx` (dashboard)
- Purge DB complète : demandes_rdv, interventions, logs vidés — 5 comptes + données entreprise conservés

### Session 2026-06-03 (11) — Correctifs bugs terrain post-déploiement
- Migration `20260603040000` : RLS `vehicules_operateur_select` + contrainte "1 en_cours à la fois" dans RPC
- `terrain.tsx` : `AvenirCard` cliquable (fiche planifiée), `todayCount` corrigé, `hasEnCours` désactive le CTA
- Reset DB test : 2 interventions repassées en `planifiee`
- CLAUDE.md : règle "Validation empirique obligatoire" + lessons.md mis à jour

### Session 2026-06-03 (10) — Compte opérateur fonctionnel + redesign terrain
- **Fix critique** : liaison `operators.user_id → auth.users` — interventions planifiées désormais visibles par l'opérateur terrain
- Migration `20260603030000_operateur_liaison.sql` : `user_id` sur `operators`, RLS interventions + photos + storage mis à jour
- RPC `prendre_en_charge_intervention()` : `planifiee → en_cours` + `operateur_id = auth.uid()`
- `terrain.tsx` refonte complète : hero sombre + stats live, section "À venir" (planifiées), section "En cours" (auto-refresh 30s), bottom nav 4 onglets (Recherche / En cours / Histoire / Profil), tab Profil
- `terrain.intervention.$id.tsx` refonte : vue planifiée (date/lieu + CTA), header enrichi (#ID · client · pack), stepper avec labels, zones avec badge ok/à faire, compteurs checklists
- `interventions.ts` : 6 zones extérieures, checklists simplifiées client-facing, `typeScope()` ajouté

### Session 2026-06-03 (9) — Créneaux RDV + GPS/Carte
- Formulaire client : 2 créneaux min sur jours différents (`hasSameDayCreneaux`, init 2 créneaux vides)
- RPC `get_creneaux_disponibles` : capacite_totale = COUNT(operators)*2, multi-opérateurs ready
- Guard race condition dans `creer_demande_rdv` : exception SQL si tous créneaux saturés au submit
- Calendar grise dates full-saturées ; RadioGroup grise demi-journée saturée
- Edge function `geocode-address` déployée (Nominatim, JWT, fire-and-forget)
- `creer_demande_rdv` + `assigner_rdv` : stockent et propagent latitude/longitude
- `AssignerRdvDialog` : badge ⚠️ + bouton "Géocoder" si latitude IS NULL
- `RouteMap` : centre adaptatif (dernier GPS DB → Paris fallback, plus de hardcoding)

### Session 2026-06-03 (8) — Fiches cliquables + replanification heure RDV
- Fix routing TanStack : `admin.interventions.tsx` → layout `<Outlet/>` + `admin.interventions.index.tsx` → redirect. Fiches et blocs board maintenant cliquables.
- RPC `modifier_heure_rdv` : replanification heure uniquement (créneau verrouillé), propage aux interventions, bloque si `validee`, logge dans `admin_actions_log`
- `GererRdvConfirmeDialog` remplace `AnnulerRdvAdminDialog` (replanifier OU annuler en un seul dialog)
- Edge function `send-email` v9 + type `rdv_modifie` dans `email.ts`
- Bouton "Modifier l'horaire" sur fiche intervention → redirige vers la demande via `useAutoOpenFromSearch`
- Tests DB complets : flow 08:30→09:30→11:00 + 3 garde-fous validés, DB nettoyée

### Session 2026-06-02 (7) — Annulations RDV + planning responsive
- `PasswordInput` (œil) sur login, recovery, reset-password, ChangePasswordDialog
- Fix heure "02:00" : `assigned_heure` au lieu du composant horaire de `date_confirmee`
- Migration : `annuler_rdv_client` (règle 48h) + `annuler_rdv_admin` (sans délai) + statuts `annulee_admin`/`annulee`
- Emails `rdv_annule_client` (→ admin) + `rdv_annule_admin` (→ client), edge function déployée v7
- Client : annulation RDV confirmé avec motif obligatoire + désactivé < 48h
- Admin : cartes confirmées cliquables → `AnnulerRdvAdminDialog`
- `PlanningCalendar` : suppression drag, cellules cliquables, mobile = vue jour / desktop = grille
- Interventions : statut `annulee` (label/couleur + filtre dédié, exclu de "tous")

### Session 2026-06-02 (6) — UX + quota + planning board
- Fix "Demande introuvable" : `DetailDemandeRdvDialog.tsx` (supprimer `refus_motif`)
- Dashboard client : cartes "Prochain RDV" + "Dernière prestation" (requêtes + liens)
- Migrations : quota mensuel enforced (`creer_demande_rdv`) + capacité 3→2 + contrat_ligne_id (`assigner_rdv`)
- Fiche véhicule : quota mensuel affiché (X/Y passages ce mois)
- `AssignerRdvDialog` : supprimer badges 0/3 + dropdown heure 30 min
- `PlanningCalendar` : board horizontal, 4 sous-créneaux, fix immat "—"

### Session 2026-06-02 (5) — Corrections post-tests manuels
- `AssignerRdvDialog` : calendrier libre → sélection créneaux client + heure précise
- `interventions.ts` : statut `'planifiee'` ajouté
- `InterventionsListPanel` : badges corrigés, filtre "Planifiées", créneau affiché
- `admin.interventions.$id` : section Planification (opérateur + créneau + heure + lieu)
- `PlanningCalendar` : blocs cliquables → détail
- Migration : `heure_intervention TIME` + `assigned_heure TIME` + `assigner_rdv` mis à jour

### Session 2026-06-02 (4) — Lieu d'intervention end-to-end
- Colonnes adresse sur `demandes_rdv` + `interventions`
- `creer_demande_rdv` : 3 champs lieu obligatoires
- `assigner_rdv` : propagation adresse → interventions
- `AssignerRdvDialog` : lieu affiché, `AdminDemandeRdv` centralisé
- `CreerDemandeRdvDialog` : champs lieu pré-remplis depuis entreprise
- Types Supabase régénérés

### Session 2026-06-02 (3) — Onglet Planning unifié
- Fusion 3 onglets → `/admin/planning` (Demandes / Planning board / Interventions)
- Redirections compat `/admin/rendez-vous`, `/admin/interventions`, `/admin/demandes-rdv`
- Un seul opérateur dans `operators` (label neutre)
- `InterventionsListPanel` extrait en composant réutilisable

### Session 2026-06-02 (2) — Gel véhicule admin + purge
- RPCs `geler_vehicule_admin` / `annuler_gel_vehicule_admin`
- `GelerVehiculeAdminDialog`, card état gel sur fiche véhicule
- Purge données test (gardé 5 comptes + entreprise client)

### Session 2026-06-02 (1) — Audit & bugfix complet
- Prix V2 migrés (catalogue DB + frontend en sync)
- Montants facture recalculés dynamiquement
- Routes admin-only sécurisées avec `RoleGuard`
- Lien "Retour" `/settings` dynamique via `rolePath()`

### Sessions précédentes
- Resend via edge functions (SMTP natif cassé)
- Page `/reset-password` dédiée
- `isRecovery` centralisé dans `auth-context.tsx`
