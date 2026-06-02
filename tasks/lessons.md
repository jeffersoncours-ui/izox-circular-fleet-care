# Lessons Learned — IZOX

## Auth / Supabase

- **SMTP Supabase cassé** → ne jamais utiliser le SMTP natif. Toujours passer par les edge functions + API HTTP Resend.
- **Flow implicit vs PKCE** : l'app tourne en implicit (confirmé logs). Les liens recovery arrivent avec `#access_token=...&type=recovery` dans le hash, pas `?code=`.
- **Race condition login + recovery** : avoir `isRecovery` dans `auth-context.tsx` (via `detectAuthCallback()`) empêche le redirect automatique quand une session existe déjà.
- **Page dédiée `/reset-password`** : bien plus robuste que gérer la recovery dans `/login`. Aucune logique de redirect conflictuelle, gestion propre des liens expirés.
- **Microsoft Defender scanner** : fait des requêtes HEAD sur les liens `/verify` de Supabase → retourne 405, n'invalide PAS le token. Normal.
- **Supabase redirect URLs** : tout nouveau path utilisé comme `redirect_to` doit être ajouté dans Auth > URL Configuration du dashboard Supabase.
- **`routeTree.gen.ts`** : auto-généré par TanStack Router au build Vercel. Éditer manuellement uniquement pour que la route soit connue avant le premier build — le build le régénère ensuite.

## Vercel / Déploiement

- **Vercel MCP** : `list_projects` peut retourner vide même si le projet est live (problème de scope OAuth). L'app est bien déployée sur `izox-circular-fleet-care.vercel.app`.
- **Déploiement auto** : chaque merge sur `main` déclenche un déploiement Vercel automatiquement.

## Sécurité / RoleGuard

- **UI filtering ≠ route guard** : masquer un lien dans la sidebar (ex. `adminOnly: true`) ne protège pas la page. Un staff/commercial peut naviguer directement vers `/admin/planning` par URL. Toujours ajouter un `RoleGuard` au niveau du composant route en plus du filtre UI.
- **Liens de retour dynamiques** : ne jamais hardcoder `/admin` dans un lien "Retour" accessible à tous les rôles. Utiliser `rolePath(profile?.role)` pour que chaque rôle soit renvoyé vers sa page d'accueil correcte.

## Workflow Git

- **Branches de travail** : supprimer après merge pour garder le repo propre. Impossible via `git push --delete` depuis le container (403) — le faire depuis GitHub UI.
- **Rebase avant merge** : si main a avancé, `git rebase origin/main` avant de créer la PR pour éviter les conflits.
- **Commits déjà upstream** : lors d'un rebase, git "drop" automatiquement les commits dont le contenu est déjà dans main — c'est normal.
