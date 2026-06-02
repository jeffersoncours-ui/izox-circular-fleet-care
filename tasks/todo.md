# Todo — IZOX

## En cours — Session 2026-06-02 (3) : Refonte onglet Planning unifié

### Périmètre de cette session
Fusionner les 3 onglets admin (`Rendez-vous`, `Planning`, `Interventions`) en **un seul onglet**
et préparer le terrain GPS. **Hors périmètre** (backlog) : géocodage automatique, carte
interactive avec auto-optimisation des tournées, refonte visuelle Claude Design.

### Étape 1 — Nettoyage opérateurs
- [x] Migration SQL (`20260602002000_single_operator.sql`) : un seul opérateur dans `operators`, label neutre « Opérateur » (OP), couleur neutre — appliquée + vérifiée en DB
- [x] UI : rendu déjà dynamique (board / dialog / carte lisent `operators`), aucun nom en dur — s'adapte automatiquement à 1 opérateur

### Étape 4 — Fusion des 3 onglets en un seul
- [x] Onglet unifié sur `/admin/planning` avec 3 sous-onglets : **Demandes** / **Planning (board)** / **Interventions**
- [x] Niveaux d'accès préservés : onglet accessible à tous les rôles admin ; sous-onglet board + carte restent **admin-only** (`RoleGuard` + trigger masqué pour non-admin)
- [x] Hook `useAutoOpenFromSearch` rebindé sur la route `/admin/planning` (param `?demande=<uuid>` + `?tab=`)
- [x] Redirections `/admin/rendez-vous`, `/admin/interventions`, `/admin/demandes-rdv` → `/admin/planning?tab=…` (deep-links préservés)
- [x] Sidebar : entrées `Rendez-vous` et `Interventions` retirées, une seule entrée « Planning & RDV » avec badge RDV en attente
- [x] Liens du tableau de bord + navigation retour fiche intervention recâblés vers l'onglet unifié
- [x] `InterventionsListPanel` extrait en composant réutilisable ; `CalendrierRdvPlaceholder` (stub mort) supprimé
- [x] Build OK (`vite build` ✓), typecheck propre sur les fichiers modifiés

## Review — Session 2026-06-02 (3)

- **Choix host** : `/admin/planning` retenu comme onglet hôte (correspond au modèle mental « le planning absorbe les autres »). `DemandesRdvList` rebindé dessus (lecture `?demande=` + `clearDemandeParam`).
- **Permissions** : conservées à l'identique. Avant fusion, `rendez-vous`/`interventions` étaient accessibles staff/commercial, `planning` était admin-only. Après : onglet accessible à tous les rôles admin, board+carte gardés admin-only (défense en profondeur : trigger masqué ET `RoleGuard`).
- **Compat** : 3 anciennes routes redirigent (pas de lien cassé). Fiche détail `/admin/interventions/$id` inchangée.
- **3 erreurs TS pré-existantes** (gel véhicule : `geler_vehicule_admin` + colonnes `gel_admin_*` absentes des types Supabase générés) — hors périmètre, n'empêchent pas le build. À régénérer (`generate_typescript_types`) lors d'une prochaine passe.
- **Reste en backlog** (non touché) : GPS/géocodage, carte interactive + auto-optimisation, refonte Claude Design.

## Backlog

- [ ] **GPS / géolocalisation (reporté — trop lourd maintenant)** : champ `adresse_intervention` sur `demandes_rdv` (distinct de l'adresse facturation `entreprises`), pré-rempli mais modifiable côté client ; géocodage Nominatim → `latitude`/`longitude` ; propagation vers `interventions`
- [ ] **Carte interactive (reporté)** : points déplaçables manuellement entre opérateurs/créneaux + recalcul km en direct, puis bouton « Optimiser » (regroupement par zones proches, validable par l'admin)
- [ ] **Refonte visuelle Claude Design (reporté)** : migration écran par écran, garder les contrats de données (mêmes RPCs, mêmes champs), vérifier les invariants `lessons.md` à chaque écran
- [ ] Migration domaine `izox.fr` : mettre à jour `SITE_URL` env var Supabase + vérifier redirect URLs
- [ ] Vérifier que `/reset-password` reste dans les redirect URLs Supabase après migration de domaine

## Terminé

### Session 2026-06-02 (2) — Gel véhicule admin direct + purge données test
- [x] Migration SQL : colonnes `gel_admin_*` sur `vehicules` + RPC `geler_vehicule_admin` + RPC `annuler_gel_vehicule_admin` + extension cron quotidien
- [x] Composant `GelerVehiculeAdminDialog.tsx` (date début/fin + motif, badge "Gel immédiat" / "Gel programmé")
- [x] Route `admin.vehicules.$id.tsx` : card état gel (actif bleu / programmé ambre), bouton Geler pleine largeur au-dessus de Modifier/Supprimer
- [x] Purge complète des données app — gardé : 4 comptes IZOX + `jeffersonjouenne@outlook.com` (+ son entreprise), séquence contrats remise à 0

### Session 2026-06-02 (1) — Audit & bugfix complet
- [x] Bug fix pricing (B1) : `prestations_catalogue` migré vers prix V2 — pack_interieur 100→130€, pack_standard 150→170€, pack_vtc 190→240€
- [x] Bug fix pricing (B2) : `contrat_lignes.prix_unitaire_ht` synchronisé avec les nouveaux prix
- [x] Bug fix pricing (B3) : `montant_brut_mensuel` et `montant_net_mensuel` recalculés pour tous les contrats actifs
- [x] Bug fix affichage (B4) : "net mensuel" dans `admin.contrats.$id` calculé dynamiquement via `facture`
- [x] Bug fix affichage (B5) : `RemiseCommercialeDialog` reçoit `facture.totalBrutHt` + `facture.tauxPalier`
- [x] Bug fix labels (B6/B7) : `FicheContratClient` — labels packs via `getPackLabel()`
- [x] Bug fix code mort (B8) : `CreateContratDialog` — `useEffect` dupliqué supprimé
- [x] Bug fix sécurité : routes `admin-only` — ajout `RoleGuard allowed={["admin"]}`
- [x] Bug fix navigation : lien "Retour" dans `/settings` → dynamique via `rolePath()`

### Sessions précédentes
- [x] Remplacer SMTP natif Supabase par Resend via edge functions
- [x] Page `/reset-password` dédiée pour la réinitialisation de mot de passe
- [x] `isRecovery` centralisé dans `auth-context.tsx` via `detectAuthCallback()`
- [x] Tracking `email_logs` dans toutes les edge functions
- [x] Redirect URLs mises à jour vers `/reset-password` (login, admin, edge functions)
</content>
</invoke>
