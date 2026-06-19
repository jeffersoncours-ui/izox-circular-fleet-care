# IZOX (Remix) — Design Handoff

Fleet Operating System pour le nettoyage éco-responsable de flottes (VTC, PME premium, location, concessionnaires).
Direction : **Confident European SaaS** — forest-green, typo Outfit/Inter/JetBrains, spacing enterprise.

---

## ⚠️ À lire en premier — nature de ce bundle

Les fichiers de ce dossier sont des **références de design construites en HTML/React-via-CDN**. Ce sont des **prototypes** qui montrent l'apparence et le comportement voulus — **pas du code de production à copier tel quel**.

**La tâche** : recréer ces écrans dans le **codebase cible** avec ses patterns établis — ici **React + Tailwind + Supabase + TanStack Router**. Lis chaque écran comme une spec visuelle, puis réimplémente proprement (composants, routing, data layer, state) selon les conventions du repo.

**Fidélité : haute (hifi).** Couleurs, typo, spacing et états sont définitifs. Reproduis l'UI au pixel près en t'appuyant sur les tokens ci-dessous et le code source des `.jsx`.

---

## Visualiser le design

Ouvre `index.html` dans un navigateur. Aucun build — React 18 + Babel via CDN. Les écrans sont disposés sur un canvas pan/zoom (`design-canvas.jsx` + `izox2/app.jsx`) qui est **du scaffolding de présentation uniquement — à ignorer/supprimer pour le prod**.

---

## Structure

```
index.html                  ← entrée, charge tous les scripts (canvas de présentation)
design-canvas.jsx           ← canvas pan/zoom — PRÉSENTATION uniquement, à droper
izox2/
  tokens.jsx                ← TOK (couleurs, type, radii), STATUS, withAlpha   ◀ SOURCE DE VÉRITÉ
  atoms.jsx                 ← Mono, Data, Tag, PackTag, Btn, I (icônes Lucide-like)
  brand.jsx                 ← IzoxWord, IzoxMark, BrandBar, BrandBoard, PaletteBoard
  system.jsx                ← TypeBoard, ButtonsBoard, BadgesBoard (planches de specs)
  deliverables.jsx          ← TailwindBoard, BeforeAfterBoard (specs livrables)
  photos.jsx                ← PHOTOS (URLs Unsplash) + PhotoFrame, StripeMarks
  cards.jsx                 ← VehicleCard, Stat, QuotaBar, DemandeCard, ClientCard, ContratCard
  shell.jsx                 ← NAV_CLIENT, NAV_ADMIN, Sidebar, Topbar, Page, MobileShell,
                              MobileTabbar, Search, Stepper

  mobile-client.jsx         ← M_Dashboard, MTABS_CLIENT, MHead, QuickTile
  mobile-client-2.jsx       ← M_Flotte, MFleetRow, M_Vehicule
  mobile-client-3.jsx       ← M_Prestations, M_Factures, M_Login
  desktop-client.jsx        ← D_Client_Dashboard, D_Client_Flotte, D_Client_Vehicule

  admin-overview.jsx        ← A_Dashboard
  admin-clients.jsx         ← A_Clients, A_Client_Fiche (4 onglets)
  admin-ops.jsx             ← A_Contrats, A_Vehicules, A_Gel, A_RDV
  admin-interventions.jsx   ← A_Interventions, A_Intervention_Fiche (stepper 3 étapes)
  mobile-terrain.jsx        ← T_Dashboard, T_Intervention (stepper terrain 3 étapes)

  empty.jsx                 ← EmptyState, EmptyPage + 6 empty states clés
  impact-shared.jsx         ← ECO, MetricCard, Sparkline, MonthlyChart, FilterPill
  impact-client.jsx         ← C_Impact (+ NoData, FilterEmpty), NAV_CLIENT_IMPACT
  impact-admin.jsx          ← A_Impact (+ NoData, QueueEmpty), NAV_ADMIN_IMPACT
  invoice.jsx               ← InvoiceDetail (facture complète mentions légales FR)
  booking.jsx               ← D_Booking, M_Booking, CalMonth, SlotGrid (prise de RDV calendrier)

  app.jsx                   ← câblage canvas — PRÉSENTATION uniquement
  print-app.jsx             ← câblage print — PRÉSENTATION uniquement
```

---

## Écrans livrés

