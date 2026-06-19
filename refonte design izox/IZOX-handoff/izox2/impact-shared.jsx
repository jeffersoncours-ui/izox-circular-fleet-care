// Shared impact helpers — metric cards, SVG charts, eco palette.

const ECO = {
  eau:      { key: "eau",      label: "Eau économisée",   unit: "L",     icon: I.drop,    color: "#2A6FDB", soft: "#D5E2F6" },
  pollution:{ key: "pollution",label: "Pollution évitée", unit: "g",     icon: I.leaf,    color: "#1F8A5B", soft: "#DCEEE4" },
  compost:  { key: "compost",  label: "Compost généré",   unit: "kg",    icon: I.recycle, color: "#C7811E", soft: "#F6E8CD" },
  co2:      { key: "co2",      label: "CO₂ évité",        unit: "kg",    icon: I.cloud,   color: "#0F2F23", soft: "#E7EFEA" },
};

// Big hero metric card (client impact)
const MetricCard = ({ eco, value, delta, series, big }) => (
  <div style={{
    background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r6,
    padding: 20, display:"flex", flexDirection:"column", gap: 14,
    boxShadow: TOK.shadow, position:"relative", overflow:"hidden",
  }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, background: eco.soft,
        display:"inline-flex", alignItems:"center", justifyContent:"center",
      }}>{eco.icon({ s: 22, c: eco.color })}</div>
      {delta != null && (
        <span style={{
          display:"inline-flex", alignItems:"center", gap: 4,
          fontFamily: TOK.body, fontSize: 12, fontWeight: 600, color: TOK.ok,
          background: TOK.okL, padding: "3px 8px", borderRadius: 999,
        }}>
          <I.arrow s={11} c={TOK.ok}/> +{delta}%
        </span>
      )}
    </div>
    <div>
      <Mono size={9}>{eco.label}</Mono>
      <div style={{ display:"flex", alignItems:"baseline", gap: 6, marginTop: 8 }}>
        <span style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: big ? 40 : 34, letterSpacing: "-1px", color: TOK.ink, lineHeight: 1 }}>
          {value}
        </span>
        <span style={{ fontFamily: TOK.body, fontSize: 14, color: TOK.ink50, fontWeight: 600 }}>{eco.unit}</span>
      </div>
    </div>
    {series && <Sparkline data={series} color={eco.color}/>}
  </div>
);

// Tiny sparkline
const Sparkline = ({ data, color, h = 34 }) => {
  const max = Math.max(...data), min = Math.min(...data);
  const w = 100, n = data.length;
  const pts = data.map((d, i) => [ (i/(n-1))*w, h - ((d-min)/(max-min||1))*(h-4) - 2 ]);
  const path = pts.map((p,i)=> (i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const area = path + ` L ${w} ${h} L 0 ${h} Z`;
  const gid = "sg" + color.replace("#","");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display:"block" }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={color} stopOpacity="0.18"/>
        <stop offset="1" stopColor={color} stopOpacity="0"/>
      </linearGradient></defs>
      <path d={area} fill={`url(#${gid})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

// Monthly area chart (Recharts-style)
const MonthlyChart = ({ data, labels, color = TOK.accent, height = 220, unit = "L" }) => {
  const w = 720, h = height, padL = 44, padB = 28, padT = 16, padR = 12;
  const max = Math.max(...data) * 1.15;
  const ix = (i) => padL + (i/(data.length-1)) * (w - padL - padR);
  const iy = (v) => h - padB - (v/max) * (h - padB - padT);
  const line = data.map((d,i)=> (i?"L":"M")+ix(i).toFixed(1)+" "+iy(d).toFixed(1)).join(" ");
  const area = line + ` L ${ix(data.length-1)} ${h-padB} L ${ix(0)} ${h-padB} Z`;
  const ticks = 4;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display:"block" }}>
      <defs><linearGradient id="mc" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={color} stopOpacity="0.22"/>
        <stop offset="1" stopColor={color} stopOpacity="0.01"/>
      </linearGradient></defs>
      {/* gridlines + y labels */}
      {Array.from({length: ticks+1}).map((_, i) => {
        const v = (max/ticks)*i, y = iy(v);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w-padR} y2={y} stroke={TOK.line} strokeWidth="1" strokeDasharray={i?"3 4":"0"}/>
            <text x={padL-8} y={y+3} textAnchor="end" fontFamily={TOK.mono} fontSize="9" fill={TOK.ink30}>
              {Math.round(v).toLocaleString("fr-FR")}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#mc)"/>
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      {data.map((d,i)=> (
        <circle key={i} cx={ix(i)} cy={iy(d)} r={i===data.length-1?4:2.5} fill={TOK.surface} stroke={color} strokeWidth="2"/>
      ))}
      {labels.map((l,i)=> (
        <text key={i} x={ix(i)} y={h-8} textAnchor="middle" fontFamily={TOK.body} fontSize="10" fontWeight="500" fill={TOK.ink50}>{l}</text>
      ))}
    </svg>
  );
};

// Filter pill (select-like)
const FilterPill = ({ label, value, icon }) => (
  <button style={{
    display:"inline-flex", alignItems:"center", gap: 8,
    background: TOK.surface, border: `1px solid ${TOK.line}`,
    borderRadius: TOK.r4, padding: "8px 12px", cursor:"pointer",
    fontFamily: TOK.body, fontSize: 13, color: TOK.ink,
  }}>
    {icon && <span style={{ color: TOK.ink50, display:"inline-flex" }}>{icon}</span>}
    <span style={{ color: TOK.ink50 }}>{label}</span>
    <strong style={{ fontWeight: 600 }}>{value}</strong>
    <I.chev s={13} c={TOK.ink50}/>
  </button>
);

Object.assign(window, { ECO, MetricCard, Sparkline, MonthlyChart, FilterPill });
