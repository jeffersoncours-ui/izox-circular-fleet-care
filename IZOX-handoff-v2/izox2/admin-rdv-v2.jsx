
// Admin · Demandes RDV v2 — split view liste 40% + carte 60%
// Hover sur une demande = pin actif sur la carte
// Bouton "Assigner & planifier" = drawer avec planning + carte

const RDV_ROWS = [
  { id:"R-082", d:"JEU 13 · 09:30", c:"Cabify Paris",  i:"AB-123-CD", m:"Mercedes Vito",   p:"Standard", op:"Karim B.", s:"confirmée",  t:"ok",      lat:48.8738, lng:2.3015, adresse:"8 Av. Champs-Élysées, 75008" },
  { id:"R-083", d:"JEU 13 · 14:00", c:"LeasePlan FR",  i:"OP-111-QR", m:"Renault Trafic",  p:"Standard", op:"Sofia T.", s:"en_attente", t:"warn",    lat:48.8540, lng:2.3200, adresse:"7 Bd Saint-Michel, 75005" },
  { id:"R-084", d:"VEN 14 · 08:00", c:"Heetch Ops",    i:"BC-890-DE", m:"Mercedes Class S",p:"VTC",      op:"Karim B.", s:"confirmée",  t:"ok",      lat:48.8676, lng:2.3636, adresse:"17 Bd Richard-Lenoir, 75011" },
  { id:"R-085", d:"VEN 14 · 11:30", c:"Bolt France",   i:"FR-987-XK", m:"Tesla Model 3",   p:"VTC",      op:"Yann L.", s:"en_attente", t:"warn",    lat:48.8576, lng:2.3736, adresse:"3 Pl. de la République, 75011" },
  { id:"R-086", d:"LUN 17 · 09:00", c:"Hertz CDG",     i:"WX-333-YZ", m:"Range Rover Sport",p:"Standard",op:"—",       s:"refusée",   t:"danger",  lat:48.8484, lng:2.4397, adresse:"12 Av. du Trône, 75012" },
  { id:"R-087", d:"LUN 17 · 14:00", c:"Cabify Paris",  i:"DE-234-FG", m:"Tesla Model 3",   p:"VTC",      op:"Sofia T.", s:"confirmée",  t:"ok",      lat:48.8718, lng:2.3315, adresse:"5 Pl. de l'Opéra, 75009" },
  { id:"R-088", d:"MAR 18 · 10:00", c:"LeasePlan FR",  i:"ST-222-UV", m:"Renault Trafic",  p:"Standard", op:"—",       s:"en_attente", t:"warn",    lat:48.8404, lng:2.3215, adresse:"22 Bd Montparnasse, 75014" },
];

// Couleurs status pour les pins map
const PIN_TONE = { confirmée:"#1F8A5B", en_attente:"#C7811E", refusée:"#C8412F" };

// Minimap Leaflet (vue RDV)
const RdvMap = ({ rows, hoveredId, clickedId }) => {
  const containerRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const markersRef = React.useRef({});

  const buildIcon = (row, active) => {
    const c = PIN_TONE[row.s] || "#6B7280";
    const scale = active ? 1.3 : 1;
    const sz = Math.round(32 * scale);
    return window.L && window.L.divIcon({
      className: "",
      html: `<div style="width:${sz}px;height:${sz}px;background:${c};border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px ${active?'12':'6'}px ${c}55;display:flex;align-items:center;justify-content:center;transition:all .2s">
        <span style="color:#fff;font-size:${active?'11':'9'}px;font-weight:700;font-family:system-ui">${row.id.split('-')[1]}</span>
      </div>`,
      iconSize: [sz, sz], iconAnchor: [sz/2, sz/2], popupAnchor: [0, -sz/2],
    });
  };

  React.useEffect(() => {
    if (!containerRef.current || !window.L) return;
    if (!mapRef.current) {
      mapRef.current = window.L.map(containerRef.current, { zoomControl: true, attributionControl: false })
        .setView([48.858, 2.347], 12);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 })
        .addTo(mapRef.current);
    }

    // Construire/mettre à jour les markers
    rows.forEach(row => {
      const active = row.id === hoveredId || row.id === clickedId;
      if (markersRef.current[row.id]) {
        try { mapRef.current.removeLayer(markersRef.current[row.id]); } catch(e) {}
      }
      const icon = buildIcon(row, active);
      if (!icon) return;
      const mk = window.L.marker([row.lat, row.lng], { icon })
        .addTo(mapRef.current);
      mk.bindPopup(`
        <div style="font-family:system-ui;padding:2px 0;min-width:150px">
          <div style="font-weight:700;font-size:12px">${row.i}</div>
          <div style="font-size:11px;color:#6B7280;margin-bottom:2px">${row.c}</div>
          <div style="font-size:11px;color:#6B7280">${row.d} · ${row.p}</div>
        </div>
      `, { maxWidth: 180 });
      if (active) mk.openPopup();
      markersRef.current[row.id] = mk;
    });

    if (hoveredId || clickedId) {
      const activeRow = rows.find(r => r.id === (hoveredId || clickedId));
      if (activeRow) mapRef.current.setView([activeRow.lat, activeRow.lng], 14, { animate: true });
    }
  }, [hoveredId, clickedId]);

  React.useEffect(() => {
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      {!window.L && (
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:TOK.panel, flexDirection:"column", gap:8 }}>
          <I.loc s={24} c={TOK.ink30}/>
          <Mono size={11} color={TOK.ink30}>Chargement de la carte…</Mono>
        </div>
      )}
    </div>
  );
};

