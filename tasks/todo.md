# Todo — IZOX

---

## Session 2026-06-05 (21) — Correctifs UI (lot 3) + fix CORS reset MDP

### Plan

- [x] 1. `login.tsx` — texte titre/sous-titre aligné à gauche + flèche verte `CornerDownLeft` après "sans friction." ; logo **recentré** (`mx-auto`) et agrandi (`h-[72px]/sm:h-24`)
- [x] 2. `admin-reset-password` (edge function) — **CORS dynamique** (`corsFor(req)`) reflétant `izox.fr` + tout `*.vercel.app`. Déployé v15.
- [x] 3. `admin.clients.$id.tsx` + `EditEntrepriseDialog.tsx` — bouton MDP retiré du header (corrige le débordement horizontal) → déplacé dans le dialog "Modifier" (section "Mot de passe du client → Réinitialiser")
- [x] 4. `admin.clients.$id.tsx` — boutons d'action sortis du `PageHeader` vers le conteneur de contenu → mêmes bords gauche/droit que les cartes. Mobile : grille `[1.6fr_1fr]` (Ajouter + Modifier) + Archiver pleine largeur. Desktop : ligne alignée à droite.
- [x] 5. Build 0 erreur + commits + push (`d5bdabc`, `4c1a1cb`)

### Contexte décisions / cause racine
- **Cause racine bouton MDP en erreur** : `admin-reset-password` utilisait un CORS statique `Access-Control-Allow-Origin: SITE_URL` (= `izox.fr`). Servie depuis un domaine `*.vercel.app`, l'OPTIONS preflight passait (200) mais le navigateur **bloquait le POST** (origine non concordante). Preuve dans les logs edge : que des OPTIONS, jamais de POST. Fix mirror du pattern `request-password-reset`. **Confirmé fonctionnel par l'utilisateur** (email reçu côté client).
- **Logo login** : seul le texte devait être à gauche, le logo reste centré (correction du lot précédent qui avait tout aligné à gauche).

---

## Session 2026-06-05 (20) — Correctifs UI (lot 2)

### Plan

- [x] 1. `login.tsx` — hero blanc (bg-background) + tagline "Une flotte propre, sans friction." sous le logo
- [x] 2. `admin.index.tsx` + `page-header.tsx` — StatTile `h-full` pour égaliser la hauteur des 4 KPI cards
- [x] 3. `admin.clients.$id.tsx` — boutons : 3 en ligne (Ajouter / Modifier / MDP toujours visible) + Archiver en barre pleine largeur dessous ; explication disabled quand contrat actif
- [x] 4. `PlanningCalendar.tsx` — `goToday()` bascule aussi en vue "Jour" pour rendre le clic visible
- [x] 5. Build + commit + push

### Contexte décisions
- **Archiver désactivé** : volontaire — `disabled={nbContratsActifs > 0}` → résilier le contrat d'abord. Info affichée dans le titre du bouton.
- **Bouton MDP** : envoie un email via edge function `admin-reset-password`. Le texte "MDP" était caché sur mobile → toujours visible (puis déplacé dans le dialog Modifier en session 21).
- **Planning "Aujourd'hui"** : bug UX — si déjà sur la semaine courante en vue Semaine, le clic ne changeait rien visuellement. Fix : bascule en vue Jour pour que la journée soit bien visible.

---

## Session 2026-06-05 (19) — Phase C : Factures & Documents (B3)

**Constat audit** : aucun bouton "télécharger facture" n'existe (mémoire user erronée).
Seulement des onglets "Factures" placeholder "Bientôt disponible" (admin.clients.$id,
admin.contrats.$id). Backend prêt (RPC generer_facture/emettre_facture, snapshots, RLS client).
**Décision archi** : fusionner Factures dans Documents côté client (Option B validée user).
**Décision légale IZOX** : placeholders marqués TODO (Option A validée user).
**Point fiscal** : franchise de base (art. 293 B CGI) → TVA non applicable, HT = TTC. Ne pas suivre le mockup (20%).

### Plan

