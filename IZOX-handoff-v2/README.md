# Handoff : IZOX Pro — Nouveaux Écrans

## Overview

Ce package documente **5 nouveaux écrans** pour **IZOX Pro**, une SaaS B2B de gestion de flotte de nettoyage automobile éco-responsable. Le design global est épuré, premium, desktop-first côté admin et mobile-first côté client.

Les écrans couverts :

1. **Planning Admin** (`/admin/planning`) — Calendrier des opérateurs (vue semaine/jour, drag-drop des créneaux, indicateurs de charge)
2. **Carte Géographique** (`/admin/planning/map`) — Optimisation des tournées (pins colorés par opérateur, polylines, panel interventions + km estimés)
3. **Demandes RDV** (`/admin/demandes-rdv`) — Split view liste + carte temps réel, modal d'assignation rapide
4. **Double Authentification 2FA** (`/settings/security`) — Flow de configuration en 4 étapes (client + admin)
5. **RGPD & CGV** (`/legal`) — Pages légales avec onglets + sidebar sections + bannière cookies

Chaque écran est livré avec ses **états** : vide (empty), chargé (loaded), survol/glisser (hover/drag-in-progress), erreur (error), et chargement (skeleton) le cas échéant.

---

## About the Design Files

⚠️ **Les fichiers HTML de ce bundle sont des références de design**, pas du code de production à copier tel quel. Ce sont des prototypes React + Babel (transpilation in-browser) qui montrent l'apparence et le comportement attendus.

**La tâche est de recréer ces designs dans l'environnement du codebase IZOX Pro existant** — c.-à-d. **Tailwind CSS** avec le `tailwind.config.js` de l'équipe, en utilisant les composants et patterns déjà établis (Login, Dashboard, Ma flotte, Interventions, etc.).

Les prototypes utilisent des objets de style inline JS (`TOK.brand`, `TOK.r4`...) pour itérer rapidement. **En production, ces valeurs doivent être mappées sur les classes/tokens Tailwind existants** (voir section Design Tokens ci-dessous pour la correspondance).

---

## Fidelity

**High-fidelity (hifi).** Couleurs, typographie, espacements, rayons et interactions sont définitifs. Le développeur doit recréer l'UI au pixel près en s'appuyant sur les composants Tailwind existants du codebase IZOX Pro. Les données (immatriculations, clients, opérateurs) sont fictives mais réalistes — à remplacer par des données réelles via API.

---

## Mapping couleurs opérateurs (fixe — NE PAS modifier)

Le code couleur des opérateurs est **partagé entre le Planning et la Carte**. Il doit rester identique partout :

| Opérateur | Couleur principale | Background tint | Border | Initiales |
|-----------|-------------------|-----------------|--------|-----------|
| **Karim B.** | `#2A6FDB` (bleu) | `#D5E2F6` | `#A3BFF5` | KB |
| **Sofia T.** | `#0F766E` (teal) | `#CCFBF1` | `#5EEAD4` | ST |
| **Yann L.** | `#7C3AED` (violet) | `#EDE9FE` | `#C4B5FD` | YL |

---

## Screens / Views

### 1. Planning Admin (`/admin/planning`)

**Purpose** : L'admin visualise et organise les interventions de la semaine pour les 3 opérateurs terrain.

**Layout** :
- Sidebar admin existante à gauche (réutiliser le composant `Sidebar`)
- Header fixe (h ~58px) : navigation semaine `< [Sem. du 9 au 13 Juin 2026] >` + bouton « Aujourd'hui » + switcher **Semaine/Jour** + 3 indicateurs de charge opérateurs + bouton brand « + Nouvelle intervention »
- Corps : **3 colonnes opérateurs côte à côte**, largeur **370px** chacune, scroll horizontal si dépassement
- En vue **Jour** : barre d'onglets jours (LUN→VEN) sous le header

**Colonne opérateur** :
- Header collant (sticky) : avatar rond 34px (couleur opérateur), nom (Outfit 14px/700), badge charge `4/6`, **barre de charge** (height 5px, remplissage couleur opérateur). Background = tint de l'opérateur, border-bottom 2px couleur opérateur.
- Pour chaque jour : carte jour (icône calendrier + « LUN 09 Juin »), puis 2 blocs **Matin · 08h–12h** et **Après-midi · 14h–18h**, chacun avec **3 créneaux max** (= 6 interventions/jour max).