// Drawer "Assigner & planifier"
const AssignDrawer = ({ row, onClose }) => {
  const [step, setStep] = React.useState(1);
  const [selOp, setSelOp] = React.useState(null);
  const [selSlot, setSelSlot] = React.useState(null);

  if (!row) return null;

  const SLOTS_DISP = {
    "Karim B.": [
      { day:"JEU 13", period:"Matin",      time:"08:00", free:false },
      { day:"JEU 13", period:"Matin",      time:"10:00", free:false },
      { day:"JEU 13", period:"Après-midi", time:"14:00", free:true  },
      { day:"JEU 13", period:"Après-midi", time:"15:30", free:true  },
      { day:"VEN 14", period:"Matin",      time:"09:00", free:true  },
    ],
    "Sofia T.": [
      { day:"JEU 13", period:"Matin",      time:"08:00", free:false },
      { day:"JEU 13", period:"Après-midi", time:"14:00", free:true  },
      { day:"VEN 14", period:"Matin",      time:"08:30", free:true  },
      { day:"VEN 14", period:"Après-midi", time:"14:00", free:true  },
    ],
    "Yann L.": [
      { day:"JEU 13", period:"Matin",      time:"09:30", free:false },
      { day:"JEU 13", period:"Après-midi", time:"14:30", free:true  },
      { day:"VEN 14", period:"Matin",      time:"08:00", free:true  },
    ],
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(17,24,39,.45)", display: "flex", justifyContent: "flex-end",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: 520, height: "100%", background: TOK.surface,
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "-8px 0 40px rgba(17,24,39,.18)",
      }}>
        {/* Drawer header */}
        <div style={{
          padding: "18px 22px", borderBottom: `1px solid ${TOK.line}`,
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          <div>
            <Mono size={9} color={TOK.brand} style={{ marginBottom: 4, display:"block" }}>Assigner & Planifier · #{row.id}</Mono>
            <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>
              {row.i} <span style={{ color: TOK.brand }}>· {row.m}</span>
            </div>
            <div style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink50, marginTop: 3 }}>
              {row.c} · Pack {row.p} · Demande {row.d}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: TOK.panel, border: `1px solid ${TOK.line}`, borderRadius: TOK.r2,
            padding: 6, cursor: "pointer", display: "inline-flex",
          }}><I.x s={14} /></button>
        </div>

        {/* Stepper mini */}
        <div style={{ padding: "14px 22px", borderBottom: `1px solid ${TOK.line}`, display:"flex", gap:0 }}>
          {["Choisir opérateur", "Choisir créneau", "Confirmer"].map((s, i) => {
            const done = i + 1 < step, on = i + 1 === step;
            return (
              <React.Fragment key={s}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{
                    width:22, height:22, borderRadius:4, display:"inline-flex", alignItems:"center", justifyContent:"center",
                    background: done ? TOK.ok : on ? TOK.brand : TOK.panel,
                    color: (done||on) ? "#fff" : TOK.ink50,
                    fontFamily: TOK.mono, fontSize:10, fontWeight:700,
                  }}>{done ? "✓" : i+1}</span>
                  <span style={{ fontFamily:TOK.body, fontSize:11, color: on ? TOK.ink : TOK.ink50, fontWeight: on?600:400 }}>{s}</span>
                </div>
                {i < 2 && <div style={{ flex:1, height:1, background:TOK.line, margin:"0 10px", alignSelf:"center", minWidth:16 }}/>}
              </React.Fragment>
            );
          })}
        </div>

        {/* Corps drawer */}
        <div style={{ flex:1, overflowY:"auto", padding:22 }}>
          {step === 1 && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <Mono size={10} style={{ marginBottom:4, display:"block" }}>Sélectionner l'opérateur</Mono>
              {Object.entries(OPERATORS).map(([name, op]) => (
                <button key={name} onClick={() => setSelOp(name)} style={{
                  display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                  background: selOp === name ? op.bg : TOK.paper,
                  border: `1.5px solid ${selOp === name ? op.color : TOK.line}`,
                  borderRadius:TOK.r4, cursor:"pointer", textAlign:"left",
                }}>
                  <div style={{
                    width:38, height:38, borderRadius:999, background:op.color, color:"#fff",
                    display:"inline-flex", alignItems:"center", justifyContent:"center",
                    fontFamily:TOK.body, fontSize:13, fontWeight:700,
                  }}>{op.initials}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:TOK.head, fontWeight:600, fontSize:14, color:TOK.ink }}>{name}</div>
                    <Mono size={9} color={TOK.ink50}>Opérateur terrain · {getLoad(name).filled}/{getLoad(name).max} créneaux</Mono>
                  </div>
                  {/* Barre charge mini */}
                  <div style={{ width:60 }}>
                    <div style={{ height:4, background:TOK.line, borderRadius:999, overflow:"hidden" }}>
                      <div style={{ width:`${(getLoad(name).filled/6)*100}%`, height:"100%", background:op.color }}/>
                    </div>
                  </div>
                  {selOp === name && <I.check s={16} c={op.color}/>}
                </button>
              ))}
            </div>
          )}

          {step === 2 && selOp && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <Mono size={10} style={{ marginBottom:4, display:"block" }}>Créneaux disponibles · {selOp}</Mono>
              {(SLOTS_DISP[selOp] || []).map((sl, i) => (
                <button key={i} onClick={() => sl.free && setSelSlot(sl)} style={{
                  display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
                  background: !sl.free ? TOK.panel : selSlot === sl ? OPERATORS[selOp].bg : TOK.paper,
                  border: `1.5px solid ${selSlot === sl ? OPERATORS[selOp].color : TOK.line}`,
                  borderRadius:TOK.r4, cursor: sl.free ? "pointer" : "not-allowed",
                  opacity: sl.free ? 1 : 0.55,
                }}>
                  <div style={{
                    width:3, height:28, borderRadius:2,
                    background: sl.free ? OPERATORS[selOp].color : TOK.rule,
                  }}/>
                  <div style={{ flex:1, textAlign:"left" }}>
                    <span style={{ fontFamily:TOK.head, fontWeight:600, fontSize:13 }}>{sl.day} · {sl.time}</span>
                    <span style={{ fontFamily:TOK.body, fontSize:11, color:TOK.ink50, marginLeft:8 }}>{sl.period}</span>
                  </div>
                  {!sl.free && <Tag tone="neutral" style={{ fontSize:10 }}>Occupé</Tag>}
                  {sl.free && selSlot === sl && <I.check s={14} c={OPERATORS[selOp].color}/>}
                  {sl.free && selSlot !== sl && <Tag tone="ok" style={{ fontSize:10 }}>Libre</Tag>}
                </button>
              ))}
            </div>
          )}

          {step === 3 && selOp && selSlot && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ background:TOK.ok + "15", border:`1px solid ${TOK.ok}33`, borderRadius:TOK.r4, padding:16 }}>
                <Mono size={10} color={TOK.ok} style={{ marginBottom:8, display:"block" }}>Récapitulatif de la planification</Mono>
                {[
                  ["Véhicule", row.i + " · " + row.m],
                  ["Client", row.c],
                  ["Pack", row.p],
                  ["Opérateur", selOp],
                  ["Date & heure", `${selSlot.day} · ${selSlot.time}`],
                  ["Période", selSlot.period],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderTop:`1px dashed ${TOK.line}` }}>
                    <Mono size={10} color={TOK.ink50}>{k}</Mono>
                    <span style={{ fontFamily:TOK.body, fontSize:12, fontWeight:600 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ background:TOK.warnL, border:`1px solid ${TOK.warn}33`, borderRadius:TOK.r4, padding:12 }}>
                <div style={{ fontFamily:TOK.body, fontSize:12, color:TOK.ink70 }}>
                  Une notification sera envoyée au client et à l'opérateur une fois confirmé.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 22px", borderTop:`1px solid ${TOK.line}`, display:"flex", gap:10, justifyContent:"space-between" }}>
          {step > 1 ? (
            <Btn kind="ghost" icon={<I.chevL s={12}/>} onClick={() => setStep(s => s-1)}>Précédent</Btn>
          ) : (
            <Btn kind="ghost" onClick={onClose}>Annuler</Btn>
          )}
          {step < 3 ? (
            <Btn kind="primary" icon={<I.arrow s={12}/>}
              state={(step===1 && !selOp)||(step===2 && !selSlot) ? "disabled" : "default"}
              onClick={() => setStep(s => s+1)}>Continuer</Btn>
          ) : (
            <Btn kind="primary" icon={<I.check s={12}/>} onClick={onClose}>Confirmer l'assignation</Btn>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── PAGE PRINCIPALE RDV V2 ──────────────────────────────────────────────────
const A_RDV_V2 = () => {
  const [hoveredId, setHoveredId] = React.useState(null);
  const [clickedId, setClickedId] = React.useState(null);
  const [assignRow, setAssignRow] = React.useState(null);
  const [filterStatus, setFilterStatus] = React.useState("toutes");

  const rows = filterStatus === "toutes" ? RDV_ROWS
    : RDV_ROWS.filter(r => r.s === filterStatus);

  return (
    <Page>
      {assignRow && <AssignDrawer row={assignRow} onClose={() => setAssignRow(null)} />}
      <Sidebar items={[...NAV_ADMIN]} active="Demandes RDV" role="Admin" user={{ name:"Admin Ops", org:"IZOX · Paris" }} />
      <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Topbar */}
        <Topbar crumbs={["Admin","Demandes RDV"]} title="Demandes de RDV"
          sub="2 en attente · 12 confirmés cette semaine"
          right={<>
            <Search placeholder="Client, immatriculation…" style={{ minWidth:240 }}/>
            <Btn kind="ghost" size="sm" icon={<I.filter s={12}/>}>Filtres</Btn>
            <Btn kind="ghost" size="sm" icon={<I.cal s={12}/>}>Planning →</Btn>
          </>}
        />

        {/* Filtres + stats */}
        <div style={{
          padding:"10px 28px", borderBottom:`1px solid ${TOK.line}`,
          display:"flex", gap:8, alignItems:"center", background:TOK.surface,
        }}>
          {[
            { key:"toutes",     label:`Toutes · ${RDV_ROWS.length}`,    tone:"neutral" },
            { key:"en_attente", label:`En attente · ${RDV_ROWS.filter(r=>r.s==="en_attente").length}`, tone:"warn" },
            { key:"confirmée",  label:`Confirmées · ${RDV_ROWS.filter(r=>r.s==="confirmée").length}`,  tone:"ok"   },
            { key:"refusée",    label:`Refusées · ${RDV_ROWS.filter(r=>r.s==="refusée").length}`,      tone:"danger"},
          ].map(f => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)} style={{
              background:"transparent", border:"none", padding:0, cursor:"pointer",
            }}>
              <Tag tone={filterStatus === f.key ? f.tone : "neutral"} dot={filterStatus===f.key}
                style={{ cursor:"pointer", fontWeight: filterStatus===f.key ? 700:500 }}>
                {f.label}
              </Tag>
            </button>
          ))}
          <div style={{ flex:1 }}/>
          <Mono size={9} color={TOK.ink50}>Hover sur une ligne pour voir le pin sur la carte</Mono>
        </div>

        {/* Split view */}
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

          {/* Liste 40% */}
          <div style={{ flex:"0 0 40%", display:"flex", flexDirection:"column", overflow:"hidden", borderRight:`1px solid ${TOK.line}` }}>
            <div style={{ flex:1, overflowY:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:TOK.body, fontSize:12 }}>
                <thead>
                  <tr style={{ background:TOK.panel, position:"sticky", top:0, zIndex:1 }}>
                    {["Date","Client","Immat.","Pack","Statut",""].map((h,i) => (
                      <th key={i} style={{
                        textAlign: i===5?"center":"left", padding:"10px 12px",
                        fontFamily:TOK.head, fontSize:9, letterSpacing:".14em",
                        textTransform:"uppercase", color:TOK.ink50, fontWeight:600,
                        borderBottom:`1px solid ${TOK.line}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const active = hoveredId === r.id || clickedId === r.id;
                    return (
                      <tr key={r.id}
                        onMouseEnter={() => setHoveredId(r.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => setClickedId(clickedId === r.id ? null : r.id)}
                        style={{
                          borderTop: i ? `1px solid ${TOK.line}` : "none",
                          background: active ? TOK.brandL : "transparent",
                          cursor:"pointer", transition:"background .1s",
                          borderLeft: active ? `3px solid ${TOK.brand}` : "3px solid transparent",
                        }}>
                        <td style={{ padding:"11px 12px", fontFamily:TOK.mono, fontSize:11, fontWeight:600 }}>{r.d}</td>
                        <td style={{ padding:"11px 12px", color:TOK.ink70, fontWeight:500, maxWidth:100, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.c}</td>
                        <td style={{ padding:"11px 12px" }}><Data size={11} weight={700}>{r.i}</Data></td>
                        <td style={{ padding:"11px 12px" }}><PackTag pack={r.p} style={{ fontSize:10, padding:"2px 6px" }}/></td>
                        <td style={{ padding:"11px 12px" }}><Tag tone={r.t} dot style={{ fontSize:10 }}>{r.s}</Tag></td>
                        <td style={{ padding:"11px 8px", textAlign:"center" }}>
                          {r.s === "en_attente" ? (
                            <button onClick={e => { e.stopPropagation(); setAssignRow(r); }} style={{
                              background:TOK.brand, color:"#fff", border:"none",
                              borderRadius:TOK.r2, padding:"5px 8px", cursor:"pointer",
                              fontFamily:TOK.body, fontSize:10, fontWeight:600,
                              display:"inline-flex", gap:4, alignItems:"center",
                              whiteSpace:"nowrap",
                            }}>
                              <I.cal s={10} c="#fff"/>Assigner
                            </button>
                          ) : (
                            <button style={{ background:"transparent", border:`1px solid ${TOK.line}`, color:TOK.ink50, borderRadius:TOK.r2, padding:5, cursor:"pointer", display:"inline-flex" }}><I.eye s={12}/></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer liste */}
            <div style={{ padding:"10px 16px", borderTop:`1px solid ${TOK.line}`, background:TOK.surface }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <Mono size={9} color={TOK.ink50}>{rows.length} demande{rows.length>1?"s":""} affichée{rows.length>1?"s":""}</Mono>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  {hoveredId && (
                    <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                      <div style={{ width:6, height:6, borderRadius:999, background:PIN_TONE[rows.find(r=>r.id===hoveredId)?.s||""] }}/>
                      <Mono size={9} color={TOK.ink50}>#{hoveredId} survolé</Mono>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Carte 60% */}
          <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
            <RdvMap rows={rows} hoveredId={hoveredId} clickedId={clickedId} />
            {/* Légende */}
            <div style={{
              position:"absolute", top:12, left:12, zIndex:500,
              background:"rgba(255,255,255,.95)", border:`1px solid ${TOK.line}`,
              borderRadius:TOK.r4, padding:"8px 12px", boxShadow:TOK.shadowMd,
              display:"flex", flexDirection:"column", gap:5,
            }}>
              <Mono size={9} color={TOK.ink50} style={{ marginBottom:2 }}>Légende</Mono>
              {[
                { c:"#1F8A5B", l:"Confirmée" },
                { c:"#C7811E", l:"En attente" },
                { c:"#C8412F", l:"Refusée" },
              ].map(({ c,l }) => (
                <div key={l} style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:10, height:10, borderRadius:999, background:c }}/>
                  <Mono size={9} color={TOK.ink70}>{l}</Mono>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </Page>
  );
};

Object.assign(window, { A_RDV_V2, AssignDrawer });
