# IZOX — Landing B2C | Design v2 (Dark Mode Premium)

## 🎯 Contexte

**Projet** : Landing vitrine B2C pour IZOX (nettoyage automobile éco-responsable à eau recyclée en circuit fermé).  
**Stack** : TanStack Start (SSR), Supabase (Postgres + Auth + Edge Functions), Vercel, Resend, Stripe, Framer Motion.  
**Vision** : Design **dark mode immersif** avec illustrations au trait, animations scroll-driven sophistiquées, tweaks panel en temps réel.

---

## 📋 Config Design System

| Paramètre | Valeur |
|-----------|--------|
| **Accent lumineux** | `#3FE08F` (vert IZOX) |
| **Fond primaire** | Abysse vert (`#06120C`) |
| **Fond secondaire** | `#0A1B12` |
| **Texte principal** | `#E7E6DD` |
| **Texte secondaire** | `#8AA295` |
| **Texte tertiaire** | `#52685B` |
| **Typographie titres** | Instrument Serif (400, italiques en accent) |
| **Taille titres** | 125 % (amplifiée pour impact) |
| **Corps / Labels** | Archivo (400, 500) + JetBrains Mono |
| **Voiture** | Trait pur (gravure NOCTRA, sans teinte) |
| **Intensité lueur** | 75 % (glow modéré, glacial) |

### Thèmes additionnels (non actifs, prêts pour tweaks)
- `body.t-noir` : Noir profond (`#0E0D0B`)
- `body.t-nuit` : Bleu nuit (`#070D17`)
- `body.t-papier` : Papier clair (`#EDE8DC`)

---

## 🎨 Architecture visuelle par section

### 01 — Hero
- **Accroche** (3 lignes, dernier mot en `<em>` accent) :
  - "On lave à l'eau."
  - "On la récupère."
  - "On la fait **revivre.**"
- **Illustration** : Gravure R5 E-Tech au trait fin
  - Lance haute pression avec éventail de 4 jets
  - Carrosserie R5 (silhouette fermée, hachures NOCTRA)
  - Eau qui ruisselle en nappes le long des flancs
  - Berme de récupération + pompage retour local
  - **Animations** : jets animés (stroke-dasharray), brume aux impacts, gouttes chutent au rythme
  - Étiquettes : "jet haute pression", "eau ~50 L en moyenne", "berme de récupération", "retour local"

### 02 — Étapes (Comment ça marche)
- **Trois stepcard** : 01 Je réserve, 02 On vient, 03 L'eau repart en boucle
- **Reveal animations** au scroll (`rv` class, opacity + translateY, cascade de délais)

### 03 — **La boucle d'eau (section SIGNATURE)**
- **Tuyau qui se remplit** (nouveau design)
  - `.pipe-outer` : bordure paroi (stroke 18px)
  - `.pipe-inner` : intérieur du tuyau (stroke 14.5px)
  - `.loop-draw` : eau qui remplit (stroke 9.5px, dasharray piloté au scroll)
  - `.loop-sheen` : reflet liquide par-dessus (1.5px opacity 35%)