- [x] 1. `src/lib/izox-legal.ts` — constante IZOX_LEGAL (placeholder SIRET/adresse/IBAN, marqué TODO)
- [x] 2. `src/lib/factures.ts` — types snapshots + helpers (formatEuro, formatPeriode, formatDateFr, STATUT_FACTURE config)
- [x] 3. `src/components/factures/FactureDocument.tsx` — facture imprimable partagée (client + admin)
- [x] 4. `src/routes/client.factures.$id.tsx` — page détail (fetch RLS-scoped + lignes, bouton Imprimer → window.print)
- [x] 5. `src/routes/client.factures.tsx` → layout pur `<Outlet/>` (éviter le bug redirect parent→enfant)
- [x] 6. `src/routes/client.factures.index.tsx` — redirect /client/factures → /client/documents
- [x] 7. `src/routes/client.documents.tsx` — refonte : sous-onglets Factures | Autres docs (liste réelle DB)
- [x] 8. `src/components/client/ClientNav.tsx` — retirer "Factures" → grid-cols-4
- [x] 9. `src/routes/admin.clients.$id.tsx` — onglet Factures = liste réelle + détail en Dialog (FactureDocument)
- [x] 10. `src/styles.css` — `@media print` (n'imprimer que la facture)
- [x] 11. `npm run build` (régénère routeTree.gen.ts) → 0 erreur TS · tsc --noEmit 0 erreur
- [x] 12. Validation empirique : fixture (entreprise + contrat pro 5% + remise commerciale 10% + 4 interventions validées), générer + émettre → FA-B2B-2026-000001, RLS client (1 émise visible, 0 brouillon) + admin (2 dont brouillon), puis purge complète (tout à 0, users=4, triggers réactivés)
- [ ] 13. Commit + push

### Review session 19

**Livré (B3 — Factures & Documents) :**
- Page détail facture client `/client/factures/$id` (mockup invoice.jsx adapté au régime réel).
- Fusion Factures → Documents côté client (Option B) : `/client/documents` avec sous-onglets Factures | Autres docs. `/client/factures` redirige (layout+index pour ne pas casser `$id`). Nav client 5→4 items.
- Onglet Factures admin (`/admin/clients/$id`) : liste réelle + détail imprimable en Dialog (réutilise `FactureDocument`).
- Impression : `window.print()` + `@media print` (n'imprime que `.facture-print-root`). Pas de dépendance PDF (le navigateur fait "Enregistrer en PDF").

**Décisions :**
- Régime fiscal **franchise de base** (art. 293 B CGI) respecté : TVA non applicable, HT=TTC. Le mockup (TVA 20%) volontairement ignoré.
- Infos légales IZOX = placeholders marqués TODO dans `src/lib/izox-legal.ts` (Option A user) → **à remplacer par les vraies valeurs avant émission réelle**.

**Preuves empiriques :** facture FA-B2B-2026-000001 générée (334,31 € TTC), lignes prestation/remise palier/remise commerciale conformes, snapshots cohérents avec les types TS, RLS client/admin validés positif+négatif, purge vérifiée.

---

## Session 2026-06-04 (18) — Audit sécurité complet + Phase B

### Audit & correctifs sécurité ✅ TERMINÉ

- [x] **CRITIQUE** : `seed-users` — endpoint public `verify_jwt=false` avec mot de passe admin hardcodé `Izox2026!` → désactivé (410 Gone), redéployé v4 immédiatement. DB vérifiée : 4 comptes légitimes seulement, zéro exploitation.
- [x] **CORS `*`** sur 6 edge functions → remplacé par `SITE_URL` (statique pour les fonctions authentifiées, dynamique + validation `Origin` pour `request-password-reset`)
- [x] **XSS email templates** — `send-email` : ajout `esc()` (HTML-escape) sur toutes les valeurs user-controlled injectées dans les templates HTML
- [x] **Open redirect** — `redirect_to` dans 3 fonctions (`request-password-reset`, `admin-reset-password`, `create-client-account`) → validé par `safeRedirectTo()` (whitelist origin)
- [x] **robots.txt** — créé avec blocage complet : `Disallow: /` global + blocage explicite de 20 crawlers IA (GPTBot, Claude, CCBot, etc.)
- [x] **vercel.json** — ajout headers sécurité : `X-Robots-Tag`, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-XSS-Protection`
- [x] **`__root.tsx`** — meta robots : `noindex, nofollow, noarchive, nosnippet` + blocage crawlers IA en meta tags
- [x] Déploiement 6 edge functions sécurisées (send-email v13, request-password-reset v6, admin-reset-password v13, create-client-account v16, geocode-address v2, compute-impact v4)
- [x] `npm install` + `npx tsc --noEmit` → 0 erreur

### Phase B — Code nouveau ✅ TERMINÉ (commit `65de7d0`)

- [x] **B1. RGPD/CGV** `/legal` — route créée, 2 onglets, sidebar 220px smooth-scroll, 8 sections CGV + 8 RGPD, bloc acceptation localStorage `izox_cgv_accepted`, bannière cookies localStorage `izox_cookie_consent`
- [x] **B2. Demandes RDV split view** — `DemandesRdvList.tsx` refactorisé : filter pills, split 40%/60%, `DemandesRdvMap.tsx` (Leaflet markers colorés par statut, hover → pin actif + zoom + popup), logique métier/dialogs intacts

### Review session 18

**Sécurité :** 1 faille critique neutralisée (`seed-users` public + mdp hardcodé), CORS hardened sur 6 fonctions, XSS email templates corrigé, open redirect bloqué, triple défense anti-crawlers IA.

**Phase B :** B1 + B2 livrés, build 0 erreur, TS 0 erreur. `routeTree.gen.ts` régénéré par le build (pattern confirmé : créer la route, lancer le build, TS passe).

---

## Session 2026-06-04 (17) — Handoff v2 : 5 nouveaux écrans

**Handoff reçu** : `IZOX-handoff-v2/` (commité). 5 écrans : Planning board, Carte, Demandes RDV split view, 2FA, RGPD/CGV.

**Stratégie décidée avec l'utilisateur** : d'abord **finir le correctif visuel** (refonte des pages déjà fonctionnelles), PUIS le **code nouveau** (pages/features inédites).

### Classification des 5 écrans

| Écran | Nature | Existant | Phase |
|-------|--------|----------|-------|
| **2FA** `/settings/security/2fa` | Refonte visuelle pure (logique TOTP intacte) | `TwoFactorSetup.tsx` (523 l, otpauth+qrcode fonctionnels) | **Visuel** |
| **Planning board** `/admin/planning` | Refonte visuelle + states (dnd-kit déjà là) | `PlanningCalendar` | **Visuel** |
| **Carte** `/admin/planning/map` | Refonte layout tripartite (Leaflet déjà là) | `RouteMap.tsx` (268 l) | **Visuel** (+ panel léger) |
| **RGPD/CGV** `/legal` | Page nouvelle (statique, contenu fourni) | ❌ n'existe pas | **Code nouveau** |
| **Demandes RDV** split view | Page + 2e Leaflet + modal refondu | redirection seule | **Code nouveau** (le + lourd) |

### Phase A — Correctif visuel ✅ TERMINÉ (commit `dbfa00e`)

- [x] **Cartographie fine** (agents parallèles) : PlanningCalendar, RouteMap, TwoFactorSetup, design tokens styles.css
- [x] **A1. 2FA** — refonte visuelle `TwoFactorSetup.tsx` : cartes méthode radio, QR cadre blanc, OTP 14×12 mono, animations checkPop/drawCheck/shake, AnimatedCheck SVG, grille codes de secours 2 colonnes, note sécurité. Logique TOTP intacte.
- [x] **A2. Planning board** — refonte `PlanningCalendar` : HalfDayBlock (matin/après-midi), InterventionCard border-left 3px couleur opérateur, EmptySlot dashed, OperatorColumn header avatar+barre de charge, vue semaine/jour, statut pills + pack labels. Business logic intacte.
- [x] **A3. Carte** — layout tripartite `RouteMap` : drawer gauche 220px (opérateur + légende + km), map flex-1 (pins teardrop, polylines pointillées, opacité sélection), panel droit 280px (liste défilante + KM total + bouton "Valider la tournée" UI-only). Business logic intacte.
- [x] `styles.css` : soft tints (success/warning/info/destructive-soft) + keyframes checkPop/drawCheck/shake/stripeMove/pulseDot
- [x] Build TS 0 erreur · `npm run build` OK
- [x] Commit + push

### Données de test générées ✅ (2026-06-04)

- [x] Opérateur : `adfda534` color_hex=#2A6FDB, linked user_id operateur.test@izox.fr
- [x] Client : auth user `client.test@izox.fr` (id: `b1000000`) · profile Jean Dupont
- [x] Entreprise : Cabify Paris (`e1000000`)
- [x] Contrat : CTR-2026-001 (`c1000000`)
- [x] Véhicules : AB-123-CD, DE-456-FG, GH-789-IJ, KL-012-MN
- [x] Interventions : 8 sur la semaine (2026-06-02→05) avec GPS Paris · 4 statuts différents · tous types de pack
- [x] Demandes RDV : 2 en_attente + 1 confirmee (liée intervention) + 1 refusee avec motif
- [x] RPC `get_creneaux_disponibles` validé : slots 04/06 saturés (2/2), slots 05/06 disponibles (1/2)

### Phase B — Code nouveau (APRÈS validation Phase A)

- [ ] **B1. RGPD/CGV** `/legal` — nouvelle route, 2 onglets, sidebar sections smooth-scroll, contenu CGV/RGPD fourni, bloc acceptation, bannière cookies localStorage
- [ ] **B2. Demandes RDV split view** — décision archi (sous-onglet vs page dédiée), table + Leaflet temps réel hover, modal assignation rapide

### Décisions en suspens (à trancher avec l'utilisateur avant Phase B)

- Demandes RDV : sous-onglet `/admin/planning` (cohérent fusion session 3) **vs** vraie page `/admin/demandes-rdv` (fidèle handoff)
- « Valider la tournée » : état UI local **vs** persistance `interventions.ordre` (migration)
- Acceptation CGV : `localStorage` **vs** colonne `profiles.cgv_accepted_at`
- Backlog #1 (factures `/client/factures/$id`) : avant ou après le handoff v2 ?

---

## Session 2026-06-04 (16) — Complétion refonte visuelle (pages admin oubliées)

**Constat** : audit empirique du code (pas du todo) → 3 pages admin majeures jamais refondues
lors des sessions 14-15 (jamais listées dans la Phase 2). Client ✅ et terrain ✅ étaient bien faits
(faux positifs grep = chiffres de stats / logos PDF). Designs présents dans le handoff :
`admin-ops.jsx → A_Contrats` + `impact-admin.jsx`.

- [x] `admin.contrats.tsx` → `PageHeader` + 4 `StatTile` (actifs, MRR, gel, résiliés calculés depuis données) + filtres pills + table redesign (raw table, statut en pills tokens) + cards mobiles restylées
- [x] `admin.contrats.$id.tsx` → `PageHeader` (crumbs + numéro + entreprise) + statut pill + Retour, wrapper contenu `p-6 lg:p-8`, lien client préservé
- [x] `admin.impact.tsx` → `PageHeader` + layout `flex flex-col min-h-full` + table coeff header uppercase/tracking + shadow-card (Tabs conservés — KPIs eau/CO₂ non ajoutés car nécessiteraient nouvelles requêtes = hors périmètre CSS-only)
- [x] `login.tsx` → titres `font-semibold` → `font-bold tracking-tight` (poids display tokens ; Outfit déjà via `@layer base`)
- [x] `settings.*` → vérifié : déjà cohérent (h1 Outfit via base layer + Card tokens + layout cross-rôle intentionnel) → pas de churn
- [x] `npx tsc --noEmit --skipLibCheck` → 0 erreur · `npm run build` → OK
- [x] Commit + push

### Review session 16

**Périmètre** : refonte purement visuelle des pages admin restantes. **Zéro logique métier touchée** —
RPCs, appels Supabase, handlers (gel, résiliation, validation impact, dialogs) intacts. Uniquement
classes CSS / structure JSX de présentation.

**Méthode** : mirroring des patterns déjà éprouvés (`admin.clients.tsx` pour la liste, `admin.clients.$id.tsx`
+ `admin.interventions.$id.tsx` pour les fiches détail) + fidélité aux maquettes handoff.

**Leçon clé** : les heuristiques grep (`font-display`, `text-3xl font-bold`) donnent des faux
signaux car `@layer base` applique déjà Outfit à tous les `h1-h4`. Vraie rupture = absence de
`PageHeader` parmi des pages sœurs qui l'utilisent (contrats + impact), pas le poids de police.

---

## Session 2026-06-03 (13) — Audit complet + correctifs sécurité + inventaire design

- [x] Audit code complet (79 points : 5 critiques, 28 importants, 46 mineurs)
- [x] Inventaire pages/fonctions/boutons 3 portails (brief Claude Design)
- [x] Fix CRITIQUE : `rdv_modifie` absent de `send-email` edge function (email replanification silencieusement cassé)
- [x] Fix SÉCURITÉ : `send-email` sans vérification de rôle → client peut spammer staff
- [x] Fix IMPORTANT : upload photo terrain sans validation MIME
- [x] Régénérer types Supabase (éliminer `as any` casts sur `operators`, RPCs typés)
- [x] Deploy edge function `send-email` v11
- [x] Commit + push

### Review session 13 — Merge sur main

**Commits :**
- `1f9e967` fix: audit sécurité — rdv_modifie email, rôle send-email, MIME photos, casts as any
- `3bb6ff1` docs: inventaire complet pages + brief Claude Design + lessons session 13

**Résumé corrections :**
- Bug critique `rdv_modifie` : email replanification absent du switch send-email depuis session 8 → silence fallback default error
- Sécurité : vérification `profiles.role` dans send-email, client limité à 2 types autorisés
- Important : validation MIME `file.type.startsWith("image/")` avant upload photo terrain
- Casts `as any` éliminés : operators + 3 RPCs (AssignerRdvDialog, PlanningCalendar, RouteMap, admin.interventions.$id)
- `routeTree.gen.ts` régénéré : route `terrain.index` était manquante localement
- Brief complet pour Claude Design : `tasks/inventory-design-brief.md` (3 portails, matrices miroirs, statuts visuels)

**État merge :** build TS 0 erreur, tests edge function déployée, codebase prête refonte

---

## Session 2026-06-03 (12) — Refonte onglets opérateur terrain

- [x] 1. Migration DB `20260603050000` : colonne `telephone_intervention` + table `operateur_observations` + RPCs mis à jour
- [x] 2. Régénérer types TypeScript Supabase
- [x] 3. `CreerDemandeRdvDialog` : champ téléphone obligatoire pré-rempli
- [x] 4. `terrain.tsx` : refonte complète 4 onglets (Planning / Interventions / Suivi / Profil)
- [x] 5. `AssignerRdvDialog` : afficher téléphone dans la section lieu
- [x] 6. Validation empirique DB + build TS
- [x] 7. Commit + push + deploy

---

## Session 2026-06-03 (12b) — Correctifs post-tests manuels (audit liaisons)

- [x] Audit complet des 8 points signalés + preuve par timestamps en base
- [x] **Quota (P1)** : faux bug confirmé (annulation #2 → 59 s avant #3). Durci quand même : `creer_demande_rdv` vérifie le quota sur le **mois des créneaux demandés** (au lieu de `NOW()`)
- [x] **Verrou heure (P2)** : `modifier_heure_rdv` bloque si RDV daté jour J/passé OU intervention `en_cours`. Bouton admin masqué sauf `planifiee` future
- [x] **Fiche admin (P4)** : compte-rendu (contrôle/photos/checklists/notes/signature) masqué tant que la prestation n'est pas faite (`en_revision`/`validee`/`refusee`)
- [x] **Suivi vide (P8)** : cause racine = pas de policy RLS `operateur` sur `entreprises`. Policy ajoutée (entreprises liées à ses interventions)
- [x] **Verrou serveur (P5)** : `prendre_en_charge_intervention` refuse le démarrage avant l'heure de déverrouillage (date+heure, fuseau Europe/Paris)
- [x] Tests DB empiriques (impersonation admin/operateur/client) : 6 scénarios validés, données restaurées
- [~] **P3 (email annulation)** : déjà envoyé — retravail global des mails reporté (décision user)
- [x] **P7 (clic onglet Interventions)** : cause racine trouvée — même bug que admin.interventions (session 8). `terrain.tsx` = page pleine sans `<Outlet/>`. Fix : `terrain.tsx` → layout pur, contenu → `terrain.index.tsx`
- [x] P6 (photos/observations opérateur) : déjà présent dans le stepper terrain — rien à faire

---

## Session 2026-06-03 (12c) — Fix routing terrain + purge DB

- [x] Cause root bug clic interventions : `terrain.tsx` sans `<Outlet/>` → fiches `terrain.intervention.$id` ne s'affichaient pas
- [x] Fix : `terrain.tsx` → layout `<Outlet/>` pur, `terrain.index.tsx` → contenu du dashboard opérateur (même pattern admin.interventions)
- [x] Purge DB : 0 demandes_rdv, 0 interventions, 0 logs (5 comptes + 1 entreprise + 1 véhicule + 1 contrat conservés)
- [x] Commit + push
- [x] todos.md + lessons.md mis à jour
- [ ] **Merge branch** `claude/izox-fleet-care-dev-h1D0G` → `main`

---

## 🎨 PROCHAINE SESSION — Refonte visuelle complète (design handoff disponible)

**Fichiers de référence :** `refonte design izox/IZOX-handoff/` (28 fichiers JSX dans le repo main)

### Ordre d'implémentation recommandé

#### Phase 1 — Design system (tokens + composants atomiques) ✅ SESSION 14
- [x] Lire `izox2/tokens.jsx` → extraire les variables CSS (couleurs, typo, espacements, radius)
- [x] Lire `izox2/brand.jsx` → vérifier cohérence avec `tailwind.config` et CSS variables actuelles
- [x] Lire `izox2/atoms.jsx` + `izox2/shell.jsx` + `izox2/system.jsx` → composants Button, Badge, Card, Layout
- [x] Mettre à jour `src/styles.css` (CSS variables) pour matcher les tokens du design
  - Palette complète hex (#F9FAFB paper, #1B4332 brand, sémantiques ok/warn/danger/info)
  - Sidebar blanche (bg white, accents verts, item actif #E7EFEA)
  - Shadows design (elegant/card/strong)
  - Radius : r4=8px(md) / r6=10px(lg) / r10=14px(xl)
  - Ajout info color (#2A6FDB)
- [x] Google Fonts : ajout Outfit (700/800 headings)
- [x] `@layer base` : h1-h4 → Outfit, `.font-display`, `.font-mono`
- [x] `AdminSidebar` : indicateur barre gauche item actif + opacités nav alignées
- [x] `Card` : rounded-xl → rounded-lg (r6=10px) + shadow-card

#### Phase 2 — Portail Admin ✅ SESSION 15
- [x] `admin.index` → Dashboard `PageHeader` + `StatTile` (KPIs live)
- [x] `admin.clients` + `admin.clients.$id` → PageHeader, filtres pills, table redesign
- [x] `admin.planning.index` → PageHeader + sous-onglets recalibrés
- [x] `admin.vehicules` + `admin.vehicules.$id` → PageHeader
- [x] `admin.demandes-gel` → PageHeader + filtre statut en right slot
- [x] `admin.equipe` + `admin.facturation` → PageHeader + empty states stylisés
- [x] `admin.interventions.$id` → PageHeader (immat + contexte) + Retour
- [x] Composant `PageHeader` + `StatTile` créé (`src/components/ui/page-header.tsx`)

#### Phase 3 — Portail Client (desktop + mobile) ✅ SESSION 15
- [x] `client.index` → date header, hero sombre, StatCards, PalierCard
- [x] `client.flotte` + `client.flotte.$id` → filtres pills, MFleetRow cards, gel tokens
- [x] `client.factures` + `client.documents` → empty states icon-block
- [x] `MesPrestationsPage` → header + RDV en right slot
- [x] `ClientNav` (header + bottom nav) → fond clair, accents verts

#### Phase 4 — Portail Terrain ✅ SESSION 15
- [x] `terrain.index` → hero `bg-foreground`, typo Outfit, badges design tokens

#### Phase 5 — Composants transversaux ✅ SESSION 15
- [x] `client.impact` → header redesign, hero cards
- [x] États vides homogénéisés (icon-block + texte descriptif)

### Règles impératives pour la refonte
- **Ne jamais modifier la logique métier** : uniquement CSS classes, layout, composants UI. Les RPCs, Supabase calls, et hooks restent intacts.
- **Vérifier le build TS après chaque phase** : `npx tsc --noEmit --skipLibCheck`
- **Toujours garder la responsivité** : mobile-first, breakpoint `md:` pour desktop
- **Pas de régression fonctionnelle** : tester visuellement chaque page modifiée avant de passer à la suivante

### Review — Refonte visuelle (Sessions 14-15)

**Périmètre :** refonte purement visuelle des 3 portails (admin / client / terrain) à partir du
handoff `refonte design izox/IZOX-handoff/izox2/`. **Zéro modification de logique métier** —
uniquement classes CSS, layout et composants UI. RPCs, appels Supabase et hooks intacts.

**Livré :**
- Phase 1 (design system) : tokens CSS, fonts Outfit/Inter/JetBrains Mono, sidebar claire, shadows, radius
- Phase 2 (admin) : `PageHeader` + `StatTile` généralisés sur 10 pages admin
- Phase 3 (client) : dashboard, flotte, prestations, factures, documents — mobile-first
- Phase 4 (terrain) : hero + typo alignés tokens
- Phase 5 (transversal) : impact RSE, états vides homogènes

**Vérifications :**
- `npx tsc --noEmit --skipLibCheck` → 0 erreur à chaque phase
- Commits incrémentaux par phase sur `claude/izox-visual-redesign-QRnfC`
- Aucun appel DB / RPC touché → pas de validation empirique base requise (CSS/UI uniquement)

**Commits clés :** `058dcb9`, `b116f54`, `1850c97`, `dac2c24`, `5f49754`

---

## Backlog actif

- [ ] **#Feature — Détail facture client `/client/factures/$id`** : maquette `invoice.jsx` (handoff) non implémentée. Nécessite route `client.factures.$id` + fetch table `factures`/`factures_lignes` côté client + rendu aux normes FR (lignes, TVA, totaux). C'est une **nouvelle feature avec logique data**, pas une refonte CSS. La page liste `client.factures` est aujourd'hui un empty state.
- [ ] **#TechDebt — Nominatim → API cartographique SLA** : Nominatim (OSM) sans garantie de SLA, limité à 1 req/s. Prévoir migration vers Mapbox Geocoding API ou Google Maps Geocoding API quand le volume le justifie.
- [ ] **Carte interactive** : optimisation tournée (nearest-neighbor + bouton « Optimiser ») à faire quand plusieurs opérateurs.
- [ ] **Migration domaine `izox.fr`** : mettre à jour `SITE_URL` env var Supabase + vérifier que `/reset-password` reste dans les redirect URLs.
- [ ] **Lier nouveaux opérateurs** : quand un 2e opérateur est créé, ajouter `user_id` dans `operators` via migration ou UI admin.

---

## Historique sessions

### Session 2026-06-03 (12c) — Fix routing terrain + purge DB
- Bug racine clic interventions : `terrain.tsx` pleine page sans `<Outlet/>` → pattern identique au bug admin.interventions (session 8)
- Fix : split `terrain.tsx` (layout pur) + `terrain.index.tsx` (dashboard)
- Purge DB complète : demandes_rdv, interventions, logs vidés — 5 comptes + données entreprise conservés

### Session 2026-06-03 (11) — Correctifs bugs terrain post-déploiement
- Migration `20260603040000` : RLS `vehicules_operateur_select` + contrainte "1 en_cours à la fois" dans RPC
- `terrain.tsx` : `AvenirCard` cliquable (fiche planifiée), `todayCount` corrigé, `hasEnCours` désactive le CTA
- Reset DB test : 2 interventions repassées en `planifiee`
- CLAUDE.md : règle "Validation empirique obligatoire" + lessons.md mis à jour

### Session 2026-06-03 (10) — Compte opérateur fonctionnel + redesign terrain
- **Fix critique** : liaison `operators.user_id → auth.users` — interventions planifiées désormais visibles par l'opérateur terrain
- Migration `20260603030000_operateur_liaison.sql` : `user_id` sur `operators`, RLS interventions + photos + storage mis à jour
- RPC `prendre_en_charge_intervention()` : `planifiee → en_cours` + `operateur_id = auth.uid()`
- `terrain.tsx` refonte complète : hero sombre + stats live, section "À venir" (planifiées), section "En cours" (auto-refresh 30s), bottom nav 4 onglets (Recherche / En cours / Histoire / Profil), tab Profil
- `terrain.intervention.$id.tsx` refonte : vue planifiée (date/lieu + CTA), header enrichi (#ID · client · pack), stepper avec labels, zones avec badge ok/à faire, compteurs checklists
- `interventions.ts` : 6 zones extérieures, checklists simplifiées client-facing, `typeScope()` ajouté

### Session 2026-06-03 (9) — Créneaux RDV + GPS/Carte
- Formulaire client : 2 créneaux min sur jours différents (`hasSameDayCreneaux`, init 2 créneaux vides)
- RPC `get_creneaux_disponibles` : capacite_totale = COUNT(operators)*2, multi-opérateurs ready
- Guard race condition dans `creer_demande_rdv` : exception SQL si tous créneaux saturés au submit
- Calendar grise dates full-saturées ; RadioGroup grise demi-journée saturée
- Edge function `geocode-address` déployée (Nominatim, JWT, fire-and-forget)
- `creer_demande_rdv` + `assigner_rdv` : stockent et propagent latitude/longitude
- `AssignerRdvDialog` : badge ⚠️ + bouton "Géocoder" si latitude IS NULL
- `RouteMap` : centre adaptatif (dernier GPS DB → Paris fallback, plus de hardcoding)

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
