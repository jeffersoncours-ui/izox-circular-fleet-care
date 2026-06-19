// Deliverable boards: Tailwind config snippet + Before/After comparison.

const TailwindBoard = () => {
  const code = `// tailwind.config.js — IZOX design tokens
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1B4332',  // primary — vert forêt IZOX
          hover:   '#143D2E',  // -10% lum
          active:  '#0F2F23',  // -20% lum
          tint:    '#E7EFEA',  // nav/badge bg
        },
        accent:  { DEFAULT: '#1F8A5B', tint: '#DCEEE4' }, // vert moyen actif
        ink:     { DEFAULT: '#111827', 70: '#374151', 50: '#6B7280', 30: '#9CA3AF' },
        paper:   '#F9FAFB',
        surface: '#FFFFFF',
        panel:   '#F3F4F6',
        line:    '#E5E7EB',
        ok:      '#1F8A5B', warn: '#C7811E', danger: '#C8412F', info: '#2A6FDB',
      },
      fontFamily: {
        head: ['Outfit', 'system-ui', 'sans-serif'],     // H1–H3, display
        sans: ['Inter', 'system-ui', 'sans-serif'],       // body, UI, labels
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'], // data only
      },
      fontSize: {
        h1: ['32px', { lineHeight: '40px', letterSpacing: '-0.5px', fontWeight: '700' }],
        h2: ['24px', { lineHeight: '32px', letterSpacing: '-0.5px', fontWeight: '700' }],
        h3: ['18px', { lineHeight: '28px', letterSpacing: '-0.5px', fontWeight: '700' }],
        body: ['13px', { lineHeight: '22px' }],
        data: ['12px', { lineHeight: '18px' }],
      },
      borderRadius: { card: '10px', control: '8px', chip: '4px' },
      boxShadow: {
        card: '0 1px 2px rgba(17,24,39,0.04)',
        pop:  '0 1px 2px rgba(17,24,39,0.04), 0 12px 30px -20px rgba(17,24,39,0.20)',
      },
      spacing: { card: '20px', section: '24px', stack: '16px' },
    },
  },
};`;
  return (
    <div style={{ width:"100%", height:"100%", boxSizing:"border-box", background: TOK.ink, padding: 28, display:"flex", flexDirection:"column", gap: 16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontFamily: TOK.head, fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing:"-0.5px" }}>tailwind.config.js</span>
        <span style={{ fontFamily: TOK.body, fontSize: 11, fontWeight: 600, color: "#7CC9A5", textTransform:"uppercase", letterSpacing:".08em" }}>Pour Claude Code</span>
      </div>
      <pre style={{
        margin: 0, flex: 1, overflow:"auto",
        background: "#0B1A12", border: "1px solid #1f3b2c", borderRadius: TOK.r6,
        padding: 20, fontFamily: TOK.mono, fontSize: 11.5, lineHeight: 1.65,
        color: "#C7D6CC", whiteSpace: "pre", tabSize: 2,
      }}>{code}</pre>
    </div>
  );
};

// Before/After swatch+type comparison
const Chip = ({ hex, label, old }) => (
  <div style={{ display:"flex", alignItems:"center", gap: 10 }}>
    <span style={{ width: 34, height: 34, borderRadius: TOK.r4, background: hex, border: `1px solid ${TOK.line}`, flex:"0 0 34px" }}/>
    <div style={{ display:"flex", flexDirection:"column", gap: 2 }}>
      <span style={{ fontFamily: TOK.mono, fontSize: 12, color: TOK.ink, fontWeight: 500, textDecoration: old ? "line-through" : "none", opacity: old ? .5 : 1 }}>{hex.toUpperCase()}</span>
      <Mono size={8}>{label}</Mono>
    </div>
  </div>
);