- **Scroll-driven** : À mesure du défilement, le tuyau se remplit progressivement
- **Stations** (4 vannes qui s'allument) :
  1. Lavage à domicile (~50 L)
  2. Berme + pompage (80 %)
  3. Recyclage au local (50 %)
  4. Réutilisation
- **Compteurs** : Défilement trigonométrique (easing cubic-bezier) quand la station s'illumine
- **Goutte pilote** : `loopDrop` suit la courbe au scroll, avec glow

### 04 — Preuve RSE
- **Trois grands chiffres** : ~50 L / 80 % / 50 %
- **Comparaison** : "2 à 4× moins d'eau qu'un lavage au jet à domicile"

### 05 — Avant / Après
- **Grille 4 photos** : 2 avant/après sellerie, 1 large extérieur, 2 avant/après moquette
- Tags `ba-tag` : "Avant" (neutre) / "Après" (accent vert)

### 06 — Tarifs
- **Tabs** : "Intérieur" | "Int. + Ext. (+30 €)"
- **Grille complète TTC**
  - Intérieur : Citadine 80€ → Utilitaire 170€
  - Intérieur + Extérieur : Citadine 110€ → Utilitaire 200€
- **Options** : Puzzi (40–60€ selon véhicule) / Traitement ozone (40€ fixe)
- **Note** : "Tous prix TTC · acompte 30 % en ligne, solde sur place (TPE/espèces)"

### 07 — Vision (Feuille de route)
- **Illustration aquaponie** : Gravure au trait
  - Bassin avec ligne d'eau luminescente
  - **3 poissons qui nagent au rythme du scroll** (position pilotée par scroll progress)
  - Pousses au-dessus, cultures en circuit court
  - Étiquettes, bulles
- **Chaîne** : Compost → Aquaponie → Légumes locaux
  - 3 chain-items avec dots qui s'allument (cascade au scroll)
- **Économie** : 
  - "Une **rentabilité écologique**"
  - "Chaque litre économisé et chaque résidu valorisé réduit nos coûts d'exploitation — et donc vos prix, durablement."

### 08+ — Sections suivantes
- **Abonnement** : "jusqu'à −15 % — 2 ou 4 passages/mois"
- **Avis clients** : 3 quotes avec ★★★★★
- **FAQ** : 5 `<details>` (zone, paiement, annulation L221-28, produits, durée)
- **CTA final** : "À votre tour de fermer la boucle"
- **Footer** : Mentions légales, CGV, RGPD, contact, lien `/entreprises`

---

## 🎬 Animations

### Scroll-driven (seul moteur universel — mobile-first)
1. **Fil de l'eau** (fixe à droite)
   - `.fil-trail` : progression (height 0→100%)
   - `.fil-drop` : goutte luminescente suit le scroll global (position calculée via `getPointAtLength()`)

2. **Boucle au scroll**
   - `.loop-draw` + `.loop-sheen` : stroke-dashoffset piloté (tuyau se remplit)
   - Compteurs (`.station`) : défilement easing cubic-bezier quand `.lit`
   - `loopDrop` : positionnée via `getPointAtLength()` de la courbe SVG

3. **Aquaponie au scroll**
   - `fish1`, `fish2`, `fish3` : `transform: translate()` calculée par `setFish(p)` où `p` = progression section vision
   - Nage sinusoïdale + montée/descente

### Reveals (prefers-reduced-motion respecté)
- `.rv` : opacity + translateY au scroll (threshold 15%)
- Cascades : `.rv-d1` (+90ms), `.rv-d2` (+180ms)
- Chain-items (`.chain-item`) : `.lit` quand pv > 0.25 + i*0.12

### Micro-animations
- **Pulse badge** : `@keyframes pulse` (0–2.4s, opacity pulsante)
- **Jets eau** : `stroke-dasharray: 2.5 6` en animation `flow` (1.1–1.9s linéaire)
- **Brume** : `@keyframes mist` (2.8s ease-in-out, opacity 0.12→0.85)
- **Gouttes** : `@keyframes drip` (2.2s ease-in, translateY + opacity fade)

### Desktop (bonus, dégradable)
- Button `:hover` → remplissage eau de bas en haut (`.fillwater`)
- *Pas d'effects curseur intrusive*

### Respect prefers-reduced-motion
- Tous les effets gérés par le flag `reduced`
- Animations statiques en mode réduit

---

## 🎚️ Tweaks Panel (en temps réel)

Utilisateur peut ajuster **en direct** depuis le panel dans la toolbar :

| Section | Paramètre | Type | Options |
|---------|-----------|------|---------|
| **Couleurs** | Accent lumineux | Color | #3FE08F, #5BC8E8, #A8C4B4, #E8C268 |
| | Fond | Select | Abysse vert, Noir profond, Bleu nuit, Papier clair |
| **Voiture** | Teinte carrosserie | Color | #3FE08F, #5BC8E8, #E8C268, #9AA3AD |
| | Rendu | Radio | Teintée, **Trait pur** (actuel) |
| **Typographie** | Titres | Radio | **Serif éditorial**, Outfit bold |
| | Taille titres | Slider | 80–125 % (actuellement 125) |
| **Textes** | Accroche ligne 1 | Text | "On lave à l'eau." |
| | Accroche ligne 2 | Text | "On la récupère." |
| | Accroche ligne 3 | Text | "On la fait revivre." (dernier mot accentué) |
| | Bouton principal | Text | "Réserver mon nettoyage" |
| **Lumière** | Intensité glow | Slider | 0–100 % (actuellement 75) |

**Persistence** : Tweaks sauvegardés via `useTweaks()` (localStorage).

---

## 📱 Responsive & Performance

- **Mobile-first strict** : Teste d'abord sur 390px (viewport mobile)
- **Desktop** : Centrage colonne max-width 520px, halo et animations accessibles
- **FCP** : Ossature texte + bouton interactifs avant scripts animations
- **Lazy-load** : Animations chargées après viewport (IntersectionObserver)
- **SSR-compatible** : Pas de JS côté server, hydratation client propre

---

## 🔐 Conformité & Mentions légales

### RGPD
- Opt-in marketing distinct de la réservation (case décochée par défaut)
- Captcha recommandé : Cloudflare Turnstile

### Droit de la consommation
- **Art. L221-28 (Code conso)** : Prestations à date fixe → pas de droit de rétractation 14j
- **CGV** : À écrire avec politique d'annulation (acompte remboursable)
- **Chiffres RSE** : Validés et sourcés (comparaison toujours nommée : "vs lavage au jet à domicile")

---

## ⚙️ Spécifications techniques pour TanStack Start

### Routes à implémenter
1. **`/`** — Landing B2C (ce design)
2. **`/reservation`** — Tunnel sobre (multi-step form + Stripe)
   - Gate code postal (rayon 25km)
   - Détection flotte (bascule optionnelle vers /entreprises)
   - Calcul prix direct au choix
   - Cuve qui se remplit (CSS pur, étape-based)
   - Paiement Stripe (acompte 30% min OU intégral)
   - Hold temporaire 10 min (SELECT … FOR UPDATE)
3. **`/entreprises`** — B2B lead capture (à refont également avec ce design)
   - Argumentaire flotte
   - Formulaire (nom, société, taille flotte, email, tel)
   - Captcha Turnstile
   - Création lead Supabase

### Backend (Supabase)
- **Table interventions** (source de vérité unique CRM)
  - `id`, `date`, `slot` (matin/après-midi 1 ou 2), `équipe`, `statut` (libre/réservé/B2B/annulé)
  - Index unique : `(date, slot, équipe)`
  - Capacité : 2 slots/demi-journée (1 équipe)
  - Atomicité : Transaction + SELECT … FOR UPDATE
- **Table réservations B2C** (consomme la table interventions)
  - `id`, `intervention_id`, `client_name`, `client_email`, `client_phone`, `vehicle_type`, `formule`, `options`, `price_ttc`, `payment_status`, `acompte_paid_at`, `created_at`
- **Table leads B2B** (contact depuis /entreprises)
  - `id`, `company_name`, `fleet_size`, `email`, `phone`, `created_at`, `status` (new/contacted/proposal/lost)

### Paiement (Stripe)
- Acompte 30% min OU intégral (choix utilisateur)
- `PaymentIntent` avec métadonnées : intervention_id, vehicle_type, formule, options
- Webhook : `payment_intent.succeeded` → confirmer la réservation, déclencher emails Resend
- Reste (70%) : TPE ou espèces sur place

### Email (Resend)
- Confirmation réservation (client)
- Notification équipe terrain
- Rappel 24h avant intervention
- Reçu paiement acompte

---

## 📝 Notes supplémentaires

- **Logo IZOX** : À intégrer en `.wordmark`
- **Photos avant/après** : Placeholders actuels, à remplacer par vraies photos vendeur/intervention
- **Poissons aquaponie** : Animation custom `setFish(p)` — à valider UX sur mobile
- **Tweaks étendu** : Possible d'ajouter plus de paramètres (espacement, ombres, densité) selon besoin
- **Stratégie CRM** : Le B2C consomme la même table CRM que le B2B — ne pas créer deux calendriers

---

**Status** : Design v2 validé ✅ | En attente plan de refonte
