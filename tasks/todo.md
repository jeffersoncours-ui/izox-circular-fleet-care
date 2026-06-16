# Todo — IZOX

---

## Session 2026-06-16 (47) — Avis clients : carrousel StaggerTestimonials + table admin-manageable

Demande utilisateur : composant 21st.dev "Stagger Testimonials" fourni pour la section Avis clients de la landing. Après critique (contenu factice = conflit avec la politique "aucun faux avis" L121-2 C. conso déjà en place, style carte blanche/clip-path incohérent avec `.b2c-glow-card`), décisions validées :
- Carrousel codé mais vide pour l'instant (0 avis réel) — rempli plus tard.
- Cartes restylées en `.b2c-card b2c-glow-card` (pas de clip-path/bandelette/inversion couleur).
- Aucune photo par défaut (slot `photo_url` prévu pour une future synchro Google Reviews — espoir exprimé par l'utilisateur, hors scope aujourd'hui).
- Stockage en table Supabase admin-manageable (pas un tableau codé en dur) — anticipe le besoin futur.

### Plan

- [x] **Migration `avis_clients`** : `auteur_nom` text not null, `auteur_role` text nullable, `texte` text not null, `note` smallint nullable (check 1-5), `photo_url` text nullable, `source` text not null default `'manuel'` (check `manuel`/`google`), `google_review_id` text nullable unique, `publie` boolean not null default `false`, `created_at` timestamptz default now().
- [x] **RLS** : SELECT public (anon+authenticated) où `publie = true` ; ALL pour admin/staff via `has_role()`. Testé empiriquement (cf. note ci-dessous).
- [x] Régénérer les types TypeScript Supabase.
- [x] **`src/components/landing/TestimonialsStagger.tsx`** : adapté du snippet 21st.dev — retrait `"use client"`, clip-path, bandelette diagonale, inversion couleur carte centrale (remplacée par glow/bordure renforcés, `.is-center` directement sur la carte `.b2c-glow-card` → réutilise la règle `:hover` existante dans `landing-b2c.css`) ; cartes en `.b2c-card b2c-glow-card` ; étoiles (lucide `Star`) si `note` présent ; avatar uniquement si `photo_url` présent ; a11y clavier (`role="button"`/`tabIndex`/Enter-Espace) + `aria-live` ; respect `prefers-reduced-motion` (règle globale déjà en place) ; retourne `null` si moins de 3 avis (pas assez pour un effet stagger correct).
- [x] **`Reviews()` (`sections.tsx`)** : fetch des avis publiés ; si ≥ 3 → `<TestimonialsStagger/>` ; sinon la carte honnête actuelle reste affichée à l'identique (zéro changement visiteur tant qu'il n'y a pas assez d'avis réels).
- [x] **Admin `/admin/avis`** (admin + staff) : liste + créer/éditer/supprimer + bascule publié/dépublié. Champs : nom, rôle, texte, note (select 1-5), publié (switch). `source` toujours `'manuel'` depuis ce formulaire (`photo_url` pas dans le formulaire admin pour l'instant — réservé à la future synchro Google). Entrée sidebar "Avis clients" (icône `Star`, visible admin+staff+commercial, `RoleGuard` interne limite réellement à admin+staff).
- [x] Validation empirique DB : insert avis publié + non publié ; RLS anon → ne voit que `publie=true` ; RLS admin → voit tout (y compris non publié, via impersonation JWT claims) ; mise en défaut → anon `INSERT` refusé (`42501 insufficient_privilege`, erreur RLS brute vérifiée sans handler qui l'aurait masquée) ; mise en défaut #2 → `commercial` ne peut ni lire les non-publiés ni `DELETE` (0 ligne affectée, RLS `USING` exclut le rôle). UPDATE (toggle publié) testé admin → OK. SELECT anon avec exactement les colonnes utilisées par `Reviews()` → 3 lignes retournées dès que `publie=true`, confirmant le seuil `≥3` du carrousel.
- [x] `npx tsc --noEmit --skipLibCheck` (0 erreur) + `npm run build` (0 erreur, `routeTree.gen.ts` régénéré pour `/admin/avis`).
- [x] Commit + push sur `claude/izox-project-continuation-2nkupi` (commit `f80d42c`).
- [ ] **Nettoyage différé** : le serveur MCP Supabase s'est bloqué (« MCP tool call requires approval » sur tout appel, y compris `SELECT 1`) avant la suppression des 3 lignes de test (`avis_clients.auteur_nom LIKE 'TEST-%'`). Sur décision utilisateur, le nettoyage automatique a été abandonné — **à supprimer manuellement** (dashboard Supabase ou page `/admin/avis` une fois déployée) avant tout merge sur `main`. Les UUID : `5d0abf7b-4292-42a3-8f7b-a5debe8e6242`, `d0a5f0d2-6604-4992-965e-d54585a06142`, `bacadfde-56bd-4642-87bb-7d716fae7f30`.

**Hors scope explicite** : intégration réelle API Google Business Profile (OAuth, credentials) — le schéma (`source`, `google_review_id`, `photo_url`, `note`) est prêt à l'accueillir sans nouvelle migration, mais aucun code de synchro aujourd'hui.

---

## Session 2026-06-16 (46) — Rollback toggle formule + audit complet landing

Demande utilisateur : tentative de redesign du toggle de formule (Intérieur/Int.+Ext.) en "capsule verre dépoli" avec glider glow + icônes (`FormuleToggle.tsx`). Après vérification visuelle sur le déploiement Vercel, le rendu n'a pas convaincu — rollback complet décidé plutôt que de continuer à itérer.

- [x] **Rollback** : `PricingSection.tsx` + `landing-b2c.css` restaurés à l'état pré-expérience (`git checkout <commit pré-toggle> -- ...`), tabs simples d'origine. `FormuleToggle.tsx` + `public/plaque-formule.png` supprimés (`git rm`).
- [x] **Audit complet landing** (3 agents parallèles, scopes non-chevauchants : composants `.tsx` / `landing-b2c.css` / routes) :
  - Fix bug : `installFilDeLeau` ne s'installait jamais sur une page sans élément `.rv` (return précoce dans `PublicLayout.tsx`) — découplé des reveals IntersectionObserver.
  - Fix bug : `try/catch/finally` manquant autour de `supabase.functions.invoke("create-lead", ...)` dans `reservation.tsx` et `entreprises.tsx` — un throw réseau laissait le bouton bloqué en chargement (`setSending` jamais remis à `false`).
  - Dead code : import `React` inutilisé (`AlphaVideo.tsx`), fonctions `remap`/`viewportProgress` jamais appelées (`scrollScenes.ts`), 302 lignes de CSS orpheline dans `landing-b2c.css` (anciens boutons `.b2c-btn--ghost`/`.b2c-btn--yellow`, `.b2c-figure`, `.b2c-glow-ring/text`, `.b2c-hairline`, `.stepcard__num`, tout l'ancien bloc d'animations SVG `gv-*`/`.station`/`.fish`/`.chain-item` remplacé par des images statiques en session 42). Thèmes `.t-noir/.t-nuit/.t-papier` (appliqués dynamiquement en JS, non grep-ables côté `.tsx`) explicitement préservés.
  - A11y : `aria-pressed` (tabs PricingSection, swatches/segmented TweaksPanel), `aria-label` (select thème, range glow, 3 champs accroche + CTA du TweaksPanel).
  - Commentaires de phase obsolètes corrigés (`Hero.tsx`, `sections.tsx`, `PublicLayout.tsx` mentionnaient encore "Phase 2b/2c" pour des features déjà livrées).
- [x] **Validation** : `npx tsc --noEmit --skipLibCheck` 0 erreur + `npm run build` clean sur l'état consolidé (rollback + 3 audits).
- [x] Commit + push sur `claude/circular-fleet-care-landing-2lu5v6`.

### Review session 46
- **Livré** : retour à un toggle de formule simple et fiable après échec visuel de la version "capsule verre dépoli" ; profit de la pause pour un audit défensif complet de toute la landing B2C (bugs réels + dead code + a11y), sans toucher au design existant.
- **2 vrais bugs corrigés**, pas de simples nitpicks : un défaut d'animation scroll silencieux (`installFilDeLeau`) et un risque de bouton bloqué sur erreur réseau dans 2 formulaires de lead.
- **503 lignes nettes supprimées** (CSS mort + composant/asset abandonnés) contre 104 insertions — la landing ressort plus légère qu'avant l'expérience.
- **Méthode** : 3 agents parallèles sur des scopes disjoints (composants / CSS / routes) pour auditer vite sans risque de conflit, chacun avec sa propre vérification (`tsc`/`build`), puis revue manuelle de chaque diff avant commit.

---

## Session 2026-06-15 (45) — Design premium landing : 7-seg, ShinyButton, GlowCard

### Afficheur 7-segments LCD (chiffres fluo)
- [x] **SevenSegment.tsx** créé (`src/components/landing/`) : `SevenSegmentDigit` (SVG 1 chiffre, `b2c-seg-on`/`b2c-seg-off`) + `SevenSegmentNumber` (multi-chiffres, IntersectionObserver + easeOutCubic, `animate=false` → `setDisplay(value)` dans `useEffect` pour prop change, `aria-label`). Fix : glow via `filter: drop-shadow()` (pas `text-shadow`, inopérant sur SVG).
- [x] **sections.tsx** : WaterLoop `~50 L` + `80 %` + `50 %` + `2 à 4×` → SevenSegment. Retrait `CountUp`. Retrait step numbers `01/02/03` de HowItWorks.
- [x] **PricingSection.tsx** : prix véhicules (80/110/140/170 €) + options (40/40-60 €) → SevenSegment. `items-baseline` → `items-center` (SVG incompatible avec baseline). `animate=false`.
- [x] **entreprises.tsx** : `2 à 4×`, `80 %`, `50 %` → SevenSegment.
- [x] **CSS** : `.b2c-seg-number`, `.b2c-seg-digit` (glow drop-shadow pilotés par `--b2c-glow`), `.b2c-seg-on`/`.b2c-seg-off`, `.b2c-seg-affix` (néon + alignement vertical).
- [x] **CountUp.tsx** supprimé (code mort, toutes les instances remplacées par SevenSegmentNumber).

### ShinyButton (CTA premium)
- [x] **Étape 1 — animé (21st.dev Ali Imam)** : intégré avec `@property` Houdini + 3 `@keyframes` + conic-gradient tournant. Adapté : `"use client"` retiré, CSS scopé `.izox-b2c`, couleurs sur `--b2c-accent`. Appliqué sur tous les gros CTA (Hero, Reviews, FinalCta, Reservation, Entreprises, Abonnement).
- [x] **Étape 2 — simplifié (bug animation)** : animation tournante jugée buggy/glitchy → remplacement par bordure fluo STATIQUE. Suppression des 4 `@property` + 3 `@keyframes`. Nouveau `.shiny-cta` : `border: 1px solid var(--b2c-accent)` + `box-shadow` glow, picots `::before` en accent statiques, lueur bas `::after`, hover = glow amplifié + `translateY(-1px)`. Aucune animation, zéro `animation-composition`.
- [x] **`.b2c-btn--ghost`** supprimé (CSS mort, plus utilisé depuis conversion en `.shiny-cta`).

### GlowCard (conteneurs premium)
- [x] **`.b2c-glow-card`** (CSS, scopée `.izox-b2c`) : bordure fluo statique (`color-mix`), picots intérieurs `::before` en accent, lueur 4 angles `::after`, box-shadow halo pilotés par `--b2c-glow`, hover intensifié. `isolation: isolate` + `z-index: -1` sur pseudo-éléments → contenu toujours visible.
- [x] **Appliquée sur `/`** : stepcard HowItWorks (×3), carte tarifs véhicules, carte options, carte Reviews, carte FAQ, carte abonnement.
- [x] **Appliquée sur `/reservation`** : carte principale (incohérence détectée à l'audit + corrigée).
- [x] **Appliquée sur `/entreprises`** : Lever cards (×4), LeadForm, confirmation envoi.
- [x] **Navbar** : `b2c-glow-sep-b` (bordure inférieure fluo + halo vers le bas).
- [x] **Footer** : `b2c-glow-sep-t` (bordure supérieure fluo + halo vers le haut).

### Audit final + merge
- [x] TypeScript 0 erreur · `npm run build` OK · isolation CRM : `b2c-glow-card`/`shiny-cta` dans bundles landing uniquement.
- [x] Audit subagent : 3 problèmes identifiés et corrigés (carte /reservation manquante, CountUp.tsx mort, `.b2c-btn--ghost` CSS mort).
- [x] Merge sur `main`.

### Review session 45
- **Livré** : 3 couches de design premium sur la landing — afficheur 7-segments LCD (chiffres fluo animés au scroll), ShinyButton statique fluo (pill sombre bordure accent, picots), GlowCard (bordure fluo + picots + lueur angles sur tous les conteneurs de contenu + navbar/footer).
- **Code mort retiré** : `CountUp.tsx`, `.b2c-btn--ghost`, `border-dashed` sur la carte Reviews.
- **Cohérence** : bouton et cartes partagent le même langage (statique, fluo, accent, glow piloté par `--b2c-glow`) → TweakPanel contrôle tout.
- **Validation** : tsc 0 erreur, build propre, isolation CRM confirmée, audit subagent 0 problème résiduel.

---

## Session 2026-06-15 (44) — Avant/Après → galerie flip (21st.dev)

Demande utilisateur : remplacer la présentation avant/après (placeholders hachurés en grille) par le composant « Flip Gallery » (21st.dev, Le Thanh). Option A retenue : avant→après du même véhicule, alternés. Photos laissées vides (fournies plus tard).

- [x] **Audit existant** : `BaCard`+`BeforeAfter` (sections.tsx), `<BeforeAfter/>` (index.tsx), classes `.ba-*`+`.rv-left/.rv-right` (landing-b2c.css). Vérifié : `.rv-left/.rv-right` utilisées uniquement par BaCard.
- [x] **Critique du prompt** : template Next/shadcn générique → chemin `ui/` inadapté (→ `landing/`), `<style>` global à scoper, lucide déjà présent (no-op), `demo.tsx` = code mort écarté.
- [x] **`FlipGallery.tsx`** créé (`src/components/landing/`) : types stricts (`GalleryItem`, refs typées), guards DOM (`querySelector?.animate`), cleanup des `setTimeout` au unmount, `prefers-reduced-motion` → swap instantané, aria FR. **Bug stale-closure corrigé** : index passé explicitement (la source lisait `currentIndex` via closure → image décalée).
- [x] **CSS scopé** dans landing-b2c.css (`.izox-b2c #flip-gallery …`), couleurs sur tokens b2c, slot vide = hachures placeholder.
- [x] **`BeforeAfter()`** réécrit : `SectionHeading` conservé + `<FlipGallery/>` centré. `BaCard` supprimé.
- [x] **Code mort retiré** : `.ba-tag/.ba-tag--after/.ba-ph/.ba-ph__label/.rv-left/.rv-right`.
- [x] **Validation** : `tsc` 0 erreur · `npm run build` OK · SSR `/` rend `flip-gallery` + 0 ancien marqueur · `/login` 0 token b2c (isolation CRM).
- [x] Commit + push

### Partie 2 — Kickers néon bleu (CSS pur)
Demande : mettre les petits titres bleus majuscules (`.b2c-kicker`) en style néon, **en gardant le bleu et les majuscules**. Composant 21st.dev `NeonRGBTextEffect` fourni mais **écarté** (canvas WebGL plein écran, texte codé en dur, effet aberration RGB blanc ≠ néon bleu, 12 contextes GL nécessaires = perf/limite navigateur). Solution retenue : CSS `text-shadow`.

- [x] **Analyse** : composant inadapté (blanchit le texte au lieu de bleu, 12 canvas WebGL impossibles avec le fond fumée déjà présent). Recommandé + validé : néon CSS fixe.
- [x] **landing-b2c.css** : `text-shadow` néon 3 couches sur `.b2c-kicker`, dans `rgba(63,216,255,…)` (= accent), intensité pilotée par `--b2c-glow` (TweaksPanel). Texte conservé bleu accent. Fixe (pas de flicker).
- [x] **Validation** : `tsc` 0 erreur · `npm run build` OK · SSR `/` kickers présents · `/login` 0 token b2c.

### Partie 3 — Cadre kicker Vision + fusion sections doublons
Demandes : (1) retirer le cadre (pilule bordée) du kicker « Notre feuille de route » (Vision). (2) fusionner RseProof dans WaterLoop : doublons 80 %/50 % supprimés, ne garder que « 2 à 4× » placé à côté du « ~50 L ». (3) kicker fusionné en 2 lignes empilées « Notre différence » + « Des chiffres réels, pas des promesses ».

- [x] **Vision** : pilule `rounded-full border bg` retirée → `<p class="b2c-kicker">` simple (néon conservé).
- [x] **SectionHeading** : prop `kicker` `string` → `React.ReactNode` (pour 2 lignes empilées).
- [x] **WaterLoop** : kicker 2 lignes empilées ; bloc figures en grille 2 colonnes → `~50 L` + `2 à 4× / moins d'eau / qu'un lavage au jet à domicile`.
- [x] **RseProof + RseStat supprimés** (code mort) ; import + rendu retirés de `index.tsx`. Les 80 %/50 % restent dans WaterLoop (descriptions berme/filtration).
- [x] **Validation** : `tsc` 0 erreur · `npm run build` OK · SSR : kicker 2 lignes présent, `2 à 4×` unique (doublon éliminé), paragraphe RseProof absent, cadre pilule absent, `/login` 0 token b2c.

### Partie 4 — Simplification kicker boucle d'eau + alignement chiffres
- [x] **WaterLoop** : retrait de la 2e ligne du kicker (retour à « Notre différence » seul).
- [x] **WaterLoop** : bloc `~50 L` + `2 à 4×` aligné à gauche (`max-w-2xl`, plus de `mx-auto`/`text-center`).

### Partie 5 — Espacement kicker Hero
- [x] **Hero.tsx** : `<h1>` `mt-5` → `mt-2` — rapproche le kicker néon de son titre, homogène avec les section headings.

### Partie 6 — Néon généralisé à tous les textes bleus
- [x] **landing-b2c.css** : variable `--b2c-neon` (halo 3 couches, pilotée par `--b2c-glow`) factorisée et appliquée à `.b2c-kicker`, `.b2c-accent` (mots italiques des titres), `.b2c-figure` (chiffres + prix véhicule), `.b2c-glow-text`.
- [x] **PricingSection.tsx** : prix option → ajout `b2c-glow-text`.
- [x] Icônes (SVG) volontairement non traitées (`text-shadow` inopérant sur SVG).
- [x] **Validation** : `tsc` 0 erreur · `npm run build` OK.

### Review session 44
- **Livré** : (1) galerie flip avant/après (FlipGallery, photos vides en attente) ; (2) néon bleu fixe généralisé à TOUS les textes bleus via `--b2c-neon` (kickers, mots accentués, chiffres, prix), réglable par le slider glow ; (3) fusion des sections « boucle d'eau » / « preuve RSE » (doublons 80 %/50 % supprimés, `2 à 4×` rapatrié à côté du `~50 L`) ; (4) nettoyages d'espacement (cadre pilule Vision retiré, kicker Hero rapproché, chiffres alignés à gauche).
- **Composants 21st.dev** : Flip Gallery intégré (adapté + bug stale-closure corrigé) ; NeonRGBTextEffect **écarté** (WebGL plein écran inadapté) au profit d'un néon CSS pur — plus simple, plus performant, et fidèle à la demande (bleu conservé).
- **À fournir par l'utilisateur** : vraies photos avant/après → `ITEMS[].url` dans `FlipGallery.tsx` + fichiers dans `public/landing/`.
- **Aucune donnée DB créée** (frontend/CSS only). Purge §7 exécutée avant merge par conformité.

---

## Session 2026-06-14 (43) — Fond fumée WebGL + perf vidéo + essais titres (rollbackés)

### Partie 1 — Fond animé fumée WebGL (conservé)
Demande utilisateur : ajouter un fond fumée premium (obtenu sur 21st.dev, corrigé par Gemini) sous le filigrane, sécurisé + optimisé.

- [x] **SmokeBackground.tsx** : renderer WebGL2 (shader fbm + filigrane halftone fusionné en texture). Fallback si pas de WebGL2, prefers-reduced-motion = 1 frame, pause sur onglet caché, DPR plafonné 1.5 × RENDER_SCALE 0.6, cap 25 fps, skip GPU si intensité ~0.
- [x] **useTweaks.tsx** : ajout `smokeColor` + `smokeIntensity` (defaults #155e63 / 0.32).
- [x] **TweaksPanel.tsx** : contrôles teinte (5 presets + picker) + slider intensité.
- [x] **landing-b2c.css** : suppression du pseudo-élément `::before` filigrane (fusionné dans le canvas) + keyframes watermark-drift.
- [x] **Commits** : `7ce9f95`, `b3a94ca`

### Partie 2 — Fluidité vidéo HeroCar (conservé)
Demande utilisateur : la vidéo de la voiture bégaie par moments.

- [x] **AlphaVideo.tsx** : `will-change: contents` + `contain: layout style paint` sur le container, `backfaceVisibility: hidden` sur la vidéo → isole les repaints du canvas fumée + reveal.
- [x] **Hero.tsx** : `contain: layout style paint` sur la section.
- [x] **SmokeBackground.tsx** : cap fps 30 → 25 (réduit la contention GPU avec le décodage vidéo).
- [x] **Commits** : `9d3ed9c`, `147b6e8`

### Partie 3 — Essais d'effets sur les textes/titres (TOUS ROLLBACKÉS)
4 tentatives successives, toutes rejetées par l'utilisateur → revert propre à chaque fois.

- [x] **TextBlockAnimation (GSAP SplitText)** sur les sous-textes → rejeté (lag) → revert `93414cc` + retrait deps gsap.
- [x] **Titres isométriques v1** (perspective + rotateX) → rejeté (fuite 3D, sans rapport avec la réf) → revert `1891895`.
- [x] **Titres isométriques v2** (skew 2D + extrusion) → rejeté → revert `54bac38`.
- [x] **LayeredText** (empilement de mots isométrique, réf poster, statique) → rejeté → revert `d2fe962`.

### Partie 4 — Vérif finale + merge main
- [x] **Revue de bugs** (subagent) sur toute la landing : SSR guardé, cleanups complets, aucune référence cassée, assets présents. Rien de bloquant.
- [x] **Fix défensif Hero.tsx** : fallback si `heroLine3` vidé via le panel (évite `<em>` vide).
- [x] **Fix doc** : commentaires fps 30 → 25 dans SmokeBackground.
- [x] **tsc + build** : 0 erreur.

### Review session 43
- **Conservé** : fond fumée WebGL (pilotable via TweaksPanel) + optimisations fluidité vidéo HeroCar.
- **Abandonné** : tout effet visuel sur les titres/textes (4 approches testées, aucune validée). Les titres restent en serif éditorial classique avec reveals `.rv`.
- **Leçon clé** : pour un effet visuel subjectif, livrer une version minimale testable + rollback facile (1 commit par essai) plutôt que de sur-investir. Voir lessons.md.

---

## Session 2026-06-14 (42) — Landing B2C : cleanup Hero + em-dashes + copyright

### Partie 1 — Nettoyage Hero
Demandes utilisateur : (1) retirer bouton inutile "Voir comment l'eau revit" ; (2) renommer "Envie d'un abonnement ou société ?" ; (3) auditer les liens.

- [x] **Hero.tsx** : suppression du bouton ghost "Voir comment l'eau revit ↓" (lien vers #boucle)
- [x] **Hero.tsx** : suppression import `ArrowDown` (inutilisé)
- [x] **Hero.tsx** : renommage bouton "Envie d'un abonnement ou société ?" → "Vous êtes une entreprise ?"
- [x] **PublicLayout.tsx** : suppression du lien navbar "La boucle d'eau" (desktop + mobile)
- [x] **Audit complet** : aucune autre référence externe au bouton supprimé ✓
- [x] **Commit** : `72f926e`

### Partie 2 — Remplacer em-dashes "—" par virgules ","
Demande utilisateur : retirer les tirets em-dashes du contenu visible et les remplacer par des virgules.

- [x] **sections.tsx** : 7 em-dashes remplacés (Boucle d'eau, Tarifs, Options, Abonnement, FAQ)
  - "Pas de lavage « sans eau »... — c'est ça" → "... c'est ça"
  - "Pression optimisée — la saleté..." → "Pression optimisée, la saleté..."
  - "circuit court — chaque lavage..." → "circuit court, chaque lavage..."
  - "rentable — écologiquement..." → "rentable, écologiquement..."
  - "exploitation — et donc vos prix" → "exploitation, et donc vos prix"
  - "premier nettoyage — sans engagement" → "premier nettoyage, sans engagement"
  - "Tout juste lancés — vos avis..." → "Tout juste lancés, vos avis..."
  - "consommation) — c'est la politique..." → "consommation), c'est la politique..."
- [x] **PricingSection.tsx** : "prix payé — rien de plus" → "prix payé, rien de plus"
- [x] **PublicLayout.tsx** : copyright "© IZOX — Circular Fleet Care" → "© IZOX"
- [x] **PublicLayout.tsx** : logo alt "IZOX — Circular Fleet Care" → "IZOX"
- [x] **Build validation** : `npm run build` 0 erreur ✓
- [x] **Commit + push** : `6e69ea8`

### Partie 3 — Remplacer schéma SVG de la boucle d'eau par image statique
Demande utilisateur : remplacer le schéma SVG animé + textes autour par une image statique détourée avec textes au-dessus/dessous.

- [x] **Image source** : détourage ffmpeg/PIL avec alpha transparent et feathering (bords fondus)
  - Fond noir retiré via lumakey (threshold=25–65)
  - Flou gaussian sur alpha pour bords fondus naturels
  - PNG RGBA 1069×971 → `public/boucle-traitement.png`
- [x] **sections.tsx** : simplifier WaterLoop()
  - Retirer useRef + useEffect (animations scroll inutiles)
  - Retirer import WaterLoopDiagram
  - Retirer import installWaterLoop
  - Remplacer schéma SVG par image centrée + deux textes blancs :
    * "Recueillir la saleté avec un minimum de volume" (au-dessus)
    * "Traitement des hydrocarbures et métaux lourds pour une maîtrise des déchets" (au-dessous)
- [x] **Code mort supprimé** :
  - `src/components/landing/illustrations/WaterLoopDiagram.tsx` (git rm)
  - `installWaterLoop()` dans scrollScenes.ts (reste `installFilDeLeau`)
- [x] **Build validation** : `npm run build` 0 erreur ✓
- [x] **Commit + push** : `e701202`

### Review session 42

**Livré — Corrections landing complètes :**

**Partie 1 — Nettoyage Hero :**
- Bouton "Voir comment l'eau revit" supprimé (CTA scroll inutile).
- Lien navbar "La boucle d'eau" supprimé (cohérence).
- CTA "Envie d'un abonnement ou société ?" → "Vous êtes une entreprise ?" (plus directe).

**Partie 2 — Em-dashes → virgules :**
- 9 em-dashes "—" remplacés par virgules dans le contenu visible.
- Copyright : "© 2026 IZOX — Circular Fleet Care" → "© 2026 IZOX"

**Partie 3 — Schéma boucle d'eau :**
- Image statique détourée (alpha + feathering) remplace le schéma SVG animé.
- Filigrane visible derrière l'image, bords fondus intégrés.
- Deux textes blancs au-dessus et au-dessous (sans uppercase, même style que le reste).
- Code mort supprimé : -147 lignes (SVG + animations scroll inutiles).

---

## Session 2026-06-14 (41) — AquaponieImage : remplacement SVG → vidéo → image statique PNG

Demande utilisateur (évolution en cours de session) : remplacer le schéma SVG aquaponie par une vidéo IA gravure, puis **pivot vers image statique PNG** (plus qualitative).

### Partie 1 — Vidéo gravure (remplacée par pivot PNG)
- [x] **Conversion WebM VP9 alpha** : ffmpeg lumakey → yuva420p · `public/aquaponie.webm` 2,1 Mo
- [x] **MP4 fallback** : `public/aquaponie.mp4` 1 Mo
- [x] **`AlphaVideo.tsx`** : composant générique partagé (logique vidéo-alpha) — HeroCar l'utilise, zéro duplication
- [x] **`HeroCar.tsx`** : refactoré en mince wrapper sur `AlphaVideo`
- [x] **`scrollScenes.ts`** : suppression `installAquaponie` (code mort)
- [x] **`AquaponieScene.tsx`** : supprimé

### Partie 2 — Pivot image statique PNG (état final)
- [x] **PNG source utilisateur** → `public/aquaponie-scene.png` (1,3 Mo → retravaillé 1,5 Mo RGBA)
- [x] **Détourage fond noir en alpha réel** : ffmpeg `lumakey=threshold=0.04:tolerance=0.10:softness=0.22,gblur=sigma=1.5:steps=2:planes=8,format=rgba` → PNG RGBA sans fond carré noir
- [x] **`AquaponieImage.tsx`** : composant simple `<img>` (pas de vidéo, pas de mask-image CSS — le PNG porte son alpha)
- [x] **`AquaponieVideo.tsx`** : supprimé (pivot PNG), `aquaponie.webm` + `aquaponie.mp4` supprimés
- [x] **`sections.tsx`** : import `AquaponieImage`, taille 480px → 580px → 680px
- [x] **Validation** : tsc 0 erreur · build OK ✓

### Review session 41

**Livré — AquaponieImage (PNG gravure détouré) :**
- `AlphaVideo.tsx` générique reste en place (utilisé par HeroCar).
- PNG fond noir → alpha réel baked via ffmpeg lumakey (même technique que les vidéos, appliquée à une image statique). CSS `mask-image` radial-gradient ne suffisait pas : il coupe les coins mais laisse les zones noires internes opaques.
- Composant `AquaponieImage.tsx` minimaliste : `<img>` direct, alpha natif du fichier, pas de JS.
- Nettoyage complet : vidéo aquaponie (2,1 Mo WebM + 1 Mo MP4) retirée, net -2,1 Mo d'assets.

---

## Session 2026-06-14 (39) — Firefox H.264 codec fix + WebM fallback + iOS unlock

Demande utilisateur : rollback à l'état avant aquaponie vidéo, puis investiguer pourquoi la voiture reste invisible sur Firefox malgré les fixes précédents. **Root cause diagnostiqué** : Firefox sur Linux ne supporte PAS le H.264 (mp4) sans codecs système. Le navigateur traitait le fichier mp4 comme audio → icon lecteur audio visible en UI.

- [x] **Rollback** : reset à b851497 (état pré-aquaponie). Restauré AquaponieScene.tsx SVG.
- [x] **Diagnostic Firefox** : H.264 mp4 non décodable sur Firefox sans system codecs. Seul WebM VP9 fonctionne natif.
- [x] **Solution = double source WebM/mp4** : restauré `hero-car-r5.webm` (917 KB, VP9) + refonte HeroCar.tsx.
- [x] **HeroCar.tsx refonte complète** :
  - Ajout `containerRef` (parent) pour iOS unlock handler
  - Ajout `unlocked` state (re-trigger render loop)
  - iOS unlock effect : click/touchstart → `video.play()` + `setUnlocked(!unlocked)`
  - Remplacé `src="/hero-car-r5.mp4"` → `<source src="/hero-car-r5.webm" type="video/webm">` PUIS `<source src="/hero-car-r5.mp4" type="video/mp4">`
  - Pur rAF loop (pas rVFC) + `drawFrame` immediate sur `loadeddata` (fallback si autoplay bloqué)
  - Forced `muted=true`, `defaultMuted=true`, `playsInline=true` imperatifs (React ne reflète pas toujours)
  - Deps useEffect : `[reduced, unlocked]`
- [x] `npm run build` ✓ · Commit + push `claude/izox-review-plan-b0b2ul`
- [ ] **À vérifier** : Firefox display voiture sur preview Vercel (WebM VP9 décod natif) + Chrome/Edge inchangé

### Review session 39

**Root cause Firefox finalement identifiée** : H.264 mp4 non décodable natif sans system codecs. WebM VP9 fallback restauré → expected fix Firefox + suppression audio icon.

---

## Session 2026-06-13 (38) — Hero R5 vidéo : Canvas chroma-key + trim artefact final

Demande utilisateur : remplacer l'illustration statique (masque luminance PNG) par une **vidéo animée** (R5 E-Tech nettoyée par l'utilisateur), avec chroma-key Canvas pour éliminer le fond noir complètement (garantir la transparence sur tous les navigateurs). Dernier artefact : boîte noire visible en fin du clip (drawbox pour masquer l'étoile) — réduire la vidéo pour l'éviter.

- [x] **Analyse approche A/B** : mix-blend-mode CSS insuffisant (fond noir reste visible malgré screen/lighten). Solution = Canvas chroma-key propre.
- [x] **HeroCar.tsx refonte** : `<canvas>` visible + `<video>` cachée hors-écran. Chaque frame vidéo traitée en temps réel : `getImageData` → alpha keying basé sur `max(r,g,b)` (seuils LO=18 transparent, HI=64 opaque, dégradé lissé entre) → `putImageData`. Traitement sous-échantillonné 676×370 pour perf mobile. `requestVideoFrameCallback` avec fallback rAF. `prefers-reduced-motion` → frame figée à t=1.0s (voiture visible).
- [x] **Erreur 1 — flash noir au démarrage** : poster initial était noir. Fix : utiliser frame à t=1s avec voiture visible (58 KB JPG → retirer du commit final).
- [x] **Erreur 2 — fond noir persistant** : mix-blend-mode CSS imprévisible. Fix : Canvas chroma-key garantit 100% transparence du fond (49% des pixels alpha 0) + filigrane passe intégralement derrière.
- [x] **Erreur 3 — artefact noir en fin (drawbox étoile)** : visible sur "RETOUR LOCAL". Fix : réduire vidéo de 4.04s → 3.5s (ffmpeg -t 3.5, re-encode H.264 web-optimisé). Artefact final supprimé, voiture + jet d'eau + boucle conservés.
- [x] `npm run build` ✓ · tsc 0 erreur · 3 commits pushés sur `claude/izox-review-plan-b0b2ul` · Merge main imminent

### Review session 38

**Livré — Hero R5 vidéo avec Canvas chroma-key** :
- **Canvas API chroma-key** : approche robuste indépendante du navigateur (pas mix-blend-mode). Alg luminance : max(r,g,b) ≤ 18 → transparent, ≥ 64 → opaque, dégradé lissé entre (49% des pixels alpha 0). Prefers-reduced-motion = frame t=1s figée.
- **Optimisation perf** : sous-échantillonnage 676×370, traitement canvas redimensionné en CSS 100%, `willReadFrequently: true` pour hint browser.
- **Trim vidéo** : ffmpeg -t 3.5 appliquée localement (env cloud), boîte noire drawbox (x=960:50×50 y=495) éliminée de la fin du clip. Durée finale 3.5s, voiture animée + water loop intact.
- **Assets** : ancien poster noir + masque PNG supprimés. Source unique = `public/hero-car-r5.mp4` 876 KB (trimée).
- **Validation** : SSR build 0 erreur. Isolation CRM confirmée (aucun Canvas/chroma dans `/login`). Render Canvas = client-side JS (pas SSR blocking).

---

## Session 2026-06-13 (37) — Hero R5 : masque luminance + couleur TweakPanel

Demande utilisateur : remplacer l'illustration SVG gravure (jugée trop simpliste)
par une **image blueprint R5 E-Tech fournie**, détourée pour se superposer au
filigrane de la page, avec couleur **adaptable via TweakPanel** (bleu fluo).

- [x] **Détourage** : image source fond noir (`max(r,g,b)` aux coins ≈ 0-9) → masque grayscale (noir=transparent, blanc=tracé) via PIL `max(r,g,b)` + étirement de contraste (threshold 10). Conserve voiture + jet + berme + textes intégrés à l'image.
- [x] **Couleur adaptable** : abandon de `<image>` SVG → `div` avec `mask-image`/`mask-mode:luminance` + `background:var(--b2c-accent)`. La couleur suit le TweakPanel en temps réel, **zéro JS**. Webkit prefix sur `-mask-image/-size/-repeat/-position` (Safari/Chrome).
- [x] **Itérations utilisateur** :
  - Retrait textes/jets animés/scan line (rounds intermédiaires) → finalement tout intégré dans l'image fournie
  - Étoile bas-droite **exclue** du masque (zone y>670, x>1180 mise à 0 avant crop)
  - Crop au contenu (bbox) + fade bords (8% G/D, 5-6% H/B) pour des bords propres
  - Bleed mobile calibré `-mx-5` (annule exactement le padding container 1.25rem) → image pile largeur viewport, "RETOUR LOCAL" / "BERME DE RÉCUPÉRATION" complets, pas de coupe
- [x] Image finale `public/hero-car-r5.png` : 1100×576, grayscale, ~255 Ko
- [x] `npm run build` ✓ · tsc 0 erreur
- [x] CLAUDE.md + lessons.md mis à jour · merge → `main`

### Review session 37

Changement purement visuel (hero landing). Technique clé : **mask-image + background var()** = recoloration d'une image monochrome pilotée par CSS var (TweakPanel), sans dupliquer l'asset par couleur ni toucher au JS. Le détourage par masque de luminance (`max(r,g,b)` + étirement) préserve toute la profondeur du tracé. Aucune donnée de test DB créée (frontend only).

---

## Session 2026-06-13 (36) — Finitions landing B2C (round 3)

- [x] **Logo IZOX réel** : image marque (900×245 RGBA, fond vert opaque → traitement PIL luminance → PNG blanc fond transparent 300×82). `Wordmark` texte → `<img src="/logo-izox-brand.png">` dans `PublicLayout`. CRM (AdminSidebar, ClientNav) inchangé = `logo-izox.png` conservé.
- [x] **Filigrane velours animé** : tile → `cover 130vmax` sans répétition + oscillation triangulaire (42%→58%→50%→42%, 26s ease-in-out) = dérive organique style velours, zéro bande JPEG.
- [x] **Accent bleu fluo** : `#3FE08F` (vert) → `#3FD8FF` (bleu clair fluo) — CSS var + tous `rgba(63,224,143,…)` → `rgba(63,216,255,…)` + SVG hardcoded + useTweaks + TweaksPanel.
- [x] **Goutte eau montante** : `installWaterLoop` + `WaterLoopDiagram` — ajout `clipPath#waterLevel` avec `<rect data-water-rect>` animé en JS (bas→haut au scroll) + `linearGradient#waterGrad` (opaque bas, transparent haut). Effet verre d'eau.
- [x] **Légendes stations** : grille 3 colonnes autour de la goutte (top/bottom `b2c-mono uppercase`, left/right idem). Stats existantes (50L / 80% / 50%) conservées.
- [x] **Bassin aquaponie centré** : mur droit x=400→380 (marge symétrique 20px). ClipPath, hachures, lignes d'eau, panneau de contrôle mis à jour.
- [x] **Bouton hero** : « Envie d'un abonnement ou société ? » — `b2c-btn--primary` (accent fluo, modifiable en live via TweaksPanel). Pleine largeur mobile.
- [x] `npm run build` ✓ · Purge DB ✓ · Merge → `main` ✓

### Review session 36

Finitions visuelles pures. Leçons clés : traitement PIL luminance pour extraire un logo sur fond opaque ; bande noire JPEG en tile = bord near-black → corriger en cover+oscillation ; SVG clipPath avec rect animé = meilleure approche pour fill d'une forme custom.

---

## Session 2026-06-12 (35) — Corrections landing B2C round 2 (5 demandes user)

- [x] **1. Hero kicker** : « · Évry-Courcouronnes » retiré (reste « Nettoyage circulaire » seul). La ville reste dans le lead et le footer.
- [x] **2. HeroCar agrandi** : viewBox resserré `0 0 460 320` → `56 36 404 276` (suppression des marges mortes = vraie cause du rendu petit), `max-w` 520→620, `-mx-5 sm:mx-0` (pleine largeur mobile, annule le padding container).
- [x] **3. AquaponieScene agrandie** : label « rampes led » recentré au-dessus de la rampe (plus de débord droit), viewBox `0 0 520 420` → `96 0 328 420` (gain ×1.59), `max-w` 520→480 (format portrait), `-mx-6 sm:mx-0` (pleine largeur mobile dans la card). `installAquaponie` inchangé (coordonnées user units non affectées par le viewBox).
- [x] **4. PricingSection refondue** : matrice 4 cards → **liste lignes** (véhicule + exemples à gauche, prix à droite, séparateurs) dans une card max-w-2xl centrée. Tabs mono uppercase (INTÉRIEUR / INT. + EXT. (+30 €)), section Options en liste dessous, footer note mono « TOUS PRIX TTC · ACOMPTE 30 % EN LIGNE, SOLDE SUR PLACE ». Données `pricing-b2c.ts` inchangées.
- [x] **5. Filigrane halftone** (style hermes-agent.nousresearch.com) : image user compressée (952 K EXIF → 130 K grayscale 760px, EXIF strippé) → `public/watermark-halftone.jpg`. CSS : `.izox-b2c::before` fixed plein écran, `opacity 0.06`, `mix-blend-mode: luminosity` (prend la teinte du fond), `z-index -1` + `isolation: isolate` sur `.izox-b2c` (reste sous tout le contenu). Zéro effet CRM (CSS importé uniquement par PublicLayout).
- [x] `tsc` 0 erreur · `npm run build` ✓ · SSR `/` : kicker sans ville, 3 viewBox neufs, note tarifs présente, `/watermark-halftone.jpg` HTTP 200 · `/login` : 0 token b2c (isolation CRM confirmée)
- [x] Commit + push `claude/landing-page-visual-fixes-x2pj6w`

### Review session 35

Refonte visuelle pure, zéro logique métier. L'agrandissement des SVG passe d'abord par le resserrage des viewBox (cause racine : marges mortes), pas seulement par le `max-w`. Opacité du filigrane (0.06) ajustable facilement si trop discret/présent sur le preview Vercel.

---

## Session 2026-06-12 (34) — Corrections visuelles landing B2C (3 demandes user)

### Plan (validé par l'utilisateur — pas de GSAP/Framer, archi scrollScenes existante)

- [x] **1. Avant/Après** : layout 2/1/2 (Sellerie ×2 / Extérieur pleine largeur / Moquette ×2), tuiles AVANT slide-in gauche, APRÈS slide-in droite au scroll. Nouvelles classes `.rv-left`/`.rv-right` (observées par l'IO `.rv` existant), placeholder hachuré `.ba-ph` + étiquette `.ba-ph__label`, chips `ba-tag` restylées (après = vert plein). Titre « Avant. *Après.* ». Labels provisoires — à ajuster avec les vraies photos.
- [x] **2. Boucle d'eau** : stadium → **goutte verticale** (`LOOP_PATH` réécrit, viewBox 360×420). Contour seul animé : point lumineux part du sommet et parcourt le bord au scroll (tuyau qui se remplit) — `installWaterLoop` inchangé (mêmes data-attributes). 4 dots d'étape sur le contour (t=0.01/0.3/0.5/0.7), plus de labels dans le SVG. Textes repositionnés en HTML autour de la goutte : ~50 L centré au-dessus, 80 % / 50 % en grille dessous (plus de cards). CSS : `.pipe-outer/.pipe-inner/.loop-sheen` → `.drop-track/.drop-fill`, `.loop-draw` aminci (2.6).
- [x] **3. Aquaponie** : réécriture gravure fluo d'après l'image de référence (sans personnage) — rack vertical 2 étages, 5 plants feuillus/étage, rampes LED (`.gv-led` dasharray + pulse), cuve à poissons en bas (eau hachurée pattern, panneau de contrôle), 3 poissons `data-fish` + bulles conservés. `installAquaponie` : constantes de trajectoire recalées sur la nouvelle cuve (x[150..390], y[316..382]).
- [x] `tsc` 0 erreur · `npm run build` ✓
- [x] Validation SSR (dev server 127.0.0.1:3100) : `/` HTTP 200 — tous nouveaux marqueurs présents (rv-left ×2, rv-right ×3, drop-track, data-loop-draw/drop, gv-led, data-fish ×3, ba-ph__label), anciens absents (pipe-outer, loop-sheen, Étape 1, Habitacle = 0). **Isolation CRM confirmée** : `/login` sans aucun token b2c.
- [x] Commit + push `claude/landing-page-visual-fixes-x2pj6w`

### Review session 34

Refonte visuelle pure — zéro logique métier touchée. Le prompt GSAP/Framer fourni par l'utilisateur a été écarté d'un commun accord (archi scrollScenes vanilla déjà en place, plus légère). Rendu final à valider sur le preview Vercel (pas d'outil de screenshot dans le container).

---

## [REFONTE v2] Landing B2C dark premium — `tasks/design-brief-v2.md`

⚠️ **Le CRM B2B (admin/client/terrain/settings/login) ne change PAS visuellement.**
Tout le dark mode est scopé sous `.izox-b2c` — aucun effet hors de cet arbre.
Le `:root` global de `styles.css` reste light, intact.

### Phase 2a — Fondation visuelle dark ✅ (session 33)
- [x] **`src/styles/landing-b2c.css`** : tokens v2 (abysse `#06120C`, accent `#3FE08F`, glow, tscale) + remap des tokens sémantiques CRM scopé `.izox-b2c` (Button/Input rendent dark sans modif) + thèmes t-noir/t-nuit/t-papier + classes (`.b2c-display` serif, `.b2c-accent` italic glow, `.b2c-card`, `.b2c-btn`, `.stepcard`, `.ba-tag`, `.fil`, `.rv` reveals) + `prefers-reduced-motion`
- [x] **Fonts** : Instrument Serif + Archivo ajoutés au lien Google Fonts root (dispo globale, usage scopé)
- [x] **`useTweaks.tsx`** : contexte + localStorage + application CSS vars (panneau UI = Phase 2d)
- [x] **`PublicLayout`** : wrapper `.izox-b2c` dark, navbar/footer dark, wordmark texte, fil de l'eau (structure), IntersectionObserver reveals (progressive enhancement : visible si JS off), `body.b2c-active` anti-seam overscroll
- [x] **Hero** : accroche serif éditoriale (dernier mot italic accent), double CTA `.b2c-btn`, placeholder gravure R5 (halo + goutte SVG)
- [x] **sections.tsx** : HowItWorks, WaterLoop, RseProof, BeforeAfter, Vision, Subscription, Reviews, FAQ, **FinalCta** (nouveau) — tous dark + reveals
- [x] **PricingSection** : tabs formule (Intérieur / Int.+Ext.) + matrice dark + options
- [x] **reservation/entreprises** : `bg-white` → transparent (présentables en dark ; refonte complète = Phase 2f)
- [x] Build ✓ + tsc 0 erreur + isolation CRM vérifiée (aucun sélecteur global non scopé impactant, aucune collision de classe)

### Phase 2b — Illustrations SVG au trait ✅ (session 33)
- [x] **HeroCar** : gravure R5 hatchback au trait (hachures NOCTRA via pattern), lance + 4 jets animés (gv-flow), brume (gv-mist), ruissellement + gouttes (gv-drip), berme + tuyau retour local, étiquettes pulse
- [x] **WaterLoopDiagram** : tuyau stadium (pipe-outer/inner/loop-draw/loop-sheen) + 4 stations (data-station-t) + goutte pilote (data-loop-drop) — LOOP_PATH exporté
- [x] **AquaponieScene** : bassin + ligne d'eau + 3 poissons (data-fish) + bulles (gv-bubble) + cultures hors-sol + circuit court légumes
- [x] Micro-animations CSS autonomes ajoutées (jets/brume/gouttes/pulse/bulles) + classes pipe/station/fish/chain (gated `data-anim` pour progressive enhancement)

### Phase 2c — Animations scroll-driven ✅ (session 33)
- [x] **scrollScenes.ts** : `installFilDeLeau` (height + goutte via scroll global), `installWaterLoop` (dashoffset via getTotalLength/getPointAtLength + stations .lit + goutte sur le path), `installAquaponie` (`setFish(p)` oscillation + orientation scaleX) — tous rAF-throttlés, prefers-reduced-motion = état final figé
- [x] Wiring : fil dans PublicLayout, boucle dans WaterLoop (ref), poissons dans Vision (ref)
- [x] **CountUp** : compteurs (IntersectionObserver + easeOutCubic) sur figures boucle (~50 L / 80 % / 50 %) + RSE
- [x] Hover `fillwater` desktop (`@media hover:hover` — jamais sur tactile)
- [x] **Validation empirique** : dev server SSR → `/` HTTP 200, tous marqueurs présents (noctra, data-loop-draw, data-fish, fil-trail), 0 erreur SSR. **CRM isolé confirmé** : `/login` sans `izox-b2c` ni couleur dark, `body.b2c-active` absent du SSR (client-side only). `/entreprises` + `/reservation` rendus.

### Phase 2d — Tweaks panel UI ✅ (session 33)
- [x] **TweaksPanel** : toggle flottant bas-droite → panneau (drawer mobile / carte desktop)
- [x] Contrôles : swatches accent + custom color, select fond (4 thèmes), swatches carrosserie + segmented trait/teintée, segmented serif/Outfit, sliders taille titres (80–125 %) + glow (0–100 %), text inputs accroche (3 lignes) + CTA, bouton réinitialiser
- [x] Câblage carrosserie : `--b2c-car` + classe `.car-teinte` sur wrapper → coque `[data-car-body]` reçoit fill translucide en mode teintée
- [x] Tout persisté via `useTweaks` (localStorage), scopé `.izox-b2c`
- [x] Validation SSR : toggle présent sur `/`, **absent sur `/login`** (CRM intact), 0 erreur

### Phase 2e — Responsive + perf ✅ (session 33)
- [x] `overflow-x: clip` sur `.izox-b2c` (coupe les halos sans casser la navbar sticky)
- [x] Layout déjà responsive : clamp() sur titres/sections, grids `sm:`/`lg:`, fil masqué <860px, illustrations SVG viewBox (height auto → 0 CLS)
- [x] FCP protégé : contenu SSR, animations en useEffect post-hydratation (jamais bloquantes)
- [x] Scroll listeners rAF-throttlés + passive ; CountUp via IntersectionObserver
- [x] prefers-reduced-motion : état final figé partout (déjà en place)

### Phase 2f — /entreprises + /reservation dark-native ✅ (session 33)
- [x] **/entreprises** : réécrit dark-native (b2c-display serif + accent, b2c-kicker, b2c-card, b2c-btn glow, CountUp sur stats RSE, reveals)
- [x] **/reservation** : page d'attente dark-native (b2c-card, serif accent, b2c-btn) — capture email conservée
- [x] Validation SSR : `/entreprises` + `/reservation` HTTP 200, classes b2c présentes, 0 erreur

### Phase 2g — Tunnel de réservation complet ⏳ BLOQUÉ (compte Stripe requis)
- [ ] Multi-step form (code postal/gate 25km, véhicule, formule, options, prix direct, créneau, coordonnées, paiement)
- [ ] Cuve de progression CSS
- [ ] Moteur de réservation temps réel (table interventions partagée B2B/B2C, invariant 2 slots/demi-journée, atomicité SELECT FOR UPDATE, hold 10 min)
- [ ] Paiement Stripe (acompte 30 % / intégral) + webhook + emails Resend
- [ ] **Prérequis utilisateur** : créer le compte Stripe + fournir les clés (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, VITE_STRIPE_PUBLISHABLE_KEY)

### Review Phases 2a–2f (session 33) ✅ TERMINÉ

**Livré — Refonte landing B2C design v2 (6 phases complètes)** :

- **Phases 2a–2c : Dark foundation + Illustrations + Scroll animations** ✅
  - Dark mode scopé `.izox-b2c` (abysse #06120C, accent #3FE08F glow). Tokens sémantiques remappés (Button/Input rendent dark automatiquement).
  - SVG illustrations : HeroCar (R5 gravure au trait, hachures NOCTRA, 4 jets animés), WaterLoopDiagram (tuyau stadium loop-draw loop-sheen, 4 stations, goutte pilote), AquaponieScene (bassin, 3 poissons data-fish, bulles, cultures).
  - Scroll animations : `scrollScenes.ts` avec rAF throttle, IntersectionObserver, CountUp (lazy), getPointAtLength for SVG path tracing. `prefers-reduced-motion` freeze final state.

- **Phase 2d : Tweaks panel UI** ✅
  - Float toggle bottom-right (glow) → drawer avec contrôles (accent swatches + custom, fond 4 themes, carrosserie trait/teinte, typo serif/Outfit, taille 80–125 %, glow 0–100 %, accroche 3 lignes, CTA label).
  - localStorage persistence via `useTweaks`. Zero impact CRM (`izox-b2c` scoped).

- **Phases 2e–2f : Responsive + Polish + Dark routes** ✅
  - `overflow-x: clip` for sticky navbar coups. FCP protected (animations post-hydration). Responsive grids clamp() scales.
  - `/` (Hero + 9 sections dark-native) + `/reservation` (dark card email capture) + `/entreprises` (B2B dark hero + Levers + LeadForm).

**Validation empirique** :
- SSR : `/` `/reservation` `/entreprises` HTTP 200, dark classes present, 0 errors.
- CRM isolation verified : `/login` remains light, no dark classes, TweaksPanel absent.
- Build : `tsc 0 errors`, `npm run build 0 errors`.

**Commits** : 5 commits on `claude/izox-invoice-generation-5fyxk9`
- cd918c5 facture_emise email + terrain bug fix (session 32)
- 4b91c3e design v2 plan + brief
- dc6006d Phase 2a dark foundation
- 7f23c3d Phase 2b illustrations + Phase 2c scroll animations
- 88aa6ac Phase 2d Tweaks panel
- bcc1b49 Phase 2e responsive + Phase 2f dark routes polish

**Blocked on Phase 2g** : Stripe tunnel requires user Stripe account + STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, VITE_STRIPE_PUBLISHABLE_KEY environment variables.

---

## [PLAN] Landing B2C IZOX — 4 phases

> Brief complet : `tasks/brief-landing-b2c.md`

### Architecture (décisions fixes)
- Même app TanStack Start / Vercel — routes publiques `/`, `/reservation`, `/entreprises` côte à côte du CRM `/admin`, `/client`, etc.
- `AuthProvider` au root est OK — il ne force aucun redirect, les pages publiques ignorent le contexte auth.
- `/` cesse d'être un redirect vers `/login` — devient la landing B2C.
- Meta `robots` de la landing = indexable (overrider le `noindex` global du root).
- Séparation stricte tarifaire : `src/lib/pricing-b2c.ts` (TTC B2C) ≠ `src/lib/pricing.ts` (HT B2B).

### Prérequis avant Phase 3 (Stripe)
- Compte Stripe créé + clés API env Vercel (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
- Variable `VITE_STRIPE_PUBLISHABLE_KEY` côté client

---

### Phase 1 — Routes publiques + contenu statique ✅ (session 33)

- [x] `npm install framer-motion` (v12.40 — utilisé à partir Phase 4)
- [x] **`src/routes/index.tsx`** : landing publique. Guard auth callback préservé (hash `#access_token`/`type=recovery` → redirect client-side `/login`)
- [x] **`src/components/landing/PublicLayout.tsx`** : navbar (Tarifs, Boucle d'eau, Entreprises, **Espace client → /login**, CTA Réserver) + footer + menu mobile
- [x] **`src/lib/pricing-b2c.ts`** : catalogue TTC (4 véhicules × 2 formules + Puzzi/Ozone), `prixTotalB2C()`, `ZONE_INTERVENTION`, `CHIFFRES_EAU` (source unique chiffres RSE)
- [x] **Hero** : « On lave à l'eau. On la récupère. On la fait revivre. » + double CTA + lien flotte + bandeau confiance
- [x] **Comment ça marche** : 3 étapes
- [x] **Boucle d'eau** (statique Phase 1) : 50 L / 80 % / 50 % avec base de comparaison nommée
- [x] **Preuve RSE** : « 2 à 4× moins d'eau qu'un lavage au jet », aucune certification mentionnée
- [x] **Grille tarifaire** : matrice complète + options détaillées par véhicule
- [x] **Avant/après** : placeholders explicites (vraies photos à fournir)
- [x] **Vision** : badge « Notre feuille de route », rentabilité écologique mentionnée
- [x] **Abonnement** : module discret (mailto en attendant l'offre définitive)
- [x] **Avis clients** : empty-state honnête — AUCUN faux avis (L121-2 C. conso)
- [x] **FAQ** : 6 questions (zone, paiement, annulation L221-28, produits, durée, autonomie)
- [x] **Footer** : liens juridiques marqués « à venir » (contenus définitifs pas prêts)
- [x] **`src/routes/entreprises.tsx`** : hero B2B + 4 leviers + stats RSE + formulaire lead complet
- [x] **`src/routes/reservation.tsx`** : page d'attente avec capture email (zéro 404 sur le CTA, zéro lead perdu) — remplacée par le tunnel en Phase 2
- [x] **Migration `leads_landing`** : type b2b|b2c_attente, CHECK champs b2b, unique lower(email)+type, RLS deny-by-default (SELECT/UPDATE internes, DELETE admin, zéro policy anon)
- [x] **Edge function `create-lead` v1** (publique, verify_jwt=false) : whitelist types, validation email, caps longueur, doublon idempotent, notification interne équipe sur lead B2B
- [x] **SEO** : meta robots `index,follow` sur `/`, `/reservation`, `/entreprises` (override du noindex root) + og tags
- [x] **robots.txt** : réécrit — pages vitrine ouvertes aux moteurs classiques, CRM bloqué (`/admin`, `/client`, `/terrain`, `/settings`, `/reset-password`), crawlers IA toujours bloqués
- [x] Types Supabase régénérés (95 101 chars) + `npm run build` ✓ + `tsc` 0 erreur
- [x] Validation empirique (voir Review)

### Review Phase 1 (session 33)

**Validation empirique DB (fixture nettoyée, leads=0) :**
- INSERT b2b nominal ✓ · INSERT b2c_attente nominal ✓
- Doublon email+type → 23505 bloqué ✓ (l'edge function le mappe sur `{ok:true}` idempotent)
- CHECK b2b sans téléphone → bloqué ✓ · type hors whitelist → bloqué ✓
- RLS négatif : `SET ROLE anon` → SELECT 0 rows, INSERT direct refusé ✓
- RLS positif : impersonation admin → voit les 2 leads ✓
- ⚠️ Invoke HTTP réel de `create-lead` non testable depuis le sandbox (réseau sortant bloqué) — à vérifier sur l'app déployée : soumettre le formulaire `/entreprises` et la page `/reservation`.

**À fournir par l'utilisateur avant ouverture :**
- Vraies photos avant/après (`public/landing/`)
- Contenus juridiques : mentions légales, CGV (annulation + L221-28), politique de confidentialité
- Email `contact@izox.fr` à créer chez OVH (utilisé dans footer + abonnement)

---

### Phase 2 — Tunnel `/reservation` (multi-step + créneaux)

- [ ] **`src/routes/reservation.tsx`** : route publique `/reservation`
- [ ] **Multi-step form** (8 étapes, voir §6 brief) : état local `step` + `formData`
- [ ] **Étape 1** : code postal + gate 25km Évry-Courcouronnes (geocodage Nominatim via edge function existante ou calcul haversine JS) — capture email si hors zone
- [ ] **Étape 1 bis** : détection flotte → proposition bascule `/entreprises` (discrète)
- [ ] **Étapes 2–4** : véhicule / formule / options → prix TTC affiché en direct (recalcul instantané depuis `pricing-b2c.ts`)
- [ ] **Étape 5** : calendrier créneaux temps réel — RPC `get_creneaux_disponibles` existant adapté B2C (4 créneaux fixes : 8h, 11h, 14h, 16h30 — invariant 2 slots/demi-journée partagé B2B/B2C)
- [ ] **Étapes 6–7** : coordonnées + opt-ins RGPD séparés (réservation nécessaire ≠ prospection opt-out)
- [ ] **Étape 8** : récap + choix acompte 30 % / intégral → Stripe (Phase 3)

---

### Phase 3 — Paiement Stripe + atomicité hold

- [ ] **Migration Supabase** `reservations_b2c` : client_nom/email/tel, adresse_intervention, type_vehicule, formule, options JSONB, montant_ttc, montant_acompte, stripe_payment_intent_id, statut (en_hold | confirmee | annulee | expiree), slot_date, slot_heure, slot_creneau
- [ ] **Contrainte d'unicité** `(slot_date, slot_creneau, equipe_id)` sur `reservations_b2c` UNION interventions B2B — COUNT vérifié par RPC
- [ ] **Hold 10 min** : colonne `hold_expires_at TIMESTAMPTZ` + cron cleanup (étend `cron_maintenance_quotidienne`)
- [ ] **RPC `reserver_slot_b2c`** : SELECT FOR UPDATE + INSERT + hold atomique
- [ ] **Edge function `create-reservation-b2c`** : appelle `reserver_slot_b2c`, crée Stripe PaymentIntent (montant acompte ou intégral), retourne `client_secret`
- [ ] **Stripe Elements** intégré côté client (étape 8 tunnel)
- [ ] **Edge function `stripe-webhook`** : on `payment_intent.succeeded` → statut `confirmee` + sendEmail `reservation_b2c_confirmee`
- [ ] **Nouveau type email** `reservation_b2c_confirmee` dans `src/lib/email.ts` + `send-email` edge function (confirmation client + résumé intervention + lien annulation)
- [ ] **Annulation** : edge function `annuler-reservation-b2c` → statut `annulee` + Stripe refund acompte + sendEmail

---

### Phase 4 — Animations (après validation fonctionnelle)

- [ ] **Fil de l'eau** : SVG path vertical qui relie les sections, goutte pilotée au scroll (Framer Motion `useScroll` + `useTransform`)
- [ ] **Section Boucle d'eau** : tracé SVG animé scroll-driven, chiffres RSE qui s'allument au passage de la goutte
- [ ] **Section Vision** : animation goutte → compost → poissons → légumes (scroll-driven)
- [ ] **Cuve progression tunnel** : CSS pur `clip-path` lié au `step` courant — 0/8 → 8/8
- [ ] **Boutons desktop** : remplissage eau bas→haut + effet magnétique (`useMouseMove`)
- [ ] **Mobile-first check** : aucun hover mappé sur touch, scroll natif non perturbé
- [ ] **`prefers-reduced-motion`** : wrapping conditionnel sur tous les composants Framer
- [ ] **Lazy-load** : `React.lazy` + `Suspense` sur les sections d'animation (sous la ligne de flottaison)
- [ ] **Perf** : vérifier FCP < 1,5s (aucune animation ne bloque le premier rendu)

---

## Session 2026-06-11 (32) — Email "Facture disponible" + test cycle facturation

### Constat (audit facturation)
- `emettre_facture` (RPC) : attribue le numéro séquentiel + crée une **notification interne** client, mais **aucun email Resend** n'est envoyé.
- `send-email` (edge function) : 8 types couverts, **`facture_emise` absent**.
- `src/lib/email.ts` : union `EmailType` sans `facture_emise`.
- `admin.facturation.tsx` `handleEmettre` : n'appelle pas `sendEmail` après l'émission.
- Conséquence : le client reçoit une notif in-app mais aucun email l'informant qu'une facture est disponible.

### Plan
- [x] **email.ts** : ajouter `"facture_emise"` à l'union `EmailType`
- [x] **send-email/index.ts** : `buildFactureEmiseHtml()` (numéro, période, montant TTC, échéance, bouton → `/client/documents`) + case `facture_emise` (lecture `factures` + `entreprises(nom, email_contact)` + `resolveClientEmail` fallback). Déployée **v18 ACTIVE**.
- [x] **admin.facturation.tsx** : `sendEmail("facture_emise", factureId)` (fire-and-forget) après succès de `emettre_facture`
- [x] **Bug session 31 corrigé** (bloquait le build) : `terrain.index.tsx` `.sort()` utilisait `a.last`/`b.last` au lieu de `a.lastNoteDate`/`b.lastNoteDate` → TS2339. Corrigé.
- [x] `npx tsc --noEmit --skipLibCheck` → 0 erreur
- [x] **Test empirique du cycle complet** (voir Review) : fixture → `generer_facture` → `emettre_facture` → vérifs OK. Fixture nettoyée, DB vierge (users=4, tout à 0).
- [ ] Commit + push

### Review session 32

**Livré — email "Facture disponible" :**
- Nouveau type `facture_emise` (frontend `email.ts` + edge `send-email` v18). Template avec numéro, période facturée, montant TTC, date d'échéance, bouton CTA vers `/client/documents`.
- `handleEmettre` (admin.facturation) déclenche `sendEmail("facture_emise", id)` en fire-and-forget après l'émission — le client reçoit désormais un **email Resend** EN PLUS de la notification in-app (qui existait déjà).
- Destinataire résolu via `resolveClientEmail` : `entreprises.email_contact` → fallback email auth du compte client. RBAC : `facture_emise` hors `CLIENT_ALLOWED_TYPES` → seuls admin/staff/commercial peuvent le déclencher.

**Hors-plan corrigé :** bug TS session 31 dans `terrain.index.tsx` (`.last` inexistant) qui cassait `tsc`/build.

**Validation empirique (cycle complet, fixture nettoyée) :**
- `generer_facture(CT-TEST-S32, 6, 2026)` → brouillon. Lignes : 2 passages × 97,75 € (= 85 × 1,15 multiplicateur mensuel) = **195,50 € HT**, palier starter (1 véh., 0%), franchise TVA. ✓
- `emettre_facture` → **FA-B2B-2026-000003**, statut `emise`, `date_echeance` = émission +30j (2026-07-11). ✓
- Données lues par l'email vérifiées en DB : numéro, montant TTC 195,50, période 01→30 juin, échéance, **destinataire `jeffersoncours@gmail.com`** (résolution `email_contact` OK). ✓
- Notification interne créée : « Nouvelle facture disponible — FA-B2B-2026-000003 », lien `/client/documents`. ✓
- RLS client **positif** : le client voit la facture émise. **négatif** : un brouillon (juillet) reste invisible au client. ✓
- Envoi Resend réel non testable depuis SQL (invoke JWT requis) — à confirmer côté app déployée (parité avec les 8 types email déjà fonctionnels). DB remise vierge.

---

## Session 2026-06-11 (31) — Journal multi-notes opérateur + vue admin/équipe

### Décisions utilisateur
- Note rattachée à un **client (entreprise_id)**, véhicule optionnel
- Remplace l'UI textarea-par-intervention (table `operateur_observations` conservée, UI retirée)
- Côté admin : onglet "Notes clients" dans `/admin/equipe` (panneau droit, à côté du chat)

### Plan

- [x] **DB** : migration `operateur_notes` (entreprise_id, vehicule_id nullable, operateur_id, date_observation DATE, note TEXT) + 5 RLS (opérateur CRUD own, admin/staff SELECT all)
- [x] **Types** : régénérés (94 057 chars)
- [x] **terrain.index.tsx** : `TabObservations` remplacée → liste cards clients cliquables (nom, nb notes, dernière date) + search. Route cible : `/terrain/suivi/$id`
- [x] **terrain.suivi.$id.tsx** : nouvelle route (renommée depuis `terrain.client.$id` — `.client.` interdit par le plugin SSR `import-protection`) — header client, form (date picker max=today, véhicule optionnel, textarea), journal groupé par date, suppression avec confirmation
- [x] **admin.equipe.tsx** : panneau droit → onglets "Messages" | "Notes clients" ; `NotesPanel` (lecture seule, groupé par client)
- [x] `npm run build` → ✓ 0 erreur (client + serveur)
- [x] Tests empiriques : INSERT note OK, 5 RLS vérifiées, données nettoyées (notes=0, entreprises_test=0)
- [ ] Commit + push

---

## Session 2026-06-11 (30) — Audit fiches admin + scope intervention + timeline prestations

### Audit (3 zones, demandé par l'utilisateur après tests manuels)

1. **Timeline « Historique » fiche contrat** (`/admin/contrats/$id`, PAS la fiche client) :
   source = `admin_actions_log` filtré sur `details->>'contrat_id'`. 11 types d'événements
   mappés (création, ajustement flotte, validation/refus véhicule, gel/reprise, résiliation,
   clôture mensuelle, maintenance cron…). **Manquait** : la validation d'une intervention
   n'écrivait rien dans `admin_actions_log` → invisible dans la timeline.
2. **Fiche validation intervention admin** (`/admin/interventions/$id`) : affichait l'extérieur
   (zones photo + checklist) même pour un `pack_interieur`. Cause = `typeScope()` **redéfinie
   localement** (cassée, renvoyait `complet` pour tous les packs) au lieu d'importer celle de
   `interventions.ts`. La fiche terrain, elle, importait la bonne.
3. **Observations clients opérateur** (`/terrain` → Suivi) : écriture inline (textarea onBlur →
   upsert `operateur_observations`, 1 note/intervention, `now()` forcé, pas d'antidate). Souhait
   futur = cliquer fiche → page dédiée → journal multi-notes antidatées.

### Corrigés cette session

- [x] **Sujet 2 — scope fiche admin** : `admin.interventions.$id.tsx` importe désormais
  `typeScope` depuis `@/lib/interventions`, suppression de la version locale cassée. `scope`,
  `showInt`, `showExt` recalés. Un `pack_interieur` n'affiche plus que l'habitacle + checklist
  intérieur (parité avec la fiche terrain).
- [x] **Sujet 1 — log prestation validée** : migration `20260611010000_log_intervention_validee.sql`
  → trigger `trg_log_intervention_validee` (AFTER UPDATE, SECURITY DEFINER, search_path=public)
  insère `action='intervention_validee'` dans `admin_actions_log` (contrat_id, immat, pack, date,
  validated_by) à la transition vers `validee`. Mapping UI ajouté dans `getActionMeta()` de
  `admin.contrats.$id.tsx` (icône Sparkles, « Prestation validée · {immat} · {pack} »).

### Tests empiriques (session 30)

- [x] Trigger : fixture entreprise+contrat+vehicule+intervention `pack_interieur` → UPDATE→validee
  → log créé avec `contrat_id`, `immatriculation=TEST-LOG-99`, `pack=pack_interieur`, date, user ✓
- [x] Mise en défaut : UPDATE ultérieur (notes / re-set validee) → pas de doublon (condition
  `OLD.statut IS DISTINCT FROM 'validee'`) ✓
- [x] Fixture nettoyée : 0 entreprise test, 0 intervention, `auth.users=4` ✓
- [x] `npm install` + `npx tsc --noEmit --skipLibCheck` → 0 erreur ✓

### Décidé, à faire en session dédiée

- [ ] **Sujet 3 — journal multi-notes antidatées (opérateur)** : nouvelle table `operateur_notes`
  (1 ligne = 1 note, `date_observation`, `entreprise_id`/`vehicule_id`, `note`, `created_at`,
  `operateur_id`) + nouvelle route terrain `/terrain/client/$id` (cards cliquables → page dédiée
  avec date picker antidaté borné à aujourd'hui + liste des notes). La table actuelle
  `operateur_observations` (UNIQUE intervention+operateur, pas de date d'obs) ne permet pas le
  multi-notes — décision utilisateur : **journal multi-notes**.

---

## Session 2026-06-11 (29 — suite) — Bugs terrain + géocodage + dégel contrat

### Bugs corrigés

- [x] **`_recalculer_caches_contrat` — colonne `remise_pct` inexistante** : `degeler_contrat` échouait avec ERROR 42703. Migration `20260610c_fix_recalculer_caches_contrat_taux_remise.sql` → `SELECT palier, taux_remise` (même oubli que sessions 27c/28 sur les autres RPCs). Vérifié : `degeler_contrat('CT-202606-0001', 'cron')` retourne `{success:true}`, contrat repassé `actif`, caches recalculés.
- [x] **Intervention annulée encore réalisable côté opérateur** : `terrain.intervention.$id.tsx` n'avait pas de garde pour `statut='annulee'` → le stepper s'affichait, les photos échouaient silencieusement (RLS bloque INSERT si `statut ≠ 'en_cours'`). Fix : écran dédié "Intervention annulée — aucune action possible" avant tout rendu du stepper.
- [x] **Photo terrain : caméra forcée, galerie impossible** : `capture="environment"` dans `PhotoSlot.tsx` forçait l'ouverture directe de l'appareil photo. Fix : retrait de `capture` → picker natif propose caméra OU photothèque.
- [x] **Géocodage Nominatim fragile sur abréviations** : "18 Av. du Gén Leclerc" → Nominatim retournait 0 résultat → coords null → carte vide. Fix triple : (1) `geocode-address` v3 déployée — normalisation abréviations FR + cascade adresse exacte → normalisée → ville+CP fallback. (2) `AssignerRdvDialog` : géocodage automatique best-effort dans `ensureGeocoded({silent:true})` avant `assigner_rdv`. (3) `ensureGeocoded` propage aussi les coords aux interventions déjà créées via `UPDATE interventions WHERE demande_rdv_id`.
- [x] **Backfill intervention de test sans GPS** : intervention `eca72099` (Chaumes-en-Brie, 77390) mise à jour avec `latitude=48.6736, longitude=2.8689`.

### Tests empiriques validés (session 29 suite)

- [x] `degeler_contrat` : OK après fix `taux_remise` ✓
- [x] `tsc --noEmit` : 0 erreur ✓
- [x] `geocode-address` v3 : déployée ACTIVE ✓

### Backlog non bloquant (inchangé)

- [ ] **`temp-test-recovery`** : edge function à neutraliser (stub 410) via dashboard Supabase.
- [ ] **`buildRdvConfirmeeHtml` : `date_confirmee` peut être null** — aligner `rdvDateLabel()`.
- [ ] Factorisation dialogs gel, DateSlotPicker partagé, FormDialog générique — sessions futures.
- [ ] CORS dynamique `send-email` (pour previews Vercel).
- [ ] Suppression définitive `compute-impact` depuis le dashboard (le MCP ne peut pas supprimer).
- [ ] Migration enum PG `interventions.statut` (actuellement CHECK text).
- [ ] RDV `refusee` : workflow "admin refuse → opérateur reprend" (RPC + statut en_cours requis par RLS).

### Review session 29 complète

**DB :** `degeler_contrat` fix + backfill coords test. Supabase MCP : `geocode-address` v3 déployée.  
**Frontend :** 3 fichiers (terrain.intervention, PhotoSlot, AssignerRdvDialog).  
**Edge function :** geocode-address v3 (normalisation abréviations + cascade fallback).  
**Commits :** `9434503` (session 29 début) → `085fca9` (dégel fix) → `d563da4` (terrain+géocodage).

---



### Bugs corrigés

- [x] **Leaflet z-index transperçant le Dialog** : la carte `DemandesRdvMap` (Leaflet, z-index 600-800) débordait visuellement au-dessus du `AssignerRdvDialog` (Radix, z-50). Fix : `style={{ isolation: "isolate" }}` sur le container carte (60%) dans `DemandesRdvList.tsx` — crée un nouveau stacking context qui confine les z-indexes Leaflet.
- [x] **Emails transactionnels silencieusement skippés** : `entreprises.email_contact` était null pour les comptes créés sans le champ → `send-email` loggait `"Aucun email destinataire valide"` pour `rdv_confirmee`, `rdv_modifie`, `rdv_annule_admin`, `intervention_close`, `gel_validee`, `rappel_24h`. Deux fixes : (1) `send-email` v17 — helper `resolveClientEmail()` qui fallback vers l'email auth Supabase si `email_contact` est null ; (2) `create-client-account` v26 — defaulte `email_contact = payload.user.email` à la création. DB : `UPDATE entreprises SET email_contact='jeffersoncours@gmail.com'` pour le compte existant.
- [x] **Mutation directe de prop dans `AssignerRdvDialog`** : `demande.latitude = data.latitude` mutait l'objet prop (anti-pattern React). Fix : state local `geocoded: boolean`, reset à chaque ouverture, utilisé dans `!demande.latitude && !geocoded` pour masquer le badge après géocodage réussi.

### Tests empiriques validés (session 29)

- [x] `modifier_heure_rdv` : rejette 13h00 (hors plage matin), accepte 09h00 ✓
- [x] `prendre_en_charge_intervention` : bloque si intervention future (verrou horaire) ✓
- [x] `seed-users` : retourne 410 Gone (safe malgré verify_jwt=false) ✓
- [x] `emettre_facture` : protégé par RLS (clients n'ont que SELECT) ✓
- [x] `email_contact` DB : corrigé → `jeffersoncours@gmail.com` ✓
- [x] `resolveClientEmail` fallback : pipeline vérifié (profiles.role=client → auth email) ✓

### Bugs identifiés non bloquants (backlog)

- [ ] **`temp-test-recovery`** : edge function v3 en prod, absente du repo local. À neutraliser (stub 410) ou supprimer via le dashboard Supabase.
- [ ] **`buildRdvConfirmeeHtml` : `date_confirmee` peut être null** si la date vient uniquement de `assigned_date`. Aligner `rdvDateLabel()` sur le template `rdv_confirmee`.

### Review session 29

- 3 bugs corrigés, 2 edge functions déployées (send-email v17, create-client-account v26)
- Commit `9434503` pushé sur `claude/izox-fleet-care-session-io8syg`
- `email_contact` DB corrigé + pipeline `resolveClientEmail` validé en prod

---

## Session 2026-06-10 (28) — Bugfixes boucle infinie + validation véhicule + audit email

### Bugs corrigés

- [x] **`valider_vehicule` — "column remise_pct does not exist"** : même bug que session 27c sur `ajouter_vehicule`/`supprimer_vehicule`. Migration `20260610b_fix_valider_vehicule_remise_pct.sql` appliquée. Fix : `SELECT palier, taux_remise INTO ...` (pas `remise_pct`). Vérifié en DB.
- [x] **Boucle infinie `/client/flotte` et `/admin/planning`** : cause racine — `useSupabaseQuery` mettait `queryFn` et `options` (inline arrow + inline object) dans les deps de `useCallback`, ce qui recréait `fetch` à chaque render → `useEffect([fetch])` se déclenchait à chaque render → `setLoading(true)` → re-render → ∞. Fix : ref pattern — `queryFnRef`/`defaultValueRef`/etc. mis à jour à chaque render, `useCallback(fn, [])` pour un `fetch` stable, `useEffect(..., deps ?? [])` sans `fetch` dans les deps.
- [x] **Double-chargement `/client/flotte/$id`** : guard `if (!authLoading)` dans le `useEffect` de `load` pour éviter le chargement pendant que `profile=null`, puis un 2e chargement quand l'auth résout.

### Audit email — résultats

- 8 types `EmailType` couverts par l'edge function `send-email`
- 7 appels `sendEmail()` dans le frontend (gel, RDV confirmé/modifié/annulé, intervention close, annulation client)
- **Email manquant identifié** : validation véhicule (`ValidationVehiculeBadge.tsx`) — aucun `sendEmail` appelé après `valider_vehicule`. Pas de type `"vehicule_valide"` dans l'enum. À implémenter en session dédiée si souhaité.
- **`rdv_confirmee`** : bien déclenché dans `AssignerRdvDialog.tsx` — à diagnostiquer en DB via `email_logs` si non reçu.

### Review session 28

- 3 bugs corrigés, buildTS 0 erreur, commits pushés sur `claude/vehicle-validation-errors-xsbt9t`
- Purge DB complète : `auth.users=4`, toutes tables métier à 0
- Merge sur `main` effectué

---

## Session 2026-06-10 (27c) — Bug critique véhicule + audit complet app

### Bug bloquant corrigé

**Problème** : ajout de véhicule impossible côté client ET admin (RPC retournait 400)
**Cause** : `ajouter_vehicule` et `supprimer_vehicule` lisaient `remise_pct` au lieu de `taux_remise` depuis `calculer_palier_remise`
**Fix** : migration `20260610_fix_calculer_palier_remise_column.sql` → redéploiement immédiat en prod
**Preuve** : 5 erreurs PostgreSQL "column remise_pct does not exist" dans les logs avant la fix

### Audit complet application — résultats (3 agents parallèles + vérif DB)

#### 🔴 CRITIQUE — corrigés cette session (migration `20260610_security_fixes_idor_guards`)

- [x] **IDOR `ajouter_vehicule`** : un client pouvait créer véhicules/contrats chez n'importe quelle entreprise (RPC SECURITY DEFINER appelable en direct avec un `p_entreprise_id` arbitraire, aucun check d'appartenance). → garde `get_user_entreprise(uid) = p_entreprise_id` pour les clients. Vérifié en DB.
- [x] **RLS `vehicules_operateur_select` grande ouverte** : la policy filtrait uniquement `has_role(operateur)` → tout opérateur voyait les véhicules de TOUTES les entreprises (immat, marques, notes, pricing). → ajout filtre `EXISTS interventions liées (operateur_id OU operator_id)`. Vérifié en DB.
- [x] **`generer_facture` sans guard de rôle** : SECURITY DEFINER appelable par tout authenticated → un client pouvait générer des brouillons de facture pour n'importe quel contrat. → guard admin/staff en tête de fonction. Vérifié en DB.

#### 🟠 IMPORTANT

- [x] **`supprimer_vehicule` — commercial sans contrôle d'appartenance** : corrigé (migration `20260610_supprimer_vehicule_commercial_guard`) — commercial limité aux entreprises qu'il gère (signataire / commercial_id / accès délégué). Client et admin/staff inchangés.
- [x] **IDOR `compute-impact` (get_summary / get_client_records)** : SUPPRIMÉ (validé utilisateur). Table `impact_records` droppée (migration `20260610_drop_impact_records_dead_code`, vérifiée vide + 0 dépendance DB), edge function remplacée par un stub 410 Gone (v8 — le MCP ne permet pas la suppression ; suppression définitive possible depuis le dashboard), dossier `supabase/functions/compute-impact` supprimé du repo, types régénérés.
- [x] **22 requêtes Supabase sans capture d'`error`** : TOUTES corrigées. 4 via hook `useSupabaseQuery` (client.flotte, PassagesReportesBanner, QuotaGelDecompose, DemandesRdvList) + 19 sites via capture minimale `const { data, error }` + toast (3 agents parallèles, batchs A/B/C). `auth-context` et `TwoFactorSetup` en `console.error` (pas de toast pour éviter le bruit).
- [x] **`compute-impact` fuite `error.message` au client** : sans objet — fonction supprimée.

#### 🟡 MINEUR

- [x] **`admin.facturation.tsx` — RoleGuard `beforeLoad`** : RÉÉVALUÉ → ne pas faire. L'architecture est déjà cohérente : layout `/admin` = `RoleGuard [admin,staff,commercial]`, les 4 routes admin-only (facturation, equipe, planning.map, board planning) = même `RoleGuard [admin]`. Un `beforeLoad` exigerait d'exposer l'auth Supabase (client-side) au contexte router — risqué (cf bug `admin.interventions` beforeLoad documenté dans CLAUDE.md) pour gain nul : le RoleGuard bloque le rendu (spinner→redirect, jamais de données affichées) et les données sont protégées par RLS/RPC durcis cette session.
- [x] **Casts `(supabase as any).rpc(...)`** : TOUS retirés (`terrain.index.tsx` ×4, `TwoFactorSetup.tsx` ×3 ; `terrain.intervention.$id.tsx` n'en avait plus). Types régénérés post-drop `impact_records` ; fix `null` → `undefined` sur params optionnels `setup_2fa`.
- [ ] **`compute-impact` / `send-email` CORS statique** (pas de `corsFor()` dynamique) : OK en prod, KO pour previews Vercel. Aligner si besoin de previews.
- [ ] **"XSS `rdvDateLabel`" signalé par l'audit → NON exploitable** : `assigned_heure` (TIME) et `assigned_date` (DATE) sont des colonnes typées, pas du texte libre. Pas de fix nécessaire (noté pour mémoire).
- [ ] **Enum `interventions.statut` en CHECK text** (vs type PG) : ajout de `annulee` a nécessité une redéf. Migrer vers un vrai ENUM PG un jour pour discipline.

#### 🔧 SIMPLIFICATIONS (refactor sans changement de comportement, classées gain/risque)

- [x] **RoleGuard `beforeLoad` unifié** : réévalué → ne pas faire (voir 🟡 MINEUR ci-dessus — déjà cohérent, beforeLoad risqué pour gain nul).
- [x] **Hook `useSupabaseQuery<T>`** : fait — `src/lib/hooks/useSupabaseQuery.ts` (loading + error toast + defaultValue + refetch + deps). Utilisé sur 4 fichiers ; les autres sites corrigés en capture minimale (moins de churn).
- [ ] **Dialogs de gel factorisés** (gain 8 / risque 2) : `GelContratDialog` + `GelerVehiculeAdminDialog` + `DemanderGelDialog` + `LeverGelAnticipeDialog` partagent date_debut/fin/motif/submit → `<GelFormDialog>` commun (~-400 LOC). **Backlog — session dédiée.**
- [ ] **`useRdvSelection` + `<DateSlotPicker>`** (gain 7 / risque 2) : `CreerDemandeRdvDialog` + `ReplaceVehiculeDialog` + `GererRdvConfirmeDialog` dupliquent la logique calendrier/créneaux. **Backlog — session dédiée.**
- [ ] **`<FormDialog<T>>` générique** (gain 7 / risque 3) : abstraction plus risquée — à faire en dernier. **Backlog.**

### Review session 27c (finale)

**Sécurité (DB, vérifié en prod)** :
1. 3 IDOR/guards critiques corrigés (`ajouter_vehicule`, `generer_facture`, RLS `vehicules_operateur_select`) + guard commercial `supprimer_vehicule`.
2. `compute-impact` neutralisée (stub 410) + table `impact_records` droppée + types régénérés.
3. RPC `ajouter_vehicule` testée en DB avec succès (admin → véhicule actif, palier OK) — données de test nettoyées.

**Qualité code** :
4. Hook `useSupabaseQuery` créé + 4 composants migrés.
5. 19 requêtes silencieuses → capture `error` + toast (ou console.error pour auth/2FA).
6. 7 casts `as any` retirés (terrain, 2FA) grâce aux types régénérés.

**Décision archi** : pas de `beforeLoad` auth — RoleGuard composant conservé (cohérent partout, RLS en backstop).

**Purge DB complète (2026-06-10 finale)** :
7. Base vidée de toutes données de test : 0 notifications, 0 observations, 0 actions log, 0 emails logs, 0 photos, 0 interventions, 0 demandes RDV/gel, 0 factures/avoirs, 0 contrats, 0 véhicules, 0 entreprises clients. Conservés : exactement 4 comptes techniques (admin.test, staff.test, commercial.test, operateur.test). Vérifié via execute_sql : `COUNT(auth.users)=4` + tous les tables métier à 0. État vierge ready pour prochaine session.

**Reste en backlog (sessions futures)** : factorisation dialogs gel, DateSlotPicker partagé, FormDialog générique, enum PG `interventions.statut`, CORS dynamique `send-email`, suppression définitive de `compute-impact` depuis le dashboard Supabase (le MCP ne sait que redéployer, pas supprimer).

---

## Session 2026-06-10 (27b) — Fix liens email reset/invite MDP

### Contexte (bug remonté en test manuel)

Cliquer sur le lien d'un email d'invitation ("Définir mon mot de passe") ou de reset
("Mot de passe oublié") atterrissait sur `/login` avec les identifiants admin pré-remplis
(autofill navigateur) au lieu de `/reset-password`.

### Causes racines identifiées

1. **Edge functions** : les 3 fonctions (`create-client-account`, `admin-reset-password`,
   `request-password-reset`) définissaient `safeRedirectTo()` mais ne l'appelaient JAMAIS.
   `generateLink` utilisait `${siteUrl}/reset-password` avec `siteUrl = SITE_URL ?? "https://izox.fr"`.
   Si cette URL n'est pas dans l'allowlist Supabase, Supabase ignore silencieusement le
   `redirect_to` et retombe sur la Site URL (racine de l'app) → `/login`.
2. **`reset-password.tsx`** : lecture des params URL dans `useEffect` (après commit React).
   Supabase-js peut nettoyer l'URL (`history.replaceState`) avant → `hasCode/hasToken = false`
   → `navigate("/login")`.
3. **`auth-context.tsx`** : `SIGNED_OUT` (déclenché quand la session admin existante est
   remplacée par la session recovery) remettait `isRecovery = false` avant que
   `PASSWORD_RECOVERY` n'arrive.

### Plan

- [x] Fix 1 — les 3 edge functions appellent réellement `safeRedirectTo(redirect_to)` du payload frontend
- [x] Fix 2 — `reset-password.tsx` : capture des params URL en `useState` lazy (synchrone, avant tout nettoyage)
- [x] Fix 3 — `auth-context.tsx` : `SIGNED_OUT` ne reset plus `isRecovery` si un callback recovery était présent au chargement (`recoveryInProgress` ref)
- [x] Déploiement edge functions : `create-client-account` v23, `admin-reset-password` v21, `request-password-reset` v8
- [x] `npm run build` → 0 erreur
- [x] Commit + push branche session

### À vérifier côté Supabase Dashboard (action utilisateur)

- Auth → URL Configuration → Redirect URLs doit contenir
  `https://izox-circular-fleet-care.vercel.app/reset-password` (et idéalement
  `https://*.vercel.app/reset-password` pour les previews).
- Retester : 1) création compte client → email invitation → lien → `/reset-password` ;
  2) "Mot de passe oublié" → email reset → lien → `/reset-password` ;
  3) reset depuis fiche client admin → idem.

---

## Session 2026-06-06 (27) — Exports CSV + Alertes dashboard + Rapport B3

### Plan

- [x] B1. `src/lib/csv.ts` — utilitaire `downloadCSV(rows, filename)` partagé (BOM UTF-8 Excel)
- [x] B1. `admin.facturation.tsx` — bouton "Exporter CSV" dans la barre de filtres (respecte filtre actif)
- [x] B1. `admin.clients.tsx` — bouton "CSV" dans le PageHeader (respecte filtre actif)
- [x] B1. `InterventionsListPanel.tsx` — bouton "CSV" inline dans la Card filtres
- [x] B2. `admin.index.tsx` — section "À traiter" : 4 alertes calculées au chargement (en_revision > 24h, RDV sans réponse > 48h, brouillons factures > 30j, contrats expirant dans 30j)
- [x] B3. Rapport disponibilites_operateurs — audit schéma + get_creneaux_disponibles → reporter
- [x] Guide tests manuels complet (client/admin/opérateur) fourni à l'utilisateur
- [x] Build 0 erreur tsc + npm run build
- [x] Purge DB (toutes tables à 0, auth.users = 4)
- [x] Commit + push + merge main

### Review session 27

**Livré :**
- **B1 — Exports CSV** : 3 points d'export admin. `src/lib/csv.ts` : utilitaire partagé avec BOM UTF-8 (compatible Excel/LibreOffice), séparateur `;`, échappement des guillemets. Boutons désactivés si liste vide. Nommage automatique `{type}-izox-{date}.csv`.
- **B2 — Alertes dashboard** : section "À traiter" sur `/admin` — rouge si critique (fiches en_revision > 24h, demandes RDV sans réponse > 48h), ambre si warning (brouillons > 30j, contrats expirant dans 30j). N'apparaît que si ≥ 1 alerte active. Chaque alerte est un lien direct vers la section concernée.
- **B3 — Rapport** : `disponibilites_operateurs` bien structurée (7 colonnes, FK operateur_id → auth.users, actif + dates_validite). Bloquant : `get_creneaux_disponibles` ne l'utilise pas du tout (capacité = `COUNT(operators)*2`). UI inutile avant migration de la RPC. À reporter quand 2e opérateur recruté.

**Validation empirique :**
- tsc 0 erreur, npm run build 0 erreur ✓
- Purge DB : 9 tables à 0, auth.users = 4 ✓

---

## Session 2026-06-06 (26) — Corrections UX + sécurité auth + suppression /legal

### Plan

- [x] 1. `reset-password.tsx` + `login.tsx` — `signOut()` obligatoire après `updateUser` pour détruire la session de récupération avant redirect `/login` (faille critique)
- [x] 2. `login.tsx` — retirer `border-b` du brandHeader + resserrer `py-10` pour remonter la carte vers le texte
- [x] 3. `admin.contrats.tsx` + `admin.clients.tsx` — pills filtres sur une seule ligne (overflow-x-auto nowrap)
- [x] 4. Suppression complète `/legal` + liens (AdminSidebar, ClientNav, terrain.index.tsx) + nettoyage CLAUDE.md
- [x] 5. `npx tsc --noEmit --skipLibCheck` + `npm run build` → 0 erreur
- [x] 6. Commit + push sur `claude/izox-fleet-care-planning-RJ00W`
- [x] 7. Fix CORS `create-client-account` — accepter `*.vercel.app` (CORS bloquait depuis les previews Vercel)
- [x] 8. Fix `redirectTo` toutes les edge functions — hardcoder `${siteUrl}/reset-password` (URL dans l'allowlist Supabase) au lieu du `redirect_to` du frontend (non whitelisté → Supabase ignorait → SSR perdait le hash)
- [x] 9. Fix `isRecovery` non remis à `false` au `SIGNED_OUT` → boucle set-password après soumission. Fix : `onAuthStateChange` SIGNED_OUT → `setIsRecovery(false)` dans `auth-context.tsx`

### Review session 26

**Livré :**
- Faille sécurité auth : session recovery non détruite après `updateUser` → `signOut()` ajouté dans `reset-password.tsx` et `login.tsx`. L'utilisateur doit se ré-authentifier explicitement.
- Login page : retrait `border-b` + espacement resserré entre hero et carte auth.
- Pills filtres : `flex-wrap` → `flex-nowrap overflow-x-auto` sur contrats et clients.
- Suppression complète de `/legal` (route, liens sidebar admin, nav client, terrain profil).
- CORS dynamique `create-client-account` : accepte tous `*.vercel.app`.
- `redirectTo` toutes edge functions : toujours `${siteUrl}/reset-password` (URL dans l'allowlist Supabase) — le `redirect_to` du frontend n'est plus utilisé pour le lien Supabase.
- `isRecovery` remis à `false` sur `SIGNED_OUT` — empêche la boucle où `/login` re-affichait le formulaire de changement de MDP après soumission.

**Versions edge functions déployées :**
- `create-client-account` v21
- `admin-reset-password` v19
- `request-password-reset` v7

---

## Session 2026-06-06 (25) — Lier opérateurs + messagerie V1 admin↔terrain

### Plan

- [x] B. Nettoyage backlog — retirer item stale `client/factures/$id` (déjà livré session 19)
- [x] A1. `admin.equipe.tsx` — charger operators + profiles opérateurs, cards état liaison + unread count
- [x] A2. Dialog "Lier un compte terrain" — dropdown profiles.role=operateur non liés + UPDATE operators.user_id
- [x] C1. Migration `20260605030000_operateur_messages` — table + index + RLS (5 policies) + trigger SECURITY DEFINER `tg_message_notify_fn` → notifications_internes
- [x] C2. Régénérer types Supabase
- [x] C3. `src/lib/messaging.ts` — types OperateurMessage/LocalMessage/MessageStatus + fetchConversation + sendMessage + markReadAdmin + markReadOperator + subscribeToConversation (INSERT only) + loadPendingMessages + savePendingMessages
- [x] C4. `src/hooks/useMessaging.ts` — hook optimiste avec inFlightIds + sentLocalIds + localStorage pending + retry on 'online' event + realtime INSERT only (anti-boucle)
- [x] C5. `src/components/messaging/MessageBubble.tsx` — bulle message (gauche/droite selon sender) + indicateurs status (⏳ pending / ✓ sent / ⚠️ failed + retry)
- [x] C6. `src/components/messaging/ChatWindow.tsx` — liste messages auto-scroll + input + envoi Enter/clic
- [x] C7. `admin.equipe.tsx` — intégrer ChatWindow dans split view desktop / full mobile + badge unread par opérateur
- [x] C8. `terrain.index.tsx` — sous-onglet "Messages" dans Suivi + ChatWindow + badge unread bottom nav Suivi
- [x] C9. `npx tsc --noEmit --skipLibCheck` + `npm run build` → 0 erreur
- [x] C10. Validation empirique : table schema + RLS + trigger SECURITY DEFINER + assigner_rdv restauré + types régénérés + build 0 erreur
- [x] Fix hors-plan : `assigner_rdv` accidentellement supprimé par session 24 → migration `20260606010000_fix_assigner_rdv_restore.sql`

### Review session 25

**Livré — Messagerie V1 admin↔terrain + liaison opérateurs :**

**DB (migration 20260605030000) :**
- Table `operateur_messages` : `id`, `conversation_operator_id` (FK → auth.users), `sender_id`, `content`, `image_url`, `client_local_id UUID` (déduplication Realtime), `created_at`, `read_at_admin`, `read_at_operator`
- Contrainte `chk_om_has_content` : content OR image_url requis
- 5 RLS policies : INSERT open authenticated, SELECT admin/staff, SELECT own conversation (operateur), UPDATE admin/staff, UPDATE own conversation (operateur)
- Trigger `tg_message_notify` → `tg_message_notify_fn()` SECURITY DEFINER + `search_path=public` : notifie tous les admin/staff si opérateur envoie, notifie l'opérateur si admin/staff envoie

**Fix (migration 20260606010000) :**
- `assigner_rdv` restauré avec signature correcte : `DEFAULT NULL` sur `p_heure` + role guard admin/staff + notification client RDV confirmé + SECURITY DEFINER SET search_path = public

**Frontend :**
- `src/lib/messaging.ts` : fetch, send (avec client_local_id), markRead, subscribe INSERT-only, localStorage pending
- `src/hooks/useMessaging.ts` : optimistic UI, inFlightIds (StrictMode), sentLocalIds (Realtime dedup), retry on 'online'
- `src/components/messaging/MessageBubble.tsx` : bulles gauche/droite, états pending/failed+retry
- `src/components/messaging/ChatWindow.tsx` : auto-scroll, Enter/Shift+Enter, empty state
- `admin.equipe.tsx` : split view desktop 320px/reste, mobile full, cards opérateur avec badge unread, LinkOperatorDialog + UnlinkOperatorDialog
- `terrain.index.tsx` : sous-onglet "Messages IZOX" dans Suivi, ChatWindow, badge unread bottom nav

**Validation empirique :**
- `assigner_rdv` : présent en DB, SECURITY DEFINER, signature 5 params ✓
- `operateur_messages` : 9 colonnes dont `client_local_id` ✓
- RLS : 5 policies correctes ✓
- Trigger `tg_message_notify` : SECURITY DEFINER + search_path ✓
- `operators.user_id` : colonne présente (nullable) ✓
- `npx tsc --noEmit --skipLibCheck` : 0 erreur ✓
- `npm run build` : 0 erreur ✓

---

## Session 2026-06-05 (24) — Audit sécurité complet + hardening

### Plan

- [x] 1. Audit multi-agents (SQL, edge functions, frontend) — 3 agents parallèles
- [x] 2. Migration DB `20260605020000_security_fixes.sql` — search_path injection, views security_invoker, RLS impact_records, v_contrats_passages_restants fix, assigner_rdv role guard + search_path, calculer_palier_remise thresholds + SECURITY DEFINER, generer_facture SECURITY DEFINER SET search_path, get_max_vehicules_par_demande SECURITY DEFINER
- [x] 3. `compute-impact/index.ts` — `getCallerRole()` helper + role guards sur `generate` / `validate_intervention` / `get_estimated` (admin/staff only)
- [x] 4. `update-client-info/index.ts` — CORS wildcard `"*"` → `corsFor(req)` dynamique
- [x] 5. `admin-reset-password/index.ts` — CORS pattern regex étendu + token exposure (`link: emailSent ? null : actionLink`)
- [x] 6. `create-client-account/index.ts` — `esc()` helper + `${esc(prenom)}` dans le template HTML
- [x] 7. `send-email/index.ts` — `.select("role, entreprise_id")` + ownership checks IDOR dans `rdv_annule_client` et `staff_notification`
- [x] 8. `AssignerRdvDialog.tsx` — double-submit prevention `disabled={!canConfirm || submitting}`
- [x] 9. `client.flotte.tsx` — React Rules of Hooks : split `MaFlotte` (layout) + `MaFlotteList` (hooks)
- [x] 10. `terrain.index.tsx` — stale async setState : `let alive = true` + `if (!alive) return` + cleanup `return () => { alive = false }`
- [x] 11. Déploiement edge functions (compute-impact v6, admin-reset-password v17, update-client-info v2, create-client-account v18, send-email v15)
- [x] 12. Commit + push branche `claude/izox-fleet-care-resume-yXUX9`

### Review session 24

**Livré — Sécurité hardening complet :**

**DB (migration 20260605020000) :**
- `search_path` injection éliminé : `assigner_rdv`, `calculer_palier_remise`, `generer_facture`, `get_max_vehicules_par_demande` tous avec `SET search_path = public`
- `dispatcher_notification` : `CREATE OR REPLACE` (signature préservée, trigger intact) + `search_path`
- Views avec `security_invoker = true` : `v_entreprises_vehicules_resume`, `v_demandes_gel_with_quota` → RLS s'applique per-caller
- `v_contrats_passages_restants` : comptait uniquement `validee`, corrigé pour inclure `planifiee|en_cours|en_revision`
- `calculer_palier_remise` : seuils corrects (5/10/20 interventions, 3%/5%/8%) + SECURITY DEFINER
- RLS `impact_records` : policies INSERT/UPDATE publiques supprimées

**Edge functions :**
- `compute-impact` : `getCallerRole()` + guards sur actions sensibles (generate, validate_intervention, get_estimated)
- `update-client-info` : CORS `"*"` → `corsFor(req)` dynamique (était la seule fonction avec wildcard)
- `admin-reset-password` : CORS regex durci + token non exposé si email envoyé avec succès
- `create-client-account` : `esc()` appliqué sur le prénom dans le template HTML
- `send-email` : ownership checks IDOR sur `rdv_annule_client` et `staff_notification` (client ne peut notifier que sa propre demande)

**Frontend :**
- `AssignerRdvDialog` : double-submit bloqué par `submitting` state
- `client.flotte.tsx` : React Rules of Hooks corrigé (split layout/content)
- `terrain.index.tsx` : cancellation flag `alive` sur async useEffect

---

## Session 2026-06-05 (23) — Onglet Factures contrat + notifications client complètes

### Plan

- [x] 1. `admin.contrats.$id.tsx` — onglet Factures : remplace placeholder par `FacturesTab` (filtre `contrat_id`, copie pattern `admin.clients.$id`) — build 0 erreur (`e062687`)
- [x] 2. Audit notifications : `valider_vehicule`/`valider_gel`/`refuser_gel` ✅ déjà faits ; `assigner_rdv`/`annuler_rdv_admin`/`modifier_heure_rdv`/`emettre_facture` ❌ manquants
- [x] 3. Migration `20260605010000` — notifications client dans les 4 RPCs manquants, validé en DB (`46eb300`)
- [x] 4. Push branche `claude/izox-fleet-care-resume-yXUX9`

### Review session 23

**Livré :**
- Onglet Factures dans `/admin/contrats/$id` : liste réelle + dialog détail imprimable (FactureDocument). Admin voit tous statuts (brouillons inclus). Filtre `contrat_id`.
- Notifications client complètes : les 4 RPCs (`assigner_rdv`, `annuler_rdv_admin`, `modifier_heure_rdv`, `emettre_facture`) insèrent désormais une `notification_interne` pour le `user_id` client de l'entreprise concernée — exactement comme `valider_vehicule`.

**État notifications client après cette session :**
| Événement | Notification client |
|-----------|---------------------|
| Véhicule validé | ✅ `valider_vehicule` |
| Gel approuvé | ✅ `valider_gel` |
| Gel refusé | ✅ `refuser_gel` |
| RDV confirmé | ✅ `assigner_rdv` (session 23) |
| RDV annulé par IZOX | ✅ `annuler_rdv_admin` (session 23) |
| Horaire RDV modifié | ✅ `modifier_heure_rdv` (session 23) |
| Facture émise | ✅ `emettre_facture` (session 23) |

**Validation empirique :**
- Colonnes SQL `factures.contrat_id` validées en base
- 4 RPCs vérifiés via `pg_get_functiondef` : tous `has_notification=true`, `has_client_uid=true`
- DB vierge (4 comptes tech, 0 client) → test RLS ignoré normalement ; pattern identique à `valider_vehicule` déjà validé en prod

**Reste à faire :**
- [ ] Merge sur `main` + purge DB si besoin

---

## Session 2026-06-05 (22 suite) — Cookies + RSE charts

### Plan

- [x] 1. `legal.tsx` — retrait banner cookie (état, fonctions, JSX), mise à jour section RGPD "Cookies" (seul cookie session Supabase, pas de Matomo, aucun consentement requis)
- [x] 2. `client.impact.tsx` — 4ème hero card CO₂ évité (Zap icon, violet), grille 2×2, équivalences (douches économisées, km voiture évités), CO₂ ajouté à l'AreaChart
- [x] 3. `admin.impact.tsx` — nouvel onglet "Vue globale" (défaut) : 4 KPI cards (interventions, eau, CO₂, clients actifs) + BarChart mensuel interventions + BarChart horizontal eau par client
- [x] 4. `impact.ts` — `fetchGlobalImpactSummary()` + type `GlobalImpactSummary` exportés
- [x] 5. Build 0 erreur + tsc 0 erreur + commit + push (`15e8ab6`)

### Review session 22 suite

**Livré :**
- Cookie banner retiré de tous les portails (était sans objet sur un CRM B2B privé n'utilisant que des cookies techniques essentiels). Section RGPD "Cookies" mise à jour pour refléter la réalité (pas de Matomo, pas d'analytics).
- RSE client : 4ème carte CO₂ (grille 2×2), section équivalences concrètes (X douches, X km voiture), CO₂ dans le graphe AreaChart.
- RSE admin : "Vue globale" avec 4 KPIs + 2 BarCharts (tendance mensuelle + répartition par client). Tab actif par défaut.
- `fetchGlobalImpactSummary()` : agrège toutes les interventions validées tous clients, calcule totaux, timeline mensuelle, top 6 clients par eau économisée.

---

## Session 2026-06-05 (22) — Module facturation admin + liens /legal

### Plan

- [x] 1. `admin.facturation.tsx` — page complète (KPIs brouillons/émises/payées/CA mois, filtres statut+recherche, liste cross-client avec actions Émettre/Payée/Supprimer brouillon, dialog Clôture mensuelle, dialog détail imprimable)
- [x] 2. `AdminSidebar.tsx` — lien "CGV & Confidentialité" dans le footer (avant Déconnexion)
- [x] 3. `ClientNav.tsx` — lien légal discret au-dessus de la bottom nav mobile
- [x] 4. `terrain.index.tsx` — lien légal en bas du tab Profil opérateur
- [x] 5. `izox-legal.ts` — retrait `tvaIntracom` (inutilisé, N/A franchise de base) + marqueurs `TODO_LEGAL` clairs
- [x] 6. Build 0 erreur + tsc 0 erreur + commit + push (`3744c2e`)

### Review session 22

**Livré :**
- Module facturation admin `/admin/facturation` : liste globale toutes factures, 4 KPIs, filtres pills + recherche, actions par statut (Émettre → `emettre_facture` RPC, Payée → UPDATE direct permis par la machine d'états, Supprimer brouillon), dialog Clôture mensuelle (sélection mois/année, liste contrats actifs, `generer_facture` idempotent, rapport résultats créé/vide/erreur), dialog détail/impression réutilisant `FactureDocument`.
- Lien `/legal` dans les 3 portails : AdminSidebar footer, ClientBottomNav (barre discrète au-dessus des tabs), tab Profil terrain.
- `izox-legal.ts` : `tvaIntracom` retiré (franchise de base = pas de N° TVA), marqueurs `TODO_LEGAL` uniformisés.

**Décisions techniques :**
- UPDATE direct `statut='payee' + date_paiement` sur facture émise : permis par `trg_protect_facture_immuable` (seuls les champs métier sont figés, pas statut/date_paiement) + validé par `trg_factures_machine_etats` (emise→payee autorisé si date_paiement non null).
- `snapshot_client.raison_sociale` pour le nom client en liste (pas de join, toujours disponible depuis le snapshot immuable).
- `generer_facture` idempotent : retourne null si 0 prestation validée, UUID si créée ou existante.

**À faire avant production :**
- Remplacer les `TODO_LEGAL` dans `izox-legal.ts` par les vraies valeurs SIRET/adresse/IBAN une fois la société créée.

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
