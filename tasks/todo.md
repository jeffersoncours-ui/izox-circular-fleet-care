# Todo — IZOX

## En cours
_Rien en cours._

## Backlog

- [ ] Migration domaine `izox.fr` : mettre à jour `SITE_URL` env var Supabase + vérifier redirect URLs
- [ ] Vérifier que `/reset-password` reste dans les redirect URLs Supabase après migration de domaine

## Terminé

- [x] Bug fix : lien "Retour" settings hardcodé `/admin` → dynamique via `rolePath()` (brisait la nav operateur/client)
- [x] Bug fix : routes admin-only (`/admin/planning`, `/admin/planning/map`, `/admin/equipe`, `/admin/facturation`) sans garde route-level → ajout `RoleGuard allowed={["admin"]}`
- [x] Remplacer SMTP natif Supabase par Resend via edge functions
- [x] Page `/reset-password` dédiée pour la réinitialisation de mot de passe
- [x] `isRecovery` centralisé dans `auth-context.tsx` via `detectAuthCallback()`
- [x] Tracking `email_logs` dans toutes les edge functions
- [x] Redirect URLs mises à jour vers `/reset-password` (login, admin, edge functions)
