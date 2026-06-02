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

## Architecture pricing

Deux catalogues à garder **toujours synchronisés** :

| Source | Fichier | Utilisé par |
|--------|---------|-------------|
| Frontend | `src/lib/pricing.ts` → `PACKS_CATALOG` | Calculs UI, aperçu facture, `calculerFactureFlotte()` |
| DB | `prestations_catalogue` | RPCs Supabase (`valider_vehicule`, `appliquer_remise_commerciale`) |

Prix V2 (mai 2026) : **pack_interieur=130€, pack_standard=170€, pack_vtc=240€** (HT).

- `montant_brut_mensuel` / `montant_net_mensuel` en DB = cache calculé par les RPCs. Ne pas les afficher directement : calculer dynamiquement depuis `facture.*` pour éviter les dérives.
- Tout changement de tarif → migration SQL sur `prestations_catalogue` + mise à jour `PACKS_CATALOG`.

## Points de vigilance

- **Ne pas utiliser le SMTP natif Supabase** — toujours passer par les edge functions + Resend
- **`routeTree.gen.ts`** est auto-généré par TanStack Router au build — ne pas modifier manuellement en production
- **Variables d'env Supabase** nécessaires : `RESEND_API_KEY`, `SITE_URL`, `EMAIL_FROM`
- **Scanner email Microsoft Defender** : fait des requêtes HEAD sur les liens Supabase `/verify` (retourne 405, n'invalide pas le token)
- Les tokens de récupération sont à **usage unique** et expirent après 24h
- **Routes admin-only** (`/admin/planning`, `/admin/planning/map`, `/admin/equipe`, `/admin/facturation`) : protégées par `RoleGuard allowed={["admin"]}` en plus du filtre sidebar — ne jamais se fier au seul masquage UI
- **Lien "Retour" dans `/settings`** : utiliser `rolePath(profile?.role)` — `/settings` est accessible à tous les rôles, hardcoder `/admin` casserait la nav operateur/client

## Architecture gel véhicule

Deux mécanismes coexistent — **ne pas les confondre** :

| Acteur | Mécanisme | Table | RPC |
|--------|-----------|-------|-----|
| Client | Demande → validation admin | `demandes_gel` | `demander_gel` / `valider_gel` |
| Admin | Action directe (immédiate ou programmée) | `vehicules.gel_admin_*` | `geler_vehicule_admin` / `annuler_gel_vehicule_admin` |

Colonnes admin sur `vehicules` : `gel_admin_date_debut`, `gel_admin_date_fin`, `gel_admin_motif`.
- `gel_admin_date_debut IS NOT NULL` + `statut='actif'` → gel programmé (pas encore actif)
- `gel_admin_date_debut IS NOT NULL` + `statut='gele'` → gel actif

Le cron `cron_maintenance_quotidienne()` active/expire automatiquement les gels admin (et les gels clients via `demandes_gel`). Toujours étendre cette fonction pour toute nouvelle automatisation quotidienne.

## Architecture planning & RDV (refonte en cours)

Les 3 onglets admin `Rendez-vous`, `Planning` et `Interventions` sont en cours de fusion
en **un seul onglet** hébergé sur `/admin/planning`, avec 3 sous-onglets :

| Sous-onglet | Composant | Accès | Rôle |
|---|---|---|---|
| Demandes | `DemandesRdvList` | tous rôles admin | gérer les demandes RDV entrantes |
| Planning (board) | `PlanningCalendar` | **admin only** | drag-drop interventions par opérateur/créneau |
| Interventions | liste interventions | tous rôles admin | suivi des fiches d'intervention |

- Carte des routes : `/admin/planning/map` (`RouteMap`, admin only).
- Le param `?demande=<uuid>` ouvre automatiquement une demande (`useAutoOpenFromSearch`) — à préserver.
- `/admin/rendez-vous` et `/admin/interventions` redirigent vers l'onglet unifié (compat liens).

### Modèle opérateurs

- **`operators`** (table planning admin : `name`, `initials`, `color_hex`) ≠ **`profiles.role=operateur`** (compte terrain Supabase Auth). Décorrélés.
- `interventions.operator_id` → `operators` (planning). `interventions.operateur_id` → `auth.users` (terrain).
- **Un seul opérateur réel pour l'instant** : `operators` ne contient qu'un row, label neutre « Opérateur » (pas de nom de personne). Le rendu UI est dynamique — ne jamais coder en dur les opérateurs.

### GPS / géolocalisation (backlog — non implémenté)

- Aucune adresse de lieu d'intervention n'existe encore : seule `entreprises` porte une adresse (`adresse`, `ville`, `code_postal`). `demandes_rdv` n'a qu'un commentaire libre.
- Cible : champ `adresse_intervention` sur `demandes_rdv` (pré-rempli adresse entreprise, modifiable) → géocodage Nominatim → `interventions.latitude/longitude` → carte des routes + regroupement par proximité.
- `interventions.latitude/longitude` existent déjà mais ne sont jamais alimentées → carte des routes vide tant que le GPS n'est pas câblé.

## Comptes de test (après purge 2026-06-02)

| Email | Rôle |
|-------|------|
| `admin.test@izox.fr` | admin |
| `staff.test@izox.fr` | staff |
| `commercial.test@izox.fr` | commercial |
| `operateur.test@izox.fr` | operateur |
| `jeffersonjouenne@outlook.com` | client (seul compte client conservé) |

## Commandes utiles

```bash
# Déployer une edge function
supabase functions deploy <nom> --project-ref kddoyjbfvaakfbegzjyt
```
