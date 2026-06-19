// Atoms: Mono label, Tag, Badge, Btn, Field, Check, Switch, Avatar, Logo.

// Eyebrow / micro-label — UI element, set in Inter SemiBold (not mono).
const Mono = ({ children, size = 10, color, weight = 600, style = {} }) => (
  <span style={{
    fontFamily: TOK.body, fontSize: size, fontWeight: weight,
    letterSpacing: ".06em", textTransform: "uppercase",
    color: color || TOK.ink50, lineHeight: 1, ...style,
  }}>{children}</span>
);

// Data atom — monospace, ONLY for immatriculations, IDs, codes, email, phone.
const Data = ({ children, size = 12, color, weight = 500, style = {} }) => (
  <span style={{
    fontFamily: TOK.mono, fontSize: size, fontWeight: weight,
    letterSpacing: "0", color: color || TOK.ink, lineHeight: 1.2, ...style,
  }}>{children}</span>
);

// Inline tag (uppercase mono) used for breadcrumbs, IDs, micro-labels.
const Tag = ({ children, tone, dot, style = {}, square }) => {
  const map = {
    brand:   { bg: TOK.brandL,  fg: TOK.brandD, dot: TOK.brand },
    ok:      { bg: TOK.okL,     fg: TOK.ok,     dot: TOK.ok },
    warn:    { bg: TOK.warnL,   fg: TOK.warn,   dot: TOK.warn },
    danger:  { bg: TOK.dangerL, fg: TOK.danger, dot: TOK.danger },
    info:    { bg: TOK.infoL,   fg: TOK.info,   dot: TOK.info },
    neutral: { bg: TOK.panel,   fg: TOK.ink70,  dot: TOK.ink50 },
    invert:  { bg: TOK.brand,   fg: "#fff",     dot: "#7CC9A5" },
  };
  const t = map[tone || "neutral"];
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap: 6,
      background: t.bg, color: t.fg,
      padding: "3px 8px",
      borderRadius: square ? TOK.r2 : 999,
      fontFamily: TOK.body, fontSize: 11, fontWeight: 600,
      letterSpacing: ".01em", textTransform: "none",
      lineHeight: 1, whiteSpace: "nowrap", border: `1px solid ${TOK.line}`,
      borderColor: tone === "invert" ? TOK.brand : `${t.fg}22`,
      ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, background: t.dot, borderRadius: 999 }} />}
      {children}
    </span>
  );
};

// Pack badge — distinct visual per pack
const PackTag = ({ pack, style = {} }) => {
  const tones = { Intérieur: TOK.pInterieur, Standard: TOK.pStandard, VTC: TOK.pVTC };
  const t = tones[pack] || TOK.pStandard;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap: 6,
      background: t.bg, color: t.fg, border: `1px solid ${t.border}`,
      padding: "4px 9px", borderRadius: TOK.r2,
      fontFamily: TOK.body, fontSize: 11, fontWeight: 600,
      letterSpacing: ".02em", textTransform: "none",
      ...style,
    }}>
      {pack === "VTC" && <span style={{ width: 6, height: 6, borderRadius: 999, background: "#7CC9A5" }}/>}
      {pack}
    </span>
  );
};

