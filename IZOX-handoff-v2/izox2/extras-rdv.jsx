
// Extras · Demandes RDV — modal assignation rapide + 4 états (empty/loaded/hover/error)

const _RDV_ROWS = [
  { id:"R-082", d:"JEU 13 · 09:30", c:"Cabify Paris",  i:"AB-123-CD", m:"Mercedes Vito",    p:"Standard", op:"Karim B.", s:"confirmée",  t:"ok",      lat:48.8738, lng:2.3015, adresse:"8 Av. Champs-Élysées, 75008" },
  { id:"R-083", d:"JEU 13 · 14:00", c:"LeasePlan FR",  i:"OP-111-QR", m:"Renault Trafic",   p:"Standard", op:"—",       s:"en_attente", t:"warn",    lat:48.8540, lng:2.3200, adresse:"7 Bd Saint-Michel, 75005" },
  { id:"R-084", d:"VEN 14 · 08:00", c:"Heetch Ops",    i:"BC-890-DE", m:"Mercedes Class S", p:"VTC",      op:"Karim B.", s:"confirmée",  t:"ok",      lat:48.8676, lng:2.3636, adresse:"17 Bd Richard-Lenoir, 75011" },
  { id:"R-085", d:"VEN 14 · 11:30", c:"Bolt France",   i:"FR-987-XK", m:"Tesla Model 3",    p:"VTC",      op:"—",       s:"en_attente", t:"warn",    lat:48.8576, lng:2.3736, adresse:"3 Pl. de la République, 75011" },
  { id:"R-086", d:"LUN 17 · 09:00", c:"Hertz CDG",     i:"WX-333-YZ", m:"Range Rover Sport",p:"Standard", op:"—",       s:"refusée",    t:"danger",  lat:48.8484, lng:2.4397, adresse:"12 Av. du Trône, 75012" },
  { id:"R-087", d:"LUN 17 · 14:00", c:"Cabify Paris",  i:"DE-234-FG", m:"Tesla Model 3",    p:"VTC",      op:"Sofia T.", s:"confirmée",  t:"ok",      lat:48.8718, lng:2.3315, adresse:"5 Pl. de l'Opéra, 75009" },
];

const _PIN_TONE = { confirmée:"#1F8A5B", en_attente:"#C7811E", refusée:"#C8412F" };

