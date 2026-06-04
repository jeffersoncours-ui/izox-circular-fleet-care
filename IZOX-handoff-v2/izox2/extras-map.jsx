
// Extras · Carte géo — legend drawer gauche + panel droit + 4 états

const _KM = { "Karim B.": 28.4, "Sofia T.": 19.7, "Yann L.": 8.2 };

// ─── LÉGENDE GAUCHE ──────────────────────────────────────────────────────────
const LegendDrawer = ({ selectedOp, setSelectedOp }) => (
  <div style={{
    width: 220, flexShrink: 0,
    background: TOK.surface,
    borderRight: `1px solid ${TOK.line}`,
    display: "flex", flexDirection: "column",
    overflow: "hidden",
  }}>
    {/* Titre */}
    <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${TOK.line}` }}>
      <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 14, letterSpacing: "-0.2px", marginBottom: 2 }}>Légende</div>
      <Mono size={9} color={TOK.ink50}>Lundi 9 Juin 2026</Mono>
    </div>

    {/* Opérateurs */}
    <div style={{ padding: "10px 10px", borderBottom: `1px solid ${TOK.line}` }}>
      <Mono size={9} color={TOK.ink30} style={{ display: "block", marginBottom: 8, paddingLeft: 4 }}>OPÉRATEURS</Mono>
      {Object.entries(OPERATORS).map(([name, op]) => {
        const interventions = TODAY_INTERVENTIONS[name] || [];
        const done = interventions.filter(i => i.t === "ok").length;
        const on = selectedOp === name;
        return (
          <button key={name} onClick={() => setSelectedOp(name)} style={{
            display: "flex", alignItems: "center", gap: 9, width: "100%",
            padding: "8px 8px", borderRadius: TOK.r2, cursor: "pointer", textAlign: "left",
            background: on ? op.bg : "transparent",
            border: `1px solid ${on ? op.border : "transparent"}`,
            marginBottom: 4,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: op.color, flexShrink: 0 }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: TOK.body, fontSize: 12, fontWeight: on ? 700 : 500, color: TOK.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
              <Mono size={9} color={TOK.ink50}>{done}/{interventions.length} terminé{done > 1 ? "s" : ""}</Mono>
            </div>
            <div style={{ fontFamily: TOK.mono, fontSize: 10, fontWeight: 600, color: op.color }}>{_KM[name]}km</div>
          </button>
        );
      })}
    </div>

    {/* Statuts des pins */}
    <div style={{ padding: "10px 10px", borderBottom: `1px solid ${TOK.line}` }}>
      <Mono size={9} color={TOK.ink30} style={{ display: "block", marginBottom: 8, paddingLeft: 4 }}>STATUTS PINS</Mono>
      {[
        { c: TOK.ok,      l: "Terminée",  n: "✓" },
        { c: TOK.warn,    l: "En cours",  n: "→" },
        { c: TOK.brand,   l: "Planifiée", n: "·" },
      ].map(({ c, l, n }) => (
        <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "0 4px" }}>
          <div style={{
            width: 22, height: 22, borderRadius: "50% 50% 50% 2px", transform: "rotate(-45deg)",
            background: c, display: "inline-flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 2px 6px ${c}55`, flexShrink: 0,
          }}>
            <span style={{ transform: "rotate(45deg)", color: "#fff", fontSize: 8, fontWeight: 700 }}>{n}</span>
          </div>
          <Mono size={10} color={TOK.ink70}>{l}</Mono>
        </div>
      ))}
    </div>

    {/* Polylines */}
    <div style={{ padding: "10px 14px" }}>
      <Mono size={9} color={TOK.ink30} style={{ display: "block", marginBottom: 8 }}>ITINÉRAIRES</Mono>
      {Object.entries(OPERATORS).map(([name, op]) => (
        <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <svg width={30} height={6}>
            <line x1="0" y1="3" x2="30" y2="3" stroke={op.color} strokeWidth="2.5" strokeDasharray="5,4"/>
          </svg>
          <Mono size={9} color={TOK.ink70}>{name}</Mono>
        </div>
      ))}
    </div>
  </div>
);

