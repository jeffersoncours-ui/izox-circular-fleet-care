# Todo — IZOX

## Session 8 (en cours) — Fiches cliquables + replanification heure RDV

Bugs signalés (screens mobile admin) :
1. Sous-onglet Interventions : fiches non cliquables.
2. Board planning visuel : blocs RDV non cliquables.
3. Impossible de redécaler l'heure d'un RDV confirmé (clic = annulation seule).

Cause racine #1+#2 : `admin.interventions.tsx` (redirect beforeLoad) est le
parent de `admin.interventions.$id.tsx` → le redirect s'exécute pour le détail.

- [x] Audit complet (routing + RPC + edge function + état DB)
- [x] Fix routing : `admin.interventions.tsx` → layout `<Outlet/>` + redirect déplacé dans `admin.interventions.index.tsx`
- [x] RPC `modifier_heure_rdv(p_demande_id, p_heure)` (admin/staff, créneau verrouillé, propage aux interventions)
- [x] Email `rdv_modifie` (→ client) : edge function v9 + `email.ts`
- [x] Dialog `GererRdvConfirmeDialog` (replanifier heure OU annuler) → remplace `AnnulerRdvAdminDialog`
- [x] Bouton "Modifier l'horaire" sur fiche intervention (admin, statut planifiee/en_cours) → ouvre la demande
- [x] Régénérer types Supabase + `tsc` (clean) + build (OK)
- [x] Tests réels : véhicule + demande client + assigner + replanifier (08:30→09:30→11:00) + garde-fous (hors plage, non-admin)
- [ ] Commit + push

### Review session 8
- **Cause racine fiches non cliquables** : `admin.interventions.tsx` portait un
  `beforeLoad` redirect, et comme `admin.interventions.$id.tsx` en était l'enfant,
  le redirect s'exécutait aussi pour le détail → retour planning instantané.
  Corrigé en séparant layout (`<Outlet/>`) et index (redirect), comme `admin.planning.*`.
- **Replanification** : nouveau RPC `modifier_heure_rdv` — verrouille date + créneau,
  ne change que l'heure, propage à toutes les interventions liées non validées/annulées,
  bloque si une intervention est déjà validée, notifie le client (`rdv_modifie`).
- **Tests DB** (auth.uid() simulé via `request.jwt.claims`) : flow complet OK +
  3 garde-fous validés. DB re-nettoyée après tests (0 demandes/interventions/véhicules).

---

## Backlog actif

- [ ] **Formulaire client — 2 créneaux minimum** : `CreerDemandeRdvDialog` imposer min. 2 créneaux sur jours différents + message explicatif. Actuellement 1 créneau suffit, ce qui prive l'admin de flexibilité. Modifier `canSubmit` : `creneauxRemplis.length >= 2` + validation dates différentes.
- [ ] **Créneaux saturés côté client** : lors de la sélection des créneaux, masquer ou griser les dates/créneaux déjà à 3/3 interventions planifiées pour l'opérateur disponible.
- [ ] **GPS / géolocalisation** : colonnes `latitude`/`longitude` existent sur `demandes_rdv` et `interventions` — géocodage via Nominatim à câbler dans `creer_demande_rdv` ou via un trigger, propagation vers les interventions via `assigner_rdv`.
- [ ] **Carte interactive** : `RouteMap` (`/admin/planning/map`) toujours vide (lat/lon jamais alimentées). Une fois GPS câblé : afficher les points, optimisation de tournée (regroupement par zones proches), bouton « Optimiser », drag-drop sur carte.
- [ ] **Refonte visuelle Claude Design** : migration écran par écran, garder les contrats de données (mêmes RPCs, mêmes champs), vérifier les invariants `lessons.md` à chaque écran.
- [ ] **Migration domaine `izox.fr`** : mettre à jour `SITE_URL` env var Supabase + vérifier que `/reset-password` reste dans les redirect URLs.

---

## Historique sessions

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