**Carte de créneau (rempli)** :
- Background blanc, border 1px `#E5E7EB`, **border-left 3px couleur opérateur**, radius 8px, padding 9px 10px
- Photo miniature 38×38 (radius 4px) + immatriculation (mono 12px/700) + status pill + client (Inter 11px, `#6B7280`) + PackTag + heure (mono 9px)
- **Hover** : border devient couleur opérateur, shadow `0 2px 8px {opColor}22`

**Zone créneau vide (droppable)** — RENDUE TRÈS VISIBLE :
- Border 2px **dashed** (`#D1D5DB` au repos), radius 8px, height 72px
- Contenu centré : pastille ronde 26px avec icône `+` + label « Créneau libre »
- **Hover / drag-over** : border + texte passent en couleur opérateur, background `{opColor}12`, **rayures animées** en diagonale (`@keyframes stripeMove`), label devient « Déposer ici », pastille se remplit
- **État erreur** (drop invalide) : border + pastille rouge `#C8412F`, icône `×`, label « Créneau indisponible »

**Drag-in-progress** :
- Bandeau d'info dans le header : pastille pulsante + « Déplacement en cours · AB-123-CD »
- La carte en cours de déplacement : `transform: rotate(-1.5deg) scale(1.03)`, shadow forte, opacité 0.95 ; sa position d'origine est grisée (opacity 0.3)

**État vide** : toutes les colonnes affichent uniquement des zones droppables (0/6 partout, barres de charge vides).

**État skeleton (chargement)** : header avec blocs gris animés (`@keyframes` pulse), 3 colonnes avec header tinté + 6 blocs gris dégressifs.

**Version mobile (390×844)** :
- Status bar iOS simulée + topbar « Planning » + bouton « Créer »
- **Sélecteur opérateur en pills horizontales scrollables** (avatar + prénom + charge), pill active = fond plein couleur opérateur
- Barre de charge sous le sélecteur
- Liste verticale Matin puis Après-midi (cartes pleine largeur, photo 42×42)

---

### 2. Carte Géographique (`/admin/planning/map`)

**Purpose** : Valider et optimiser les tournées du jour — visualiser les interventions sur carte, réordonner par drag-drop, valider.

**Layout en 3 zones** :
- **Légende drawer gauche (220px)** : titre + date, liste **OPÉRATEURS** (pastille couleur + nom + « 2/4 terminés » + km), liste **STATUTS PINS** (Terminée/En cours/Planifiée avec pins en goutte), liste **ITINÉRAIRES** (échantillon de polyline pointillée par opérateur)
- **Carte centrale (flex:1)** : fond type Google Maps tiles neutres (en prod : **Leaflet + OpenStreetMap**, `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`). Pins en goutte (`border-radius: 50% 50% 50% 2px; transform: rotate(-45deg)`) avec numéro d'ordre, colorés par opérateur. Polylines pointillées (`dashArray: "6,10"`) reliant les pins dans l'ordre chronologique. Opérateur sélectionné = opacité 1, autres = 0.35.
- **Panel droit (290px)** : titre « Interventions du jour », sélecteur opérateur mini, **liste ordonnée drag-drop** (numéro rond + immat + heure + adresse + handle 6 points), footer avec km par opérateur + **total estimé** (mono brand) + bouton brand pleine largeur **« Valider la tournée »**

**Interactions** :
- Drag-drop dans le panel droit → réordonne la liste ET recalcule l'ordre des pins/polyline **en temps réel** (mise à jour immédiate)
- Clic opérateur dans la légende → sélectionne, recentre la carte (fitBounds), met en avant sa tournée
- « Valider la tournée » → remplace le bouton par un encart vert `Tournée validée ✓`

**États** :
- **Loaded** : tout visible avec données
- **Empty** : carte affiche medallion + « Aucune intervention aujourd'hui » + CTA ; panel droit affiche empty state
- **Drag-in-progress** : tag « Réorganisation en cours… » dans le header, item en cours grisé
- **Error** : header en tint rouge, carte remplacée par medallion danger + « Carte indisponible » + bouton Réessayer

---

### 3. Demandes RDV (`/admin/demandes-rdv`)

**Purpose** : Traiter les demandes de rendez-vous — voir leur localisation, assigner un opérateur + créneau en un geste.

**Layout** : **Split view 40% / 60%**
- **Gauche (40%)** : tableau (colonnes Date, Client, Immat., Pack, Statut, Action). Lignes survolables.
- **Droite (60%)** : carte temps réel avec pins colorés **par statut** (pas par opérateur ici)