### Client — mobile (390px)
- **Login** (`M_Login`)
- **Dashboard** (`M_Dashboard`) — contrat actif, prochaine intervention, quotas
- **Ma flotte** (`M_Flotte`) + **Fiche véhicule** (`M_Vehicule`)
- **Prestations** (`M_Prestations`), **Factures** (`M_Factures`)
- **Prise de RDV** (`M_Booking`) — calendrier mensuel + créneaux

### Client — desktop (1280px)
- **Dashboard** (`D_Client_Dashboard`)
- **Ma flotte** (`D_Client_Flotte`, accordéons) + **Fiche véhicule** (`D_Client_Vehicule`)
- **Prise de RDV** (`D_Booking`)
- **Impact RSE** (`C_Impact`) — 4 hero cards (eau, pollution, compost, CO₂), courbe mensuelle, filtres période + véhicule, export CSV / impression

### Admin
- **Dashboard** (`A_Dashboard`)
- **Clients** (`A_Clients`) + **Fiche client** (`A_Client_Fiche`, 4 onglets)
- **Contrats** (`A_Contrats`), **Véhicules** (`A_Vehicules`, groupés), **Demandes gel** (`A_Gel`), **Demandes RDV** (`A_RDV`)
- **Interventions** (`A_Interventions`) + **Fiche intervention** (`A_Intervention_Fiche`, stepper 3 étapes)
- **Impact RSE** (`A_Impact`) — coefficients RSE éditables (eau, pollution, compost, CO₂) + file de validation "accuser réception"

### Terrain — mobile
- **Dashboard ops** (`T_Dashboard`)
- **Intervention** (`T_Intervention`, stepper terrain 3 étapes)

### Document
- **Facture détail** (`InvoiceDetail`) — en-tête (n°, dates, SIRET, TVA intra, coordonnées IZOX), bloc client, lignes (description / qté / PU HT / TVA / total HT), totaux (sous-total HT, TVA ventilée, total TTC), pied (conditions de paiement, pénalités, RIB/IBAN), statut brouillon/émise/payée, bouton télécharger PDF

### Empty states (6 clés) — `empty.jsx`
1. `E_AdminClients` — zéro client
2. `E_AdminVehicules` — zéro véhicule
3. `E_AdminInterventions` — zéro intervention
4. `E_ClientDashboard` — pas de contrat actif
5. `E_ClientFlotte` — zéro véhicule
6. `E_AdminGel` — zéro demande de gel
+ RSE : `C_Impact_NoData`, `C_Impact_FilterEmpty`, `A_Impact_NoData`, `A_Impact_QueueEmpty`

**Pattern empty state** : icône + message explicite + CTA principal (`#1B4332`) + fond panel `#F3F4F6`, centré verticalement.

---

## Design tokens — `izox2/tokens.jsx` (source de vérité)

### Surfaces
| Token | Hex | Usage |
|---|---|---|
| `paper` | `#F9FAFB` | fond de page |
| `surface` | `#FFFFFF` | cartes surélevées |
| `panel` | `#F3F4F6` | zones en creux / empty states |
| `line` | `#E5E7EB` | bordures |
| `rule` | `#D1D5DB` | filets forts |

### Encre (texte)
`ink #111827` · `ink70 #374151` · `ink50 #6B7280` · `ink30 #9CA3AF`

### Brand — forest green
| Token | Hex | Usage |
|---|---|---|
| `brand` | `#1B4332` | primary (boutons, accents, nav active, headers) |
| `brandD` | `#143D2E` | hover (−10% lum) |
| `brandDD` | `#0F2F23` | active/pressed (−20% lum) |
| `brandL` | `#E7EFEA` | tint clair (fond badge/nav) |
| `accent` | `#1F8A5B` | vert moyen actif |
| `accentL` | `#DCEEE4` | tint accent |

### Sémantique
`ok #1F8A5B` / `okL #DCEEE4` · `warn #C7811E` / `warnL #F6E8CD` · `danger #C8412F` / `dangerL #F3D8D3` · `info #2A6FDB` (gel) / `infoL #D5E2F6`

### Packs prestation
- **Intérieur** : bg `#F3F4F6`, fg `#4B5563`, border `#E5E7EB`
- **Standard** : bg `#E7EFEA`, fg `#1B4332`, border `#CBDDD2`
- **VTC** : bg `#1B4332`, fg `#FFFFFF`

### Rayons
`r2 4px` · `r4 8px` (boutons, inputs, tags) · `r6 10px` (cartes) · `r10 14px`

### Ombres
- `shadow` : `0 1px 2px rgba(17,24,39,0.04)`
- `shadowMd` : `0 1px 2px rgba(17,24,39,0.04), 0 12px 30px -20px rgba(17,24,39,0.20)`

