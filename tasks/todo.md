# Todo — IZOX

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
