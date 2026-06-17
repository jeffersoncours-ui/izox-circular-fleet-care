# Lessons Learned — IZOX

## Composant de calendrier : toujours lire la contrainte métier avant de choisir le primitif (session 50)

- **Le calendrier mensuel shadcn (`Calendar`) ne suffit pas pour un créneau B2C avec 4 heures fixes** : il gère des dates isolées, pas des couples date+heure. Dès qu'on a besoin de 4 sous-sélections par jour (08h/10h/14h/16h) ET de règles sur le nombre de jours distincts, un composant dédié (`WeekSlotPicker`) est plus simple qu'une surcouche sur `Calendar`.
- **Construire autour d'une grille semaine (lun-sam × heures) donne une UX plus claire** pour un délai court (mois en cours) : l'utilisateur voit 6 jours en un coup d'œil, le grisage de saturation est lisible colonne par colonne, et la navigation semaine est bornée naturellement par `endOfMonth`.
- **Règle 1-par-jour dans le click handler** : 3 cas à traiter → (1) même créneau = toggle off, (2) autre heure même jour = remplacer, (3) nouveau jour + pas au max = ajouter. Toute logique manquante laisse l'utilisateur sélectionner 3 fois le même jour.

## Double validation client + serveur pour les contraintes de réservation (session 50)

- **Le frontend peut être contourné** : même si `WeekSlotPicker` empêche UI deux créneaux le même jour, l'edge function doit valider elle-même (`uniqueDates.size !== creneaux.length`). Sinon un appel API direct bypasse la règle.
- **Valider le jour de la semaine côté serveur avec UTC** : `new Date(c.date + "T12:00:00Z").getUTCDay()` — utiliser midi UTC évite les décalages de timezone qui feraient classer un samedi soir comme dimanche.

## setTimeout dans un handler d'événement framer-motion : toujours stocker l'ID (session 50)

- **`setTimeout(() => setState(...), 0)` dans `handleDragEnd` (framer-motion `onDragEnd`)** : si le composant se démonte avant que le timeout se déclenche (ex. navigation rapide), le callback s'exécute sur un composant démontés. Fix : stocker l'ID dans un `useRef`, retourner un cleanup `useEffect` qui appelle `clearTimeout`. Même pour un délai 0ms, la bonne pratique s'impose — elle coûte 3 lignes et évite un avertissement React en dev.
- **Pattern minimal** :
  ```tsx
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (tRef.current !== null) clearTimeout(tRef.current); }, []);
  // dans le handler :
  if (tRef.current !== null) clearTimeout(tRef.current);
  tRef.current = setTimeout(() => setState(false), 0);
  ```

## Tunnel B2C public : séparer table + edge function quand auth non disponible (session 49)

- **Un tunnel public (sans Supabase Auth) ne peut PAS réutiliser une RPC qui lit `auth.uid()`** : `creer_demande_rdv` requiert un utilisateur connecté, un `entreprise_id` et des `vehicule_ids[]`. Vouloir forcer la réutilisation aurait exigé soit de byp la RLS (risque sécurité), soit d'inventer des IDs fictifs (incohérence DB). La bonne décision : nouvelle table `reservations_b2c` + edge function publique (`verify_jwt=false`) avec service_role. Coût faible, séparation nette.
- **`GRANT EXECUTE ... TO anon` est nécessaire pour les RPC appelées depuis un client non authentifié** : `get_creneaux_disponibles` était utilisable par les clients Supabase Auth, mais bloquée pour `anon`. Ajouter le GRANT dans la migration suffit. Vérifier toujours les GRANTs existants (`\df+ <fonction>` en psql ou `pg_get_functiondef` + `has_function_privilege('anon', ...)`) avant de conclure qu'une fonction "ne répond pas".

## Saturation créneaux B2B+B2C : la confirmation admin = le vrai verrou (session 49)

- **Les réservations B2C pré-paiement n'occupent un créneau qu'après confirmation admin** : `get_creneaux_disponibles` compte uniquement les `interventions` créées. Une réservation B2C `en_attente_paiement` n'en crée pas encore — le slot reste disponible. C'est acceptable en pré-Stripe (faible volume, admin traite rapidement). Une fois Stripe câblé, envisager de compter aussi les réservations B2C payées-mais-pas-encore-confirmées dans la RPC pour éviter les doubles réservations en cas de pics.

## Emails outbound Resend ≠ inbox pour recevoir les alertes (session 49)

- **Resend est un service d'envoi d'emails transactionnels, pas un serveur de messagerie entrant** : envoyer des alertes à `contact@izox.fr` via Resend n'a de sens que si la boîte `contact@izox.fr` existe réellement et est configurée pour recevoir. Sans mailbox OVH/Gsuite/autre, les emails partent dans le vide ou rebondissent. **Toujours vérifier que la boîte destinataire existe et est opérationnelle avant de câbler les alertes**, sinon les tests d'email génèrent des bounces qui peuvent dégrader la réputation du domaine `izox.fr`.
- **SPF merge obligatoire** si OVH Zimbra vient s'ajouter à Resend : ne pas laisser OVH écraser l'enregistrement SPF existant. Résultat attendu : `v=spf1 include:mx.ovh.com include:spf.resend.com ~all`.

## Spécificité CSS `.b2c-glow-card` vs classes utilitaires Tailwind (session 48)

- **Le sélecteur `.izox-b2c .b2c-glow-card { position: relative }` a une spécificité de 2 classes** (0,0,2,0) contre 1 seule pour un utilitaire Tailwind comme `.absolute` (0,0,1,0). Dans le périmètre `.izox-b2c`, n'importe quel utilitaire Tailwind portant une propriété déjà définie sur `.b2c-glow-card` sera écrasé silencieusement. Cas confirmé : cartes de pile qui retombaient dans le flux normal du document (empilées verticalement au lieu de se superposer) parce que `position: relative` battait `position: absolute`. Aucun message d'erreur ni avertissement — le comportement visuel est simplement cassé.
- **Règle absolue** : sur la landing IZOX, tout élément portant simultanément `.b2c-glow-card` ET une position absolue/fixe doit forcer la position via un **style inline** (`style={{ position: "absolute" }}`). Les styles inline ont une spécificité de (1,0,0,0) — imbattables par n'importe quel sélecteur de classe, même `!important` ne peut les écraser qu'avec `!important` inline lui-même.
- **Même piège sur d'autres propriétés** : vérifier également `z-index`, `display`, `overflow` — toute propriété que `.b2c-glow-card` ou `.b2c-card` pose explicitement sera potentiellement écrasée si la valeur souhaitée vient d'un utilitaire Tailwind. Préférer le style inline dès qu'il y a un doute, ou augmenter la spécificité du sélecteur Tailwind (ex. via `[@.izox-b2c_&]:absolute`).

## Composant 21st.dev avec animation framer-motion — adaptation à `.b2c-glow-card` (session 48)

- **framer-motion anime les styles via `style` inline** (propriété `animate` transformée en `style` par motion) : c'est justement ce mécanisme qui contourne le problème de spécificité CSS décrit ci-dessus. En choisissant un composant framer-motion (`motion.div`) plutôt qu'un carrousel CSS-only (translate/absolute Tailwind), on bénéficie automatiquement d'un style inline pour les propriétés animées (`top`, `left`, `rotate`, `scale`, `opacity`) — les plus susceptibles d'être écrasées par des règles CSS de scope. **Un composant framer-motion est donc plus robuste qu'un équivalent CSS-only dans le contexte `.izox-b2c`** pour les éléments portant `.b2c-glow-card`.
- **Toujours vérifier quelles propriétés CSS la classe de scope redéfinit** avant d'intégrer un composant qui en dépend. `position` en est un exemple, mais l'audit de `.b2c-card`/`.b2c-glow-card` dans `landing-b2c.css` révèle aussi : `border-style`, `border-color`, `box-shadow`, `transition`, `background`, `border-radius`, `isolation`. Toute valeur Tailwind tentant de modifier ces propriétés sur un `div.b2c-glow-card` sera potentiellement écrasée selon la spécificité.

## Audit systématique : vérifier le code mort par grep AVANT de supprimer (session 48)

- **Ne jamais se fier à la mémoire pour décider qu'un symbole est mort** : `data-aqua-section`, `--b2c-surface`, `--b2c-bg3` — chacun semblait mort mais un seul `grep` confirmait l'absence d'usage. L'audit a aussi montré que `prixTotalB2C` et `formatPrixTTC` sont « inutilisés » *maintenant* mais sont des fondations documentées du tunnel Stripe Phase 2g. Un grep sans contexte de roadmap aurait conclu à de la mort. **La règle du grep confirme la mort — la connaissance du projet décide de la suppression.**
- **Un audit de landing B2C sur 14 fichiers révèle principalement du code mort et des bugs mineurs** (pas de bugs critiques si le code a été bien structuré dès le départ). L'investissement d'un subagent dédié (scope + instructions précises) sur ce périmètre prend ~2 min et donne un rapport priorisé exploitable directement. À refaire avant chaque merge majeur.

## Serveur MCP Supabase qui se bloque en cours de session (session 47)

- **« MCP tool call requires approval » peut bloquer TOUS les appels, pas juste un seul** : pendant la validation empirique de `avis_clients`, le serveur MCP Supabase s'est mis à refuser systématiquement tout appel (`execute_sql`, `list_tables`, `get_logs`), y compris un `SELECT 1` trivial, après plusieurs dizaines d'appels réussis dans la même session. Réessayer le même appel, recharger le schéma via `ToolSearch`, ou faire approuver explicitement par l'utilisateur n'a rien changé — la connexion au serveur était bloquée côté outil, pas une question de droits SQL.
- **Ne pas boucler indéfiniment sur des retries d'un outil MCP cassé** : après 2-3 échecs identiques sur des requêtes différentes (y compris une requête triviale sans rapport avec la précédente), considérer le serveur comme indisponible plutôt que de continuer à réessayer — demander à l'utilisateur de vérifier/relancer la connexion, ou accepter de différer l'action (ex. nettoyage de données de test) plutôt que de bloquer toute la session.
- **Conséquence concrète** : 3 lignes de test (`avis_clients`, préfixe `TEST-`) sont restées en base faute de pouvoir les supprimer — documentées dans `tasks/todo.md` avec leurs UUID exacts pour un nettoyage manuel ultérieur. Toujours noter precisément ce qui reste à nettoyer quand un nettoyage automatique est interrompu, pour ne pas perdre la trace de données de test avant un merge sur `main`.

## Rollback complet plutôt que d'itérer sur un design qui ne convainc pas (session 46)

- **Vérifier le rendu réel déployé avant d'investir plus de temps** : le toggle "capsule verre dépoli" (glider glow, icônes Armchair/CarFront) a été conçu et implémenté sur plusieurs itérations, mais une fois vu en conditions réelles (déploiement Vercel), le résultat n'a pas convaincu. Plutôt que de continuer à patcher un design déjà jugé insatisfaisant, le rollback complet vers la version simple d'origine était la bonne décision — cohérent avec la leçon session 43 ("effet visuel subjectif : livrer minimal + rollback facile, ne pas sur-investir").
- **`git checkout <commit> -- <fichiers>` est suffisant pour un rollback ciblé** : pas besoin de `git revert` quand l'état cible existe déjà tel quel dans un commit antérieur connu — restaurer fichier par fichier les fichiers concernés, puis `git rm` les fichiers entièrement nouveaux créés pendant l'expérience (composant + asset). Plus simple et plus sûr qu'un revert qui rejouerait l'historique à l'envers.
- **Un rollback est une bonne occasion d'audit défensif gratuit** : profiter de la pause forcée pour lancer un audit complet (bugs + dead code + a11y) sur tout le périmètre touché récemment, via agents parallèles sur scopes disjoints (composants/CSS/routes) pour éviter les conflits d'édition concurrents. A permis de trouver 2 vrais bugs (animation scroll qui ne s'installait jamais sans `.rv`, bouton de formulaire bloqué sur erreur réseau) sans rapport avec le rollback lui-même.
- **Toujours diffuser contre `origin/<branche>`, pas la ref locale** : la ref locale `main` peut être très en retard sur `origin/main` si jamais explicitement mise à jour/fetchée — toujours `git fetch` puis comparer/merger contre `origin/main` pour le bon point de référence, sinon risque de merge-base erroné.

## Code 21st.dev partiel : reconstruire le CSS manquant, pas juste adapter le JSX (session 45)

- **Un snippet 21st.dev peut ne livrer que le JSX sans son CSS** : le `CardCanvas`/`Card` fourni ne contenait que la structure HTML (filtre SVG `#unopaq`, 4 `border-element`, `card-backdrop`) — tout l'effet réel (bords lumineux animés, motif points, keyframes) était dans un fichier CSS absent. Dans ce cas, « corriger le code » = le reconstruire entièrement, pas l'adapter. Toujours demander : « le snippet contient-il son CSS ? » avant de plonger.
- **Le filtre SVG `feColorMatrix` bloom est coûteux sur mobile** : appliquer un bloom SVG animé sur 15+ conteneurs (FAQ, tarifs, cartes) sature le GPU sur mobile moyen + crée des bugs de stacking context avec les `transform`/`opacity` des reveals `.rv`. Quand un composant 21st.dev repose sur un filtre SVG par élément, évaluer la charge GPU AVANT d'approuver.
- **Cohérence du langage visuel : si on retire une animation sur un type d'élément, ne pas la réintroduire sur un autre** : le conic-gradient tournant du ShinyButton a été rejeté (buggy, glitchy). Le `CardCanvas` 21st.dev utilise exactement le même mécanisme (bords lumineux rotatifs) sur les cartes. Intégrer ce composant tel quel aurait réintroduit le défaut qu'on venait de corriger ×15. Décision correcte : même langage statique pour boutons et cartes.

## `filter: drop-shadow()` vs `text-shadow` — ne pas confondre texte et SVG (session 45)

- **`text-shadow` est inopérant sur les SVG** : les chemins SVG (`<path>`, `<rect>`) ne sont pas du texte — `text-shadow` est ignoré silencieusement. Pour faire briller un SVG (ici les segments LCD), utiliser `filter: drop-shadow(0 0 Xpx color)` sur l'élément SVG conteneur. La valeur du filtre peut référencer des CSS custom properties (`calc(Xpx * var(--b2c-glow))`), ce qui le rend pilotable par le TweakPanel.
- **SVG et `items-baseline`** : l'alignement `align-items: baseline` d'un flexbox ne fonctionne pas correctement avec des SVG inline — ils n'ont pas de ligne de base typographique. Utiliser `items-center` pour aligner chiffres SVG avec suffixes texte.

## `useEffect` avec `animate=false` : penser aux mises à jour de props (session 45)

- **Problème stale-value** : un composant avec `const [display, setDisplay] = useState(value)` initialise l'état à la valeur de la prop. Si `animate=false`, il ne lance pas le countup → `display` reste à la valeur initiale. Quand la prop `value` change (ex. switch d'onglet Formule dans PricingSection), l'état ne se met PAS à jour car l'`useEffect` dépend du flag `animate` qui n'a pas changé. Fix : ajouter `if (!animate) { setDisplay(value); return; }` en tête de l'`useEffect([value, animate])`. La dépendance à `value` garantit le re-run à chaque changement de prop.

## Audit systématique avant merge : auditer même les fichiers « non touchés » (session 45)

- **3 problèmes trouvés par l'audit subagent** : (1) carte `/reservation` oubliée (`.b2c-glow-card` non appliqué → incohérence visuelle), (2) `CountUp.tsx` devenu code mort non supprimé, (3) `.b2c-btn--ghost` CSS mort laissé en place. Aucun n'aurait cassé le build, mais tous auraient pollué le déploiement et trompé sur l'état réel du code.
- **Checklist audit visuel post-session** : pour chaque nouvelle classe CSS créée → vérifier qu'elle est appliquée à TOUS les endroits prévus (grep dans `src/`) ; pour chaque composant remplacé → vérifier que l'ancien est supprimé (CountUp) ; pour chaque classe CSS retirée des templates → vérifier que son style CSS est aussi supprimé (`.b2c-btn--ghost`).

## Composant 21st.dev : juger l'adéquation AVANT d'intégrer, pas juste l'adapter (session 44)

- **Un composant 21st.dev peut être le mauvais outil même s'il a l'air joli** : le `NeonRGBTextEffect` fourni était un canvas WebGL **plein écran** au texte **codé en dur**, produisant une **aberration chromatique RGB (texte blanc frangé)** — l'opposé d'un « néon bleu ». Pour 12 kickers il aurait fallu 12 contextes WebGL (limite navigateur ~16, +1 déjà pris par le fond fumée) = désastre perf. La bonne réponse était **CSS `text-shadow` pur** : zéro JS, zéro WebGL, garde le texte bleu, réglable via `--b2c-glow`. **Toujours confronter le composant à la demande réelle et aux contraintes (perf, scope, archi) avant de coder** — recommander la solution simple si le composant ne colle pas.
- **Le Flip Gallery (21st.dev) avait un bug de stale-closure** : `updateGallery(nextIndex)` n'utilisait jamais `nextIndex`, il lisait `currentIndex` via la closure (encore l'ancienne valeur juste après `setState`) → image décalée d'un cran. Fix : passer l'index explicitement aux fonctions (`setActiveImage(el, index)`). **Ne jamais copier-coller un composant 21st.dev sans relire sa gestion d'état** — beaucoup ont des bugs latents masqués par des données de démo aléatoires.
- **Adapter le code 21st.dev (rappel sessions 43/41)** : retirer `"use client"`, déplacer les `<style>` globaux vers le CSS scopé (`.izox-b2c`) — surtout quand les sélecteurs sont génériques (`.top`, `.bottom`, `#flip-gallery`) qui fuiteraient dans le CRM —, retirer le wrapper démo plein écran (`min-h-screen bg-black`), typer les refs, gérer le cleanup des timeouts/animations au unmount, ajouter `prefers-reduced-motion`. Pas de `demo.tsx` (code mort).

## Factoriser un effet CSS réutilisé dans une custom property (session 44)

