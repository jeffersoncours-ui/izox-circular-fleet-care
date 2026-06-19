# BRIEF — Site vitrine B2C IZOX (Circular Fleet Care)

> Document de spécification pour Claude Code.
> Objectif : construire la **landing publique B2C** (hors app CRM existante) avec
> tunnel de réservation en direct + paiement, et une route B2B de capture de leads.
> **Le CRM/portail existe déjà** — cette page consomme l'infra existante, elle ne la recrée pas.

---

## 0. CONTEXTE & RÈGLE D'OR

IZOX est un service de nettoyage automobile **éco-responsable à eau recyclée en circuit fermé**
(berme sous véhicule → pompage → retour local → recyclage → réutilisation).
Ce n'est PAS du « sans eau ». Le différenciateur = **la circularité de l'eau**.

**Règle d'or du projet : une page = une décision.**
- La landing B2C convertit vers UNE action : réserver un nettoyage.
- Le B2B a sa propre route, il ne parasite jamais le tunnel B2C.
- Le tunnel de paiement est SOBRE : zéro distraction, zéro animation gratuite.

---

## 1. IDENTITÉ DE MARQUE

**Couleurs**
- Primaire : vert forêt `#1B4332`
- Secondaire : `#1F8A5B`
- Surfaces : blanc / neutres clairs
- **Pas de dégradés.** Cards à ombre douce.

**Typographie**
- Titres : `Outfit`
- Corps : `Inter`
- Chiffres / codes / prix : `JetBrains Mono`
- Tracking serré (tight) sur les titres.

**Style UI**
- Surfaces blanches, sidebar blanche (côté app), épuré, premium-sobre.
- Coins doux, ombres légères, beaucoup d'air.

---

## 2. STACK TECHNIQUE

- **Framework** : TanStack Start (SSR + streaming)
- **Backend** : Supabase (Postgres + Auth + Edge Functions)
- **Hébergement** : Vercel
- **Email** : Resend
- **Animations** : Framer Motion (scroll-driven, SSR-compatible)
- **Paiement** : Stripe (acompte + solde)

**Contrainte SSR/perf non négociable :**
L'ossature texte + le bouton « Réserver » doivent être **interactifs avant** que les
scripts d'animation (boucle d'eau, poissons) ne soient chargés.
Animations lazy-loadées sous la ligne de flottaison. **First Contentful Paint protégé.**

---

## 3. ARCHITECTURE DES ROUTES

| Route | Rôle | Audience |
|---|---|---|
| `/` | Landing vitrine + bifurcation | B2C principal |
| `/reservation` | Tunnel de réservation + paiement (SOBRE) | B2C |
| `/entreprises` | Argumentaire flotte + capture de lead | B2B |

Le hero de `/` fait la bifurcation propre B2C / B2B.
**B2C et B2B sont deux parcours distincts** — psychologies opposées :
- B2C veut : praticité, nouveauté, bonne conscience écolo, réservation rapide.
- B2B veut : réduction de coûts, fiabilité opérationnelle, reporting, conformité.

---

## 4. PLAN DE PAGE — LANDING `/`

Concept directeur visuel : **« le fil de l'eau »**.
Une goutte / ligne d'eau suit le visiteur du haut en bas et tisse les sections.
En scrollant, on suit physiquement le parcours de l'eau dans la boucle circulaire.
**Les animations RACONTENT le concept, elles ne décorent pas.**

### Sections (ordre exact)

1. **Hero**
   - Accroche circularité : *« On lave à l'eau. On la récupère. On la fait revivre. »*
   - Sous-titre : produits bio + zone (Évry-Courcouronnes, rayon 25 km).
   - Double CTA :
     - Primaire → `Réserver mon nettoyage` (vers `/reservation`)
     - Secondaire → `Voir comment l'eau revit` (scroll vers section boucle)
   - Lien discret → `Je gère une flotte` (vers `/entreprises`)
   - Bandeau confiance : produits bio · eau recyclée · paiement sécurisé.
   - Animation : voiture + eau qui ruisselle dans la berme. Goutte « commence son voyage ».

2. **Comment ça marche** — 3 étapes : *Je réserve / On vient / L'eau repart en boucle.*

