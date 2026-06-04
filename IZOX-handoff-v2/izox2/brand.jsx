// IZOX logo — wordmark + symbol, brutalist mono interpretation.

const IzoxWord = ({ size = 20, color = TOK.ink, accent = TOK.brand }) => (
  <svg width={size * 4.4} height={size} viewBox="0 0 220 50" fill="none" aria-label="IZOX">
    <rect x="0"  y="0"  width="12" height="50" fill={color}/>
    <path d="M22 0 H78 V12 L42 38 H78 V50 H22 V38 L58 12 H22 Z" fill={color}/>
    <path d="M118 0 a25 25 0 1 0 0.01 0 Z M118 12 a13 13 0 1 1 -0.01 0 Z" fill={color} fillRule="evenodd"/>
    <path d="M150 0 H166 L178 18 L190 0 H206 L186 24 L208 50 H192 L178 32 L164 50 H148 L170 24 Z" fill={color}/>
    <rect x="208" y="40" width="12" height="10" fill={accent}/>
  </svg>
);

const IzoxMark = ({ size = 36, bg = TOK.brand, fg = "#fff" }) => (
  <div style={{
    width: size, height: size, background: bg, color: fg,
    display:"inline-flex", alignItems:"center", justifyContent:"center",
    borderRadius: TOK.r4, flex:"0 0 auto", fontFamily: TOK.head,
    fontWeight: 700, fontSize: size * 0.5, letterSpacing: "-1px",
  }}>iz</div>
);

// Compact brand bar used inside topbars
const BrandBar = ({ size = 18, sublabel }) => (
  <div style={{ display:"flex", alignItems:"center", gap: 10 }}>
    <IzoxMark size={size + 10}/>
    <div style={{ display:"flex", flexDirection:"column", gap: 2 }}>
      <IzoxWord size={size} />
      {sublabel && <Mono size={9} color={TOK.ink50}>{sublabel}</Mono>}
    </div>
  </div>
);

// Brand intro board for the system canvas
const BrandBoard = () => (
  <div style={{
    width:"100%", height:"100%", boxSizing:"border-box",
    background: TOK.paper, padding: 36, color: TOK.ink,
    display:"flex", flexDirection:"column", gap: 22,
    fontFamily: TOK.body,
  }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
      <Mono size={11}>IZOX · Fleet Operating System</Mono>
      <Mono size={11} color={TOK.brand}>v2026.5</Mono>
    </div>

    <div style={{ flex: 1, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <IzoxWord size={64}/>
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 14, borderTop: `1px solid ${TOK.line}`, paddingTop: 14 }}>
      {[
        ["SaaS B2B", "Gestion flottes nettoyage premium"],
        ["Cibles",   "VTC · PME · sociétés de location"],
        ["Personae", "Client · Admin · Commercial · Terrain"],
      ].map(([k,v]) => (
        <div key={k}>
          <Mono size={9}>{k}</Mono>
          <div style={{ fontFamily: TOK.body, fontSize: 13, color: TOK.ink, marginTop: 6, lineHeight: 1.55 }}>{v}</div>
        </div>
      ))}
    </div>
  </div>
);

// Palette swatch board — 1 palette only this time
const Swatch = ({ name, hex, big, fg }) => (
  <div style={{
    background: hex, color: fg || (isDarkHex(hex) ? "#fff" : TOK.ink),
    border: `1px solid ${TOK.line}`,
    padding: big ? "16px 14px" : "10px 12px",
    minHeight: big ? 92 : 60, display:"flex", flexDirection:"column", justifyContent:"space-between",
    borderRadius: TOK.r2,
  }}>
    <Mono size={9} color={(fg || (isDarkHex(hex) ? "rgba(255,255,255,.65)" : TOK.ink50))}>{name}</Mono>
    <Mono size={10} color={(fg || (isDarkHex(hex) ? "rgba(255,255,255,.85)" : TOK.ink))}>{hex.toUpperCase()}</Mono>
  </div>
);

function isDarkHex(c){
  const r=parseInt(c.slice(1,3),16), g=parseInt(c.slice(3,5),16), b=parseInt(c.slice(5,7),16);
  return (r*299 + g*587 + b*114)/1000 < 128;
}

const PaletteBoard = () => (
  <div style={{
    width:"100%", height:"100%", boxSizing:"border-box",
    background: TOK.paper, padding: 28, fontFamily: TOK.body, color: TOK.ink,
    display:"flex", flexDirection:"column", gap: 18,
  }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
      <div>
        <Mono size={10}>Palette · 01</Mono>
        <div style={{ fontFamily: TOK.head, fontSize: 30, marginTop: 6, fontWeight: 700, letterSpacing: "-0.5px" }}>
          Forest &amp; Paper
        </div>
      </div>
      <Mono size={10} color={TOK.brand}>Signature</Mono>
    </div>

    <div style={{ fontSize: 13, color: TOK.ink50, lineHeight: 1.55, maxWidth: 460 }}>
      Vert forêt IZOX (#1B4332) pour l'action et l'identité, vert moyen actif (#1F8A5B)
      pour les confirmations. Surfaces blanches, fond gris ultra clair. Sémantique
      sobre, contraste élevé, aucun gradient.
    </div>

    <Swatch name="brand · primary #1B4332" hex={TOK.brand} big fg="#fff"/>

    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 8 }}>
      <Swatch name="hover" hex={TOK.brandD} fg="#fff"/>
      <Swatch name="active" hex={TOK.brandDD} fg="#fff"/>
      <Swatch name="accent" hex={TOK.accent} fg="#fff"/>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 8 }}>
      <Swatch name="paper" hex={TOK.paper}/>
      <Swatch name="surface" hex={TOK.surface}/>
      <Swatch name="panel" hex={TOK.panel}/>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap: 6 }}>
      <Swatch name="ink" hex={TOK.ink} fg="#fff"/>
      <Swatch name="ink70" hex={TOK.ink70} fg="#fff"/>
      <Swatch name="ink50" hex={TOK.ink50} fg="#fff"/>
      <Swatch name="line" hex={TOK.line}/>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 6, paddingTop: 4, borderTop: `1px dashed ${TOK.line}` }}>
      <Swatch name="ok" hex={TOK.ok} fg="#fff"/>
      <Swatch name="warn" hex={TOK.warn} fg="#fff"/>
      <Swatch name="danger" hex={TOK.danger} fg="#fff"/>
      <Swatch name="info" hex={TOK.info} fg="#fff"/>
    </div>
  </div>
);

Object.assign(window, { IzoxWord, IzoxMark, BrandBar, BrandBoard, PaletteBoard });
