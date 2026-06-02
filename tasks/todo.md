# Todo — IZOX

## Session 2026-06-02 (7) — Annulations RDV + planning responsive

- [x] Bloc 1 — `PasswordInput` (œil) sur login, recovery, reset-password, ChangePasswordDialog
- [x] Bloc 2 — Fix heure "02:00" : afficher `assigned_heure` au lieu du composant horaire de `date_confirmee`
- [x] Bloc 3 — Migration : `annuler_rdv_client` (règle 48h) + `annuler_rdv_admin` (sans délai) + statuts `annulee_admin`/`annulee`
- [x] Bloc 4 — Emails `rdv_annule_client` (→ admin) + `rdv_annule_admin` (→ client), edge function déployée v7
- [x] Bloc 5 — Client : annulation RDV confirmé avec motif obligatoire + désactivé < 48h
- [x] Bloc 6 — Admin : cartes confirmées cliquables → `AnnulerRdvAdminDialog`
- [x] Bloc 7 — `PlanningCalendar` : suppression drag, cellules cliquables, mobile = vue jour / desktop = grille
- [x] Interventions : statut `annulee` (label/couleur + filtre dédié, exclu de "tous")

---

## Session 2026-06-02 (6) — Terminée

- [x] **Bloc A** — Fix "Demande introuvable" : `DetailDemandeRdvDialog.tsx` (supprimer `refus_motif`)
- [x] **Bloc B** — Dashboard client : cartes "Prochain RDV" + "Dernière prestation" (requêtes + liens)
- [x] **Bloc D** — Migrations : quota mensuel enforced (`creer_demande_rdv`) + capacité 3→2 + contrat_ligne_id (`assigner_rdv`)
- [x] **Bloc C** — Fiche véhicule : quota mensuel affiché (X/Y passages ce mois)
- [x] **Bloc E** — `AssignerRdvDialog` : supprimer badges 0/3 + dropdown heure 30 min
- [x] **Bloc F** — `PlanningCalendar` : board horizontal, 4 sous-créneaux, fix immat "—"

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