- **Quand le même `text-shadow` multi-couches doit s'appliquer à plusieurs classes** (`.b2c-kicker`, `.b2c-accent`, `.b2c-figure`, `.b2c-glow-text`), le définir UNE fois dans une variable CSS (`--b2c-neon`) puis `text-shadow: var(--b2c-neon)` partout. DRY, une seule source de vérité, et l'imbrication `var()` (le halo référence `--b2c-glow`) reste pilotable en live par le TweaksPanel. Évite la dérive (4 copies à maintenir).
- **`text-shadow` n'affecte PAS les SVG** : les icônes lucide colorées en accent ne peuvent pas recevoir de néon via `text-shadow` (il faudrait `filter: drop-shadow`). Distinguer « texte » (text-shadow) et « icône SVG » (filter) quand une demande dit « tous les éléments bleus ».
- **Deux classes posant `text-shadow` sur un même élément ne s'additionnent pas** : `text-shadow` est une propriété unique → la cascade en choisit une seule (pas de cumul). Donc poser le même `var(--b2c-neon)` sur `.b2c-figure` ET `.b2c-glow-text` ne double pas le halo — pratique pour unifier sans risque de sur-glow.

## Espacement kicker→titre : comparer les marges réelles des deux côtés (session 44)

- **Avant de « rapprocher » deux éléments, lire les marges réelles des deux blocs à comparer** : le kicker Hero semblait « trop loin » de son titre vs les sections. Cause : Hero `<h1>` avait `mt-5` (20px) alors que `SectionHeading` `<h2>` avait `mt-2` (8px). Aligner sur `mt-2` a suffi. Le `line-height` serré des titres (1.04/1.08) ne contribuait quasi rien — l'écart venait de la marge explicite.

## Effet visuel subjectif : livrer minimal + rollback facile, ne pas sur-investir (session 43)

- **4 essais d'effets sur les titres/textes, 4 rejets** : TextBlockAnimation (GSAP), titres isométriques v1 (perspective 3D), v2 (skew 2D + extrusion), LayeredText (empilement de mots). Chaque essai a été reverté immédiatement. Leçon : sur un rendu **purement esthétique** où le goût de l'utilisateur tranche, ne pas câbler l'effet dans 8 endroits d'un coup ni ajouter une grosse lib avant validation. Faire **1 commit isolé et facilement révertable** par tentative → `git revert <sha>` propre, zéro résidu.
- **Comprendre la RÉFÉRENCE avant de coder** : l'image "INFINITE PROGRESS…" n'était pas un titre-phrase penché mais un **empilement de mots** en projection oblique. J'ai perdu 2 itérations à pencher des phrases (perspective + rotateX = fuite 3D, sans rapport) avant de réaliser que l'effet vient de l'alternance EXACTE `skew(60deg,-30deg) scaleY(0.667)` / `skew(0deg,-30deg) scaleY(1.333)` ligne par ligne. Quand l'utilisateur fournit une réf + un code source, reproduire le code source TEL QUEL d'abord, ne pas réinventer.
- **Adapter le code "21st.dev / Next.js" à Vite/TanStack** : retirer systématiquement `"use client"`, `<style jsx>` (Next-only), les media-queries inline en objet style (invalides en React → silencieusement ignorées), et toute dep lourde (GSAP) si l'animation n'est pas requise. Remplacer le responsive par `clamp()` + unités `em`.
- **GSAP SplitText = coûteux** : re-split du DOM + recréation d'overlays à chaque resize, combiné au canvas WebGL fumée = saturation du main thread → lag mobile. Pour un reveal léger, préférer CSS pur (clip-path animé via l'IntersectionObserver déjà en place) plutôt que GSAP.

## Perf : `contain` + `will-change` pour isoler une vidéo des repaints voisins (session 43)

- **`contain: layout style paint`** sur le container d'une vidéo (et sur la section parente) crée une **frontière de peinture** : les repaints du canvas WebGL d'arrière-plan et de l'animation de reveal ne se propagent plus à la vidéo → bégaiement supprimé. Combiner avec `will-change: contents` (alloue les ressources de rendu à l'avance) + `backface-visibility: hidden` (force une couche GPU).
- **Capper le fps d'un canvas d'ambiance lent** : une fumée fbm animée est imperceptible à 25 fps vs 60. Passer le cap de 30 → 25 fps réduit la contention GPU avec le décodage vidéo simultané, sans perte visuelle.

## `npm run build` ne suffit PAS — toujours `npx tsc` avant commit (session 42)

- **Symptôme** : la landing crashait en prod avec l'error boundary "Something went wrong / An unexpected error occurred". Le build Vercel passait (vert), mais la page `/` plantait au runtime.
- **Cause** : en nettoyant les imports de `sections.tsx` (suppression de `WaterLoopDiagram`, `installWaterLoop`, `useEffect`, `useRef`), j'ai **aussi retiré `ChevronDown`** de l'import `lucide-react` — alors qu'il était toujours utilisé dans la FAQ (`<ChevronDown />`). Résultat : `ReferenceError: ChevronDown is not defined` au rendu de la FAQ → error boundary.
- **Pourquoi non détecté** : `vite build` **ne fait PAS de type-checking** — il bundle, transpile, mais ne vérifie pas les références TypeScript. Un identifiant non importé passe le build sans erreur et crashe uniquement à l'exécution. J'avais validé avec `npm run build` seul, en sautant `npx tsc --noEmit --skipLibCheck`.
- **Règle absolue** : avant TOUT commit, lancer `npx tsc --noEmit --skipLibCheck` EN PLUS de `npm run build`. Le `tsc` aurait immédiatement signalé `Cannot find name 'ChevronDown'`. Le build vert ≠ code correct. C'est déjà dans CLAUDE.md ("Vérifier le build TypeScript") mais facile à zapper sous la pression de "ça compile".
- **Corollaire — supprimer un import = vérifier qu'il n'est plus utilisé** : quand on retire un symbole d'une liste d'import groupée, faire un `grep` du symbole dans le fichier AVANT de le retirer. Ici un `grep "ChevronDown" sections.tsx` aurait montré l'usage L425. Ne jamais retirer un import "à vue" en supposant qu'il était lié au code qu'on supprime.

## Détourer un PNG statique — ffmpeg lumakey fonctionne aussi sur les images (session 41)

- **`ffmpeg lumakey` n'est pas réservé à la vidéo** : la même commande fonctionne sur un PNG source (`ffmpeg -i src.png -vf "lumakey=threshold=0.04:tolerance=0.10:softness=0.22,gblur=sigma=1.5:steps=2:planes=8,format=rgba" output.png`). Le filtre `format=rgba` force la sortie avec canal alpha. Résultat : un PNG RGBA dont le fond noir est réellement transparent (pas juste masqué). Fonctionne mieux que la méthode PIL `max(r,g,b)` car le `gblur planes=8` floute uniquement le canal alpha → bords fondus naturellement.
- **CSS `mask-image: radial-gradient` ne détouré PAS les zones internes** : un masque radial coupe les coins, mais si l'image a un fond noir opaque au centre (ex. fond du PNG autour d'une illustration circulaire), il reste visible. `mask-image` = découpe de forme ; alpha réel baked dans le fichier = transparence vraie. Règle : pour toute image avec fond à supprimer, toujours pré-traiter le fichier plutôt qu'utiliser CSS.
- **Choisir image statique > vidéo quand c'est possible** : une vidéo gravure (WebM 2,1 Mo + MP4 1 Mo) pèse 3× plus qu'une image équivalente (PNG RGBA 1,5 Mo). Si le contenu est statique (illustration de concept, schéma), l'image est toujours préférable en perf et en qualité de rendu. La vidéo vaut la complexité seulement si l'animation est nécessaire.

## Composant générique vs wrapper : factoriser la logique vidéo-alpha (session 41)

- **Dès qu'une logique est réutilisée une 2e fois, extraire un composant générique** : HeroCar et AquaponieVideo ont exactement la même mécanique (alpha VP9, fondu opacity, prefers-reduced-motion, iOS unlock). La bonne architecture est `AlphaVideo` générique + wrappers minces (`HeroCar`, `AquaponieVideo`). Un 2e copier-coller de HeroCar.tsx aurait créé 2 bugs potentiels à maintenir identiquement.
- **Les props `webmSrc`, `mp4Src`, `aspectRatio`, `label`, `reducedSeek` suffisent** pour couvrir tous les cas vidéo-alpha de la landing. Si une 3e illustration vidéo s'ajoute, c'est un wrapper de 10 lignes.
- **Supprimer le code mort immédiatement** : `AquaponieScene.tsx` et `installAquaponie` devenaient du code mort dès le remplacement. Les laisser en place aurait pollué la codebase et trompé sur l'architecture réelle. Supprimer + vérifier tsc 0 erreur = confirmation propre.

## Détourer le fond noir d'une vidéo : canal alpha VP9 baked, PAS canvas ni blend (session 40)