---

## Typographie

| Rôle | Font | Weight | Size / Line | Letter-spacing |
|---|---|---|---|---|
| H1 / titres page | **Outfit** | 700 | 32 / 40 | −0.5px |
| H2 / sections | **Outfit** | 700 | 24 / 32 | −0.5px |
| H3 / sous-titres | **Outfit** | 700 | 18 / 28 | −0.5px |
| Body | **Inter** | 400 | 13 / 22 | 0 |
| Body emphasis | **Inter** | 600 | 13 / 22 | 0 |
| UI (boutons, inputs, badges) | **Inter** | 600 | 13 | 0 |
| Data (immat, IDs, codes, email, tél, adresses) | **JetBrains Mono** | 400 | 12 / 18 | 0 |

`head: "Outfit"` · `body: "Inter"` · `mono: "JetBrains Mono"` (cf. `TOK`). Le monospace est réservé **aux données** (composant `Mono` / `Data` dans `atoms.jsx`) — pas au texte courant.

---

## Spacing / tone (enterprise)

- Card padding : **20px**
- Section gap : **24px**
- Component gap : **16px**
- Border-radius cartes : **10px**
- Ton : minimaliste, données en avant, contraste +1.5% (foreground `#111827`). Référence : Pipedrive / HubSpot / Deel. **Pas** de "Valley fintech", **pas** de brutalist.

---

## Composants UI (specs)

- **Btn** (`atoms.jsx`) : variants primary (`brand`), secondary (outline `brand`), danger, ghost. Padding ~10×16, radius 8, Inter 600 13px. Hover → `brandD`, active → `brandDD`.
- **Tag / Badge** : pastille sémantique (ok/warn/danger/info) + variante `brand`. Voir `STATUS` dans `tokens.jsx` pour le mapping statut→tonalité→label (véhicule, gel, RDV, contrat).
- **PackTag** : badge pack Intérieur / Standard / VTC.
- **Cartes** (`cards.jsx`) : VehicleCard, Stat (KPI), QuotaBar, DemandeCard, ClientCard, ContratCard.
- **Shell** (`shell.jsx`) : Sidebar + Topbar (desktop), MobileShell + MobileTabbar (mobile, 390px), Page (wrapper), Stepper (workflows 3 étapes), Search.
- **Impact** (`impact-shared.jsx`) : MetricCard (hero), Sparkline, MonthlyChart (courbe — remplacer par Recharts en prod), FilterPill.

---

## Icônes

Set inline dans `atoms.jsx` (composant `I`), style **Lucide**. En prod, remplace par `lucide-react` — garde les mêmes noms/concepts.

---

## State & data

Aucune gestion d'état pour l'instant — chaque écran est une composition statique avec données mockées inline. À câbler sur **Supabase** au niveau écran. Sidebar/Topbar/Tabbar sont passifs (routing à brancher sur **TanStack Router**). Les statuts (`STATUS`) correspondent aux états métier : véhicule actif/gelé/en attente, gel en_attente/validée/active/clôturée, RDV en_attente/confirmée/refusée, contrat actif/en_cours_gel/résilié.

---

## Assets

Les photos véhicules sont des **URLs Unsplash externes** dans `izox2/photos.jsx` (map `PHOTOS`). À remplacer par tes assets CDN/locaux en prod.

---

## Migration vers le prod (notes Claude Code)

1. **Scope Babel** : tous les composants sont globaux (`Object.assign(window, …)`) à cause des `<script type="text/babel">`. Convertis chaque fichier en **module ES** avec des `export` nommés, et remplace les lectures `window.X` par des imports.
2. **Drop la présentation** : `design-canvas.jsx`, `app.jsx`, `print-app.jsx`, et les planches `*Board` (`brand.jsx`, `system.jsx`, `deliverables.jsx`) sont du matériel de revue — ne monte que les écrans applicatifs.
3. **Tokens → Tailwind** : porte `TOK` dans `tailwind.config` (couleurs `brand`/`accent`/sémantiques, radii, fontFamily Outfit/Inter/JetBrains, shadows). `deliverables.jsx` contient déjà un `TailwindBoard` de référence.
4. **Tailles** : mobile 390px, desktop 1280px. Utilise `MobileShell` / `Page` comme primitives de layout, à reconstruire en composants Tailwind responsives.
5. **Stack cible** : React 18 + Tailwind + Supabase + TanStack Router. Le loader CDN actuel est pour la revue uniquement.