3. **La boucle d'eau** ⭐ SECTION SIGNATURE
   - Tracé SVG animé que la goutte parcourt, **piloté au scroll**.
   - Chiffres réels qui s'allument quand la goutte passe (voir §8) :
     - Lavage → **~50 L / véhicule** (vs ~200 L lavage classique au jet)
     - Berme / pompage → **80 % récupéré**
     - Recyclage → **50 % réinjecté dans la boucle**
   - C'est la plus belle pièce de la page. **Preuve, pas gadget.**

4. **Preuve RSE** — chiffres réels uniquement (voir §8). Pas de label inventé.

5. **Avant / après** — galerie photo, preuve de qualité tangible.

6. **Grille tarifaire transparente** — matrice complète (voir §5), sans astérisque caché.

7. **Vision « demain »** — compost → aquaponie (poissons) → légumes revendus en local.
   - **Clairement labellisée « notre feuille de route »** — séparée du présent.
   - Doit parler AUSSI de rentabilité écologique (pas que de jolis légumes).
   - Animation : la goutte se transforme (eau → compost → bassin → poissons → légumes).

8. **Abonnement** — comparaison SOFT, non agressive.
   - *« Vous reviendrez ? L'abonnement vous fait économiser X. »*
   - **Ce n'est pas une porte d'entrée.** Module discret.

9. **Avis clients**

10. **FAQ** — zone, paiement, annulation/remboursement acompte, produits, durée d'intervention.