- **Solution définitive cross-browser = canal alpha réel dans le fichier WebM (VP9 yuva420p)** : encoder la vidéo avec `ffmpeg -vf "lumakey=threshold=0:tolerance=0.10:softness=0.16,format=yuva420p" -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 48 -an`. Le fond noir devient transparent au niveau du codec — Firefox, Chrome et Edge lisent l'alpha natif. La vidéo s'affiche DIRECTEMENT dans un `<video>` sans aucun JS de rendu. mp4 H.264 en source de fallback pour Safari/iOS (pas d'alpha VP9, mais fond noir acceptable sur fond sombre).
- **Le canvas chroma-key (`drawImage` + `getImageData`) est cassé sur Firefox** : Firefox ne décode pas les frames d'une vidéo masquée (`opacity:0`, hors-écran) pour `drawImage`/`getImageData` → canvas vide. Chrome décode quand même, d'où un bug uniquement Firefox. Aucun trick (rAF pur, rVFC, canplay…) ne corrige ça : c'est une limitation du pipeline Firefox pour les vidéos non rendues. Ne jamais revenir au canvas chroma-key.
- **`mix-blend-mode: screen` est cassé quand le parent a `transform` ou `opacity`** : le parent `.rv` (reveal au scroll) applique `transform: translateY(18px)` + `opacity: 0→1` → crée un stacking context isolé → le blend n'a plus le fond de page derrière la vidéo → le noir reste. Ne pas utiliser `mix-blend-mode` pour détourer une vidéo dont le conteneur peut être animé.
- **Fondu d'apparition pour éviter le flash de fond noir** : la vidéo reste à `opacity: 0` jusqu'à l'événement `loadeddata`/`canplay` (1ère frame décodée), puis fondu `opacity 0→1` sur 0.5s. Filet de sécurité `setTimeout(reveal, 1200)` au cas où aucun event ne se déclenche (ne jamais rester invisible).
- **Diagnostic "zone vide mais dimensionnée" = 2 causes possibles, à départager** : (A) reveal CSS (`.rv` à `opacity:0`) dont l'IntersectionObserver ne se déclenche jamais (élément déjà dans le viewport au mount + `rootMargin` négatif) → bloc garde sa taille mais reste invisible ; (B) le contenu ne se peint pas. Filet anti-A : watchdog `setTimeout` qui force `.is-in` sur tous les `.rv` après ~1,2 s (ajouté dans `PublicLayout`).
- **Garder la double source webm/mp4 + iOS unlock** : WebM VP9 alpha en 1ère source, mp4 fallback, déverrouillage autoplay au premier toucher.

## Firefox H.264 codec support — WebM VP9 fallback required (session 39)

- **H.264 (mp4) is NOT natively decoded by Firefox on Linux without system codecs** : even if you've successfully used mp4 on Chrome/Edge/Safari, Firefox may fail silently and treat the video as audio (showing an audio player icon instead of rendering). This is a platform-dependent issue, not a bug in your code.
- **Double source strategy : WebM first, mp4 fallback** : use `<source src=".webm" type="video/webm">` THEN `<source src=".mp4" type="video/mp4">` in a `<video>` element. Firefox will use WebM (VP9 codec, natively supported). Chrome/Edge support both (prefer WebM). Safari doesn't decode VP9 → falls back to mp4 (native). This covers all major browsers with a single video pair.
- **WebM VP9 encoding** : always provide a VP9-encoded WebM alongside H.264 mp4. Use FFmpeg: `ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 output.webm` (quality 30 is visually transparent, ~80% of original size).
- **Imperative video element setup** : React doesn't reliably reflect `muted`, `defaultMuted`, `playsInline` attributes on `<video>` elements. After mounting, force-set them in JS: `video.muted = true; video.defaultMuted = true; video.playsInline = true;`. This ensures iOS autoplay + mute policies are respected.
- **iOS autoplay unlock pattern** : if `video.play()` is rejected (autoplay policy), attach a one-time click/touchstart handler to a parent container. On first interaction, call `video.play()` again → succeeds after user gesture. Pattern: `container.addEventListener('click', unlock, { once: true }); container.addEventListener('touchstart', unlock, { once: true, passive: true })`. Update component state to trigger a re-render of the animation loop.
- **Pure rAF (not rVFC) for robust video rendering** : `requestVideoFrameCallback` doesn't fire if the video is paused or off-screen (iOS Safari sandboxing). Use `requestAnimationFrame` instead for a continuous loop — it always fires (even if video is paused), and you call `video.drawImage()` on whatever frame is current. Fallback: draw the first frame immediately on `loadeddata` event (in case autoplay is blocked and rAF loop hasn't started yet).
- **Audio icon in browser UI = MIME type issue** : if the browser shows an audio player icon (speaker icon) in the address bar, the file is either: (1) being served with the wrong MIME type (audio/* instead of video/*), or (2) the codec isn't recognized (Firefox H.264 issue). Check the server's Content-Type header and verify file format. A valid mp4 file served as audio/mpeg is still invalid.

## Canvas chroma-key pour transparence d'une vidéo — alpha keying sur luminance (session 38)

- **Mix-blend-mode CSS (screen, lighten) est imprévisible pour éliminer un fond** : même avec `mix-blend-mode: screen`, le fond noir d'une vidéo reste visible sur certains navigateurs, à certains moments, ou dépend du contexte de blending parent. Solution fiable = Canvas chroma-key : traiter chaque frame en JavaScript.
- **Algorithme luminance chroma-key** : lire le pixel `(r, g, b, a)` depuis `getImageData`, calculer `max_component = Math.max(r, g, b)` (luminance du pixel). Appliquer des seuils d'alpha : `max_component ≤ LO (18)` → alpha=0 (transparent) ; `max_component ≥ HI (64)` → alpha=255 (opaque) ; entre les deux → dégradé lissé `((max - LO) * 255) / (HI - LO)`. Écrire le nouvel alpha avec `putImageData`. Résultat : 49% des pixels deviennent transparents (le fond noir), le tracé vert/blanc reste opaque.
- **Sous-échantillonnage pour perf mobile** : ne pas traiter la vidéo en full résolution (1024×560). Traiter à 676×370 (×1.5 réduction de pixels), puis étirer le canvas en CSS `width: 100%; height: 100%` via le `style`. Le GPU redimensionne le canvas automatiquement → pas de banding perceptible sur un tracé au trait fluo.
- **`willReadFrequently: true` hint au contexte 2D** : `ctx = canvas.getContext("2d", { willReadFrequently: true })` informé le navigateur que `getImageData` sera appelé fréquemment (chaque frame vidéo) → optimise la stratégie de rendu (évite de copier les pixels en RAM chaque fois).
- **`requestVideoFrameCallback` avec fallback rAF** : pour synchroniser la mise à jour du canvas avec les frames vidéo, utiliser `vid.requestVideoFrameCallback(loop)` (préféré, 1 callback/frame vidéo exact). Si non supporté (ancien navigateur), fallback à `requestAnimationFrame` (peut renvoyer 2-3 frames par callback sur haute fréquence, acceptable).
- **Frame figée pour `prefers-reduced-motion`** : si l'utilisateur a désactivé les animations, pause la vidéo et cherche à `t=1.0s` pour afficher une frame où la voiture est bien visible. `prefers-reduced-motion` ≠ "pas d'animation du tout" : c'est "pas de mouvement fluide" → une image statique après 1s suffit.
- **Vidéo source cachée hors-écran** : la vidéo elle-même ne doit jamais être rendue (juste décodée en RAM). Poser `position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none`. Zéro effet visuel, zéro interaction.
- **Trim vidéo pour enlever un artefact final** : si la source contient un défaut en fin de clip (ex. boîte noire d'un drawbox mask), ne pas essayer de le nettoyer en post-traitement Canvas. Utiliser `ffmpeg -t 3.5` côté serveur/CI pour couper avant le défaut. C'est plus propre et plus rapide qu'une RLC au runtime.

## Image monochrome recolorable via CSS — mask-image + background var() (session 37)

- **Recolorer une image monochrome sans dupliquer l'asset** : pour qu'une illustration (tracé blueprint) suive une couleur pilotée par CSS var (ex. TweakPanel `--b2c-accent`), ne PAS l'insérer en `<img>`/`<image>` SVG. Utiliser un `div` avec `background: var(--b2c-accent)` + `mask-image: url(asset.png)` + `mask-mode: luminance`. Le masque luminance : blanc=opaque, noir=transparent → le background coloré ne s'affiche QUE sur le tracé. Changer la var → recoloration instantanée, zéro JS, zéro asset dupliqué par couleur.
- **Webkit prefix obligatoire** : Safari (et Chrome jusqu'à récemment) exigent `-webkit-mask-image`/`-webkit-mask-size`/`-webkit-mask-repeat`/`-webkit-mask-position`. Mais **`-webkit-mask-mode` n'existe pas** dans les types React CSSProperties (et est mal supporté) → ne PAS l'ajouter, le `mask-mode: luminance` standard suffit (Safari traite un PNG en luminance par défaut). Caster `style={{...} as React.CSSProperties}` si TS rouspète sur une propriété mask.
- **Détourer un fond noir = masque de luminance PIL** : image source tracé clair sur fond noir (`max(r,g,b)` ≈ 0-9 aux coins) → `lum = arr.max(axis=2)` (canal max, pas la luminance pondérée, pour un tracé monochrome) puis étirement de contraste `np.clip((lum - t) * 255/(255-t), 0, 255)` avec `t≈10`. Sauver en grayscale `L`. Le noir devient transparent une fois utilisé en `mask-mode:luminance`, le tracé reste plein.
- **Exclure une zone d'un détourage** : pour retirer un élément (ex. une étoile/logo bas-droite) sans l'effacer à la main, mettre sa bounding box à 0 dans le tableau numpy AVANT le crop au contenu : `lum[670:, 1180:] = 0`. Le crop `getbbox`-like se recalcule ensuite sur le contenu restant.
- **Fade des bords pour des coupes propres** : multiplier les N% de colonnes/lignes de bord par une rampe `np.linspace(0,1,fw)` (et son inverse à droite/bas). Efface en douceur les traits d'annotation qui dépassent, sans bord net.
- **Calibrer un bleed mobile négatif sur le padding du container** : un `-mx-8` (32px) sur un container à `padding-inline: 1.25rem` (20px) fait déborder l'image de 12px/côté hors viewport → contenu latéral coupé. Pour que l'image fasse **pile** la largeur du viewport (max sans coupe), utiliser `-mx-5` (= 1.25rem) qui annule exactement le padding. Toujours faire correspondre le bleed négatif au padding réel du container, pas à une valeur arbitraire.

## SVG viewBox cropping — resserrer la viewBox pour agrandir visuellement (sessions 34-36)

- **La vraie cause d'un SVG « trop petit »** n'est presque jamais le `max-w` CSS : c'est les marges mortes dans le `viewBox`. Un SVG `viewBox="0 0 460 320"` dont le dessin commence à (56,36) et finit à (460,296) affiche 72px de vide en haut+bas. Solution : `viewBox="56 36 404 276"` → le même code CSS `max-w-[620px]` produit un rendu ×1,5 plus grand. Toujours analyser les coordonnées des éléments extrêmes avant de toucher au CSS.
- **Repositionner les éléments débordants avant de cropper** : le label SVG « rampes led » de AquaponieScene débordait à droite (x=432, hors d'un crop à x+328=424). Il a fallu d'abord le recentrer (x=260) PUIS resserrer la viewBox. Ordre : identifier les outliers → les corriger → recalculer les bornes du crop.
- **`clipPath` + `data-*` attrs = pont SVG↔JS propre** : pour animer un élément SVG depuis JS (ex. eau qui monte), ajouter un `<rect data-water-rect>` dans un `<clipPath>` et le requêter via `section.querySelector('[data-water-rect]')`. Le clipPath contrôle la visibilité ; JS ne touche qu'aux attributs `y`/`height`. Zéro état React, zéro re-render.
- **linearGradient vertical pour effet eau dans un verre** : `x1="0" y1="0" x2="0" y2="1"` avec `stopOpacity` 0.07 en haut → 0.28 en bas mime la refraction d'un liquide (plus dense/opaque au fond). Le fill clippé donne l'illusion d'eau transparente.

## Extraction de logo sur fond opaque — PIL luminance masking (session 36)

- **PNG RGBA ≠ fond transparent** : un fichier `.png` avec mode `RGBA` peut avoir `alpha=255` partout (fond opaque). Toujours vérifier `img.getpixel((0,0))[3]` avant d'assumer la transparence. Si alpha=255 sur les coins : le fond est opaque.
- **Masque luminance pour séparer texte blanc / fond sombre** : `L = img.convert('L'); L_mask = L.point(lambda p: 0 if p < 110 else min(255, (p-110)*255//90))`. Pixels sombres (fond vert) → alpha=0 ; pixels clairs (texte blanc) → alpha=255. Résultat : image blanche fond transparent utilisable sur n'importe quel fond sombre.
- **Compression PIL pour assets web** : thumbnail + quality=42 + optimize=True réduit 952 KB → 130 KB (×7.3) sans perte perceptible. Pour les assets visuellement complexes (halftones, photos), passer d'abord en niveaux de gris (`.convert('L')`) avant compression JPEG = gains supplémentaires car canal unique.

## Watermark JPEG en tile — éviter les bandes (session 36)

- **Cause systématique des bandes en tile** : edge pixels d'une photo JPEG en near-black (luminosité 5/255 sur la ligne 0). En tile avec `background-repeat: repeat`, cette ligne noire apparaît toutes les `background-size` px. Solution : ne jamais tiler une photo JPEG non créée pour le tile. Utiliser `cover + no-repeat` à la place.
- **Effet velours sans tile** : `background-size: 130vmax 130vmax; background-repeat: no-repeat` + oscillation CSS `@keyframes` en 3 points (triangulaire, pas linéaire) crée un drift organique. Le mouvement triangulaire (A→B→C→A) semble moins mécanique qu'un A→B linéaire.
- **`inset: -380px` est dangereux** : dépasser les bords du viewport avec un pseudo-élément `::before` pour compenser les bords du tile crée des artefacts sur certains navigateurs mobiles (scroll horizontal). Préférer `inset: 0` avec une image plus grande que le viewport (`130vmax`).

## Dark mode scope isolation — `.izox-b2c` wrapper prevents CRM bleed (session 33)

- **CSS-scoped dark mode requires wrapper class** : wrapping the landing B2C pages in `<div className="izox-b2c">` ensures all CSS variables (--b2c-bg, --b2c-accent, --b2c-glow, etc.) are namespaced. Without wrapper, Tailwind utilities (`text-foreground`, `border-primary`) would redefine global tokens and bleed into the CRM.
- **Semantic token remapping inside scope** : under `.izox-b2c`, redefine button/input colors via Tailwind utilities that reference `--color-primary` pointing to `--b2c-accent` (green). Outside the wrapper, `--color-primary` defaults to blue (CRM). Zero conflicts because CSS rules are scoped by `.izox-b2c` parent selector.
- **Progressive enhancement : animations post-hydration** : The SSR renders static structure + dark classes before JS loads. Animations (scroll listeners, CountUp, transitions) attach via `useEffect` so they don't block FCP. Test: CPU throttle on `/` → animation jank allowed, but page readable instantly.
- **Verify CRM isolation empirically** : fetch `/login` SSR HTML, grep for `izox-b2c` (absent ✓) and `--b2c-accent` (absent ✓). Do NOT rely on visual inspection of code — actually verify the rendered HTML contains no dark tokens outside landing pages.

## SVG scroll-driven animations — `getPointAtLength` for path-traced objects (session 33)

- **Path animation requires SVG path export** : `WaterLoopDiagram` exports `LOOP_PATH` (SVG path element) + `getTotalLength()` value. The controller `installWaterLoop` reads `.getTotalLength()` + calculates `strokeDashoffset` per scroll position. Pattern : `new SVGPathElement().getTotalLength()` returns pixel distance along the path (requires actual DOM access, not JSON).
- **`getPointAtLength` for position tracking** : to move an object (droplet) along a curved path, call `path.getPointAtLength(distance)` which returns `{x, y}`. Map scroll progress [0..1] to distance [0..totalLength], then `setDropletPos(path.getPointAtLength(...))`. Critical : `getPointAtLength` is DOM-only (no SSR), so wrap in `if (typeof window !== "undefined")`.
- **rAF throttle prevents jank on scroll** : a naive scroll listener fires 60+ times/sec. Wrap the update in `let rafId; addEventListener('scroll', () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(() => updatePath(...)) })`. Coalesces updates into browser paint cycles → smooth 60fps instead of stutter.
- **SVG viewBox prevents CLS** : set `viewBox` on the SVG root so aspect ratio is preserved across responsive resizes. Without it, SVG reflows when viewport changes → Cumulative Layout Shift.

## CountUp component — IntersectionObserver for lazy animation trigger (session 33)

- **CountUp fires only when entering viewport** : wrap in `IntersectionObserver(threshold: 0.4)` so animation doesn't run if the counter is below-the-fold. Prevents 60+ unnecessary animations on SSR.
- **`easeOutCubic` for natural counting feel** : linear progress (0→final in 1100ms) feels robotic. Apply easing `const progress = 1 - (1 - t)³` (cubic ease-out) so the counter slows as it approaches the final value.
- **Respect `prefers-reduced-motion`** : if user has motion disabled in OS settings, display final value instantly (no animation loop). Idiom : `const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches; if (!motionOk) setCount(final); else [animate]`.
- **Never block page load on counter animation** : the component should run the animation independently in a `useEffect` after mount. No async await, no promises. If Supabase fetch is slow (10s), the counters still animate once data arrives.

## Responsive design for landing — mobile-first scroll-driven (session 33)

- **No hover-dependent UX on mobile** : Tailwind `@media hover:hover` applies only to devices with a real pointer. Landing buttons use "fill water bottom→top" animation on desktop hover; on mobile, skip hover and let tap reveal the interaction via state change (pressed/active). Test on iPhone: no CSS hover effects, but tap still works.
- **Sticky navbar clipping overflow** : `overflow-x: clip` on `.izox-b2c` wrapper prevents SVG glows and animated droplets from painting outside the viewport horizontally. Without it, hero car halo clips unpredictably. `clip` is safer than `hidden` (doesn't clip vertical overflow).
- **Grid layouts with `clamp()` for responsive scales** : titles use `clamp(1.5rem, 6vw, 3.8rem)` (min, preferred %, max). Smoothly scales from mobile to desktop without breakpoint jank. Applies to: hero title, section headings, card borders.
- **Mobile form inputs = full width** : buttons in `/reservation` form are `w-full` to hit 44px touch target minimum. Label text must be readable (16px+) to prevent iOS zoom-on-focus.

## Design token handoff from Figma — bridging design + code (session 33)

- **Color values are hex, not Figma variable names** : design handoff provides swatches with RGB hex values (e.g. #3FE08F abysse green). Code defines these as CSS custom properties (`--b2c-accent: #3FE08F`). Do NOT try to parse Figma's `{color.primary}` variable names into CSS — extract the final RGB hex value instead.
- **Typography : font stack order matters** : brief specifies Instrument Serif (titles) + Archivo (body) + JetBrains Mono (figures/numbers). Google Fonts `<link rel="preload">` ensures fonts load before first paint. Fallback stack: `Instrument Serif, Georgia, serif` (no Google Fonts = Serif renders in Georgia).
- **Illustration naming convention** : SVG component files are `{Concept}.tsx` (HeroCar, WaterLoopDiagram, AquaponieScene). Each exports a single `export default` functional component. The component is then imported and rendered in the page route — separates illustration code from layout.

## Framerate-aware animations with prefers-reduced-motion (session 33)

- **Detect motion preference on mount** : `const prefersReduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)`. Store in ref (not state) because media query doesn't change after mount — state would cause unnecessary re-renders.
- **Different behavior for reduced motion** : if user disabled motion, either (1) display final state immediately (counters, scroll transforms), or (2) use a simpler non-animation transition (fade, text change, no rotate/translate). Pattern for scroll: `if (prefersReduced) { stateA → stateB instantly } else { animate A→B over Xms }`.
- **Test via DevTools simulation** : Chrome DevTools → Rendering → Emulate CSS media feature "prefers-reduced-motion" to verify behavior without changing OS settings.

## Email transactionnel = 3 points à synchroniser, pas seulement le RPC (session 32)

- **Une notification interne ≠ un email** : `emettre_facture` créait bien une `notifications_internes` (in-app) depuis la session 23, mais **aucun email Resend** ne partait — le client ne voyait la facture qu'en se connectant. Le réflexe « la notif est faite donc le client est prévenu » est faux : les deux canaux sont indépendants. Toujours vérifier les DEUX (table `notifications_internes` ET `email_logs` + type dans `send-email`).
- **Ajouter un type d'email = 3 fichiers en même temps** (cf. leçon session 13 sur `rdv_modifie`) : (1) union `EmailType` dans `src/lib/email.ts`, (2) `case` + builder HTML dans l'edge function `send-email`, (3) l'appel `sendEmail(type, id)` au bon endroit du flux. Oublier (3) = le type existe mais n'est jamais déclenché (exactement l'état de `facture_emise` avant cette session : le RPC notifiait en interne mais personne n'appelait `sendEmail`).
- **RBAC edge function par défaut sûr** : `facture_emise` n'a eu aucune ligne à ajouter dans `CLIENT_ALLOWED_TYPES` — donc un client ne peut pas le déclencher (refus 403), seuls admin/staff/commercial le peuvent. Le whitelist `CLIENT_ALLOWED_TYPES` est un deny-by-default : tout nouveau type est automatiquement interdit aux clients sauf ajout explicite. Bon pattern, ne pas le contourner.
- **Tester un email côté DB sans pouvoir l'envoyer** : l'envoi Resend réel exige un `functions.invoke` JWT-authentifié (impossible depuis `execute_sql`). La validation empirique se fait alors en deux temps : (a) vérifier en DB que le `SELECT` exact de l'edge function (mêmes colonnes + join `entreprises`) retourne les bonnes valeurs et que `resolveClientEmail` a un destinataire ; (b) s'appuyer sur la parité avec les types email déjà fonctionnels (même mécanique d'envoi). Le « ça partira » repose sur la parité, pas sur un envoi observé en test.
- **Impersonation admin dans `execute_sql` via CTE `set_config`** : pour appeler un RPC SECURITY DEFINER gardé (`has_role(auth.uid(),'admin')`) depuis `execute_sql` (qui tourne en service_role), poser le claim JWT dans la MÊME transaction que l'appel : `WITH claims AS (SELECT set_config('request.jwt.claims','{"sub":"<admin_id>","role":"authenticated"}', true)) SELECT mon_rpc(...) FROM claims;`. Le `set_config(is_local=true)` ne survit qu'à la transaction courante ; le CTE garantit que l'appel RPC s'exécute dans cette transaction → `auth.uid()` = admin.
- **Teardown facturation = ne pas oublier les notifications du dispatcher** : émettre/générer une facture déclenche un `dispatcher_notification` qui notifie AUSSI le staff (pas seulement le client ciblé par le RPC). Après un test, supprimer les `notifications_internes` du client ne suffit pas : il reste les notifs staff (`generation_facture_brouillon` / `emission_facture`). Nettoyer par référence métier (`titre LIKE '%CT-TEST-...%'`) et revérifier `COUNT(notifications_internes)=0`. Penser aussi à `ALTER TABLE factures DISABLE/ENABLE TRIGGER USER` pour supprimer une facture émise (immuabilité), et `setval('seq_facture_b2b_2026', 1, false)` pour repartir vierge.

## Pattern `*.client.*` interdit par le plugin SSR TanStack Start (session 31)

- **Symptôme** : build serveur échoue avec `[import-protection] Import denied in server environment — Denied by file pattern: **/*.client.*`. Le fichier `terrain.client.$id.tsx` est refusé à l'import depuis `routeTree.gen.ts` dans le bundle serveur.
- **Cause** : TanStack Start embarque un plugin `@tanstack/start-plugin-core:import-protection` qui interdit tout fichier dont le nom correspond à `**/*.client.*` dans le bundle SSR. Le segment `.client.` au milieu du nom déclenche la protection (même convention que Next.js `.client.ts` files).
- **Fix** : renommer le fichier route sans `.client.` dans son nom. `terrain.client.$id.tsx` → `terrain.suivi.$id.tsx` (route `/terrain/suivi/$id`). Le `createFileRoute(path)` à l'intérieur est complètement indépendant du nom de fichier — TanStack Router utilise les `.` comme séparateurs de segments de nom de fichier, mais le `path` déclaré dans le fichier peut être ce qu'on veut.
- **Règle** : ne jamais nommer un fichier route avec `.client.` dans son nom dans un projet TanStack Start (SSR). Pour les routes, utiliser des noms descriptifs fonctionnels sans ce mot (`suivi`, `detail`, `journal`, etc.).

## `typeScope()` redéfinie localement = scope intérieur/extérieur cassé côté admin (session 30)

- **Symptôme** : la fiche admin `/admin/interventions/$id` affichait les zones photo extérieures (Pare-chocs, Capot, Côtés, Toit, Coffre) ET la « Checklist extérieur » (items non cochés) sur une prestation `pack_interieur` → impression trompeuse de prestation incomplète. La fiche terrain, elle, n'affichait que l'habitacle (correct).
- **Cause** : `admin.interventions.$id.tsx` **redéfinissait une `typeScope()` locale** qui renvoyait `"complet"` pour TOUS les packs (`pack_interieur` inclus), au lieu d'importer la vraie de `@/lib/interventions` (qui mappe `pack_interieur → interieur`). Du coup `showInt && showExt` étaient tous deux vrais.
- **Fix** : importer `typeScope` depuis `@/lib/interventions`, supprimer la version locale, recalculer `scope = typeScope(type_prestation)` puis `showInt = scope==='interieur'||'complet'`, `showExt = scope==='exterieur'||'complet'`. Exactement le pattern de la fiche terrain.
- **Règle** : ne JAMAIS redéfinir localement une fonction de mapping métier (`typeScope`, `zonesFor`, `getPackLabel`) qui existe déjà dans `src/lib/`. Une copie locale dérive et casse silencieusement. Toujours importer la source unique. Confirmé par CLAUDE.md (« ne jamais appliquer `type_prestation` à `zonesFor()`/`showInt/showExt` sans passer par `typeScope()` »).

## Logger un événement métier pour une timeline = trigger DB, pas code frontend (session 30)

- **Contexte** : la « Timeline des modifications » de la fiche contrat lit `admin_actions_log` filtré sur `details->>'contrat_id'`. La validation d'intervention (UPDATE `statut='validee'` côté admin) n'écrivait aucun log → invisible dans la timeline.
- **Choix** : trigger DB `AFTER UPDATE ON interventions` (SECURITY DEFINER, search_path=public) plutôt que code frontend après l'UPDATE. Garantit le log quel que soit le chemin d'écriture (RPC future, cron, action manuelle), pas seulement le bouton admin actuel. `user_id = NEW.validated_by` (déjà posé dans le même UPDATE).
- **Guard anti-doublon** : `IF NEW.statut='validee' AND OLD.statut IS DISTINCT FROM 'validee'` — ne logge qu'à la **transition**, pas à chaque édition ultérieure d'une intervention déjà validée. Toujours tester ce cas (UPDATE d'un autre champ sur ligne déjà validée → 0 nouveau log).
- **contrat_id dérivé du véhicule** : `interventions` n'a pas de `contrat_id` direct → le trigger lit `vehicules.contrat_id` via `NEW.vehicule_id`. Le filtre timeline `details->>'contrat_id'` ne montre que les interventions dont le véhicule porte un contrat (acceptable). Pas besoin de régénérer les types Supabase : un trigger n'altère aucun schéma de table.
- **Nouveau type d'action = nouveau case dans `getActionMeta()`** : sans mapping UI, l'action tombe dans le `default` (libellé brut, icône History). Ajouter le case (`intervention_validee` → icône Sparkles, « Prestation validée · {immat} · {pack} » via `getPackLabel`).

## Géocodage Nominatim fragile sur abréviations FR + intervention sans GPS (session 29)

- **Symptôme** : la carte des tournées affiche "non géolocalisé" / point absent pour les nouveaux RDV. Une demande créée avec "18 Av. du Gén Leclerc" n'avait aucune coordonnée (`latitude/longitude` NULL), alors qu'une adresse normale ("7 chemin des closeaux") géocodait bien.
- **Cause racine** : (1) Nominatim échoue sur les abréviations ("Av.", "Gén") ; (2) le géocodage client est fire-and-forget — si Nominatim échoue, la demande est créée sans coords ; (3) `AssignerRdvDialog` proposait un géocodage **optionnel** (badge + bouton), facile à zapper → `assigner_rdv` crée l'intervention avec coords NULL → absente de la carte.
- **Fix triple** :
  1. **Edge function `geocode-address` v3** : normalisation des abréviations FR courantes (`Av.→Avenue`, `Gén→Général`, `Bd→Boulevard`, etc.) + cascade de tentatives (adresse exacte → normalisée → `code_postal ville, France` en fallback ville). Garantit au moins un point ville.
  2. **`AssignerRdvDialog`** : géocodage **automatique** dans `handleConfirm` si la demande n'a pas de coords (best-effort, silencieux, n'échoue pas l'assignation). Helper `ensureGeocoded({silent})` partagé avec le bouton manuel.
  3. **`ensureGeocoded`** propage aussi les coords aux `interventions` déjà créées depuis la demande (`UPDATE ... WHERE demande_rdv_id`), pas seulement à `demandes_rdv` — sinon un RDV déjà confirmé reste sans GPS.
- **Règle** : tout point affiché sur une carte doit avoir un fallback de géocodage (au pire le centre-ville). Ne jamais laisser le géocodage comme une étape optionnelle si une fonctionnalité aval (carte des tournées) en dépend — le rendre automatique au moment où les coords deviennent nécessaires.

## Intervention annulée encore "réalisable" côté opérateur — guard UI manquant (session 29)

- **Symptôme** : un RDV annulé restait ouvrable côté terrain ; l'opérateur voyait le stepper (pré-contrôle/photos/signature) et tentait des actions. Les photos échouaient silencieusement.
- **Cause** : `terrain.intervention.$id.tsx` ne gérait spécifiquement que `planifiee` (vue "prendre en charge") puis affichait le stepper pour tous les autres statuts, **y compris `annulee`**. Les RLS Storage/`intervention_photos` exigent `statut='en_cours'` → les uploads échouaient, d'où "ça ne fonctionne pas" mais sans message clair.
- **Fix** : guard explicite — si `statut === 'annulee'`, afficher un écran "Intervention annulée / aucune action possible" + retour planning, avant tout rendu du stepper. Cohérent avec les RLS (défense en profondeur : l'UI ne doit pas proposer ce que la DB refuse).
- **Règle** : quand une RLS bloque une opération sur certains statuts, l'UI doit refléter ce blocage par un écran dédié — ne jamais afficher un formulaire dont chaque action échouera au niveau base.

## Photo terrain : `capture="environment"` empêche la photothèque (session 29)

- **Symptôme** : l'opérateur ne pouvait QUE prendre une photo sur le moment (caméra forcée), impossible de choisir une image existante — bloquant pour les photos "après" prises plus tôt ou pour reprendre une photo ratée.
- **Cause** : `<input type="file" accept="image/*" capture="environment">` dans `PhotoSlot.tsx` — l'attribut `capture` force l'ouverture directe de l'appareil photo arrière sur mobile, sans proposer la galerie.
- **Fix** : retirer `capture`. Avec seulement `accept="image/*"`, le sélecteur natif mobile propose un choix : "Prendre une photo" OU "Photothèque" OU "Choisir un fichier".
- **Règle** : n'utiliser `capture` que si la prise live est la SEULE option voulue. Dès qu'on veut laisser le choix caméra/galerie, ne pas mettre `capture` — le picker natif gère le choix.

## Leaflet z-index dans un Radix Dialog — isolation CSS (session 29)

- **Symptôme** : en ouvrant `AssignerRdvDialog`, la carte Leaflet (tiles, markers, contrôles) restait visible par-dessus le contenu du dialog. La `DialogOverlay` (fond noir semi-transparent) était bien rendue, mais les éléments Leaflet "transperçaient".
- **Cause** : Leaflet impose des z-indexes élevés (markers : 600, popups : 700, contrôles : 800) via son propre CSS. La `DialogContent` Radix utilise `z-50` (Tailwind = CSS z-index: 50), insuffisant pour battre les couches Leaflet dans le même contexte d'empilement document.
- **Fix** : `style={{ isolation: "isolate" }}` sur le container de la carte. La propriété CSS `isolation: isolate` crée un nouveau stacking context — tous les z-indexes internes à ce container (y compris ceux de Leaflet) sont confinés à l'intérieur et ne peuvent plus concurrencer des éléments extérieurs (le Dialog). Zéro changement de z-index nécessaire.
- **Règle** : quand une bibliothèque tierce (Leaflet, D3, des drag'n'drop libs) impose des z-indexes élevés en dur, ne pas essayer de les battre en augmentant le z-index du dialog. Isoler le container de la bibliothèque avec `isolation: isolate` à la place.

## Emails skippés silencieusement — email_contact null (session 29)

- **Symptôme** : `email_logs` montrait `status=skipped`, `error_message="Aucun email destinataire valide"` pour `rdv_confirmee` et `rdv_modifie`. L'utilisateur n'avait reçu aucun email après assignation d'un RDV.
- **Cause racine** : `create-client-account` insère l'entreprise avec `payload.entreprise.email_contact` qui peut être null (champ optionnel dans le formulaire admin). `send-email` résolvait alors `email ? [email] : []` → liste vide → skip. Le formulaire "Créer un compte client" ne requiert pas l'email de contact de l'entreprise (le champ existe mais n'est pas obligatoire).
- **Fix double** : (1) `create-client-account` : `email_contact: payload.entreprise.email_contact ?? payload.user.email` — toujours avoir un destinataire en defaultant sur l'email auth du compte créé. (2) `send-email` : helper `resolveClientEmail(admin, entrepriseId, knownEmail)` — si `email_contact` est null, chercher le profil client lié (`profiles.role='client'`) et récupérer son email via `auth.admin.getUserById()`. Le fallback garantit que les emails arrivent même pour les entreprises créées avant le fix.
- **Règle** : un champ `email_contact` optionnel sur `entreprises` rend toute la chaîne email fragile. Pour un CRM, l'email de notification doit toujours être résolvable. Soit le rendre obligatoire en DB (NOT NULL), soit implémenter systématiquement le fallback auth email. Choisir l'un ou l'autre — pas les deux à moitié.

## Mutation directe de prop React — masquer un état UI post-action (session 29)

- **Anti-pattern** : après géocodage d'une adresse, le code faisait `demande.latitude = data.latitude` pour masquer le badge "Adresse non géocodée". Cela mutait l'objet prop directement, ce qui ne déclenche pas de re-render React et peut causer des incohérences si le parent re-passe la prop originale.
- **Fix** : state local `geocoded: boolean` initialisé à `false`, remis à `false` à chaque ouverture du dialog (`useEffect([open, demande])`). Après géocodage réussi : `setGeocoded(true)`. Condition : `!demande.latitude && !geocoded`. Le badge disparaît immédiatement après l'action sans muter le prop.
- **Règle** : ne jamais muter un objet prop (même si JS le permet). Pour un état UI local (ex. "action vient d'être faite"), utiliser un `boolean` state local au composant. Pour exposer la mise à jour au parent, passer un callback (ex. `onGeocoded(lat, lng)`) dans les props.

## `remise_pct` vs `taux_remise` — colonne de retour de `calculer_palier_remise` (sessions 27c/28/29)

- **Symptôme** : `degeler_contrat` échoue avec `ERROR 42703: column "remise_pct" does not exist` côté front. Toast d'erreur affiché, contrat reste en `en_cours_gel`.
- **Cause** : `_recalculer_caches_contrat` lisait `SELECT palier, remise_pct FROM calculer_palier_remise(v_nb)` mais la fonction retourne `TABLE(palier text, taux_remise numeric)`. Le nom de colonne dans le SELECT doit correspondre au nom déclaré dans le RETURNS TABLE.
- **Correctif appliqué** : migration `20260610c_fix_recalculer_caches_contrat_taux_remise.sql` → `SELECT palier, taux_remise INTO v_palier, v_remise`. La colonne destination (`remise_pct` sur `contrats`) garde son nom, seul le alias de lecture depuis la fonction change.
- **Historique** : même bug corrigé sur `ajouter_vehicule`, `supprimer_vehicule`, `valider_vehicule` en sessions 27c/28. `_recalculer_caches_contrat` (appelé par `degeler_contrat`) avait été oublié.
- **Règle** : quand `calculer_palier_remise` change sa signature RETURNS TABLE, chercher TOUTES les fonctions qui l'appellent avec `grep -r "calculer_palier_remise"` et mettre à jour chaque `SELECT` en conséquence. Vérifier aussi `_recalculer_caches_contrat` qui est un helper intermédiaire appelé par plusieurs RPCs.

## Boucle infinie `useSupabaseQuery` — pattern ref pour callbacks stables (session 28)

- **Symptôme** : pages `/client/flotte` et `/admin/planning` "sautent" en continu, impossible d'interagir. Réseau : des dizaines de requêtes Supabase par seconde.
- **Cause racine** : `fetch = useCallback(fn, [queryFn, options])` — `queryFn` est une arrow function inline (nouvelle référence à chaque render), `options` est un objet inline (même chose). `fetch` est donc recrée à chaque render. Le `useEffect([fetch])` se déclenche à chaque render → `setLoading(true)` → re-render → nouvelle `queryFn` → `fetch` recrée → `useEffect` se redéclenche → boucle infinie.
- **Fix — ref pattern pour callbacks stables** :
  1. Stocker `queryFn` et chaque valeur d'`options` dans des `useRef` mis à jour à chaque render (sans être dans les deps).
  2. `useCallback(fn, [])` avec deps vide → `fetch` est **une seule fois** créée et ne change jamais.
  3. `useEffect(..., deps ?? [])` — ne pas inclure `fetch` dans les deps (inutile puisque stable).
- **Règle** : quand un callback doit être stable mais doit toujours lire les valeurs les plus récentes, utiliser `useRef` pour les valeurs + `useCallback(fn, [])`. Ne **jamais** mettre une inline arrow function ou un objet inline comme dépendance d'un `useCallback` qui est lui-même dans les deps d'un `useEffect`.
- **Diagnostiquer rapidement** : si un `useEffect` se déclenche à chaque render, chercher dans ses deps une valeur dont la référence change à chaque render (souvent : inline function, inline object, résultat de `.filter()/.map()`).

## Audit complet app — IDOR sur RPC SECURITY DEFINER (session 27c)

- **Une RPC SECURITY DEFINER bypasse TOUTE la RLS** : elle s'exécute avec les droits du owner (postgres). Le seul rempart est le code de la fonction elle-même. Donc chaque RPC qui prend un `entreprise_id`/`contrat_id`/`user_id` en paramètre DOIT vérifier explicitement l'appartenance pour un appelant client/commercial — sinon IDOR direct (un client appelle `/rest/v1/rpc/xxx` avec l'id d'un autre). La RLS sur les tables ne protège PAS les écritures faites dans une SECURITY DEFINER.
- **3 IDOR trouvés sur des RPC qui déterminaient le rôle sans l'utiliser comme garde** : `ajouter_vehicule` calculait `v_role_initiateur='client'` mais ne vérifiait jamais `get_user_entreprise = p_entreprise_id` ; `generer_facture` était SECURITY DEFINER sans aucun guard de rôle ; `supprimer_vehicule` ne contrôlait pas le commercial. Pattern de référence correct déjà présent ailleurs : `creer_demande_rdv` et `demander_gel` vérifient bien l'appartenance. **Règle : déterminer un rôle ≠ l'appliquer. Toujours suivre la détermination d'un `RAISE EXCEPTION` si l'appartenance ne matche pas.**
- **RLS « role-only » = fuite de données inter-tenant** : `vehicules_operateur_select` faisait juste `has_role(operateur)` → tout opérateur voyait les véhicules de toutes les entreprises. Une policy pour un rôle non-admin doit TOUJOURS filtrer par la donnée (ici : EXISTS interventions liées via `operateur_id` ou `operator_id`), pas seulement par le rôle. Même leçon que les 3 bugs RLS passés (vehicules/entreprises sans policy).
- **Distinguer code mort de risque actif** : `compute-impact` (edge function) + `impact_records` (table) avaient un IDOR, mais le frontend ne les appelle jamais (impact calculé on-the-fly dans `src/lib/impact.ts`). Avant de prioriser un fix, vérifier si le chemin est réellement atteignable depuis l'app. Ici → rétrogradé + recommandation de SUPPRESSION (le code mort déployé reste appelable en direct = risque latent + dette).
- **Vérifier les claims des agents d'audit avant de coder** : l'agent edge-functions a signalé un « XSS critique » sur `rdvDateLabel` — faux positif : `assigned_heure`/`assigned_date` sont des colonnes TIME/DATE (pas de texte libre injectable). Et il a dit `emettre_facture` « sans guard » alors que `pg_proc` montrait `has_role_guard=true`. Toujours confirmer en DB (`pg_get_functiondef`, `pg_policy`) avant d'agir sur un finding d'agent.

## Double-chargement page client quand auth tarde à résoudre (session 28)

- **Symptôme** : page `/client/flotte/$id` "saute" au chargement — le contenu s'affiche, disparaît brièvement (spinner), puis réapparaît.
- **Cause** : `load` dépend de `profile?.entreprise_id` via `useCallback`. Au montage, `profile = null` (auth pas encore résolue) → `load` est appelé une 1ère fois (gel check sauté). Quand l'auth résout, `profile?.entreprise_id` passe de `null` à un UUID → `load` est recrée → `useEffect` le rappelle → `setLoading(true)` flash visible → 2e chargement.
- **Fix** : extraire `loading: authLoading` depuis `useAuth()` et garder le `useEffect` avec `if (!authLoading) load()` + `authLoading` dans les deps. La 1ère exécution de l'effet est sautée tant que l'auth charge ; quand elle résout, `authLoading=false` ET `profile?.entreprise_id` changent ensemble (React 18 batch) → un seul chargement.
- **Règle** : quand `useCallback` dépend d'une valeur provenant du contexte auth (souvent `null` au départ), toujours ajouter un guard `if (!authLoading)` dans le `useEffect` pour éviter le double-chargement au montage.

## Bug critique : noms de colonnes mal synchronisés entre RPC (session 27c / 28)

- **Symptôme** : RPC returns HTTP 400 silencieusement, aucun message d'erreur frontend clair. Logs PostgreSQL montraient `"column \"remise_pct\" does not exist"`.
- **Cause racine** : `calculer_palier_remise` retourne `TABLE(palier text, taux_remise numeric)`, mais `ajouter_vehicule` et `supprimer_vehicule` faisaient `SELECT palier, remise_pct INTO ...`. Erreur de synchronisation suite à une refonte de noms de colonnes qui n'avait pas été propagée uniformément.
- **Pattern à éviter** : créer une RPC qui retourne des résultats nommés (par opposition à un scalar ou json), puis modifier les noms des colonnes résultats sans vérifier systématiquement TOUTES les RPC qui l'appellent. Le fix session 27c a corrigé `ajouter_vehicule` + `supprimer_vehicule` mais a manqué `valider_vehicule` — même bug, même erreur. Solution : grep exhaustif `calculer_palier_remise.*SELECT.*INTO` sur tout le schéma avant de clore un fix de synchronisation de colonnes.
- **Diagnostic rapide** : quand une RPC cloud retourne 400 sans contexte, toujours consulter les logs PostgreSQL (pas seulement les logs API). L'erreur est souvent loggée en DB même si le client reçoit une réponse vague.

## Export CSV côté client — pattern partagé (session 27)

- **BOM UTF-8 (`﻿`) obligatoire pour Excel** : sans BOM, Excel ouvre les fichiers CSV UTF-8 en ANSI et les accents (é, è, ç) s'affichent en caractères corrompus. LibreOffice lit correctement sans BOM mais le tolère. Toujours préfixer le contenu avec `"﻿"` (BOM littéral) ou `"﻿"`.
- **Séparateur `;` pour la France** : Excel FR utilise `;` comme séparateur CSV par défaut (le `,` est le séparateur décimal). Utiliser `,` oblige l'utilisateur à importer manuellement. Avec `;`, double-clic → tableau direct.
- **Utilitaire partagé `src/lib/csv.ts`** : évite de dupliquer la logique d'échappement dans chaque composant. Interface simple `downloadCSV(rows: Record<string, unknown>[], filename: string)`. Les clés du premier objet deviennent les en-têtes — utiliser des labels lisibles en français directement dans les keys (`"N° Facture"`, `"Montant TTC (€)"`).
- **Désactiver le bouton si liste vide** : `disabled={filtered.length === 0}` évite un CSV vide et un UX confus. Corollaire : l'export respecte toujours le filtre actif, pas la liste complète — c'est le comportement attendu ("j'exporte ce que je vois").
- **`URL.createObjectURL` + clic programmatique** : pas besoin de serveur ni de dépendance. Pattern : `new Blob([csv], {type:"text/csv;charset=utf-8;"})` → `URL.createObjectURL` → `document.createElement("a")` avec `download` → `.click()` → `URL.revokeObjectURL`. Fonctionne dans tous les navigateurs modernes.

## Widget alertes dashboard — pattern surveillance passif (session 27)

- **Alertes calculées au chargement, pas en temps réel** : pour un dashboard admin qui se recharge à chaque visite, une requête COUNT au mount est suffisante. Pas besoin de subscription Realtime pour des données qui changent rarement (contrats expirants, brouillons anciens).
- **N'afficher la section que si ≥ 1 alerte active** : `{alerts.length > 0 && <section>}` — évite un bloc vide qui occupe de l'espace et génère des questions. `setAlerts(rawAlerts.filter(a => a.count > 0))` en fin de query.
- **Deux niveaux de criticité visuels** : rouge (`danger`) pour les actions immédiates (fiche non validée depuis 24h, RDV sans réponse 48h) ; ambre (`warn`) pour les actions à planifier (brouillons 30j, contrats expirant 30j). Ne pas tout mettre en rouge — ça dévalue l'alerte rouge.
- **Chaque alerte = un lien direct** : l'utilisateur ne doit pas chercher où aller. `to` + `search` permettent de pré-sélectionner l'onglet (`?tab=demandes`, `?tab=interventions`). Le click sur l'alerte amène directement à la liste filtrée.
- **Étendre `Promise.all` existant** : ajouter les 4 requêtes d'alertes dans le même `Promise.all` que les KPIs évite un 2e `useEffect` et un 2e cycle de rendu. Un seul chargement, tout est cohérent temporellement.

## B3 — Disponibilités opérateurs : ne pas démarrer sans raccord à la RPC (session 27)

- **Une table sans consommateur = dette silencieuse** : `disponibilites_operateurs` existe depuis le début mais `get_creneaux_disponibles` ne la lit pas. Créer l'UI sans modifier la RPC aurait produit une interface fonctionnellement vide — les données auraient été saisies et ignorées. Toujours vérifier `pg_get_functiondef` avant de se lancer sur un formulaire qui alimente une table.
- **Déclencheur métier > déclencheur technique** : avec 1 seul opérateur, `COUNT(operators)*2 = 2` est exact sans même consulter les disponibilités. Le bon moment pour implémenter B3 est l'arrivée d'un 2e opérateur avec des disponibilités différentes — pas avant.



## `isRecovery` doit être réinitialisé sur `SIGNED_OUT` dans `auth-context.tsx` (session 26)

- **Symptôme** : après avoir défini son mot de passe sur `/reset-password`, l'utilisateur est renvoyé sur le formulaire "Choisir un mot de passe" au lieu du formulaire de connexion normal.
- **Cause** : `reset-password.tsx` appelle `supabase.auth.signOut()` puis `navigate({ to: "/login" })`. Le `SIGNED_OUT` event vide `session`/`user`/`profile` dans le contexte, mais `isRecovery` reste `true` (il était à `true` depuis la détection du hash `#type=recovery` au chargement). Sur `/login`, le `if (isRecovery) return <SetPasswordForm/>` s'affiche donc à nouveau — sans session valide.
- **Fix** : dans `onAuthStateChange`, ajouter `else if (event === "SIGNED_OUT") { setIsRecovery(false); }`. Sémantiquement correct : se déconnecter met fin à tout flow de récupération.
- **Règle** : `isRecovery = true` doit toujours être nettoyé par deux chemins : (1) `clearRecovery()` explicite après succès de `updateUser` dans `login.tsx`, (2) `SIGNED_OUT` event dans `auth-context.tsx` (filet de sécurité pour tous les autres appels `signOut()`).



## `redirectTo` des liens auth — leçon session 26 CORRIGÉE en session 27b

- **La "leçon" session 26 était fausse et a causé le bug** : hardcoder `${siteUrl}/reset-password` dans les edge functions semblait sûr, mais `siteUrl = Deno.env.get("SITE_URL") ?? "https://izox.fr"` — et `https://izox.fr/reset-password` n'est PAS l'URL où l'app est servie ni (forcément) dans l'allowlist. Supabase ignorait silencieusement le `redirectTo` → fallback Site URL racine → l'utilisateur atterrissait sur `/login` (avec autofill admin du navigateur, d'où l'impression de "credentials pré-remplis").
- **Pattern correct (session 27b)** : utiliser le `redirect_to` envoyé par le frontend (`${window.location.origin}/reset-password`) **validé par `safeRedirectTo()`** côté edge function (origins autorisés : SITE_URL + `izox-circular-fleet-care.vercel.app` / `*.vercel.app` selon la fonction). Le frontend connaît la VRAIE origine servie ; l'edge function ne fait que la valider contre une liste de confiance. Une helper `safeRedirectTo` définie mais jamais appelée = signal d'alarme.
- **Symétrie obligatoire** : l'URL finale doit aussi être dans l'allowlist Supabase Auth (Dashboard → Auth → URL Configuration → Redirect URLs). Supabase ne renvoie PAS d'erreur si elle n'y est pas — il retombe silencieusement sur la Site URL. Maintenir `https://izox-circular-fleet-care.vercel.app/reset-password` dans cette liste (+ wildcard `https://*.vercel.app/**` pour les previews si besoin).
- **Diagnostic rapide** : lien email → page de login sans formulaire set-password = `redirectTo` rejeté par l'allowlist. Vérifier dans l'email reçu le paramètre `redirect_to=` du lien `…/auth/v1/verify?…` : c'est la valeur réellement embarquée par `generateLink`.
- **Côté frontend, lire l'URL de façon synchrone** : `reset-password.tsx` lisait `window.location.search/hash` dans un `useEffect` — supabase-js peut nettoyer l'URL (`history.replaceState`) avant que l'effet ne tourne → `hasCode = false` → redirect `/login`. Capturer les params dans un `useState(() => …)` lazy (synchrone au premier render).
- **`SIGNED_OUT` vs recovery** : quand une session admin existe et qu'on clique un lien recovery, Supabase émet `SIGNED_OUT` (ancienne session remplacée) AVANT `PASSWORD_RECOVERY`. Le handler `SIGNED_OUT → setIsRecovery(false)` (leçon session 26, toujours valable comme filet) doit être conditionné : ne pas reset si un callback recovery était présent au chargement (ref `recoveryInProgress`, levée à réception de `PASSWORD_RECOVERY`).

## Faille auth post-reset : signOut obligatoire après updateUser (session 26)

- **La session de récupération Supabase est une session authentifiée à part entière** : quand un utilisateur clique sur un lien d'invite/reset, Supabase établit une session valide (ACCESS_TOKEN en hash ou code échangé). Cette session sert à appeler `updateUser({ password })`. Si on ne la détruit pas ensuite, l'utilisateur (ou quiconque a le mail ouvert) se retrouve connecté sans avoir saisi les identifiants — accès direct au dashboard.
- **Pattern correct** : `await supabase.auth.updateUser({ password })` → si succès → `await supabase.auth.signOut()` → `navigate("/login")`. L'utilisateur doit se ré-authentifier normalement. Ce pattern s'applique à `reset-password.tsx` ET à la branche `isRecovery` de `login.tsx`.
- **Symptôme trompeur** : `navigate("/login")` semblait protecteur, mais `login.tsx` a un effet qui redirige immédiatement vers le dashboard si une session active est détectée (`if (!loading && session && profile && !isRecovery)`). Sans `signOut()` préalable, la session récupérée reste active → redirect automatique vers `/client` ou `/admin`. La protection était donc illusoire.
- **Audit systématique des flows auth** : à chaque nouveau flow d'authentification (invite, recovery, TOTP, OAuth), vérifier explicitement ce qui se passe avec la session APRÈS la transaction. Ne jamais supposer qu'un `navigate()` isole l'utilisateur d'une session active.

## Suppression /legal — pattern retrait feature (session 26)

- **Retirer une route = 5 points obligatoires** : (1) supprimer le fichier route, (2) supprimer TOUS les liens vers cette route (grep `to="/legal"`), (3) supprimer les imports orphelins (icônes, exports), (4) mettre à jour CLAUDE.md pour documenter l'absence, (5) `npm run build` pour régénérer `routeTree.gen.ts`. Oublier un seul lien = erreur TS au build.
- **Les mentions légales facture ≠ CGV/RGPD** : `FactureDocument.tsx` + `izox-legal.ts` contiennent les mentions obligatoires sur les factures (raison sociale, SIRET, TVA art. 293 B). Ce ne sont PAS des pages CGV — les retirer rendrait les factures non conformes. Toujours distinguer : contenu légal pages web (optionnel) vs mentions légales documents comptables (obligatoires).



## Messagerie V1 admin↔terrain — architecture offline-first (session 25)

- **`client_local_id UUID` est non-négociable pour la déduplication Realtime** : sans cette colonne en DB, le webhook Realtime ne retourne pas le localId côté client. Le front ne peut pas faire correspondre le message reçu avec le `LocalMessage` 'pending' → doublons visuels garantis. Ajouter la colonne dès la migration C1, pas comme afterthought.
- **Realtime subscribe INSERT only (anti-boucle)** : `subscribeToConversation` doit utiliser `event: "INSERT"` et jamais `event: "*"`. Un `markRead` UPDATE déclencherait un callback Realtime → nouveau fetch → re-render → boucle infinie. Règle : ne souscrire qu'aux événements qui apportent de l'information nouvelle (INSERT = nouveau message).
- **SECURITY DEFINER + `SET search_path` sur le trigger de notification** : l'opérateur terrain a le droit d'INSERT sur `operateur_messages` (RLS), mais pas nécessairement d'INSERT sur `notifications_internes`. Le trigger `tg_message_notify_fn` doit être `SECURITY DEFINER SET search_path = public` pour bypasser la RLS lors de l'insertion de notification. Vérifier `pg_trigger.tgfoid` → `prosecdef=true` et `proconfig=[search_path=public]`.
- **`inFlightIds` ref contre le double-envoi StrictMode** : React StrictMode monte les composants deux fois en dev. Sans guard, le même message serait envoyé deux fois. Pattern : `Set<string>` de localIds déjà en vol, check + add avant INSERT, delete après (succès ou échec).
- **`sentLocalIds` ref pour la déduplication Realtime** : quand le message revient via le channel Realtime (confirmation serveur), matcher sur `client_local_id`. Stocker les localIds déjà traités dans un `Set` pour éviter d'ajouter deux fois le même message DB.
- **localStorage offline pending** : clé `izox_chat_pending_${operatorId}`, format `LocalMessage[]`. Au chargement : messages pending → status `failed` (ils n'ont pas été envoyés). Au retour en ligne (`window.addEventListener('online', ...)`) : retry automatique de tous les `failed`. Ce pattern garantit qu'aucun message ne disparaît silencieusement en cas de coupure réseau terrain.
- **`conversation_operator_id` toujours = `profiles.id` de l'opérateur** : non pas un ID de conversation par paire, mais l'ID user de l'opérateur. Ainsi tous les admins/staff lisent la même conversation avec un opérateur donné, sans avoir besoin de créer une table de "conversations". Simplification architecturale intentionnelle.

## Régression `assigner_rdv` — cause et prévention (session 25)

- **`CREATE OR REPLACE` sans `DEFAULT` écrase le `DEFAULT` d'une version précédente** : la migration `20260605020000_security_fixes` a recréé `assigner_rdv` avec `p_heure time without time zone` (sans `DEFAULT NULL`), écrasant la version précédente qui avait `DEFAULT NULL::time without time zone`. Le TypeScript client essaie de passer `p_heure: undefined` quand l'heure n'est pas saisie — sans DEFAULT côté DB, PostgreSQL rejette l'appel → TS type error `"assigner_rdv"` not in RPC types.
- **Régression silencieuse détectée uniquement par `tsc`** : la fonction existait bien en DB mais avec une signature différente de celle attendue par le front. Sans `npx tsc --noEmit --skipLibCheck`, la régression serait passée inaperçue jusqu'au test manuel. La règle "tsc 0 erreur obligatoire avant commit" a permis la détection.
- **Fix pattern** : nouvelle migration `20260606010000_fix_assigner_rdv_restore.sql` recréant la fonction avec la signature combinée : role guard (session 24) + `DEFAULT NULL` sur `p_heure` (session 23) + notification client + SECURITY DEFINER SET search_path = public. Toujours vérifier `pg_proc.proargdefaults` après une migration touchant des fonctions avec paramètres par défaut.

## Audit sécurité complet — hardening multi-couches (session 24)

- **`search_path` injection sur les SECURITY DEFINER functions** : une fonction `SECURITY DEFINER` sans `SET search_path = public` est vulnérable à une élévation de privilège via la substitution de schéma. Si un attaquant crée un objet malveillant dans un schéma prioritaire (`pg_temp`, schéma utilisateur), il peut intercepter les appels de fonctions built-in. Toujours écrire `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog`. Vérifier avec `pg_proc.proconfig IS NULL` pour auditer les fonctions existantes.
- **Vues sans `security_invoker = true` bypassent le RLS** : par défaut, une vue s'exécute avec le contexte du *propriétaire* (généralement `postgres`), ce qui ignore les policies RLS du caller. Ajouter `WITH (security_invoker = true)` (PG15+) pour que les queries via la vue respectent le RLS de l'appelant courant. Sans ça, un client authentifié avec RLS restrictive pourrait voir toutes les lignes via la vue.
- **`DROP FUNCTION` avant `CREATE OR REPLACE` quand la signature change** : PostgreSQL distingue les fonctions par leur signature complète (nom + types des params). Changer `DEFAULT NULL` sur un paramètre ou modifier le nombre de paramètres crée une surcharge ambiguë → `ERROR: function is not unique`. Toujours `DROP FUNCTION IF EXISTS nom(args) CASCADE` avant de recréer. Exception : si un trigger dépend de la fonction, utiliser `CREATE OR REPLACE` avec la signature identique et ajouter le `search_path` sans changer les params.
- **Ownership check (IDOR) dans les edge functions** : vérifier le JWT ≠ vérifier que l'utilisateur *possède* la ressource. Un client authentifié pouvait appeler `send-email` avec l'id d'un RDV d'un autre client → email de notification envoyé frauduleusement. Pattern correct après fetch : `if (callerRole === "client" && record.entreprise_id !== callerProfile?.entreprise_id) return 403`.
- **Token exposure dans les réponses API** : `admin-reset-password` retournait `link: actionLink` même quand l'email était envoyé avec succès — l'`action_link` est à usage unique et doit rester côté serveur. Exposer le lien dans la réponse crée une fenêtre d'exploitation (logs réseau, MITM). Pattern : `link: emailSent ? null : actionLink` (fallback admin uniquement si l'envoi a échoué).
- **CORS wildcard `"*"` sur les edge functions authentifiées** : `update-client-info` utilisait `"*"` malgré une auth JWT. Si le JWT est volé et la réponse reflétée depuis une page tierce, le navigateur laisse l'attaquant lire la réponse et vérifier que le token fonctionne. Pour les fonctions authentifiées : toujours `corsFor(req)` avec validation explicite de l'`Origin`.
- **React Rules of Hooks — split layout + content** : appeler des hooks (`useState`, `useEffect`, `useAuth`) *après* un `return` conditionnel viole les règles React (ordre d'appel non stable → crash silencieux en production ou comportement imprévisible). Pattern systématique quand une route parent peut rendre `<Outlet />` : `function ParentRoute() { if (condition) return <Outlet />; return <ContentComponent />; }` + `function ContentComponent() { /* tous les hooks ici */ }`.
- **Stale async setState dans `useEffect`** : un IIFE async dans un `useEffect` sans cleanup peut `setState` sur un composant démonté → avertissement React + données incorrectes si le composant est remonté entre-temps. Pattern standard : `let alive = true; (async () => { ...; if (!alive) return; setState(...); })(); return () => { alive = false; };`.
- **Double-submit prevention** : un bouton de soumission sans guard `disabled={submitting}` peut déclencher plusieurs requêtes identiques si l'utilisateur clique vite ou en double. Toujours maintenir un state `submitting` boolean et désactiver le bouton pendant la requête en vol.
- **git state perdu entre les turns en container éphémère** : dans un environnement remote Claude Code, une session peut être interrompue après un commit apparent et le state git local réinitié silencieusement (visible via `git log` qui montre un commit disparu). Les déploiements edge function via MCP sont **persistants** (côté Supabase), mais les commits git locaux peuvent être perdus. Toujours pousser immédiatement après commit, et vérifier `git log --oneline -3` pour confirmer que le commit est bien enregistré avant de continuer.

## Onglet Factures contrat + notifications client (session 23)

- **Audit par `pg_get_functiondef` avant de coder** : avant de modifier les RPCs, vérifier avec `pg_get_functiondef(oid) ILIKE '%notifications_internes%'` quels RPCs ont déjà des notifications. Sur 9 RPCs audités, 5 avaient déjà le pattern, 4 manquaient. Évite de réécrire des fonctions qui n'en ont pas besoin et identifie précisément la dette.
- **`CREATE OR REPLACE FUNCTION` nécessite le corps complet** : PostgreSQL ne permet pas d'ajouter du code à une fonction existante. Pour enrichir un RPC, récupérer la définition complète via `pg_get_functiondef`, ajouter le code minimal (variables DECLARE + INSERT conditionnel en fin de corps), et remplacer. Toujours copier la définition exacte de la version cible (la plus récente en cas de surcharge) pour ne pas régresser.
- **Pattern notification client standard** : `SELECT p.id INTO v_client_uid FROM profiles p JOIN user_roles ur ON ur.user_id = p.id WHERE p.entreprise_id = <id> AND ur.role = 'client' LIMIT 1` — puis `IF v_client_uid IS NOT NULL THEN INSERT INTO notifications_internes ...`. Le `LIMIT 1` est correct (un seul compte client par entreprise). Le `IF v_client_uid IS NOT NULL` évite l'erreur si aucun client n'est lié.
- **INSERT RLS `notifications_internes` dans un SECURITY DEFINER** : la policy INSERT `has_role(auth.uid(), 'admin')` vérifie le JWT claims (`request.jwt.claims->>'sub'`), pas le DB role. Dans une SECURITY DEFINER function, `auth.uid()` retourne toujours l'UID de l'appelant (lu dans les GUC JWT). L'INSERT par un admin dans la fonction passera donc bien le check RLS, même si le `user_id` inséré est celui d'un client.
- **Onglet Factures contrat vs client — seul le filtre change** : la page client montre TOUTES les factures de l'entreprise (`entreprise_id`). L'onglet contrat montre les factures liées à CE contrat (`contrat_id`). Le composant `FacturesTab` est identique sauf la prop et le filtre. Pas besoin de refactoring commun — les deux vues sont légitimement différentes.
- **`action_requise=true` pour les événements négatifs** : les notifications d'annulation (`rdv_annule_admin`) utilisent `action_requise=true` pour signaler que le client doit agir (prendre un nouveau RDV). Les confirmations et modifications d'horaire utilisent `action_requise=false`.



## Cookies B2B + RSE charts (session 22)

- **Une bannière cookies sur un CRM B2B privé est une faute, pas une conformité** : le banner annonçait des cookies Matomo « soumis à consentement » qui n'existaient pas dans le code (aucun analytics chargé). Afficher un consentement pour des traceurs absents est trompeur. La règle RGPD/ePrivacy : seuls les cookies **non essentiels** (analytics, pub, tracking cross-site) requièrent un consentement ; un cookie de **session d'authentification** est exempté. IZOX n'utilise que ce dernier (JWT Supabase) → suppression totale du banner + réécriture de la section RGPD pour dire la vérité. Toujours vérifier ce qui est **réellement** chargé avant d'écrire une politique de cookies.
- **Distinguer le localStorage applicatif légitime du faux consentement** : `izox_cgv_accepted` (preuve d'acceptation CGV) est conservé ; `izox_cookie_consent` (consentement d'un banner factice) est supprimé. Retirer un banner = retirer l'état, les handlers (`accept/refuse`), le JSX **et** l'import d'icône orphelin (`Cookie` de lucide) — sinon erreur TS `Cannot find name 'Cookie'` au build, pas au `tsc` partiel.
- **RSE = recharts déjà installé, réutiliser les patterns existants** : `client.impact.tsx` utilisait déjà `AreaChart`. Ajouter `BarChart` (vertical pour la tendance mensuelle, `layout="vertical"` pour le classement par client) ne nécessite aucune dépendance. Le `formatter` d'un `<Tooltip>` recharts est typé `Formatter<ValueType>` → annoter le paramètre `(v: number)` et non `(v: unknown)` sinon TS rejette le tuple retour `[v, label]`.
- **Impact calculé on-the-fly, pas de table** : `fetchGlobalImpactSummary()` agrège côté client toutes les `interventions` validées (limit 500) × coefficients localStorage. Pas de migration, pas de RPC — cohérent avec l'archi existante (`getClientImpactSummary`). Pour une vue admin multi-clients, grouper par `entreprise_id` + jointure `entreprises(nom)`, trier et `slice(0, 6)` pour garder le graphe lisible.
- **`grid-cols-3` → `grid-cols-2` quand on passe de 3 à 4 cartes** : ajouter une 4ème hero card (CO₂) sur une grille à 3 colonnes casse l'alignement (1 carte seule sur la 2ème ligne). Passer en 2×2 (`grid-cols-2`) pour un rendu mobile équilibré.

## CORS statique vs dynamique sur edge function authentifiée (session 21)

- **`Access-Control-Allow-Origin: SITE_URL` statique casse une fonction servie depuis `*.vercel.app`** : `admin-reset-password` figeait l'origine à `izox.fr` (SITE_URL). Servie depuis le domaine Vercel (prod ou preview), le navigateur recevait le preflight OPTIONS 200 PUIS **bloquait le POST** car l'origine de la réponse (`izox.fr`) ≠ origine de la requête (`*.vercel.app`). Côté client, `supabase.functions.invoke` renvoyait `{ error }` générique → toast "Erreur" trompeur (aucune erreur serveur réelle).
- **Signature diagnostique dans les logs edge : OPTIONS sans POST** : `get_logs(service: "edge-function")` montrait des `OPTIONS | 200` répétés pour `admin-reset-password` mais **aucun `POST`**. C'est LA signature d'un rejet de preflight CORS au niveau navigateur (le POST n'atteint jamais la fonction). Toujours regarder ce ratio OPTIONS/POST avant de suspecter la logique métier.
- **Fix = CORS dynamique reflété** : `corsFor(req)` lit `Origin`, et si l'hôte est `izox.fr` ou se termine par `.vercel.app`, reflète l'origine exacte (sinon fallback `SITE_URL`). Ajouter `"Vary": "Origin"`. Couvre prod + canonical app + tous les déploiements preview (URLs changeantes). La sécurité reste assurée **côté serveur** (JWT + vérif rôle admin) — le CORS n'est pas la frontière d'autorisation, donc refléter un preview vercel est sûr. Pattern identique à `request-password-reset` (déjà éprouvé).
- **Réseau sortant bloqué dans le container** : impossible de `curl` `*.supabase.co` depuis l'env d'exécution ("Host not in allowlist", même avec sandbox désactivé). La validation HTTP en direct du header CORS doit se faire via le test utilisateur sur l'app déployée. La validation "empirique" possible ici = logs edge (cause racine) + parité avec un pattern connu + build OK.

## Phase C — Factures & Documents (session 19)

- **Rendre depuis les snapshots, jamais les tables live** : une facture est un document légal immuable. `generer_facture` fige `snapshot_client` / `snapshot_izox` / `snapshot_contrat` / `snapshot_prestations` (JSONB) + les `factures_lignes`. La page de détail lit ces snapshots, pas les jointures live (sinon un changement d'adresse entreprise modifierait une facture déjà émise). Lire la source de la RPC pour connaître la forme EXACTE des snapshots avant de typer le frontend.
- **Le mockup n'est pas la source de vérité fiscale** : `invoice.jsx` affichait "TVA 20%" / 478,80 € TTC. Le régime réel IZOX est la **franchise de base (art. 293 B du CGI)** → `tva_taux=0`, `montant_ht = montant_ttc`. Toujours vérifier le régime en base (`factures.regime_tva`, `snapshot_izox.mention_tva`) plutôt que de recopier les chiffres d'une maquette de design. Composant rendu conditionnel sur `regime_tva` pour supporter aussi `reel_normal` plus tard.
- **Pas d'identifiants légaux inventés en prod** : le mockup contenait un SIRET / IBAN / adresse fictifs pour IZOX, absents de la base (`app_config` ne les a pas, `snapshot_izox` ne stocke que `raison_sociale`+`mention_tva`). Ne jamais pousser de faux identifiants fiscaux comme s'ils étaient réels → constante `src/lib/izox-legal.ts` clairement marquée TODO, et demander les vraies valeurs à l'utilisateur.
- **Ligne `total` des `factures_lignes` = récap, pas une ligne du tableau** : `generer_facture` insère une ligne `type_ligne='total'` qui duplique `factures.montant_ht`. Le tableau de la facture doit la **filtrer** (`type_ligne !== 'total'`) et utiliser `facture.montant_ht/tva_montant/montant_ttc` pour l'encart totaux (même pattern que `admin.contrats.$id`).
- **Redirect parent qui casse l'enfant `$id`** (rappel du bug terrain/admin.interventions) : `/client/factures` doit rediriger vers `/client/documents`, mais `/client/factures/$id` est son enfant. Mettre le `beforeLoad redirect` dans `client.factures.tsx` redirigerait aussi le détail. Solution : `client.factures.tsx` = layout `<Outlet/>` pur + `client.factures.index.tsx` = redirect (path exact). Pattern identique à `admin.interventions`.
- **Impression sans dépendance PDF** : `window.print()` + `@media print { body * { visibility:hidden } .facture-print-root,* { visible } .no-print { display:none } }`. Le navigateur propose "Enregistrer en PDF" → couvre le besoin "Télécharger PDF" sans lib (jspdf/html2pdf). `position:absolute` sur la racine imprimable la sort du flux (fonctionne aussi depuis un Dialog Radix en portail).
- **Composant facture partagé client ↔ admin** : `FactureDocument` (présentationnel, props `facture`+`lignes`) sert la page client `/client/factures/$id` ET le Dialog admin (`/admin/clients/$id` onglet Factures). Le client le voit en page, l'admin en modal — un seul rendu à maintenir. L'admin voit tous les statuts (brouillon inclus), le client seulement émise/payée/annulée via RLS.
- **Tester le RLS en positif ET en négatif** : créer un client temporaire (`auth.users` + `profiles.entreprise_id` + `user_roles`), impersonation `set_config('request.jwt.claims',...)` + `SET LOCAL ROLE authenticated`. Positif : client voit sa facture émise + lignes. Négatif : insérer un brouillon → vérifier qu'il reste invisible au client (1 visible, 0 brouillon) mais visible à l'admin (2). C'est la « mise en défaut » exigée par CLAUDE.md.
- **Purge de factures émises = désactiver les triggers** : `trg_factures_no_delete` interdit `DELETE` d'une facture `emise` (et `trg_protect_facture_immuable` les UPDATE). Pour nettoyer des données de test : `ALTER TABLE factures DISABLE TRIGGER USER` → delete → `ENABLE TRIGGER USER`. Vérifier ensuite `pg_trigger.tgenabled='O'`. Penser aussi à `UPDATE contrat_sequences SET derniere_sequence=0` (émettre une facture incrémente la séquence).
- **`multiplicateur_prix` est posé par trigger** : insérer un contrat avec `multiplicateur_prix=1.0` + `engagement_type='mensuel'` → un trigger le réécrit à 1.15 (surcharge mensuel vs annuel). Ne pas s'étonner d'un montant facturé supérieur au calcul naïf : recalculer avec la valeur réelle du snapshot (`85 × 1.15 × 4 = 391`, −5% palier, ×0.9 commercial = 334,31 €).

## Phase B — /legal + split view RDV (session 18)

- **Leaflet dans un composant non-route : `lazy()` + `Suspense` au niveau du composant consommateur** : `RouteMap` est lazy-chargé au niveau de la route (`admin.planning.map.tsx`). Pour `DemandesRdvMap` utilisé à l'intérieur de `DemandesRdvList` (composant, pas route), le `lazy()` doit être dans `DemandesRdvList.tsx` lui-même. Même pattern, niveau différent.
- **Markers Leaflet impératifs vs react-leaflet déclaratifs pour l'interactivité hover** : mettre les markers dans des `<Marker>` react-leaflet et changer leur `icon` prop sur hover provoque un re-render complet de la carte (flash visuel). Solution : sous-composant `MarkerLayer` avec `useMap()` qui gère les markers impérativement via `L.marker().addTo(map)` et `marker.setIcon()`. Deux effets distincts : un pour le rebuild complet (changement de `rows`), un léger pour le hover (changement de `hoveredId` → `setIcon()` seulement + pan).
- **Split view hauteur fixe dans un tab** : `flex-1 overflow-y-auto` sur un enfant ne fonctionne que si le parent a une hauteur définie. Dans un `TabsContent` sans hauteur fixe, utiliser `style={{ height: "520px" }}` sur la div split plutôt que `h-full` ou `flex-1` qui ne se propagent pas correctement depuis un tab parent à hauteur indéfinie.
- **`routeTree.gen.ts` et nouvelles routes** : créer `src/routes/legal.tsx` avec `createFileRoute("/legal")` génère une erreur TS `Argument of type '"/legal"' is not assignable to parameter of type 'keyof FileRoutesByPath'` tant que le routeTree n'est pas régénéré. La solution est `npm run build` (pas juste `tsc --noEmit`). Le build régénère `routeTree.gen.ts` en premier, puis la vérification TS passe.
- **`scrollRef.current.scrollTo` et `el.offsetTop`** : `el.offsetTop` retourne l'offset depuis l'`offsetParent` de l'élément, qui peut ne pas être le conteneur scroll. La méthode fiable pour smooth-scroll vers une section : `container.scrollTop + (el.getBoundingClientRect().top - container.getBoundingClientRect().top) - padding`.
- **Page légale statique = 0 fetch Supabase** : les pages de contenu statique (CGV, RGPD) n'ont pas besoin d'appels DB. Les données sont directement dans le fichier source. Pas de `useEffect` de chargement, pas de `loading` state, rendu immédiat.

## Audit sécurité complet + hardening (session 18)

- **Endpoint public `verify_jwt=false` + mot de passe hardcodé = exploit live** : `seed-users` était public ET contenait `const PASSWORD = "Izox2026!"` pour créer des comptes admin. N'importe qui avec l'URL Supabase (publique) pouvait appeler l'endpoint et créer un admin. Leçon : tout endpoint de seeding/bootstrap doit être désactivé en production ou protégé par une clé secrète. Immédiatement remplacer par un stub 410 Gone.
- **CORS `"*"` sur edge functions authentifiées = fuite de confiance** : même si le JWT est vérifié, `Access-Control-Allow-Origin: *` permet à n'importe quelle page malveillante de détecter la présence de l'API, de faire des requêtes CORS cross-origin depuis le navigateur de l'utilisateur, etc. Toujours restreindre à `SITE_URL` pour les fonctions authentifiées.
- **Open redirect dans les emails de reset** : `generateLink({ redirectTo: userInput })` sans validation permet à un attaquant d'envoyer un email IZOX avec un lien vers `attacker.com`. Toujours valider l'`origin` de `redirect_to` contre une whitelist avant de passer à `generateLink`. Le fallback doit être `/reset-password` sur le `SITE_URL` officiel.
- **XSS dans les templates email** : les templates HTML construits par string interpolation avec des données DB (nom entreprise, motif de refus, immatriculation) sont vulnérables si un admin ou un client a entré `<script>alert(1)</script>`. Les emails HTML peuvent exécuter du JS dans certains clients mail anciens. Créer une fonction `esc()` et l'appliquer systématiquement à TOUTES les valeurs user-controlled dans les templates.
- **Triple défense anti-crawlers IA** : robots.txt seul est insuffisant (les bots malveillants l'ignorent). Défense en profondeur : (1) `robots.txt` avec `Disallow: /` + directives par user-agent, (2) `X-Robots-Tag` HTTP header dans `vercel.json` (couvre toutes les réponses y compris les assets), (3) meta `<robots>` dans le HTML head (couvre les navigateurs qui ne liront pas les headers). Les trois niveaux ensemble maximisent la protection.
- **CORS dynamique pour endpoint public** : un endpoint `verify_jwt=false` ne peut pas utiliser une valeur statique pour `Access-Control-Allow-Origin` si plusieurs origines sont légitimes (production + preview Vercel). Valider l'`Origin` request header contre un `Set` d'origines autorisées et refléter l'origine validée — jamais `"*"`.

## Handoff v2 — refonte visuelle avancée (session 17)

- **Tailwind v4 : keyframes hors `@theme`, utilities dans `@layer utilities`** : les `@keyframes` se déclarent au niveau racine du fichier CSS (pas dans `@theme inline`). Les classes custom (`animate-check-pop`) vont dans `@layer utilities { .animate-... { animation: ... } }`. Les alias de couleur soft tint (`--color-success-soft`) vont dans `@theme inline` comme les autres tokens.
- **`border-left` inline style pour les couleurs DB-driven** : quand la couleur vient de la DB (ex. `operators.color_hex`), impossible d'utiliser une classe Tailwind dynamique. Solution propre : `style={{ borderLeft: "3px solid {color_hex}" }}` (inline). Ne pas générer de classe dynamique `border-l-[${color}]` — pas purgeable par Tailwind au build.
- **Composant AnimatedCheck SVG avec stroke-dashoffset** : l'animation `drawCheck` requiert `stroke-dasharray` ET `stroke-dashoffset` initiaux sur l'élément `<path>`. Le CSS seul (`animation: drawCheck`) ne fonctionne pas si l'état initial n'est pas déclaré via `style={{ strokeDasharray: 24, strokeDashoffset: 24 }}`. La classe `animate-draw-check` gère uniquement l'offset final (0).
- **Layout tripartite Leaflet : `flex h-[560px]` + `overflow-y-auto` sur le panel droit** : ne pas utiliser `grid` pour un layout avec un élément de hauteur dynamique (la carte Leaflet). `flex` avec hauteur fixe + `flex-1` sur la carte + `w-[280px] overflow-y-auto` sur le panel droit évite les conflits de redimensionnement Leaflet.
- **`createPinIcon` teardrop via CSS pur** : `border-radius: "50% 50% 50% 4px"` + `transform: "rotate(-45deg)"` sur un `div` carré donne la forme goutte Leaflet sans SVG externe. La mise à l'échelle (`width/height: 28px`) + `border: 2px solid white` + `box-shadow` donne le rendu propre. Compter le décalage pour `iconAnchor` : `[14, 28]` (pointe en bas).
- **Validation empirique des données avant de déclarer un composant testable** : après avoir créé les données de test (interventions, demandes_rdv), toujours vérifier via `execute_sql` que les RPC dépendantes (`get_creneaux_disponibles`) retournent les bonnes valeurs, et que les colonnes GPS sont bien peuplées avant de passer la main au test manuel.
- **Purge DB impérative avant merge main** : les données de test créées pendant le développement (entreprises, véhicules, interventions, demandes_rdv, comptes client) doivent toutes être supprimées avant merge. Le SQL de purge dans CLAUDE.md §7 liste l'ordre correct (FK enfants avant parents). Toujours vérifier `COUNT(auth.users) = 4` après purge.

## Complétion refonte — pages admin oubliées (session 16)

- **Auditer le code, jamais le `todo.md`** : le todo annonçait « refonte complète » mais 3 pages admin (`admin.contrats`, `admin.contrats.$id`, `admin.impact`) n'avaient jamais été refondues — elles n'étaient simplement jamais listées dans la Phase 2. Vérifier l'état réel par inspection du code (présence `PageHeader`, headers `text-3xl font-bold` résiduels) avant de déclarer une refonte terminée.
- **Les heuristiques grep donnent des faux signaux sur la typo** : `@layer base { h1,h2,h3,h4 { font-family: var(--font-display) } }` dans `styles.css` applique **déjà Outfit à tous les titres**. Donc `grep "font-display"` retourne 0 sur des pages qui rendent pourtant en Outfit (login, settings). Et `grep "text-2xl font-bold"` matchait des **chiffres de stats** (quota X/Y) et **logos PDF**, pas des titres non refondus (faux positifs côté client/terrain). Conclusion : la vraie rupture visuelle = **absence de `PageHeader` parmi des pages sœurs qui l'utilisent**, pas le poids ou la famille de police.
- **Vérifier le handoff avant d'extrapoler** : les designs manquants étaient déjà fournis (`admin-ops.jsx → A_Contrats`, `impact-admin.jsx`). Toujours `grep`/lister le dossier handoff avant de réinventer une maquette. Seul `settings` n'avait pas de mockup → extrapolation légitime du design system.
- **Ne pas inventer de data pour coller à une maquette** : la maquette `impact-admin.jsx` affiche des KPIs (eau économisée, CO₂ total) absents de la page actuelle. Les ajouter = nouvelles requêtes Supabase = logique métier → **hors périmètre d'une refonte CSS-only**. Appliquer le `PageHeader` et le layout sans fabriquer de fetch de données. Les `StatTile` de `admin.contrats` sont OK car calculés depuis des données **déjà chargées** (`rows`), pas de nouvelle requête.
- **Pattern fiche détail + `PageHeader`** : préserver le lien cliquable contextuel (ex. lien vers la fiche client) en le déplaçant dans le wrapper de contenu sous le `PageHeader` (le `sub` du `PageHeader` n'accepte qu'une string). Statut + Retour vont dans le slot `right`.

## Refonte visuelle — design system + 3 portails (sessions 14-15)

- **Tailwind v4 CSS-only** : plus de `tailwind.config.ts` — toute la config (tokens, custom colors, shadows, fonts) se fait dans `src/styles.css` avec `@theme inline { --color-... }`. Ne jamais créer de `tailwind.config.ts` dans ce projet.
- **Ordre des tokens CSS** : déclarer les variables sémantiques (`--color-primary`, `--shadow-card`) dans `@theme inline` *après* les variables hex raw. Sinon les utilitaires Tailwind générés n'ont pas accès aux valeurs.
- **`PageHeader` comme composant boundary** : créer un composant `PageHeader` réutilisable (`src/components/ui/page-header.tsx`) avec `crumbs`, `title`, `sub`, et `right` permet d'homogénéiser toutes les pages admin sans duplication. L'ajouter dans le barrel export si on a un `ui/index.ts`.
- **Ne jamais toucher la logique métier lors d'une refonte CSS** : tout changement de classe Tailwind sur un composant qui fait des appels Supabase doit être fait en ciblant uniquement les classes CSS. Les props de données (RPCs, hooks, useState) restent intacts. Si le composant est trop enchevêtré, isoler le shell HTML/CSS dans un sous-composant de présentation.
- **`flex flex-col min-h-full` pour les pages avec PageHeader sticky** : le PageHeader est `sticky top-0 z-10`. Le parent doit être `flex flex-col min-h-full` pour que le contenu dessous occupe la hauteur restante correctement. Sans ça, les pages courtes ont un PageHeader qui "flotte" visuellement.
- **Fermeture de `</div>` après refactor** : quand on remplace `<div className="p-6 max-w-5xl mx-auto">` par `<div flex-col min-h-full><PageHeader/><div p-6 max-w-5xl>`, il faut ajouter une fermeture `</div>` supplémentaire en fin de JSX. Oubli fréquent = erreur TS immédiate sur les balises déséquilibrées.
- **Edit sans Read préalable = erreur** : le tool `Edit` exige un `Read` préalable dans la session. Toujours lire avant de modifier, même si le contenu est connu via le résumé de session.
- **`PageHeader` dans les pages de détail async** : ne pas placer le `PageHeader` avant le guard de chargement (`if (loading) return <Loader/>`). Le placer dans le bloc `return` principal pour que les données (`entreprise.nom`, `vehicule.immatriculation`) soient disponibles quand il se rend.
- **Statuts visuels — tokens design cohérents** : actif = `bg-[#E7EFEA] text-primary border-[#CBDDD2]`, gelé = `bg-[#D5E2F6] text-[#2A6FDB] border-[#B3C8EF]`, en_attente = `bg-amber-50 text-amber-700 border-amber-200`. Ne jamais mélanger les couleurs Tailwind générique (`sky-*`, `blue-*`) avec les tokens custom — toujours partir des valeurs hex du design system.
- **Font Outfit sur les titres** : ajouter `font-family: var(--font-display)` via `@layer base { h1,h2,h3,h4 { font-family: ... } }` dans `styles.css`. La classe utilitaire `.font-display` + Tailwind `font-bold` suffit pour les titres isolés. Ne pas oublier de charger la fonte via le `<link>` Google Fonts dans `root.tsx`.
- **Client portal mobile-first** : les pages `/client/*` n'ont pas de sidebar — layout `px-4 py-5 max-w-2xl mx-auto pb-24`. Le `pb-24` est crucial pour éviter que le bottom nav masque le contenu. Ne jamais le retirer.
- **`Vercel MCP list_projects` peut retourner vide** malgré un projet live — problème de scope OAuth du token. Passer par le dashboard Vercel directement pour trouver le lien de preview. Déploiements auto branch = `https://<projet>-git-<branch>-<team>.vercel.app`.

## Audit sécurité et correctifs (session 13)

- **`routeTree.gen.ts` ne se régénère qu'au build** : après création d'une route index (`terrain.index.tsx`), `routeTree.gen.ts` n'est pas mis à jour localement → erreur TS silencieuse `keyof FileRoutesByPath`. Toujours lancer `npm run build` (ou au minimum vérifier avec `tsc --noEmit`) après création d'une nouvelle route. Le build Vercel régénère automatiquement, mais pas l'environnement de développement.

- **Bug de sous-ensemble d'email type : toujours vérifier la synchronisation EmailType frontend ↔ edge function** : `rdv_modifie` était dans `src/lib/email.ts` (type union frontend) mais absent du switch de `send-email`. Résultat : l'email tombait dans `default: throw new Error("Type email inconnu")` → erreur 500 silencieuse (fire-and-forget). Règle : tout nouveau type ajouté à `EmailType` dans `email.ts` doit SIMULTANÉMENT avoir un `case` dans l'edge function.

- **Vérification de rôle dans les edge functions** : authentification ≠ autorisation. Vérifier le JWT (auth.getUser()) prouve que l'utilisateur est connecté, pas qu'il a le droit d'appeler ce type d'action. Ajouter un lookup `profiles.role` après l'auth check pour limiter les types d'email par rôle (client ne peut appeler que ses propres types).

- **Casts `as any` sur tables/RPCs non typés = dette à nettoyer à chaque regen** : après chaque `generate_typescript_types`, vérifier les fichiers qui utilisaient `(supabase.from as any)("table_nouvellement_typée")` et supprimer les casts. Le regen résout la cause racine, les casts sont des symptômes.

- **Validation MIME côté client pour les uploads** : `file.type.startsWith("image/")` avant toute compression/upload. La vérification côté client ne remplace pas la validation storage policy (Supabase Storage), mais évite les erreurs de compression sur des non-images et améliore le feedback UX.

## Bug routing TanStack Router — terrain fiches non cliquables (session 12c)

- **`terrain.tsx` pleine page sans `<Outlet/>` = fiches enfants invisibles** : même bug qu'`admin.interventions` (session 8, documenté dans CLAUDE.md). `terrain.intervention.$id.tsx` est un enfant de `terrain.tsx` dans TanStack Router (file-based routing par notation `.`). Quand le parent n'a pas `<Outlet/>`, le composant enfant n'a nulle part où se rendre — le clic navigue (URL change) mais l'écran reste identique. Résolution identique à admin.interventions : `terrain.tsx` → `component: () => <Outlet/>`, dashboard → `terrain.index.tsx` avec `createFileRoute("/terrain/")`.
- **Règle systématique à l'ajout d'une route enfant** : dès qu'on crée `parent.child.tsx`, vérifier que `parent.tsx` exporte `<Outlet/>`. Si `parent.tsx` est un composant pleine page, splitter en `parent.tsx` (layout) + `parent.index.tsx` (contenu) avant de créer l'enfant. Ne pas attendre un test post-déploiement pour découvrir le bug.

## Correctifs post-tests + audit liaisons (session 12b)

- **Toujours prouver un "bug" par les timestamps avant de coder** : le client signalait un quota dépassé (3 RDV pour un pack à 2). En base, la demande #2 a été annulée **59 secondes** avant la création de la #3 → le garde-fou avait bien fonctionné (1 actif + 1 nouveau = 2). La perception utilisateur ≠ réalité base. Reconstruire la chronologie (`created_at`/`updated_at`) avant de toucher au code évite de "corriger" du code sain.
- **Bug RLS récurrent : tables jointes sans policy pour le rôle** (3ᵉ occurrence après vehicules en session 10). L'onglet Suivi opérateur affichait 0 client car `entreprises` n'avait **aucune policy `operateur`** → le join `entreprises(id,nom)` renvoyait NULL. Règle : pour CHAQUE rôle qui lit une table via un join PostgREST, vérifier qu'une policy SELECT existe sur la table jointe, pas seulement la table racine.
- **Quota mensuel : vérifier sur le mois CIBLE, pas `NOW()`** : `creer_demande_rdv` comparait au mois courant (`DATE_TRUNC('month', NOW())`). Une réservation faite en juin pour juillet était comptée sur juin. Fix : mois de référence = mois du créneau proposé le plus proche (`MIN((c->>'date')::date)`), et compter les demandes en_attente dont un créneau tombe dans ce mois.
- **Verrou métier = UI + serveur** : le verrou horaire (démarrage d'intervention) n'existait que côté React. Une RPC `SECURITY DEFINER` doit ré-appliquer la règle (ici `prendre_en_charge_intervention` recalcule l'heure de déverrouillage `date+heure AT TIME ZONE 'Europe/Paris'`). Idem `modifier_heure_rdv` : interdire jour J/passé + `en_cours` côté SQL, pas seulement masquer le bouton.
- **Fuseau horaire dans les verrous SQL** : `(date_intervention + heure)::timestamp AT TIME ZONE 'Europe/Paris'` pour matcher la logique UI (`new Date('YYYY-MM-DDTHH:MM')` = heure locale navigateur). Comparer ensuite à `now()` (timestamptz). Ne pas comparer un timestamp naïf à `now()`.
- **Tester les RPC en impersonation via `set_config('request.jwt.claims', ...)`** : `auth.uid()` lit `request.jwt.claims->>'sub'`. En posant ce GUC (is_local=true) + `SET LOCAL ROLE authenticated`, on teste RPC et RLS sous l'identité d'un rôle réel. Pour capturer une exception attendue sans casser la transaction : bloc `BEGIN...EXCEPTION WHEN others THEN` (savepoint implicite) qui écrit `SQLERRM` dans une temp table.
- **Fiche admin : ne montrer le compte-rendu que si la prestation est faite** : afficher photos/checklists/signature vides sur une intervention `planifiee` n'a pas de sens. Garde `["en_revision","validee","refusee"]` — surtout PAS `validee` seul, car l'admin doit voir les photos pendant `en_revision` pour valider.

## Refonte terrain + téléphone + observations (session 12)

- **Nom du trigger `updated_at` à vérifier avant chaque migration** : le trigger fonction s'appelle `public.tg_set_updated_at()` dans ce projet, **pas** `public.update_updated_at_column()`. Cette dernière n'existe qu'en schéma `storage`. Toujours vérifier avec `SELECT proname FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE '%updated_at%'` avant d'écrire un `CREATE TRIGGER ... EXECUTE FUNCTION`.
- **`DROP FUNCTION` avant `CREATE OR REPLACE` quand la signature change** : PostgreSQL distingue les fonctions par leur signature complète. Ajouter un paramètre DEFAULT en fin de liste nécessite un `DROP` préalable pour éviter la surcharge ambiguë. La rétrocompat est garantie par `DEFAULT NULL` en fin de liste — les anciens appels sans ce paramètre continuent de fonctionner.
- **`apply_migration` est atomique** : si la migration échoue à mi-chemin, aucune des instructions n'est persistée. Relancer la migration corrigée est sûr sans risquer d'état partiel.
- **RLS deny-by-default pour nouveaux rôles** : ne pas créer de policy pour le rôle `client` sur `operateur_observations` suffit à bloquer l'accès. RLS + `ENABLE ROW LEVEL SECURITY` = deny by default pour tout rôle sans policy. Pas besoin d'une policy `DENY` explicite.
- **Countdown `useEffect` — nettoyage strict** : tout `setInterval` dans un composant React doit retourner `() => clearInterval(timer)` dans le cleanup. Oublier le cleanup provoque des fuites mémoire et des mises à jour de state sur des composants démontés. Conditionner le `setInterval` à `isOpen && isLocked` pour ne pas le démarrer inutilement.
- **Bottom sheet vs route dédiée** : pour les détails d'une card dans un onglet mobile, préférer un composant inline (bottom sheet, drawer) plutôt qu'une nouvelle route. Évite la gestion du `back` et les états de chargement redondants sur mobile.

## Bugs terrain post-déploiement (session 10 — correctifs)

- **RLS vehicules manquante pour opérateur** : `vehicules` n'avait aucune policy SELECT pour le rôle `operateur`. Le join PostgREST dans la requête `interventions` (`.select("..., vehicules(immatriculation, marque...)")`) retournait `null` silencieusement → immatriculation "—" dans tout le dashboard. Toujours vérifier les RLS de **toutes les tables jointes**, pas seulement la table principale.
- **`todayCount` qui ignore les `en_cours` d'autres dates** : une intervention peut être `en_cours` avec `date_intervention` = demain (planifiée pour demain, prise en charge aujourd'hui). Compter `en_cours` indépendamment de la date (ils sont actifs *maintenant*), et `planifiée` uniquement si `date_intervention === today`. Formule correcte : `enCours.length + avenir.filter(i => i.date_intervention === today).length`.
- **AvenirCard non cliquable** : `<div>` wrapper ne propage pas les clics. L'opérateur ne pouvait pas voir les détails (adresse, prestation) d'une fiche planifiée avant de la prendre en charge. Solution : wrapper `<button>` avec `onClick → navigate`, et `e.stopPropagation()` sur le bouton "Prendre en charge" imbriqué pour éviter la navigation au clic du CTA.
- **Contrainte "1 à la fois" absente** : le RPC `prendre_en_charge_intervention` ne vérifiait pas si une `en_cours` existait déjà. Ajouter `IF EXISTS (SELECT 1 FROM interventions WHERE operateur_id = auth.uid() AND statut='en_cours') THEN RAISE EXCEPTION`. Côté UI : prop `hasEnCours` → bouton désactivé + libellé "Intervention en cours...".
- **Tester les RLS de toutes les tables impliquées dans un join** : avant de déclarer un composant terminé, vérifier systématiquement que l'utilisateur cible (ici `operateur`) a bien un accès SELECT sur chaque table référencée dans le `.select()` — y compris les tables de lookup (vehicules, entreprises, operators...).

## Compte opérateur terrain (session 10)

- **`operator_id` ≠ `operateur_id` — deux FK distinctes** : `operator_id` (FK → `operators`, planning admin) est rempli par `assigner_rdv`. `operateur_id` (FK → `auth.users`) est rempli par l'opérateur terrain lui-même. La RLS originale ne couvrait que `operateur_id = auth.uid()` → interventions planifiées **entièrement invisibles** pour l'opérateur terrain. Fix : `user_id` sur `operators` + RLS étendue avec `OR operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid())`.
- **RPC `prendre_en_charge_intervention`** : séparer la lecture (vue planifiée : date, lieu, véhicule) du démarrage (prise en charge). Le RPC valide opérateur lié + statut=planifiee + operator_id correct → `operateur_id = auth.uid()` + `statut = en_cours`. Simple, atomique.
- **Storage policies à mettre à jour en même temps que les RLS table** : les policies storage font `EXISTS (SELECT 1 FROM interventions WHERE ...)`. Sans la mise à jour, l'upload photos échoue silencieusement après prise en charge.
- **`typeScope()` obligatoire pour les packs commerciaux** : `type_prestation` des interventions RDV vaut `pack_standard`/`pack_vtc`/`pack_interieur`. `zonesFor()` attend `exterieur|interieur|complet`. Sans `typeScope()`, checklists et photos disparaissent. Toujours `zonesFor(typeScope(intervention.type_prestation))`.
- **Step dashboard depuis localStorage** : le stepper stocke l'étape dans `localStorage`. Le dashboard lit `izox_intervention_${id}` pour afficher "step X/3" sans requête DB supplémentaire.
- **Zones photos : changement de clés = photos historiques orphelines** : passer de 2 → 6 zones change les clés DB. Les photos existantes avec les anciennes clés ne s'affichent plus. Acceptable en dev/test, nécessite une migration de clés en production.

## Créneaux RDV & Saturation (session 9)

- **Validation 2 jours différents vs 2 créneaux distincts** : la règle "jours différents" est plus stricte que "pas de doublon exact". Un seul check `hasSameDayCreneaux` (clé = date ISO) remplace les deux anciens checks et couvre tous les cas. Initialiser le state avec 2 créneaux vides force la saisie sans message d'erreur intrusif au premier rendu.
- **`get_creneaux_disponibles` : capacité scalable** : retourner `capacite_totale = COUNT(operators) * 2` au lieu d'une constante en dur rend la RPC multi-opérateurs ready sans changer l'interface client. Slots non retournés = 0 interventions = disponibles (join implicite).
- **Guard race condition dans `creer_demande_rdv`** : le vrai verrou transactionnel reste `assigner_rdv` (FOR UPDATE sur la demande + COUNT interventions). Ajouter un check "au moins 1 créneau disponible" dans `creer_demande_rdv` donne un feedback propre au client au moment du submit, sans remplacer le guard admin. `GREATEST(COUNT(*)*2, 2)` évite un fallback = 0 si la table `operators` est vide.
- **Mapping vocabulaire slots** : DB utilise `'morning'`/`'afternoon'` (anglais, migration 20260531010000). Form client utilise `'matin'`/`'apres_midi'` (français). Toujours passer par le mapping explicite dans les deux sens — ne pas supposer une normalisation globale.

## Géocodage & Carte (session 9)

- **Nominatim server-side** : appel depuis une edge function (pas depuis le navigateur) — User-Agent identifiant l'app obligatoire, pas de quota IP navigateur, CORS géré. Fire-and-forget côté client : si Nominatim échoue, la demande est créée sans coords (la carte sera vide pour ce point, pas bloquant).
- **`creer_demande_rdv` : extension rétrocompatible** : ajouter `p_latitude DEFAULT NULL` / `p_longitude DEFAULT NULL` en fin de signature évite de casser les appels existants. Toujours `DROP FUNCTION` avant `CREATE OR REPLACE` quand on change le nombre de paramètres (PostgreSQL les distingue par signature).
- **Centre carte adaptatif** : ne pas hardcoder `[48.8566, 2.3522]` comme unique centre. Logique en cascade : AutoFitBounds quand routes GPS existent → dernier point connu en DB → Paris fallback. Le fallback statique est légitime mais doit être le dernier recours, pas le seul.
- **Badge géocodage admin** : indicateur ⚠️ "Adresse non géocodée" + bouton "Géocoder" dans `AssignerRdvDialog` quand `latitude IS NULL`. Pattern : mutation optimiste sur `demande` locale (`demande.latitude = data.latitude`) pour feedback immédiat sans refetch.

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

## Pricing / Facturation

- **Deux catalogues de prix — toujours les garder en sync** : `src/lib/pricing.ts` (`PACKS_CATALOG`) est le catalogue frontend ; `prestations_catalogue` est le catalogue DB utilisé par les RPCs Supabase (`valider_vehicule`, `appliquer_remise_commerciale`). Si l'un diverge de l'autre, les montants affichés et stockés seront différents. Tout changement de tarif doit faire l'objet d'une migration SQL + mise à jour `PACKS_CATALOG`.
- **Ne jamais afficher `contrat.montant_net_mensuel` (cache DB) directement** : calculer dynamiquement depuis `facture.totalBrutHt` et `facture.tauxPalier` pour éviter les dérives de cache. Le cache DB peut être stale si la ligne du contrat a changé sans que la RPC de recalcul ait tourné.
- **`RemiseCommercialeDialog` doit recevoir les valeurs `facture.*`** (frontend), pas `contrat.montant_brut_mensuel` / `contrat.remise_pct` (DB). La RPC Supabase recalculera depuis la DB après application — l'important est que la prévisualisation dans le dialog soit correcte.
- **Labels packs** : toujours utiliser `getPackLabel(type_pack)` depuis `@/lib/pricing`. Ne jamais afficher le code raw (`pack_interieur`) avec CSS `capitalize` — ça donne "Pack_interieur" au lieu de "Pack Intérieur".

## Architecture gel véhicule

- **Deux mécanismes de gel distincts** : le gel client passe par `demandes_gel` (workflow validé par l'admin) ; le gel admin direct utilise les colonnes `gel_admin_*` sur `vehicules` (action immédiate, sans workflow). Ne pas mélanger les deux.
- **Le client peut geler véhicule(s) OU contrat complet** : `DemanderGelDialog` s'ouvre depuis la fiche contrat client et propose le choix `type_demande = 'vehicules' | 'contrat'`. Ce n'est PAS limité aux véhicules individuels.
- **Gel admin : 3 colonnes sur `vehicules`** : `gel_admin_date_debut`, `gel_admin_date_fin`, `gel_admin_motif`. Présence de `gel_admin_date_debut IS NOT NULL` = gel admin en cours ou programmé. `statut='gele'` = actif, `statut='actif'` avec colonnes remplies = programmé.
- **Cron quotidien étendu** : `cron_maintenance_quotidienne()` gère automatiquement l'activation des gels admin programmés (date_debut atteinte) et l'expiration des gels actifs (date_fin passée). Toujours étendre cette fonction plutôt qu'en créer une nouvelle.
- **RPCs gel admin** : `geler_vehicule_admin(p_vehicule_id, p_date_debut, p_date_fin, p_motif)` et `annuler_gel_vehicule_admin(p_vehicule_id)`. Admin/staff uniquement. Loggent dans `admin_actions_log`.
- **Layout bouton gel** : le bouton Geler doit être pleine largeur (`w-full`) **au-dessus** de la rangée Modifier/Supprimer — cohérence avec le layout client (`space-y-2` + div séparée pour les 2 boutons du bas).

## Planning / RDV / Opérateurs

- **Vérifier le schéma avant de planifier une feature géo** : on a supposé qu'un « lieu d'intervention » distinct de l'adresse de facturation existait sur `demandes_rdv`. **Faux au départ** : seule `entreprises` portait une adresse. Colonnes `adresse_intervention`/`ville_intervention`/`code_postal_intervention`/`latitude`/`longitude` ajoutées sur `demandes_rdv` (session 4) et propagées vers `interventions` via `assigner_rdv`. Toujours auditer les migrations avant de bâtir un plan sur une hypothèse de données.
- **Lieu d'intervention ≠ adresse de facturation** : le bon design est un champ `adresse_intervention` sur `demandes_rdv` (la flotte peut être garée ailleurs que le siège), pré-rempli avec l'adresse entreprise mais modifiable. À construire (backlog GPS).
- **`operators` (planning) ≠ `profiles.role=operateur` (terrain)** : deux entités décorrélées. `interventions.operator_id` → `operators` (planning admin) ; `interventions.operateur_id` → `auth.users` (workflow terrain). Ne pas les confondre. Tant qu'il n'y a qu'un seul opérateur réel, garder un seul row dans `operators`, sans nom de personne (label neutre « Opérateur »).
- **Rendu opérateurs dynamique** : `PlanningCalendar`, `AssignerRdvDialog` et `RouteMap` lisent `operators` depuis la DB — ne jamais coder en dur les 3 opérateurs seed (Karim/Sofia/Yann). Réduire le seed à 1 réduit automatiquement les colonnes/sélecteurs.
- **Carte des routes morte sans GPS** : `RouteMap` filtre sur `latitude/longitude IS NOT NULL`, jamais alimentées → toujours vide. Ne dépend que de la propagation des coords (backlog GPS). Les colonnes `lat`/`lon` existent maintenant sur `demandes_rdv` et `interventions` — prêtes à être remplies par le géocodage.
- **Workflow RDV : deux chemins, un seul correct** : `GererDemandeRdvDialog` appelait `confirmer_demande_rdv_multi` qui créait des interventions sans `operator_id` ni `time_slot` → invisibles dans le board. L'unique chemin correct est `assigner_rdv` (qui définit opérateur + créneau + adresse en une transaction). Supprimer tout bouton "Confirmer" qui ne passe pas par l'assignation.
- **Consolider les dialogs admin : 1 dialog par demande** : avoir `GererDemandeRdvDialog` (confirmation directe) + `AssignerRdvDialog` (assignation) créait une confusion UI et un split du refus dans deux endroits. Solution : `AssignerRdvDialog` seul, avec section détails + refus + calendrier + email en un seul composant. La dette UI de deux dialogs parallèles faisait trou noir côté admin.
- **Fusion onglets ≠ fusion permissions** : `/admin/rendez-vous` et `/admin/interventions` sont accessibles à staff/commercial ; `/admin/planning` (board) est admin-only. En fusionnant, garder l'onglet accessible à tous les rôles admin mais protéger le sous-onglet board + carte par `RoleGuard allowed={["admin"]}`. Ne jamais élargir/réduire un accès par effet de bord d'un refactor de navigation.

## Interventions créées depuis un RDV (assigner_rdv)

- **`statut='planifiee'` est une valeur DB valide** (CHECK étendu en migration `20260523115532`) mais absente du frontend jusqu'à cette session. Toujours garder `Statut` en sync avec les valeurs DB.
- **`type_prestation` = pack commercial** sur les interventions RDV (ex: `'pack_standard'`), pas le scope (`exterieur/interieur/complet`). Utiliser `getPackLabel()` pour l'affichage, et une fonction `typeScope()` pour mapper vers le scope quand les checklists/photos en ont besoin.
- **Verrouiller l'admin sur les créneaux client** : supprimer le calendrier libre dans `AssignerRdvDialog`, afficher uniquement les créneaux `creneaux_preferes` du client comme boutons. L'admin ne choisit que l'opérateur + l'heure précise dans la plage.
- **Heure précise dans un créneau** : `<input type="time" min="08:00" max="12:00">` avec validation frontend (`heureValid()`) et colonne `heure_intervention TIME` en DB. Plage matin = 08h-12h, après-midi = 14h-18h.
- **Clic vs drag sur un board dnd-kit** : séparer le grip (`{...listeners}` sur l'icône grip uniquement) du clic navigation (bouton imbriqué sur le texte). Ne pas mettre `onClick` sur le div `ref={setNodeRef}` — ça entre en conflit avec le drag.

## Routing TanStack (file-based à plat)

- **Un `beforeLoad`/redirect sur `X.tsx` s'applique AUSSI à `X.$id.tsx`** : en routing à plat, `admin.interventions.$id.tsx` est un enfant de `admin.interventions.tsx`. Si le parent throw un `redirect` dans `beforeLoad`, le détail enfant est redirigé lui aussi → fiche « non cliquable » (on revient instantanément en arrière). Symptôme trompeur : les `onClick`/`navigate` sont pourtant corrects.
- **Pattern correct** : séparer layout et index, comme `admin.planning.tsx` (`component: () => <Outlet/>`) + `admin.planning.index.tsx`. Mettre le redirect dans `X.index.tsx` (path exact) et faire de `X.tsx` un layout pur `<Outlet/>`. Ainsi `X.$id` n'hérite plus du redirect.
- **Régénérer `routeTree.gen.ts`** : `npm run build` (vite + `@tanstack/router-plugin`) le régénère. Vérifier le `getParentRoute` des routes `$id` après tout changement de structure.

## Replanification RDV (session 8)

- **`modifier_heure_rdv(p_demande_id, p_heure)`** : verrouille date + `assigned_time_slot` (créneau client), ne change que l'heure, valide la plage (matin 08–12 / après-midi 14–18), propage `heure_intervention` à toutes les interventions liées `IN ('planifiee','en_cours','en_revision')`, bloque si une intervention est `validee` (facturée). Admin/staff only.
- **Email `rdv_modifie`** (→ client) : ajouté à l'edge function send-email (v9) + union `EmailType` de `email.ts`. Réutilise `email_status`/`email_sent_at` sur `demandes_rdv` comme `rdv_confirmee`.
- **Dialog consolidé `GererRdvConfirmeDialog`** : remplace `AnnulerRdvAdminDialog`. Un seul dialog pour un RDV confirmé = replanifier l'heure (action par défaut) OU annuler (lien secondaire). Cohérent avec « 1 dialog par demande ».
- **Tester un RPC SECURITY DEFINER sans session** : `execute_sql` tourne sans `auth.uid()`. Simuler via `PERFORM set_config('request.jwt.claims', json_build_object('sub', <uid>,'role','authenticated')::text, true)` dans un bloc `DO` (même transaction) — permet de jouer client puis admin et de tester les garde-fous.

## Workflow Git

- **Branches de travail** : supprimer après merge pour garder le repo propre. Impossible via `git push --delete` depuis le container (403) — le faire depuis GitHub UI.
- **Rebase avant merge** : si main a avancé, `git rebase origin/main` avant de créer la PR pour éviter les conflits.
- **Commits déjà upstream** : lors d'un rebase, git "drop" automatiquement les commits dont le contenu est déjà dans main — c'est normal.

## Données / Environnement de test

- **Purge données app** : supprimer dans l'ordre (enfants avant parents) : `intervention_photos` → `interventions` → `demandes_rdv` → `demandes_gel` → `factures_lignes` → `factures` → `avoirs` → `contrat_avenants` → `contrat_lignes` → `contrats` → `vehicules` → `parrainages` → `notifications_internes` → `email_logs` → `admin_actions_log` → puis `entreprise_acces_commerciaux` → `user_roles` (clients à supprimer) → `profiles` → `entreprises` → `auth.users`.
- **Ne pas purger** : `prestations_catalogue`, `app_config`, `seuils_planning`, `operators`, `disponibilites_operateurs` — ce sont des données de configuration, pas des données app.
- **Réinitialiser `contrat_sequences`** : `UPDATE contrat_sequences SET derniere_sequence = 0` après purge pour que la numérotation reparte proprement.
- **Compte client de test** : `jeffersonjouenne@outlook.com` — seul compte client conservé après purge.

## Bugs PostgREST / Supabase

- **Erreurs PostgREST silencieuses** : si on fait `const { data }` sans capturer `error`, une erreur 400 (colonne inexistante) retourne `data = null`. Le composant affiche alors "introuvable" pour TOUS les éléments — symptôme trompeur. Toujours capturer ET logger l'erreur dans les selects critiques.
- **Colonne inexistante dans SELECT** : PostgREST renvoie 400 si une colonne du SELECT n'existe pas. En session 6, `refus_motif` n'existait pas sur `demandes_rdv` → toutes les demandes retournaient "introuvable". Solution : enlever la colonne du SELECT, vérifier en DB avant de coder.
- **`date_confirmee` est un TIMESTAMPTZ** : stocker "minuit UTC" donne "02h00" à Paris. Ne jamais extraire l'heure depuis un champ timestamp qui représente une date. Toujours utiliser une colonne TIME dédiée (`assigned_heure`) pour les heures métier.

## Annulation RDV (sessions 6-7)

- **Statut `annulee` vs quota** : les interventions annulées (`statut='annulee'`) ne doivent pas compter dans le quota mensuel. Le filtre "tous" dans `InterventionsListPanel` les exclut aussi (bruit opérationnel) — filtre dédié "Annulées" pour les consulter.
- **Règle 48h côté client** : la vérification du délai est en DB (RPC `annuler_rdv_client` vérifie `assigned_date <= CURRENT_DATE + 1` → EXCEPTION). Le frontend calcule `annulable` pour désactiver le bouton avant même l'appel, mais la DB reste la source de vérité.
- **Propagation statut annulee → interventions** : `annuler_rdv_client` et `annuler_rdv_admin` mettent à jour `interventions.statut='annulee'` pour toutes les interventions liées encore actives. L'admin ne peut pas annuler si une intervention est déjà `validee` (déjà facturée).
- **Emails d'annulation bi-directionnels** : `rdv_annule_client` (déclenché par le client) → envoyé à l'admin IZOX ; `rdv_annule_admin` (déclenché par l'admin) → envoyé au client. Toujours fire-and-forget (`void sendEmail(...)`) pour ne pas bloquer l'UX si Resend échoue.

## Composants réutilisables

- **`PasswordInput`** (`src/components/ui/password-input.tsx`) : wrapper autour de `<Input>` avec bouton Eye/EyeOff. Patron utile : `forwardRef` + `Omit<React.ComponentProps<"input">, "type">` pour forwarder toutes les props sans exposer `type`. `tabIndex={-1}` sur le bouton toggle pour ne pas casser la navigation clavier.

## Planning responsive

- **Vue mobile ≠ vue desktop** : pour un board de planning, le scroll horizontal sur mobile est rédhibitoire. Solution retenue : `md:hidden` = sélecteur de jour (5 chips) + 4 créneaux empilés verticalement ; `hidden md:block` = grille semaine classique. Les deux vues partagent les mêmes données.
- **Supprimer drag-drop simplifie massivement** : dnd-kit (DndContext, DragOverlay, useDraggable, useDroppable) ajoute beaucoup de complexité pour peu de valeur métier dans ce contexte (un seul opérateur, rien à réordonner). Si le drag ne porte pas de sémantique métier réelle, le remplacer par un simple clic vers la fiche.

## Types Supabase générés

- **Après chaque migration schéma** : régénérer via MCP `generate_typescript_types`. La RPC renvoie `{"types":"..."}` (JSON wrapper) — extraire avec `python3 -c "import json; open('src/integrations/supabase/types.ts','w').write(json.loads(open('...').read())['types'])"`. Sans regen, les nouveaux RPCs ne sont pas typés et les appels `supabase.rpc(...)` déclenchent des erreurs TS.
- **Cast temporaire `as never`** : acceptable pendant le développement si les types ne sont pas encore régénérés, mais toujours régénérer et supprimer les casts avant le commit final.

## Session 27c — audit & cleanup (2026-06-10)

- **Code mort déployé = risque latent** : `compute-impact` n'était appelée par aucun frontend mais restait déployée avec un IDOR (`entreprise_id` sans check). Une edge function non utilisée doit être supprimée, pas laissée "au cas où". Le MCP Supabase ne sait pas supprimer une edge function (seulement redéployer) → en attendant la suppression dashboard, la neutraliser avec un stub 410.
- **`beforeLoad` + auth client-side = piège** : avec Supabase implicit flow, la session vit dans le contexte React (`auth-context`), pas dans le router. Mettre un guard auth en `beforeLoad` TanStack exige d'exposer l'auth au router context — changement architectural risqué (cf bug fiches interventions non cliquables). Le pattern retenu : `RoleGuard` composant partout + RLS/guards RPC en backstop. Ne pas "unifier" vers beforeLoad sans raison forte.
- **Capture d'erreur minimale > refactor massif** : pour corriger 22 requêtes silencieuses, convertir chaque `load()` au hook `useSupabaseQuery` aurait churné 15 fichiers. La capture minimale (`const { data, error }` + toast) corrige le problème réel avec un diff de 2 lignes par site. Réserver le hook aux nouveaux composants et aux cas simples.
- **Paramètres optionnels RPC typés** : les types générés Supabase déclarent les params optionnels comme `string | undefined` (pas `| null`). Passer `undefined`, pas `null`, sinon erreur TS2322 après regen.

## Purge obligatoire entre sessions (2026-06-10 finale)

- **Base vierge = nouveau départ propre** : à chaque fin de session, purger TOUTES les données de test (interventions, demandes RDV, factures, contrats, véhicules, entreprises, profils clients) pour que la session suivante démarre sur une ardoise blanche. Cela évite la dérive de données de test, les pollutions croisées, et les questions "pourquoi cette demande existe encore ?".
- **Ordre de suppression critique (FK enfants avant parents)** : notifications → observations → actions log → emails logs → photos → interventions → demandes RDV/gel → factures → avoirs → contrats → véhicules → entreprises. Une suppression dans le mauvais ordre crée une erreur FK contrainte → abandon de la purge. Toujours utiliser le SQL fourni en CLAUDE.md §7.
- **4 comptes techniques conservés impérativement** : admin.test, staff.test, commercial.test, operateur.test (FK requirements + base fonctionnelle pour la prochaine session). Vérifier `COUNT(auth.users) = 4` après purge — si 0 ou 5+, la purge est incomplète.
- **Vérifier la purge via execute_sql COUNT avant de commit** : ne pas supposer que les DELETE ont fonctionné. Faire des requêtes `COUNT(*)` sur 3-4 tables critiques (interventions, demandes_rdv, entreprises) pour confirmer 0. Une purge partielle n'est pas une purge.
- **Commit + push + merge main après purge confirmée** : la purge est l'étape finale avant le merge branch → main. C'est le moment où le code est stable ET les données sont propres.
