// Design tokens — IZOX (Remix). Confident European SaaS.
// Forest-green brand · Outfit/Inter/JetBrains type · enterprise spacing.

const TOK = {
  // Surfaces
  paper:   "#F9FAFB",    // page background (gris ultra clair)
  surface: "#FFFFFF",    // raised cards
  panel:   "#F3F4F6",    // recessed
  line:    "#E5E7EB",    // borders
  rule:    "#D1D5DB",    // strong rule

  // Ink — +1.5% contrast (foreground #111827)
  ink:     "#111827",
  ink70:   "#374151",
  ink50:   "#6B7280",
  ink30:   "#9CA3AF",

  // Brand — Vert foncé IZOX (logo officiel)
  brand:   "#1B4332",    // primary
  brandD:  "#143D2E",    // hover  (-10% lum)
  brandDD: "#0F2F23",    // active (-20% lum)
  brandL:  "#E7EFEA",    // light tint (badge/nav bg)

  // Accent — vert moyen actif
  accent:  "#1F8A5B",
  accentL: "#DCEEE4",

  // Semantic (kept)
  ok:      "#1F8A5B",
  okL:     "#DCEEE4",
  warn:    "#C7811E",
  warnL:   "#F6E8CD",
  danger:  "#C8412F",
  dangerL: "#F3D8D3",
  info:    "#2A6FDB",
  infoL:   "#D5E2F6",

  // Pack tones (Intérieur / Standard / VTC) — green-aligned
  pInterieur: { bg: "#F3F4F6", fg: "#4B5563", border: "#E5E7EB" },
  pStandard:  { bg: "#E7EFEA", fg: "#1B4332", border: "#CBDDD2" },
  pVTC:       { bg: "#1B4332", fg: "#FFFFFF", border: "#1B4332" },

  // Type — premium multi-font hierarchy
  head: '"Outfit", system-ui, sans-serif',                 // headings / display
  body: '"Inter", system-ui, sans-serif',                  // body / UI / labels
  mono: '"JetBrains Mono", ui-monospace, monospace',       // data only: immat, IDs, codes

  // Radii — légère arrondi premium (8→10)
  r2:  4,
  r4:  8,    // buttons, inputs, tags
  r6:  10,   // cards
  r10: 14,

  // Elevation — soft enterprise
  shadow:   "0 1px 2px rgba(17,24,39,0.04)",
  shadowMd: "0 1px 2px rgba(17,24,39,0.04), 0 12px 30px -20px rgba(17,24,39,0.20)",
};

function withAlpha(c, a){ return c + Math.round(a*255).toString(16).padStart(2,"0"); }

const STATUS = {
  vehActif:   { tone: "ok",     label: "actif" },
  vehGele:    { tone: "info",   label: "gelé" },
  vehAttente: { tone: "warn",   label: "en attente" },

  gelAttente: { tone: "warn",   label: "en_attente" },
  gelValidee: { tone: "info",   label: "validée" },
  gelActive:  { tone: "info",   label: "active" },
  gelCloturee:{ tone: "neutral",label: "clôturée" },

  rdvAttente: { tone: "warn",   label: "en_attente" },
  rdvConfirm: { tone: "ok",     label: "confirmée" },
  rdvRefus:   { tone: "danger", label: "refusée" },

  ctActif:    { tone: "brand",  label: "actif" },
  ctEnGel:    { tone: "info",   label: "en_cours_gel" },
  ctResilie:  { tone: "danger", label: "résilié" },
};

Object.assign(window, { TOK, withAlpha, STATUS });