**Couleurs pins par statut** :
| Statut | Couleur |
|--------|---------|
| confirmée | `#1F8A5B` (vert) |
| en_attente | `#C7811E` (orange) |
| refusée | `#C8412F` (rouge) |

**Interaction hover** : survoler une ligne → le pin correspondant **grossit** (28→36px), s'illumine, ouvre une bulle (immat). La ligne reçoit un border-left brand + background tint.

**Modal d'assignation rapide** (clic « Assigner » sur une ligne en_attente) :
- Modal centré 480px, radius 10px, shadow forte
- Header : `#R-083` + immat + modèle + client/pack/date + bouton fermer
- **Étape 1 · Opérateur** : 3 boutons (avatar + prénom), sélection = border + tint couleur opérateur + check
- **Étape 2 · Créneau** : liste des créneaux disponibles (jour · heure · période), libres cliquables (badge « Libre »), occupés grisés (badge « Occupé »)
- **Récapitulatif** : encart brand tint avec opérateur + créneau choisis
- Footer : Annuler + bouton brand « Confirmer l'assignation » (désactivé tant qu'opérateur+créneau pas choisis)
- **État succès** : check vert animé + « Intervention planifiée ! » + détails + « Notification envoyée »
- **État erreur** : medallion danger + « Assignation impossible » + encart rouge « Le créneau a été pris entre-temps » + « Choisir un autre créneau »

**États** : loaded (avec hover pin actif), empty (medallion + « Aucune demande de RDV »), modal-assignation, modal-erreur.

---

### 4. Double Authentification 2FA (`/settings/security`)

**Purpose** : Activer la 2FA. Identique côté client et admin (seul le label diffère : « Mon compte » vs « Administration »).

**Layout** : modal plein écran centré sur `paper #F9FAFB`, topbar slim avec BrandBar, contenu centré max 500px.