// ─── PANEL DROIT INTERVENTIONS + VALIDER ─────────────────────────────────────
const InterventionsPanel = ({ selectedOp, items, isEmpty, isError, onValidate, validated }) => {
  const op = OPERATORS[selectedOp];
  const [dragIdx, setDragIdx] = React.useState(null);
  const [list, setList] = React.useState(items);

  React.useEffect(() => { setList(items); }, [selectedOp]);

  const handleDrop = (targetIdx) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const arr = [...list];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(targetIdx, 0, moved);
    setList(arr);
    setDragIdx(null);
  };

  return (
    <div style={{
      width: 290, flexShrink: 0,
      background: TOK.surface,
      borderLeft: `1px solid ${TOK.line}`,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header panel */}
      <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${TOK.line}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 14 }}>Interventions du jour</div>
          {!isEmpty && <Tag tone="warn" dot style={{ fontSize: 10 }}>9 Juin 2026</Tag>}
        </div>
        {/* Sélecteur opérateur mini */}
        <div style={{ display: "flex", gap: 4 }}>
          {Object.entries(OPERATORS).map(([name, o]) => (
            <div key={name} style={{
              flex: 1, padding: "5px 3px", borderRadius: TOK.r2, textAlign: "center",
              background: selectedOp === name ? o.bg : "transparent",
              border: `1px solid ${selectedOp === name ? o.border : TOK.line}`,
            }}>
              <div style={{ width: 18, height: 18, borderRadius: 999, background: o.color, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, fontFamily: TOK.body, margin: "0 auto" }}>{o.initials}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div style={{ flex: 1, overflowY: "auto", padding: isEmpty ? 0 : "8px 8px" }}>
        {isEmpty ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 24, gap: 10 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${TOK.brand}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <I.cal s={22} c={TOK.brand}/>
            </div>
            <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 14, textAlign: "center" }}>Aucune intervention</div>
            <div style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink50, textAlign: "center", lineHeight: 1.5 }}>Aucune tournée planifiée pour {selectedOp} aujourd'hui.</div>
            <Btn kind="primary" size="sm" icon={<I.plus s={11}/>}>Planifier</Btn>
          </div>
        ) : isError ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 24, gap: 10 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${TOK.danger}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <I.x s={22} c={TOK.danger}/>
            </div>
            <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 14, textAlign: "center", color: TOK.danger }}>Erreur de chargement</div>
            <div style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink50, textAlign: "center" }}>Impossible de charger les interventions.</div>
            <Btn kind="ghost" size="sm" icon={<I.arrow s={11}/>}>Réessayer</Btn>
          </div>
        ) : (
          list.map((item, idx) => (
            <div key={item.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(idx)}
              style={{
                display: "flex", gap: 8, alignItems: "center",
                padding: "8px 8px", marginBottom: 4,
                background: dragIdx === idx ? `${op.color}12` : TOK.paper,
                border: `1px solid ${dragIdx === idx ? op.color : TOK.line}`,
                borderLeft: `3px solid ${op.color}`,
                borderRadius: TOK.r4, cursor: "grab",
                opacity: dragIdx === idx ? 0.6 : 1,
                transition: "all .12s",
              }}
            >
              <div style={{ width: 20, height: 20, borderRadius: 999, background: op.color, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: TOK.mono, fontSize: 9, fontWeight: 700, flex: "0 0 20px" }}>{idx + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Data size={11} weight={700}>{item.immat}</Data>
                  <Mono size={9} color={TOK.ink30}>{item.time}</Mono>
                </div>
                <div style={{ fontFamily: TOK.body, fontSize: 10, color: TOK.ink50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.adresse}</div>
              </div>
              <div style={{ color: TOK.ink30, flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <circle cx="9" cy="6" r="1.5" fill="currentColor"/><circle cx="9" cy="12" r="1.5" fill="currentColor"/><circle cx="9" cy="18" r="1.5" fill="currentColor"/>
                  <circle cx="15" cy="6" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/><circle cx="15" cy="18" r="1.5" fill="currentColor"/>
                </svg>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer km + valider */}
      {!isEmpty && !isError && (
        <div style={{ padding: "10px 12px", borderTop: `1px solid ${TOK.line}` }}>
          {Object.entries(OPERATORS).map(([name, o]) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: 999, background: o.color }}/>
                <Mono size={8} color={TOK.ink50}>{name}</Mono>
              </div>
              <Mono size={9} weight={600} color={TOK.ink}>~{_KM[name]} km</Mono>
            </div>
          ))}
          <div style={{ height: 1, background: TOK.line, margin: "6px 0" }}/>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Mono size={9} color={TOK.ink50}>Total estimé</Mono>
            <span style={{ fontFamily: TOK.mono, fontSize: 12, fontWeight: 700, color: TOK.brand }}>~{Object.values(_KM).reduce((a, b) => a + b, 0).toFixed(1)} km</span>
          </div>
          {validated ? (
            <div style={{ background: TOK.okL, border: `1px solid ${TOK.ok}44`, borderRadius: TOK.r4, padding: "8px 12px", display: "flex", alignItems: "center", gap: 6 }}>
              <I.check s={12} c={TOK.ok}/>
              <span style={{ fontFamily: TOK.body, fontSize: 12, fontWeight: 600, color: TOK.ok }}>Tournée validée ✓</span>
            </div>
          ) : (
            <Btn kind="primary" full icon={<I.check s={11}/>} onClick={onValidate}>Valider la tournée</Btn>
          )}
        </div>
      )}
    </div>
  );
};

// ─── FAUSSE CARTE (pour états sans Leaflet) ──────────────────────────────────
const MockMap = ({ isEmpty }) => (
  <div style={{ flex: 1, position: "relative", background: "#E8F0E9", overflow: "hidden" }}>
    {/* Grille de rues simulée */}
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
      {[100,200,300,400,500,600,700,800,900,1000,1100].map(x => <line key={x} x1={x} y1="0" x2={x} y2="800" stroke="#9CA3AF" strokeWidth="1"/>)}
      {[100,200,300,400,500,600,700].map(y => <line key={y} x1="0" y1={y} x2="1200" y2={y} stroke="#9CA3AF" strokeWidth="1"/>)}
      {[50,150,250,350,450,650,750].map(y => <line key={`h${y}`} x1="0" y1={y} x2="1200" y2={y} stroke="#9CA3AF" strokeWidth="0.5"/>)}
    </svg>
    {!isEmpty && (
      <>
        {/* Polylines simulées */}
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
          <polyline points="200,150 380,220 520,310 650,180" fill="none" stroke={OPERATORS["Karim B."].color} strokeWidth="2.5" strokeDasharray="7,5" opacity="0.8"/>
          <polyline points="300,350 480,260 580,400 720,320" fill="none" stroke={OPERATORS["Sofia T."].color} strokeWidth="2.5" strokeDasharray="7,5" opacity="0.8"/>
          <polyline points="800,200 900,350 1000,280" fill="none" stroke={OPERATORS["Yann L."].color} strokeWidth="2.5" strokeDasharray="7,5" opacity="0.8"/>
        </svg>
        {/* Pins */}
        {[
          { x:200, y:150, c:OPERATORS["Karim B."].color, n:1 },
          { x:380, y:220, c:OPERATORS["Karim B."].color, n:2 },
          { x:520, y:310, c:OPERATORS["Karim B."].color, n:3 },
          { x:300, y:350, c:OPERATORS["Sofia T."].color, n:1 },
          { x:480, y:260, c:OPERATORS["Sofia T."].color, n:2 },
          { x:800, y:200, c:OPERATORS["Yann L."].color, n:1 },
          { x:900, y:350, c:OPERATORS["Yann L."].color, n:2 },
        ].map(({ x, y, c, n }) => (
          <div key={`${x}-${y}`} style={{
            position: "absolute", left: x - 14, top: y - 28,
            width: 28, height: 28,
            background: c, border: "2.5px solid #fff",
            borderRadius: "50% 50% 50% 2px", transform: "rotate(-45deg)",
            boxShadow: `0 2px 8px ${c}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ transform: "rotate(45deg)", color: "#fff", fontSize: 10, fontWeight: 700, fontFamily: "system-ui" }}>{n}</span>
          </div>
        ))}
      </>
    )}
    {isEmpty && (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: `${TOK.brand}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <I.loc s={26} c={TOK.brand}/>
        </div>
        <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 16 }}>Aucune intervention aujourd'hui</div>
        <div style={{ fontFamily: TOK.body, fontSize: 13, color: TOK.ink50 }}>Planifiez des interventions pour voir la carte.</div>
        <Btn kind="primary" size="sm" icon={<I.plus s={11}/>}>Planifier une intervention</Btn>
      </div>
    )}
    {/* Watermark OpenStreetMap */}
    <div style={{ position: "absolute", bottom: 4, right: 8 }}>
      <Mono size={8} color={TOK.ink30}>© OpenStreetMap · Carte simulée</Mono>
    </div>
  </div>
);

// ─── PAGE CARTE COMPLÈTE ─────────────────────────────────────────────────────
const MapFull = ({ isEmpty = false, isError = false, isDrag = false }) => {
  const [selOp, setSelOp] = React.useState("Karim B.");
  const [validated, setValidated] = React.useState(false);
  const navItems = [...NAV_ADMIN, { label: "Planning", icon: <I.cal s={15}/> }];
  const items = isEmpty ? [] : TODAY_INTERVENTIONS[selOp] || [];

  return (
    <Page>
      <Sidebar items={navItems} active="Planning" role="Admin" user={{ name: "Admin Ops", org: "IZOX · Paris" }}/>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px", borderBottom: `1px solid ${TOK.line}`,
          background: isError ? `${TOK.danger}08` : TOK.surface, flexShrink: 0, gap: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Btn kind="ghost" size="sm" icon={<I.chevL s={12}/>} style={{ padding: "6px 10px" }}>Planning</Btn>
            <div style={{ width: 1, height: 18, background: TOK.line }}/>
            <I.loc s={14} c={isError ? TOK.danger : TOK.brand}/>
            <span style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px" }}>Carte · Optimisation tournées</span>
            {isError && <Tag tone="danger" dot>Erreur de chargement</Tag>}
            {isDrag && <Tag tone="warn" dot>Réorganisation en cours…</Tag>}
            {!isError && !isDrag && !isEmpty && <Tag tone="warn" dot>Lundi 9 Juin 2026</Tag>}
          </div>
          <Btn kind="ghost" size="sm" icon={<I.download s={12}/>}>Exporter</Btn>
        </div>
        {/* Corps : legend gauche + carte + panel droit */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <LegendDrawer selectedOp={selOp} setSelectedOp={setSelOp}/>
          {isError ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: TOK.paper, gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: `${TOK.danger}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <I.x s={26} c={TOK.danger}/>
              </div>
              <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 18, color: TOK.danger }}>Carte indisponible</div>
              <div style={{ fontFamily: TOK.body, fontSize: 13, color: TOK.ink50 }}>Impossible de charger les tuiles. Vérifiez la connexion.</div>
              <Btn kind="ghost" size="sm" icon={<I.arrow s={11}/>}>Réessayer</Btn>
            </div>
          ) : (
            <MockMap isEmpty={isEmpty}/>
          )}
          <InterventionsPanel selectedOp={selOp} items={items} isEmpty={isEmpty} isError={false} onValidate={() => setValidated(true)} validated={validated}/>
        </div>
      </main>
    </Page>
  );
};

const Map_Loaded   = () => <MapFull/>;
const Map_Empty    = () => <MapFull isEmpty/>;
const Map_Error    = () => <MapFull isError/>;
const Map_Drag     = () => <MapFull isDrag/>;

Object.assign(window, { Map_Loaded, Map_Empty, Map_Error, Map_Drag, LegendDrawer, InterventionsPanel, MockMap });
