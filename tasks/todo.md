# Todo — IZOX

---

## Session 9 terminée — Créneaux RDV + GPS/Carte

- [x] **A — Formulaire client : 2 créneaux minimum** sur 2 jours différents
- [x] **B1 — Migration SQL** : RPC `get_creneaux_disponibles` + guard race condition dans `creer_demande_rdv`
- [x] **B2 — Frontend occupancy** : griser Calendar + RadioGroup
- [x] **B3 — Regen types Supabase**
- [x] **C1 — Edge function `geocode-address`** (Nominatim, JWT requis, déployée)
- [x] **C2 — Migration SQL** : lat/lon dans `creer_demande_rdv` + propagation `assigner_rdv`
- [x] **C3 — Frontend** : géocoder avant soumission (fire-and-forget)
- [x] **C4 — Admin** : badge ⚠️ + bouton "Géocoder" dans `AssignerRdvDialog`
- [x] **C5 — RouteMap** : centre adaptatif (dernier point DB → Paris fallback)

## Backlog actif

- [ ] **#TechDebt — Nominatim → API cartographique SLA** : Nominatim (OSM) sans garantie de SLA, limité à 1 req/s. Prévoir migration vers Mapbox Geocoding API ou Google Maps Geocoding API quand le volume le justifie.
- [ ] **Carte interactive** : optimisation tournée (nearest-neighbor + bouton « Optimiser ») à faire quand plusieurs opérateurs.
- [ ] **Refonte visuelle Claude Design** : migration écran par écran, garder les contrats de données (mêmes RPCs, mêmes champs), vérifier les invariants `lessons.md` à chaque écran.
- [ ] **Migration domaine `izox.fr`** : mettre à jour `SITE_URL` env var Supabase + vérifier que `/reset-password` reste dans les redirect URLs.

---

## Historique sessions

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