**Stepper horizontal** (même style que le stepper d'intervention existant) : 4 étapes — **Méthode · Configuration · Vérification · Codes de secours**. Carré 22px (radius 4px) : actif = brand, fait = vert avec ✓, à venir = panel gris.

**Flow** :
1. **Méthode** : 2 grandes cartes radio — **SMS** (badge « Recommandé ») / **Application Authenticator** (badge « Plus sécurisé »). Sélection = border 2px brand + tint + radio rempli.
2a. **SMS** : champ téléphone avec préfixe `🇫🇷 +33` + note de confidentialité
2b. **Authenticator** : **QR code** (SVG) dans cadre blanc + clé manuelle copiable `IZOX-K9PX-4M2Q-8WRN`
3. **Vérification** : **6 cases OTP individuelles** (46×54px, mono 22px/700). Case remplie = border brand + tint. Auto-focus case suivante.
   - **État erreur** (code ≠ 123456) : cases passent en rouge `#C8412F`, **animation shake**, message « Code incorrect. (2 tentatives restantes) » + lien « Utiliser un code de récupération »
4. **Codes de récupération** : **check animé** (`@keyframes checkPop` + tracé du ✓) + « Double authentification activée ! » + **grille 2×4 de 8 codes** (`4K2M-8XPL`...) + boutons « Télécharger PDF » / « Imprimer »

**Note sécurité** : encart warn en bas (étapes 1-3) expliquant l'intérêt de la 2FA.

---

### 5. RGPD & CGV (`/legal`)

**Purpose** : Consulter les documents légaux. Accessible depuis le footer + au premier login.

**Layout** :
- Topbar : BrandBar + « Informations légales » + (si CGV acceptées) tag vert « CGV acceptées le {date} » + bouton « Télécharger PDF »
- **2 onglets** : « Conditions Générales de Vente » / « Politique de confidentialité »
- Corps split : **sidebar nav sections gauche (220px)** + **contenu scrollable droite (max 680px)**

**Sidebar sections** : liste cliquable, section active = couleur brand + barre brand 3px à gauche. Smooth scroll vers la section.

**Contenu** : titre H1 (Outfit 26px/700) + version + bouton PDF, puis sections H2 (17px/700, border-bottom) + corps (Inter 13px, `#374151`, line-height 1.75, `white-space: pre-line`). Contenu juridique réaliste fourni (8 chapitres CGV, 8 sections RGPD).

**Bloc acceptation CGV** (onglet CGV uniquement, en bas) :
- Encart avec **checkbox** (même style que les checkboxes de checklist intervention) + « J'accepte les Conditions Générales de Vente IZOX Pro »
- Au clic : encart passe en vert, tag « Accepté le {date} » + « Enregistré sur votre compte »

**Bannière cookies** (bottom-bar, non-intrusive) :
- Fixed bottom, fond `surface`, **border-top 1px `#E5E7EB`**, shadow douce vers le haut
- 🍪 « Gestion des cookies » + texte explicatif + lien « Personnaliser mes choix »
- Boutons « Refuser les optionnels » (ghost) + « Accepter » (brand)
- Au clic Accepter : **disparaît + `localStorage.setItem("izox_cookie_consent", Date.now())`** (réafficher après 12 mois)

---

## Interactions & Behavior

- **Drag & drop** : Planning (créneaux entre cases), Carte (réordonner interventions → recalcul live de l'itinéraire), via HTML5 Drag and Drop API (`draggable`, `onDragStart/Over/Drop`). En prod, préférer une lib comme `@dnd-kit` ou `react-beautiful-dnd`.
- **Animations** :
  - `stripeMove` : rayures défilantes sur les drop zones actives (1s linear infinite)
  - `checkPop` : pop du cercle de succès (0.4s cubic-bezier)
  - `drawCheck` : tracé du ✓ (0.35s ease-out)
  - `shake` : secousse horizontale sur erreur OTP (0.4s)
  - `pulse` : pastille de drag en cours
- **Hover** : cartes créneaux, lignes de tableau (→ pin carte), boutons
- **Loading** : skeleton planning (blocs gris pulsés)
- **Error** : drop invalide, carte indisponible, OTP incorrect, créneau pris
- **Responsive** : Planning + Carte = **desktop-only (min 1280px)** ; 2FA + RGPD = **responsive mobile**

---

## State Management

- **Planning** : `view` (semaine/jour), `dayIndex`, `loading`, état drag (`dragTarget`, `dragging`)
- **Carte** : `selectedOp`, `toggle` (Aujourd'hui/Semaine), `validated`, ordre des interventions (`orders` par opérateur)
- **RDV** : `hoveredId`, `clickedId`, `assignRow` (modal), `filterStatus`, dans le modal : `selOp`, `selSlot`, `confirmed`
- **2FA** : `step` (1-4), `method` (sms/app), `phone`, `otp`, `otpError`, `copied`
- **Légal** : `tab` (cgv/rgpd), `active` (section), `accepted`, `acceptDate`, `showCookie`, `cookieAccepted`
- **Data fetching** : interventions du jour/semaine par opérateur, demandes RDV avec coordonnées géo, créneaux disponibles par opérateur

---

## Design Tokens

### Couleurs (→ correspondance Tailwind suggérée)

| Token | Hex | Usage | Tailwind |
|-------|-----|-------|----------|
| brand | `#1B4332` | primaire (vert forêt) | `brand` |
| brandD | `#143D2E` | hover | `brand-dark` |
| brandDD | `#0F2F23` | active | |
| brandL | `#E7EFEA` | tint (nav/badge bg) | `brand-tint` |
| paper | `#F9FAFB` | fond de page | `paper` |
| surface | `#FFFFFF` | cartes | `white` |
| panel | `#F3F4F6` | zones en creux | `gray-100` |
| line | `#E5E7EB` | bordures | `gray-200` |
| rule | `#D1D5DB` | bordure forte | `gray-300` |
| ink | `#111827` | texte principal | `ink` |
| ink70 | `#374151` | texte secondaire | `gray-700` |
| ink50 | `#6B7280` | texte tertiaire | `gray-500` |
| ink30 | `#9CA3AF` | texte désactivé | `gray-400` |
| ok / accent | `#1F8A5B` | succès / actif | |
| okL | `#DCEEE4` | succès tint | |
| warn | `#C7811E` | en attente | |
| warnL | `#F6E8CD` | warn tint | |
| danger | `#C8412F` | erreur / refusé | |
| dangerL | `#F3D8D3` | danger tint | |
| info | `#2A6FDB` | gelé / info | |
| infoL | `#D5E2F6` | info tint | |

### Status pills (existants — réutiliser)

- **Véhicule** : actif (vert), gelé (bleu), en attente (orange)
- **Gel** : en_attente, validée, active, clôturée
- **RDV** : en_attente (orange), confirmée (vert), refusée (rouge)
- **Contrat** : actif, en_cours_gel, résilié

### Packs

| Pack | Background | Texte | Border |
|------|-----------|-------|--------|
| Intérieur | `#F3F4F6` | `#4B5563` | `#E5E7EB` |
| Standard | `#E7EFEA` | `#1B4332` | `#CBDDD2` |
| VTC | `#1B4332` | `#FFFFFF` | `#1B4332` |

### Typographie

- **Headings** : Outfit (400/500/600/700)
- **Body / UI** : Inter (400/500/600/700)
- **Data** (immat, IDs, codes, heures) : JetBrains Mono (400/500/600/700)

### Rayons

| Token | Valeur | Usage |
|-------|--------|-------|
| r2 | 4px | tags, petits éléments |
| r4 | 8px | boutons, inputs, cartes créneaux |
| r6 | 10px | cartes principales |
| r10 | 14px | medallions |

### Ombres

- `shadow` : `0 1px 2px rgba(17,24,39,0.04)`
- `shadowMd` : `0 1px 2px rgba(17,24,39,0.04), 0 12px 30px -20px rgba(17,24,39,0.20)`

---

## Assets

- **Photos véhicules** : placeholders Unsplash (voir `izox2/photos.jsx`) — à remplacer par les vraies photos véhicules en prod
- **Carte** : Leaflet 1.9.4 + tuiles OpenStreetMap (CDN). En prod, choisir le provider de tuiles selon la politique de l'équipe (OSM, Mapbox, Google Maps).
- **Fonts** : Google Fonts (Outfit, Inter, JetBrains Mono)
- **Icônes** : set SVG inline maison (`I.*` dans `izox2/atoms.jsx`)
- **Logo IZOX** : wordmark SVG (`izox2/brand.jsx`)
- Aucune icône emoji sauf 🍪 (bannière cookies) et 🇫🇷 (préfixe téléphone)

---

## Files

### Écrans (nouveaux)
- `izox2/admin-planning.jsx` — Planning : données PLAN, OPERATORS, vue semaine/jour, getLoad
- `izox2/admin-map.jsx` — Carte : Leaflet, MapPanel, TODAY_INTERVENTIONS, km
- `izox2/admin-rdv-v2.jsx` — RDV split view + AssignDrawer
- `izox2/security.jsx` — 2FA flow complet (Setup2FA, OTPInput, QRCodeSVG)
- `izox2/legal.jsx` — RGPD/CGV (LegalPage, CGV_SECTIONS, RGPD_SECTIONS, CookieBanner)

### États supplémentaires
- `izox2/extras-planning.jsx` — drop zones visibles, drag-in-progress, mobile, empty/error
- `izox2/extras-map.jsx` — légende drawer, panel interventions, empty/drag/error
- `izox2/extras-2fa.jsx` — étapes 2/3/4 figées + état erreur
- `izox2/extras-rdv.jsx` — modal assignation rapide + empty/error

### Design system (existant — réutiliser)
- `izox2/tokens.jsx` — TOK (tous les tokens), STATUS
- `izox2/atoms.jsx` — Mono, Tag, Badge, Btn, Field, Check, Switch, Avatar, Logo, icônes I.*
- `izox2/shell.jsx` — Sidebar, Topbar, MobileShell, NAV_CLIENT, NAV_ADMIN
- `izox2/cards.jsx` — VehicleCard, DemandeCard, ClientCard, ContratCard, KPI, PackTag
- `izox2/photos.jsx` — PHOTOS (placeholders véhicules)
- `izox2/brand.jsx` — logo IZOX, BrandBar

### Fichiers de présentation
- `IZOX Pro — Print v2.html` — toutes les maquettes + états, en pages 1440×900 (pour PDF)
- `IZOX Pro — Nouveaux Écrans.html` — design canvas interactif (zoom/pan)

---

## Notes d'implémentation

1. **Réutiliser** la Sidebar admin, Topbar, status pills, PackTag, boutons et empty states existants — ne pas les recréer.
2. **Empty states** : suivre exactement le pattern existant — medallion icône dans `rounded-2xl bg-brand-tint/20`, label uppercase `text-data text-ink-30`, titre h3, description `text-body text-ink-50`, 1-2 CTA.
3. Le **mapping couleurs opérateurs est fixe** et partagé Planning ↔ Carte.
4. **Tailwind uniquement**, pas de CSS custom (les `@keyframes` d'animation peuvent aller dans la config Tailwind via plugin ou `tailwind.config.js` → `extend.keyframes`).
5. Planning + Carte = **desktop-only** (min 1280px) ; prévoir un fallback ou message sur mobile.