const BeforeAfterBoard = () => (
  <div style={{ width:"100%", height:"100%", boxSizing:"border-box", background: TOK.paper, padding: 32, display:"flex", flexDirection:"column", gap: 22, fontFamily: TOK.body, color: TOK.ink }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
      <div>
        <Mono size={10}>Refactoring</Mono>
        <div style={{ fontFamily: TOK.head, fontSize: 26, fontWeight: 700, letterSpacing:"-0.5px", marginTop: 6 }}>Avant → Après</div>
      </div>
      <Mono size={10} color={TOK.brand}>Couleur · Typo · Spacing</Mono>
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 18 }}>
      {/* BEFORE */}
      <div style={{ background: "#FAF9F6", border: `1px solid ${TOK.line}`, borderRadius: TOK.r6, padding: 22, display:"flex", flexDirection:"column", gap: 16 }}>
        <Mono size={9} color={TOK.danger}>Avant · Valley fintech</Mono>
        <Chip hex="#6E7DFF" label="brand — indigo" old/>
        <Chip hex="#5C8EDA" label="accent — bleu" old/>
        <div style={{ borderTop:`1px dashed ${TOK.line}`, paddingTop: 14 }}>
          <div style={{ fontFamily: TOK.mono, fontSize: 24, fontWeight: 700, letterSpacing:"-0.02em", color:"#0C0E12" }}>44 véhicules</div>
          <div style={{ fontFamily: TOK.mono, fontSize: 11, color:"#6A6E78", marginTop: 6 }}>JetBrains Mono partout · uppercase · radius 4</div>
        </div>
        <div style={{ display:"flex", gap: 8 }}>
          <span style={{ background:"#6E7DFF", color:"#fff", fontFamily: TOK.mono, fontSize: 11, fontWeight: 600, textTransform:"uppercase", letterSpacing:".06em", padding:"9px 13px", borderRadius: 4 }}>Demander RDV</span>
          <span style={{ background:"transparent", color:"#0C0E12", border:`1px solid #E7E4DC`, fontFamily: TOK.mono, fontSize: 11, fontWeight: 600, textTransform:"uppercase", letterSpacing:".06em", padding:"9px 13px", borderRadius: 4 }}>Annuler</span>
        </div>
      </div>

      {/* AFTER */}
      <div style={{ background: TOK.surface, border: `1px solid ${TOK.brand}33`, borderRadius: TOK.r6, padding: 22, display:"flex", flexDirection:"column", gap: 16, boxShadow: TOK.shadowMd }}>
        <Mono size={9} color={TOK.brand}>Après · Confident European</Mono>
        <Chip hex="#1B4332" label="brand — vert forêt"/>
        <Chip hex="#1F8A5B" label="accent — vert moyen"/>
        <div style={{ borderTop:`1px dashed ${TOK.line}`, paddingTop: 14 }}>
          <div style={{ fontFamily: TOK.head, fontSize: 26, fontWeight: 700, letterSpacing:"-0.5px", color: TOK.ink }}>44 véhicules</div>
          <div style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink50, marginTop: 6 }}>Outfit headings · Inter body · mono data · radius 10</div>
        </div>
        <div style={{ display:"flex", gap: 8 }}>
          <Btn kind="primary" size="sm" icon={<I.arrow s={11}/>}>Demander RDV</Btn>
          <Btn kind="ghost" size="sm">Annuler</Btn>
        </div>
      </div>
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap: 12, borderTop:`1px solid ${TOK.line}`, paddingTop: 18 }}>
      {[
        ["Primary", "#6E7DFF", "#1B4332"],
        ["Hover", "#5B68E0", "#143D2E"],
        ["Active", "#4A56C9", "#0F2F23"],
        ["Accent", "#5C8EDA", "#1F8A5B"],
      ].map(([k, a, b]) => (
        <div key={k} style={{ display:"flex", flexDirection:"column", gap: 8 }}>
          <Mono size={9}>{k}</Mono>
          <div style={{ display:"flex", gap: 6, alignItems:"center" }}>
            <span style={{ width: 22, height: 22, borderRadius: TOK.r2, background: a, opacity:.5 }}/>
            <I.arrow s={12} c={TOK.ink30}/>
            <span style={{ width: 22, height: 22, borderRadius: TOK.r2, background: b }}/>
            <Mono size={8} style={{ marginLeft: 2 }}>{b}</Mono>
          </div>
        </div>
      ))}
    </div>
  </div>
);

Object.assign(window, { TailwindBoard, BeforeAfterBoard });
