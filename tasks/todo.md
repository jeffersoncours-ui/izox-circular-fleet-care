# Todo — IZOX

## En cours

### Session 2026-06-02 — Gel véhicule admin direct

- [x] Migration SQL : colonnes `gel_admin_*` sur `vehicules` + RPC `geler_vehicule_admin` + RPC `annuler_gel_vehicule_admin` + extension cron
- [x] Composant `GelerVehiculeAdminDialog.tsx` (date début/fin + motif)
- [x] Route `admin.vehicules.$id.tsx` : état gel + boutons Geler/Lever le gel

## Backlog

- [ ] Migration domaine `izox.fr` : mettre à jour `SITE_URL` env var Supabase + vérifier redirect URLs
- [ ] Vérifier que `/reset-password` reste dans les redirect URLs Supabase après migration de domaine
- [ ] Merger la branche `fix/role-guards-and-settings-nav` dans `main` (PR à créer)

## Terminé

### Session 2026-06-02 — Audit & bugfix complet
- [x] Bug fix pricing (B1) : `prestations_catalogue` migré vers prix V2 — pack_interieur 100→130€, pack_standard 150→170€, pack_vtc 190→240€
- [x] Bug fix pricing (B2) : `contrat_lignes.prix_unitaire_ht` synchronisé avec les nouveaux prix
- [x] Bug fix pricing (B3) : `montant_brut_mensuel` et `montant_net_mensuel` recalculés pour tous les contrats actifs (était 100€, maintenant 130€)
- [x] Bug fix affichage (B4) : "net mensuel" dans `admin.contrats.$id` calculé dynamiquement via `facture` (plus de lecture cache DB stale)
- [x] Bug fix affichage (B5) : `RemiseCommercialeDialog` reçoit `facture.totalBrutHt` + `facture.tauxPalier` au lieu des champs DB
- [x] Bug fix labels (B6/B7) : `FicheContratClient` — labels packs via `getPackLabel()` au lieu de CSS `capitalize` sur le code raw
- [x] Bug fix code mort (B8) : `CreateContratDialog` — `useEffect` dupliqué supprimé
- [x] Bug fix sécurité : routes `admin-only` (`/admin/planning`, `/admin/planning/map`, `/admin/equipe`, `/admin/facturation`) — ajout `RoleGuard allowed={["admin"]}` (staff/commercial pouvaient y accéder par URL directe)
- [x] Bug fix navigation : lien "Retour" dans `/settings` hardcodé `/admin` → dynamique via `rolePath()` (brisait la nav operateur/client)

### Sessions précédentes
- [x] Remplacer SMTP natif Supabase par Resend via edge functions
- [x] Page `/reset-password` dédiée pour la réinitialisation de mot de passe
- [x] `isRecovery` centralisé dans `auth-context.tsx` via `detectAuthCallback()`
- [x] Tracking `email_logs` dans toutes les edge functions
- [x] Redirect URLs mises à jour vers `/reset-password` (login, admin, edge functions)