11. **Footer** — mentions légales, CGV (rétractation L221-28, politique d'annulation), RGPD, contact.

---

## 5. GRILLE TARIFAIRE B2C (TTC)

### Nettoyage Intérieur
| Véhicule | Prix |
|---|---|
| Citadine | 80 € |
| Berline | 110 € |
| SUV | 140 € |
| Utilitaire | 170 € |

### Nettoyage Intérieur + Extérieur (+30 €)
| Véhicule | Prix |
|---|---|
| Citadine | 110 € |
| Berline | 140 € |
| SUV | 170 € |
| Utilitaire | 200 € |

### Options à la demande
| Option | Citadine | Berline | SUV | Utilitaire |
|---|---|---|---|---|
| Puzzi (injection-extraction) | 40 € | 47 € | 53 € | 60 € |
| Traitement ozone (prix fixe) | 40 € | 40 € | 40 € | 40 € |

> Tous prix **TTC** côté B2C.
> (Rappel : la grille B2B est en HT, franchise TVA art. 293B CGI — ne PAS mélanger.)

---

## 6. TUNNEL DE RÉSERVATION `/reservation` (SOBRE)

**Principe : page la plus sobre du site. Le design s'efface devant le paiement.**
Multi-step form. Affichage progressif. Animation utile UNIQUEMENT (voir cuve ci-dessous).

### Étapes (ordre)
1. **Code postal** — gate géographique (rayon 25 km autour d'Évry-Courcouronnes).
   - Si hors zone → capturer quand même l'email (« on vous prévient dès qu'on couvre votre secteur »). Zéro lead perdu.
   - **Détection flotte ICI** (pas dans le paiement) : si plusieurs véhicules / pro → proposer bascule vers `/entreprises`. Ligne discrète, jamais intrusive.
2. **Véhicule** — citadine / berline / SUV / utilitaire.
3. **Formule** — intérieur / intérieur + extérieur.
4. **Options** — Puzzi / Ozone (cases).
5. **Prix TTC affiché EN DIRECT** — recalcul instantané à chaque choix (supprime l'anxiété du prix).
6. **Créneau** — réservation TEMPS RÉEL (voir §7).
7. **Coordonnées** + **opt-in RGPD SÉPARÉ** :
   - Consentement réservation = nécessaire au service.
   - Opt-in prospection abonnement = **case distincte, décochée par défaut.**
8. **Paiement** — intégral OU acompte 30 % minimum.
9. **Confirmation** → déclenche séquence email (réutilise Resend, types existants si possible).

### Animation du tunnel (la SEULE autorisée ici)
- **Une cuve d'eau qui se remplit** à mesure que le client avance dans les étapes.
- Niveau d'eau = progression. Guide sans distraire.
- **CSS pur** ou transition Framer ultra-légère liée au `step` du form.
- **INTERDIT : physique de vagues calculée en JS.** Ne doit jamais ramer sur iPhone/Safari mobile au moment de sortir la carte.

### Paiement
- Acompte 30 % min OU intégral, en ligne (Stripe).
- **Reste à payer** (les 70 %) = encaissé **sur place : TPE ou espèces.**
- Slot tenu seulement si paiement réussi (voir hold §7).

### Annulation / remboursement
- Annulation → **remboursement de l'acompte.**
- Prestation à date fixe → **pas de droit de rétractation 14 j** (art. L221-28 Code conso). À écrire dans les CGV.

---

## 7. MOTEUR DE RÉSERVATION TEMPS RÉEL (cœur technique)

### Créneaux
- 4 créneaux / jour : **8h, 11h** (matin) · **14h, 16h30** (après-midi).
- Capacité = celle de l'opérateur terrain (mêmes slots que le terrain).
- **Ouverture totale au lancement** (B2C peut prendre les 4 slots).
- Élasticité capacité : règle métier interne = à 70 % de remplissage, recrutement d'un 2e opérateur (hors scope code, mais la capacité doit être **paramétrable**).

### Invariant anti-doublon B2B / B2C ⚠️ CRITIQUE
Deux « devises » de réservation coexistent :
- **B2B** réserve **2 demi-journées floues** (l'admin pose l'heure + le jour exacts APRÈS).
- **B2C** réserve une **heure précise** en temps réel.

**Règle invariante :** tout se ramène à **2 créneaux atomiques par demi-journée**, capacité = 1 équipe.
- *Réservations du matin ≤ 2*, peu importe qui réserve.
- Une demi-journée B2B en attente **consomme 1 des 2 slots** du matin (sans figer l'heure).
- Le B2C voit alors la dispo passer de 2h libres à 1h libre.
- L'admin posera le B2B sur le créneau restant.
- **Le planning drag-drop du CRM reste la source de vérité UNIQUE.** Le B2C ne crée pas son propre calendrier — il consomme la même table d'interventions.

### Atomicité (obligatoire même avec capacité élastique)
- Contrainte d'unicité Postgres sur `(date, slot, équipe)`.
- Transaction / `SELECT … FOR UPDATE` pour éviter la race condition (2 clics simultanés sur le dernier slot).
- **Hold temporaire ~10 min** pendant le paiement : slot réservé, libéré automatiquement si le paiement échoue ou expire (sinon = créneaux fantômes).

### Faisabilité géographique (lancement)
- Ne PAS implémenter de routage/optimisation de tournée au lancement.
- Plafonner les slots vendables/jour à ce qui est physiquement tenable.
- Raffiner plus tard.

---

## 8. CHIFFRES RSE — VALIDÉS & CADRÉS JURIDIQUEMENT ⚠️

**Chiffres réels (mesurés, à formuler « en moyenne, sur nos interventions ») :**
- **~50 L** utilisés / véhicule
- **40 L** récupérés → **80 % de l'eau récupérée**
- **25 L** réutilisés après recyclage → **50 % de l'eau réinjectée dans la boucle**

**Comparaison (différenciateur fort) :**
- 50 L vs lavage classique au jet (~150–300 L) → **« 2 à 4× moins d'eau qu'un lavage au jet »**
- ⚠️ TOUJOURS nommer la base de comparaison (« vs un lavage au jet à domicile »).

### INTERDICTIONS STRICTES (conformité loi Climat & Résilience / DGCCRF)
- ❌ NE JAMAIS écrire « 95 % réinjecté » (placeholder erroné — le vrai chiffre est 50 %).
- ❌ AUCUNE mention de certification (« certifié ESG/RSE », « conforme »…). **IZOX n'a aucune certification.**
- ❌ Pas de chiffre rond gonflé. Le réel (50 %) est déjà un excellent argument.
- ✅ Autorisé : « démarche éco-responsable », « produits bio », « eau recyclée », « en moyenne ».
- ✅ Tout chiffre = réel et étayable.

---

## 9. ANIMATIONS — RÈGLES TRANSVERSES ⚠️

### Mobile-first STRICT (60 %+ du trafic B2C est sur smartphone)
- **Le scroll est le SEUL moteur d'animation universel.**
  - La goutte avance au défilement, les poissons nagent au défilement, la boucle se dessine au défilement.
- **Les effets de souris (hover, parallaxe curseur, boutons magnétiques, poissons qui fuient le pointeur) = BONUS DESKTOP UNIQUEMENT.**
  - Ils se greffent par-dessus, ils ne SUPPORTENT JAMAIS la narration.
  - ❌ Ne jamais mapper le hover sur `touch` (casse le scroll natif).
- On conçoit mobile-first, on enrichit desktop. Jamais l'inverse.

### Accessibilité & perf (non négociable)
- Respecter `prefers-reduced-motion` partout.
- Animations lazy-loadées sous la ligne de flottaison.
- Premier écran instantané — jamais sacrifier la vitesse de chargement.
- Vitrine = riche en animation. **Tunnel `/reservation` = sobre.**

### Boutons
- Vert forêt `#1B4332`, coins doux.
- Desktop : effet magnétique au survol + remplissage « eau qui monte » de bas en haut.
- Mobile : état actif/pressé propre, pas de hover.
- Microcopie orientée action : `Réserver mon nettoyage` / `Voir comment l'eau revit` / `Je gère une flotte`.

---

## 10. ROUTE B2B `/entreprises`

**Objectif : capture de lead, PAS de réservation en ligne.**

- Argumentaire flotte (leviers B2B) : réduction de coûts, fiabilité opérationnelle, reporting RSE, traçabilité.
- Réutiliser les chiffres RSE (§8) comme preuve.
- **Formulaire de capture** : nom, société, taille de flotte, email, téléphone → crée un lead dans Supabase.
- Process : rappel commercial + envoi de la plaquette commerciale.
- Paliers de remise selon taille de flotte : Starter 0 % / Growth 5 % / Pro 12 % / Enterprise 20 %.
- Au lancement : version minimale (argumentaire + formulaire).

---

## 11. RGPD & SÉCURITÉ

- Opt-in marketing **distinct** du consentement de réservation (case décochée par défaut).
- Captcha (Cloudflare Turnstile recommandé) sur les formulaires (réservation + lead B2B).
- **Minimisation** : ne demander l'adresse précise qu'au moment du créneau, pas avant.
- Mentions légales, CGV (annulation, L221-28), politique de confidentialité en footer.

---

## 12. CHECKLIST DE LANCEMENT (ordre de dev suggéré)

1. Route `/` — ossature texte + hero + CTA interactifs (SSR, sans animation).
2. Grille tarifaire + sections statiques.
3. Tunnel `/reservation` — multi-step + calcul prix direct + gate code postal.
4. Moteur de réservation temps réel (invariant slots, atomicité, hold).
5. Paiement Stripe (acompte/intégral) + confirmation + emails Resend.
6. Route `/entreprises` — argumentaire + capture lead Supabase.
7. Animations scroll-driven (boucle d'eau chiffrée, fil de l'eau, vision).
8. Cuve de progression du tunnel (CSS pur).
9. Enrichissements desktop (hover, parallaxe) — par-dessus, dégradables.
10. Passe accessibilité (`prefers-reduced-motion`) + perf (FCP, lazy-load).

---

## RÉSUMÉ EXÉCUTIF

- **Circularité de l'eau** = le différenciateur. Pas « sans eau ».
- **Une page = une décision.** B2C convertit vers la réservation. B2B = route à part.
- **Mobile-first**, scroll = seul moteur universel, souris = bonus desktop.
- **Tunnel sobre**, vitrine spectaculaire. Jamais l'inverse.
- **Chiffres RSE réels** (50 L / 80 % / 50 %), zéro certification inventée, comparaison toujours sourcée.
- **Réservation temps réel** : invariant 2 slots/demi-journée, atomicité Postgres, hold 10 min, CRM = source de vérité unique.
- **Paiement** : acompte 30 % ou intégral en ligne, reste sur place (TPE/espèces), acompte remboursable.
