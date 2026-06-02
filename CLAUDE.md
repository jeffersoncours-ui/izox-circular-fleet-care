# IZOX — Circular Fleet Care

Application de gestion de flotte automobile (nettoyage éco-responsable).
Stack : TanStack Start (SSR) + Supabase + Vercel + Resend.

---

## Lecture obligatoire à chaque session

- **`tasks/todo.md`** — tâches en cours et backlog
- **`tasks/lessons.md`** — erreurs passées et leçons apprises, à consulter avant de coder

---

## Principes de travail (System Instructions)

### 1. Principes fondamentaux
- **Simplicité** : solution la plus simple et efficace. Minimum de code et de complexité architecturale.
- **Pas de patches** : chercher la cause racine, pas le contournement. Standard ingénieur senior.
- **Impact minimal** : modifier uniquement ce qui est nécessaire. Éviter les bugs régressifs et les effets de bord.

### 2. Planification
- Pour toute tâche non triviale (3+ étapes ou changement architectural) : écrire le plan dans `tasks/todo.md` avant de coder.
- Si l'exécution dévie du plan : STOP, réévaluer, re-planifier. Ne pas forcer une approche qui échoue.

### 3. Exécution
- Utiliser des subagents pour la recherche, l'analyse parallèle et les tâches exploratoires (garder le contexte principal propre).
- Corriger les erreurs CI/CD de manière autonome : analyser les logs, tracer les erreurs, résoudre sans demander d'aide.

### 4. Qualité
- **Vérification avant "terminé"** : jamais marquer une tâche comme faite sans preuve empirique (logs, tests, démo).
- **Auto-correction** : relire son travail avant de le présenter. Question : "Un staff engineer approuverait-il ça ?"

### 5. Amélioration continue
- Après toute correction de l'utilisateur : mettre à jour `tasks/lessons.md` immédiatement.
- Développer des règles pour prévenir les erreurs récurrentes.

### 6. Workflow tâches
1. Écrire le plan dans `tasks/todo.md` avec des items actionnables et cochables
2. Marquer les items comme terminés au fil de l'avancement
3. Ajouter une section "Review" à `tasks/todo.md` à la fin
4. Mettre à jour `tasks/lessons.md` avec les enseignements clés

---

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
- **`routeTree.gen.ts`** est auto-généré par TanStack Router au build — ne pas modifier manuellement en production
- **Variables d'env Supabase** nécessaires : `RESEND_API_KEY`, `SITE_URL`, `EMAIL_FROM`
- **Scanner email Microsoft Defender** : fait des requêtes HEAD sur les liens Supabase `/verify` (retourne 405, n'invalide pas le token)
- Les tokens de récupération sont à **usage unique** et expirent après 24h

## Commandes utiles

```bash
# Déployer une edge function
supabase functions deploy <nom> --project-ref kddoyjbfvaakfbegzjyt
```
