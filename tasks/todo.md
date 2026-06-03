# Todo — IZOX

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

## Backlog actif

- [ ] **#TechDebt — Nominatim → API cartographique SLA** : Nominatim (OSM) sans garantie de SLA, limité à 1 req/s. Prévoir migration vers Mapbox Geocoding API ou Google Maps Geocoding API quand le volume le justifie.
- [ ] **Carte interactive** : optimisation tournée (nearest-neighbor + bouton « Optimiser ») à faire quand plusieurs opérateurs.
- [ ] **Refonte visuelle Claude Design** : ✅ compte opérateur terminé (session 10). Reste : côté admin + client.
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
