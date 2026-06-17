---
name: audit-landing
description: Audit complet de la landing B2C IZOX — détecte les bugs, les lags, le code mort et les problèmes a11y sur les 14 fichiers du périmètre landing. Lance 3 subagents parallèles sur des scopes disjoints, applique les corrections confirmées, vérifie tsc + build. À invoquer avant tout merge majeur sur main.
---

# Audit landing B2C — IZOX

Audite le périmètre landing sur 3 axes en parallèle, corrige les findings confirmés, vérifie la compilation.

## Périmètre couvert

```
src/components/landing/          ← scope A (composants .tsx)
src/styles/landing-b2c.css       ← scope B (CSS)
src/routes/index.tsx             ← scope C (routes publiques)
src/routes/reservation.tsx
src/routes/entreprises.tsx
src/lib/pricing-b2c.ts
```

## Workflow

### 1. Lancer 3 subagents en parallèle (scopes disjoints — pas de conflit d'édition)

**Scope A — Composants `.tsx`**
Agent de type `Explore` sur `src/components/landing/` et `src/components/ui/morphing-card-stack.tsx`.

Chercher :
- **Bugs React** : mutation de ref pendant le render (hors `useEffect`), `useState` initialisé sur une prop sans `useEffect([prop])` pour suivre ses changements, effets sans cleanup (setInterval, addEventListener, ResizeObserver, rAF non annulés au unmount)
- **Memory leaks** : tableaux/objets qui grossissent sans purge (ex. tableau de timeouts, `timeoutsRef` dans FlipGallery), closures capturant des valeurs stale
- **CSS specificity trap** : tout élément portant `.b2c-glow-card` + une propriété positionnelle (position/z-index/display/overflow) via une classe Tailwind — risque d'écrasement silencieux (spécificité 2 classes CSS > 1 classe Tailwind). Vérifier que ces cas utilisent un style inline à la place
- **Lag animations** : animations CSS ou JS sur un grand nombre d'éléments simultanés, filtres SVG coûteux appliqués par élément, `getImageData` ou autre opération GPU dans une boucle rAF
- **Code mort** : composants importés mais jamais utilisés, props déclarées jamais lues, fonctions exportées jamais importées ailleurs (confirmer par grep avant de conclure), imports inutilisés
- **A11y** : boutons sans `aria-label`/`aria-pressed`, éléments interactifs sans `role`, carousels/piles sans `aria-live`, images décoratives sans `alt=""`

**Scope B — CSS `landing-b2c.css`**

Chercher :
- **Sélecteurs orphelins** : classes CSS définies dans le fichier mais jamais utilisées dans `src/` (grep `\.nom-de-classe` dans tous les `.tsx`/`.ts`)
- **Variables CSS fantômes** : `var(--b2c-xxx)` utilisées dans le CSS mais dont la définition est absente dans le fichier (ni dans `:root`, ni dans `.izox-b2c`, ni dans les thèmes `.t-*`)
- **Variables définies mais jamais consommées** : `--b2c-xxx: value` dans le fichier mais aucun `var(--b2c-xxx)` trouvé ni dans le CSS ni dans les `.tsx`
- **Doublons de règles** : même sélecteur défini deux fois (la 2e définition écrase la 1ère silencieusement)
- **Thèmes `.t-noir/.t-nuit/.t-papier`** : NE PAS les marquer comme morts — ils sont appliqués dynamiquement par `useTweaks.tsx` (JS), non grep-ables dans les templates statiques

**Scope C — Routes publiques + lib pricing**

Chercher :
- **Absence de try/catch** autour de `supabase.functions.invoke(...)` dans `reservation.tsx` et `entreprises.tsx` — un throw réseau doit toujours remettre l'état de loading à `false` (pattern : `try { setSending(true); await invoke(...) } catch(e) { ... } finally { setSending(false) }`)
- **Fonctions exportées jamais importées** dans `pricing-b2c.ts` — distinguer "mort maintenant" vs "fondation Phase 2g Stripe" (cf. `tasks/lessons.md` : `prixTotalB2C`, `formatPrixTTC` sont des fondations documentées, ne pas supprimer)
- **SSR incompatibilités** : `window`/`document`/`localStorage` appelés au top-level d'un module (hors `useEffect`) dans une route SSR TanStack Start
- **Imports React inutilisés** : `import React from "react"` ou `import { ... }` avec destructures jamais utilisées

### 2. Consolider et prioriser les findings

Regrouper tous les findings des 3 scopes en 3 niveaux :

| Niveau | Critère | Action |
|--------|---------|--------|
| 🔴 Bug | Comportement visuel cassé, throw non géré, memory leak avéré | Corriger immédiatement |
| 🟡 Lag | Croissance non bornée, animation coûteuse, stale closure | Corriger si simple |
| ⚪ Code mort | Confirmé par grep + roadmap = pas utilisé dans 6 mois | Supprimer |

**Règle grep** : avant de déclarer un symbole mort, toujours vérifier par grep dans `src/`. Si trouvé → conserver. Si absent ET pas mentionné dans `CLAUDE.md`/`tasks/todo.md` comme fondation future → supprimer.

### 3. Appliquer les corrections

Corriger dans cet ordre :
1. Bugs 🔴 (Edit ciblé, minimal — ne pas réécrire ce qui n'est pas cassé)
2. Lags 🟡 confirmés
3. Code mort ⚪ (supprimer fichier si composant entier mort, sinon Edit ciblé)

Ne pas :
- Refactoriser au-delà du finding
- Ajouter des commentaires explicatifs
- Créer de nouveaux fichiers
- Modifier `tasks/todo.md` ou `tasks/lessons.md` — c'est le rôle de l'utilisateur ou d'une session dédiée

### 4. Vérifier la compilation

```bash
npx tsc --noEmit --skipLibCheck
npm run build
```

Les deux doivent passer à 0 erreur. Si une erreur apparaît après correction → revenir sur la correction, pas sur le build.

### 5. Rapport final

Produire un tableau de synthèse :

```
| Fichier | Finding | Niveau | Action |
|---------|---------|--------|--------|
| SmokeBackground.tsx | Mutation ref pendant render | 🔴 Bug | Corrigé → useEffect |
| FlipGallery.tsx | timeoutsRef non purgé | 🟡 Lag | Corrigé → purge en tête |
| landing-b2c.css | --b2c-surface défini, jamais consommé | ⚪ Mort | Supprimé |
```

Puis : `tsc ✅ 0 erreur · build ✅ OK`

## Contraintes IZOX à respecter

- **Ne jamais supprimer** `prixTotalB2C`, `formatPrixTTC`, `FORMULES_B2C` description/label — fondations Phase 2g Stripe documentées
- **Ne jamais supprimer** les thèmes `.t-noir/.t-nuit/.t-papier` du CSS — appliqués par JS dynamiquement
- **Ne jamais modifier** `src/integrations/supabase/types.ts` manuellement
- **Ne jamais modifier** `src/routeTree.gen.ts` manuellement
- **Scope limité** : ne pas toucher aux fichiers CRM (`src/routes/admin.*`, `src/routes/client.*`, `src/routes/terrain.*`) — l'isolation `.izox-b2c` doit rester intacte