// Button — brutalist, square corners, hard edge.
const Btn = ({ kind = "primary", state = "default", size = "md", icon, children, full, style = {}, ...rest }) => {
  const sz = size === "sm" ? { padding: "8px 12px", fontSize: 12 }
           : size === "lg" ? { padding: "13px 20px", fontSize: 14 }
           : { padding: "10px 16px", fontSize: 13 };

  const base = {
    fontFamily: TOK.body, fontWeight: 600, letterSpacing: "0", textTransform: "none",
    display: "inline-flex", alignItems:"center", justifyContent:"center", gap: 8,
    border: "1px solid", borderRadius: TOK.r4, cursor: "pointer", lineHeight: 1, whiteSpace:"nowrap",
    width: full ? "100%" : undefined, transition: "background .15s, color .15s, border-color .15s",
    ...sz,
  };
  const styles = {
    primary: {
      default: { background: TOK.brand, color: "#fff", borderColor: TOK.brand },
      hover:   { background: TOK.brandD, color: "#fff", borderColor: TOK.brandD },
      active:  { background: TOK.brandDD, color: "#fff", borderColor: TOK.brandDD },
      disabled:{ background: TOK.panel, color: TOK.ink30, borderColor: TOK.line, cursor: "not-allowed" },
      loading: { background: TOK.brand, color: "rgba(255,255,255,.65)", borderColor: TOK.brand },
    },
    accent: {
      default: { background: TOK.accent, color: "#fff", borderColor: TOK.accent },
      hover:   { background: "#1A7A50", color: "#fff", borderColor: "#1A7A50" },
      active:  { background: "#166644", color: "#fff", borderColor: "#166644" },
      disabled:{ background: TOK.panel, color: TOK.ink30, borderColor: TOK.line },
      loading: { background: TOK.accent, color: "rgba(255,255,255,.65)", borderColor: TOK.accent },
    },
    ghost: {
      default: { background: "transparent", color: TOK.ink, borderColor: TOK.line },
      hover:   { background: TOK.surface, color: TOK.ink, borderColor: TOK.ink },
      active:  { background: TOK.panel,   color: TOK.ink, borderColor: TOK.ink },
      disabled:{ background: "transparent", color: TOK.ink30, borderColor: TOK.line, cursor: "not-allowed" },
      loading: { background: "transparent", color: TOK.ink50, borderColor: TOK.line },
    },
    danger: {
      default: { background: "transparent", color: TOK.danger, borderColor: `${TOK.danger}66` },
      hover:   { background: TOK.danger, color: "#fff", borderColor: TOK.danger },
      active:  { background: TOK.danger, color: "#fff", borderColor: TOK.danger },
      disabled:{ background: "transparent", color: TOK.ink30, borderColor: TOK.line },
      loading: { background: "transparent", color: TOK.danger, borderColor: `${TOK.danger}66` },
    },
  };
  return (
    <button {...rest} style={{ ...base, ...styles[kind][state], ...style }}>
      {state === "loading" && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 0 0-9-9" />
        </svg>
      )}
      {icon}
      {children}
    </button>
  );
};

// Iconography (line, monoline, 1.5 stroke)
const I = {
  car:    (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 14 L5 9 a3 3 0 0 1 2.8 -2 H16.2 a3 3 0 0 1 2.8 2 L21 14 V18 H18 V17 H6 V18 H3 Z"/><circle cx="7.5" cy="15.5" r="1.4"/><circle cx="16.5" cy="15.5" r="1.4"/></svg>,
  snow:   (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round"><path d="M12 3v18M3 12h18M5 5l14 14M19 5L5 19"/></svg>,
  clock:  (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  check:  (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>,
  search: (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>,
  plus:   (p={}) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  chev:   (p={}) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>,
  chevR:  (p={}) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>,
  chevL:  (p={}) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>,
  eye:    (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>,
  bell:   (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>,
  user:   (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/></svg>,
  doc:    (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinejoin="round"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/></svg>,
  euro:   (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round"><path d="M19 7a8 8 0 1 0 0 10M4 10h11M4 14h11"/></svg>,
  cam:    (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinejoin="round"><path d="M4 8 H8 L10 6 H14 L16 8 H20 V18 H4 Z"/><circle cx="12" cy="13" r="3.4"/></svg>,
  pen:    (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4l11-11-4-4-11 11z"/><path d="M14 6l4 4"/></svg>,
  trash:  (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>,
  pause:  (p={}) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill={p.c||"currentColor"}><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>,
  arrow:  (p={}) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  filter: (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16l-6 8v7l-4-2v-5z"/></svg>,
  upload: (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg>,
  sig:    (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round"><path d="M3 16c4 0 5-12 8-12s2 12 6 12c2 0 4-1 4-1M3 20h18"/></svg>,
  burger: (p={}) => <svg width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>,
  loc:    (p={}) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>,
  leaf:   (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20c0-9 7-15 16-15 0 9-6 16-15 16M4 20c2-5 5-8 10-10"/></svg>,
  drop:   (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/></svg>,
  cloud:  (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.5 3.5 0 0 1 17.5 18z"/></svg>,
  recycle:(p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 19l-3-5 3-1M4 14l3-6 3 2M14 4l3 5-3 1M17 9l-3 6h4M10 19h4l-2 2zM7 19h3"/></svg>,
  cal:    (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>,
  download:(p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>,
  print:  (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/></svg>,
  chart:  (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6"/></svg>,
  sliders:(p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>,
  inbox:  (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 13l2.5-7h11L20 13v5H4zM4 13h5a3 3 0 0 0 6 0h5"/></svg>,
  building:(p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17M15 8h3a1 1 0 0 1 1 1v12M8 7h2M8 11h2M8 15h2"/></svg>,
  card:   (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>,
  x:      (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>,
  spark:  (p={}) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||"currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>,
};

Object.assign(window, { Mono, Data, Tag, PackTag, Btn, I });
