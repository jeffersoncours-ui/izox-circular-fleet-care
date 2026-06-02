# IZOX — Circular Fleet Care

Application de gestion de flotte automobile (nettoyage éco-responsable).
Stack : TanStack Start (SSR) + Supabase + Vercel + Resend.

## Infos projet critiques

- **Supabase project ID** : `kddoyjbfvaakfbegzjyt` (région eu-west-3)
- **Vercel team** : `team_p96xUWAJNjEQKceK3ukiU2gK`
- **App URL** : `https://izox-circular-fleet-care.vercel.app`
- **Email provider** : Resend (domaine `izox.fr` vérifié OVH avec DKIM/SPF/DMARC)
- **Email from** : `IZOX <noreply@izox.fr>` — variable env `EMAIL_FROM`

## Architecture auth

Supabase Auth avec flow **implicit** (pas PKCE — confirmé dans les logs).

- `isRecovery` géré dans `src/lib/auth-context.tsx` via `detectAuthCallback()`
- Les liens de reset/invite redirigent vers `/reset-password` (page dédiée)
- `/reset-password` est dans la liste des redirect URLs Supabase (à maintenir)

### Rôles utilisateurs
`admin` | `staff` | `commercial` → `/admin`
`operateur` → `/terrain`
`client` → `/client`

## Edge functions Supabase

| Fonction | JWT | Usage |
|---|---|---|
| `request-password-reset` | non (public) | "Mot de passe oublié" côté login |
| `admin-reset-password` | oui (admin only) | Reset depuis la fiche client admin |
| `create-client-account` | oui (admin/staff) | Création entreprise + compte client |

Toutes envoient les emails via l'API HTTP Resend (pas SMTP natif Supabase — SMTP était cassé "535 Authentication credentials invalid").

Logs d'envoi dans la table `email_logs` (type, target_id, email_to, status, error_message).

## Points de vigilance

- **Ne pas utiliser le SMTP natif Supabase** — toujours passer par les edge functions + Resend
- **`routeTree.gen.ts`** est auto-généré par TanStack Router au build — ne pas modifier manuellement en production, le build Vercel le régénère
- **Variables d'env Supabase** nécessaires : `RESEND_API_KEY`, `SITE_URL`, `EMAIL_FROM`
- **Scanner email Microsoft Defender** : fait des requêtes HEAD sur les liens Supabase `/verify` (retourne 405, n'invalide pas le token)
- Les tokens de récupération sont à **usage unique** et expirent après 24h

## Commandes utiles

```bash
# Déployer une edge function
supabase functions deploy <nom> --project-ref kddoyjbfvaakfbegzjyt

# Voir les logs auth
# → Supabase Dashboard > Logs > Auth
```

## Todo

- [ ] Migration domaine vers `izox.fr` (remplacer vercel.app dans `SITE_URL`)
- [ ] Vérifier que `/reset-password` reste dans les redirect URLs Supabase après migration de domaine
