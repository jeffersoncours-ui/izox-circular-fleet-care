# Todo — IZOX

## En cours
_Rien en cours._

## Backlog

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