// ─── MODAL ASSIGNATION RAPIDE ────────────────────────────────────────────────
const QuickAssignModal = ({ row, onClose, isError = false }) => {
  const [selOp, setSelOp] = React.useState(null);
  const [selSlot, setSelSlot] = React.useState(null);
  const [confirmed, setConfirmed] = React.useState(false);

  if (!row) return null;

  const SLOTS = {
    "Karim B.": [
      { day:"JEU 13", time:"14:00", period:"Après-midi", free:true  },
      { day:"JEU 13", time:"15:30", period:"Après-midi", free:true  },
      { day:"VEN 14", time:"09:00", period:"Matin",      free:true  },
      { day:"VEN 14", time:"10:30", period:"Matin",      free:false },
    ],
    "Sofia T.": [
      { day:"JEU 13", time:"14:00", period:"Après-midi", free:true  },
      { day:"VEN 14", time:"08:30", period:"Matin",      free:true  },
      { day:"VEN 14", time:"14:00", period:"Après-midi", free:true  },
    ],
    "Yann L.": [
      { day:"JEU 13", time:"14:30", period:"Après-midi", free:true  },
      { day:"VEN 14", time:"08:00", period:"Matin",      free:true  },
    ],
  };

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 100,
      background: "rgba(17,24,39,.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: 480, background: TOK.surface, borderRadius: TOK.r6,
        boxShadow: "0 20px 60px rgba(17,24,39,.3)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        maxHeight: "90%",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${TOK.line}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <Mono size={9} color={TOK.brand} style={{ display: "block", marginBottom: 4 }}>Assignation rapide · #{row.id}</Mono>
            <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px" }}>
              {row.i} <span style={{ color: TOK.brand }}>· {row.m}</span>
            </div>
            <div style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink50, marginTop: 3 }}>{row.c} · Pack {row.p} · {row.d}</div>
          </div>
          <button onClick={onClose} style={{ background: TOK.panel, border: `1px solid ${TOK.line}`, borderRadius: TOK.r2, padding: 6, cursor: "pointer", display: "inline-flex" }}><I.x s={14}/></button>
        </div>

        {/* Corps */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
          {confirmed && !isError ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "12px 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: 999, background: TOK.okL, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <svg width={28} height={28} viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="18" r="18" fill={TOK.ok}/>
                  <path d="M10 18l6 6L26 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 16, color: TOK.ok, textAlign: "center" }}>Intervention planifiée !</div>
              <div style={{ fontFamily: TOK.body, fontSize: 13, color: TOK.ink50, textAlign: "center", lineHeight: 1.6 }}>
                {row.i} assigné à <strong>{selOp}</strong><br/>
                {selSlot?.day} · {selSlot?.time} · {selSlot?.period}
              </div>
              <Tag tone="ok" dot style={{ fontSize: 12 }}>Notification envoyée à {selOp}</Tag>
            </div>
          ) : isError ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "12px 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: 999, background: `${TOK.danger}12`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <I.x s={26} c={TOK.danger}/>
              </div>
              <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 16, color: TOK.danger, textAlign: "center" }}>Assignation impossible</div>
              <div style={{ background: `${TOK.danger}10`, border: `1px solid ${TOK.danger}44`, borderRadius: TOK.r4, padding: "10px 14px", width: "100%" }}>
                <div style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.danger }}>
                  Le créneau sélectionné a été pris entre-temps par un autre opérateur. Veuillez choisir un autre créneau.
                </div>
              </div>
              <Btn kind="ghost" size="sm" icon={<I.arrow s={11}/>} onClick={() => {}}>Choisir un autre créneau</Btn>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* 1. Choisir opérateur */}
              <div>
                <Mono size={10} style={{ display: "block", marginBottom: 8 }}>1 · Opérateur</Mono>
                <div style={{ display: "flex", gap: 8 }}>
                  {Object.entries(OPERATORS).map(([name, op]) => {
                    const on = selOp === name;
                    return (
                      <button key={name} onClick={() => { setSelOp(name); setSelSlot(null); }} style={{
                        flex: 1, padding: "10px 8px", borderRadius: TOK.r4, cursor: "pointer",
                        border: `1.5px solid ${on ? op.color : TOK.line}`,
                        background: on ? op.bg : TOK.paper,
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                      }}>
                        <div style={{ width: 28, height: 28, borderRadius: 999, background: op.color, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, fontFamily: TOK.body }}>{op.initials}</div>
                        <Mono size={9} color={on ? op.color : TOK.ink50}>{name.split(" ")[0]}</Mono>
                        {on && <I.check s={12} c={op.color}/>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Choisir créneau */}
              {selOp && (
                <div>
                  <Mono size={10} style={{ display: "block", marginBottom: 8 }}>2 · Créneau disponible</Mono>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {(SLOTS[selOp] || []).map((sl, i) => (
                      <button key={i} onClick={() => sl.free && setSelSlot(sl)} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                        background: !sl.free ? TOK.panel : selSlot === sl ? OPERATORS[selOp].bg : TOK.paper,
                        border: `1.5px solid ${selSlot === sl ? OPERATORS[selOp].color : TOK.line}`,
                        borderRadius: TOK.r4, cursor: sl.free ? "pointer" : "not-allowed",
                        opacity: sl.free ? 1 : 0.55,
                      }}>
                        <div style={{ width: 3, height: 28, borderRadius: 2, background: sl.free ? OPERATORS[selOp].color : TOK.rule }}/>
                        <div style={{ flex: 1, textAlign: "left" }}>
                          <span style={{ fontFamily: TOK.head, fontWeight: 600, fontSize: 13 }}>{sl.day} · {sl.time}</span>
                          <span style={{ fontFamily: TOK.body, fontSize: 11, color: TOK.ink50, marginLeft: 8 }}>{sl.period}</span>
                        </div>
                        {!sl.free ? <Tag tone="neutral" style={{ fontSize: 10 }}>Occupé</Tag>
                          : selSlot === sl ? <I.check s={13} c={OPERATORS[selOp].color}/>
                          : <Tag tone="ok" style={{ fontSize: 10 }}>Libre</Tag>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Récap */}
              {selOp && selSlot && (
                <div style={{ background: TOK.brandL, border: `1px solid ${TOK.brand}33`, borderRadius: TOK.r4, padding: "10px 14px" }}>
                  <Mono size={9} color={TOK.brand} style={{ display: "block", marginBottom: 6 }}>Récapitulatif</Mono>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Mono size={10} color={TOK.ink50}>Opérateur</Mono>
                    <span style={{ fontFamily: TOK.body, fontSize: 12, fontWeight: 600 }}>{selOp}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <Mono size={10} color={TOK.ink50}>Créneau</Mono>
                    <span style={{ fontFamily: TOK.body, fontSize: 12, fontWeight: 600 }}>{selSlot.day} · {selSlot.time}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 22px", borderTop: `1px solid ${TOK.line}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          {confirmed || isError ? (
            <Btn kind="primary" icon={<I.x s={12}/>} onClick={onClose}>Fermer</Btn>
          ) : (
            <>
              <Btn kind="ghost" onClick={onClose}>Annuler</Btn>
              <Btn kind="primary"
                icon={<I.check s={12}/>}
                state={(!selOp || !selSlot) ? "disabled" : "default"}
                onClick={() => setConfirmed(true)}>
                Confirmer l'assignation
              </Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── LISTE RDV SIMPLE (colonne gauche uniquement pour les états) ─────────────
const RdvTable = ({ rows, onAssign, hoveredId, setHoveredId }) => (
  <div style={{ flex: 1, overflowY: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: TOK.body, fontSize: 12 }}>
      <thead>
        <tr style={{ background: TOK.panel }}>
          {["Date","Client","Immat.","Pack","Statut",""].map((h, i) => (
            <th key={i} style={{ textAlign: i === 5 ? "center" : "left", padding: "10px 12px", fontFamily: TOK.head, fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: TOK.ink50, fontWeight: 600, borderBottom: `1px solid ${TOK.line}` }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const active = hoveredId === r.id;
          return (
            <tr key={r.id}
              onMouseEnter={() => setHoveredId(r.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ borderTop: i ? `1px solid ${TOK.line}` : "none", background: active ? TOK.brandL : "transparent", cursor: "pointer", borderLeft: active ? `3px solid ${TOK.brand}` : "3px solid transparent", transition: "background .1s" }}>
              <td style={{ padding: "11px 12px", fontFamily: TOK.mono, fontSize: 11, fontWeight: 600 }}>{r.d}</td>
              <td style={{ padding: "11px 12px", color: TOK.ink70, fontWeight: 500, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.c}</td>
              <td style={{ padding: "11px 12px" }}><Data size={11} weight={700}>{r.i}</Data></td>
              <td style={{ padding: "11px 12px" }}><PackTag pack={r.p} style={{ fontSize: 10, padding: "2px 6px" }}/></td>
              <td style={{ padding: "11px 12px" }}><Tag tone={r.t} dot style={{ fontSize: 10 }}>{r.s}</Tag></td>
              <td style={{ padding: "11px 8px", textAlign: "center" }}>
                {r.s === "en_attente" ? (
                  <button onClick={() => onAssign(r)} style={{ background: TOK.brand, color: "#fff", border: "none", borderRadius: TOK.r2, padding: "5px 8px", cursor: "pointer", fontFamily: TOK.body, fontSize: 10, fontWeight: 600, display: "inline-flex", gap: 4, alignItems: "center" }}>
                    <I.cal s={10} c="#fff"/>Assigner
                  </button>
                ) : (
                  <button style={{ background: "transparent", border: `1px solid ${TOK.line}`, color: TOK.ink50, borderRadius: TOK.r2, padding: 5, cursor: "pointer", display: "inline-flex" }}><I.eye s={12}/></button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

// ─── MINI MAP STATIQUE pour les variants ─────────────────────────────────────
const StaticMapRDV = ({ rows, hoveredId }) => {
  const PIN_COLOR = { confirmée:"#1F8A5B", en_attente:"#C7811E", refusée:"#C8412F" };
  // Coordonnées normalisées dans un viewport 700×800
  const PINS = [
    { id:"R-082", x:320, y:160, s:"confirmée"  },
    { id:"R-083", x:250, y:310, s:"en_attente" },
    { id:"R-084", x:480, y:220, s:"confirmée"  },
    { id:"R-085", x:520, y:270, s:"en_attente" },
    { id:"R-086", x:580, y:370, s:"refusée"    },
    { id:"R-087", x:370, y:190, s:"confirmée"  },
  ].filter(p => rows.find(r => r.id === p.id));

  return (
    <div style={{ flex: 1, background: "#EEF2E9", position: "relative", overflow: "hidden" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: .3 }}>
        {[80,160,240,320,400,480,560,640].map(x => <line key={x} x1={x} y1="0" x2={x} y2="900" stroke="#9CA3AF" strokeWidth="1"/>)}
        {[80,160,240,320,400,480,560,640,720,800].map(y => <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="#9CA3AF" strokeWidth="1"/>)}
      </svg>
      {PINS.map(p => {
        const c = PIN_COLOR[p.s] || "#6B7280";
        const active = p.id === hoveredId;
        const sz = active ? 36 : 28;
        return (
          <div key={p.id} style={{
            position: "absolute", left: `${(p.x / 700) * 100}%`, top: `${(p.y / 800) * 100}%`,
            transform: `translate(-50%,-${sz}px)`,
            transition: "all .2s",
          }}>
            <div style={{
              width: sz, height: sz, background: c, border: `${active ? 3 : 2}px solid #fff`,
              borderRadius: "50% 50% 50% 2px", transform: "rotate(-45deg)",
              boxShadow: `0 ${active ? 4 : 2}px ${active ? 16 : 6}px ${c}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ transform: "rotate(45deg)", color: "#fff", fontSize: active ? 12 : 10, fontWeight: 700, fontFamily: "system-ui" }}>
                {p.id.split("-")[1]}
              </span>
            </div>
            {active && (
              <div style={{
                position: "absolute", bottom: sz + 8, left: "50%", transform: "translateX(-50%)",
                background: "rgba(17,24,39,.9)", color: "#fff", borderRadius: TOK.r2, padding: "4px 8px",
                fontFamily: TOK.mono, fontSize: 10, fontWeight: 600, whiteSpace: "nowrap",
              }}>{rows.find(r => r.id === p.id)?.i}</div>
            )}
          </div>
        );
      })}
      <div style={{ position: "absolute", bottom: 4, right: 8 }}>
        <Mono size={8} color={TOK.ink30}>© OpenStreetMap · Paris</Mono>
      </div>
    </div>
  );
};

// ─── PAGES RDV avec états ─────────────────────────────────────────────────────
const RDV_PageShell = ({ title, children, sub }) => {
  const navItems = [...NAV_ADMIN];
  return (
    <Page>
      <Sidebar items={navItems} active="Demandes RDV" role="Admin" user={{ name:"Admin Ops", org:"IZOX · Paris" }}/>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Topbar crumbs={["Admin","Demandes RDV"]} title={title} sub={sub}
          right={<>
            <Btn kind="ghost" size="sm" icon={<I.filter s={12}/>}>Filtres</Btn>
            <Btn kind="ghost" size="sm" icon={<I.cal s={12}/>}>Planning →</Btn>
          </>}
        />
        {children}
      </main>
    </Page>
  );
};

// État loaded : liste + carte + modal fermé, une ligne en survol simulé
const RDV_Loaded = () => {
  const [hoveredId, setHoveredId] = React.useState("R-083");
  const [assignRow, setAssignRow] = React.useState(null);
  return (
    <RDV_PageShell title="Demandes de RDV" sub="2 en attente · 3 confirmées">
      {assignRow && <QuickAssignModal row={assignRow} onClose={() => setAssignRow(null)}/>}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        <div style={{ flex: "0 0 40%", display: "flex", flexDirection: "column", overflow: "hidden", borderRight: `1px solid ${TOK.line}` }}>
          <RdvTable rows={_RDV_ROWS} onAssign={r => setAssignRow(r)} hoveredId={hoveredId} setHoveredId={setHoveredId}/>
        </div>
        <StaticMapRDV rows={_RDV_ROWS} hoveredId={hoveredId}/>
      </div>
    </RDV_PageShell>
  );
};

// État empty
const RDV_Empty = () => (
  <RDV_PageShell title="Demandes de RDV" sub="Aucune demande cette semaine">
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div style={{ flex: "0 0 40%", borderRight: `1px solid ${TOK.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: `${TOK.brand}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <I.cal s={24} c={TOK.brand}/>
        </div>
        <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 16, textAlign: "center" }}>Aucune demande de RDV</div>
        <div style={{ fontFamily: TOK.body, fontSize: 13, color: TOK.ink50, textAlign: "center", lineHeight: 1.6 }}>Les demandes de rendez-vous apparaîtront ici dès qu'un client en soumettra une.</div>
      </div>
      <StaticMapRDV rows={[]} hoveredId={null}/>
    </div>
  </RDV_PageShell>
);

// État modal assignation ouverte
const RDV_WithModal = ({ isError = false }) => {
  const row = _RDV_ROWS.find(r => r.s === "en_attente");
  return (
    <RDV_PageShell title="Demandes de RDV" sub="2 en attente · Assignation en cours">
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        <div style={{ flex: "0 0 40%", display: "flex", flexDirection: "column", overflow: "hidden", borderRight: `1px solid ${TOK.line}` }}>
          <RdvTable rows={_RDV_ROWS} onAssign={() => {}} hoveredId={null} setHoveredId={() => {}}/>
        </div>
        <StaticMapRDV rows={_RDV_ROWS} hoveredId={row?.id}/>
        <QuickAssignModal row={row} onClose={() => {}} isError={isError}/>
      </div>
    </RDV_PageShell>
  );
};

const RDV_ModalError = () => <RDV_WithModal isError/>;

Object.assign(window, {
  QuickAssignModal, RdvTable, StaticMapRDV,
  RDV_Loaded, RDV_Empty, RDV_WithModal, RDV_ModalError,
});
