
// Extras · Planning — drag-drop visible + mobile + 4 états (empty/loaded/drag/error)

// ─── HELPERS LOCAUX ──────────────────────────────────────────────────────────
const _getLoad = (opName) => {
  const day = PLAN[opName]["LUN 09"];
  const filled = [...day.m, ...day.a].filter(Boolean).length;
  return { filled, max: 6 };
};

// ─── EMPTY SLOT AMÉLIORÉ (drag-drop très visible) ────────────────────────────
const DropZone = ({ opColor, isDragOver, isError }) => {
  const [hov, setHov] = React.useState(false);
  const active = hov || isDragOver;
  const borderColor = isError ? TOK.danger : active ? opColor : TOK.rule;
  const bg = isError ? `${TOK.danger}08` : active ? `${opColor}12` : "transparent";
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        border: `2px dashed ${borderColor}`,
        borderRadius: TOK.r4,
        height: 72,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 5,
        cursor: "copy",
        background: bg,
        transition: "all .18s",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Fond animé lors du drag-over */}
      {active && !isError && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `repeating-linear-gradient(45deg, ${opColor}18 0, ${opColor}18 4px, transparent 4px, transparent 14px)`,
          animation: "stripeMove 1s linear infinite",
        }}/>
      )}
      <div style={{
        width: 26, height: 26, borderRadius: 999,
        background: isError ? TOK.danger : active ? opColor : TOK.line,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        transition: "all .18s", position: "relative",
      }}>
        {isError
          ? <I.x s={12} c="#fff"/>
          : <I.plus s={13} c={active ? "#fff" : TOK.ink30}/>
        }
      </div>
      <span style={{
        fontFamily: TOK.body, fontSize: 11, fontWeight: 600, position: "relative",
        color: isError ? TOK.danger : active ? opColor : TOK.ink30,
      }}>
        {isError ? "Créneau indisponible" : active ? "Déposer ici" : "Créneau libre"}
      </span>
    </div>
  );
};

// ─── CARTE CRÉNEAU PENDANT DRAG ─────────────────────────────────────────────
const DraggingSlotCard = ({ slot, opColor }) => (
  <div style={{
    background: TOK.surface,
    border: `2px solid ${opColor}`,
    borderLeft: `4px solid ${opColor}`,
    borderRadius: TOK.r4,
    padding: "9px 10px",
    display: "flex", gap: 8, alignItems: "center",
    boxShadow: `0 8px 32px ${opColor}44`,
    transform: "rotate(-1.5deg) scale(1.03)",
    opacity: 0.95,
    cursor: "grabbing",
  }}>
    <div style={{ width: 38, height: 38, borderRadius: TOK.r2, overflow: "hidden", flex: "0 0 38px", background: TOK.panel }}>
      <img src={PHOTOS.vito} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
    </div>
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
        <Data size={12} weight={700}>{slot.immat}</Data>
        <Tag tone={slot.t} dot style={{ fontSize: 10 }}>{slot.s}</Tag>
      </div>
      <div style={{ fontFamily: TOK.body, fontSize: 11, color: TOK.ink50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{slot.client}</div>
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        <PackTag pack={slot.pack} style={{ fontSize: 10, padding: "2px 6px" }}/>
        <Mono size={9} color={TOK.ink30}>{slot.time}</Mono>
      </div>
    </div>
  </div>
);

// ─── COLONNE OPÉRATEUR AVEC DRAG-DROP AMÉLIORÉ ───────────────────────────────
const OperatorColEnhanced = ({ name, op, showDrag, showError, showEmpty }) => {
  const [dragTarget, setDragTarget] = React.useState(null);
  const dayData = showEmpty
    ? { m: [null, null, null], a: [null, null, null] }
    : PLAN[name]["LUN 09"];

  const load = showEmpty ? { filled: 0, max: 6 } : _getLoad(name);
  const pct = (load.filled / load.max) * 100;

  return (
    <div style={{
      flex: "0 0 370px", width: 370,
      background: TOK.paper,
      borderRight: `1px solid ${TOK.line}`,
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 14px 12px",
        borderBottom: `2px solid ${op.color}`,
        background: op.bg,
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 999,
            background: op.color, color: "#fff",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontFamily: TOK.body, fontSize: 11, fontWeight: 700, flex: "0 0 34px",
          }}>{op.initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 14, color: TOK.ink }}>{name}</div>
            <Mono size={9} color={TOK.ink50}>Opérateur terrain</Mono>
          </div>
          <div style={{
            background: load.filled >= 5 ? TOK.warnL : TOK.brandL,
            color: load.filled >= 5 ? TOK.warn : TOK.brand,
            fontFamily: TOK.mono, fontSize: 11, fontWeight: 700,
            padding: "2px 8px", borderRadius: 999,
          }}>{load.filled}/{load.max}</div>
        </div>
        <div>
          <div style={{ height: 5, background: TOK.line, borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: op.color, borderRadius: 999 }}/>
          </div>
        </div>
      </div>

      {/* Slots */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
        {/* Badge drag en cours */}
        {showDrag && (
          <div style={{
            display: "flex", alignItems: "center", gap: 7, padding: "6px 10px",
            background: `${op.color}15`, border: `1px solid ${op.color}44`,
            borderRadius: TOK.r2, marginBottom: 10,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: 999, background: op.color }}/>
            <Mono size={9} color={op.color}>Déplacement en cours…</Mono>
          </div>
        )}

        {/* Matin */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <div style={{ width: 3, height: 14, background: op.color, borderRadius: 2 }}/>
            <Mono size={9} color={TOK.ink50}>Matin · 08h–12h</Mono>
            <div style={{ flex: 1, height: 1, background: TOK.line }}/>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {dayData.m.map((s, i) => {
              if (!s) return (
                <div key={i}
                  onDragEnter={() => setDragTarget(`m-${i}`)}
                  onDragLeave={() => setDragTarget(null)}
                  onDrop={() => setDragTarget(null)}
                  onDragOver={e => e.preventDefault()}
                >
                  <DropZone opColor={op.color} isDragOver={showDrag && dragTarget === `m-${i}`} isError={showError}/>
                </div>
              );
              return showDrag && i === 1
                ? <DraggingSlotCard key={i} slot={s} opColor={op.color}/>
                : (
                  <div key={i} draggable style={{
                    background: TOK.surface,
                    border: `1px solid ${TOK.line}`,
                    borderLeft: `3px solid ${op.color}`,
                    borderRadius: TOK.r4,
                    padding: "9px 10px",
                    display: "flex", gap: 8, alignItems: "center",
                    cursor: "grab",
                    boxShadow: TOK.shadow,
                    opacity: showDrag && i === 1 ? 0.3 : 1,
                  }}>
                    <div style={{ width: 38, height: 38, borderRadius: TOK.r2, overflow: "hidden", flex: "0 0 38px", background: TOK.panel }}>
                      <img src={PHOTOS.vito} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Data size={12} weight={700}>{s.immat}</Data>
                        <Tag tone={s.t} dot style={{ fontSize: 10 }}>{s.s}</Tag>
                      </div>
                      <div style={{ fontFamily: TOK.body, fontSize: 11, color: TOK.ink50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.client}</div>
                      <div style={{ display: "flex", gap: 5 }}>
                        <PackTag pack={s.pack} style={{ fontSize: 10, padding: "2px 6px" }}/>
                        <Mono size={9} color={TOK.ink30}>{s.time}</Mono>
                      </div>
                    </div>
                  </div>
                );
            })}
          </div>
        </div>

        {/* Après-midi */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <div style={{ width: 3, height: 14, background: op.color, borderRadius: 2 }}/>
            <Mono size={9} color={TOK.ink50}>Après-midi · 14h–18h</Mono>
            <div style={{ flex: 1, height: 1, background: TOK.line }}/>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {dayData.a.map((s, i) => {
              if (!s) return (
                <div key={i}
                  onDragEnter={() => setDragTarget(`a-${i}`)}
                  onDragLeave={() => setDragTarget(null)}
                  onDrop={() => setDragTarget(null)}
                  onDragOver={e => e.preventDefault()}
                >
                  <DropZone opColor={op.color} isDragOver={showDrag && dragTarget === `a-${i}`} isError={showError}/>
                </div>
              );
              return (
                <div key={i} draggable style={{
                  background: TOK.surface, border: `1px solid ${TOK.line}`,
                  borderLeft: `3px solid ${op.color}`, borderRadius: TOK.r4,
                  padding: "9px 10px", display: "flex", gap: 8, alignItems: "center", cursor: "grab",
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: TOK.r2, overflow: "hidden", flex: "0 0 38px", background: TOK.panel }}>
                    <img src={PHOTOS.tesla} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Data size={12} weight={700}>{s.immat}</Data>
                      <Tag tone={s.t} dot style={{ fontSize: 10 }}>{s.s}</Tag>
                    </div>
                    <div style={{ fontFamily: TOK.body, fontSize: 11, color: TOK.ink50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.client}</div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <PackTag pack={s.pack} style={{ fontSize: 10, padding: "2px 6px" }}/>
                      <Mono size={9} color={TOK.ink30}>{s.time}</Mono>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── PAGE PLANNING (variante état) ───────────────────────────────────────────
const PlanningVariant = ({ showDrag = false, showError = false, showEmpty = false }) => {
  const navItems = [...NAV_ADMIN, { label: "Planning", icon: <I.cal s={15}/> }];
  return (
    <Page>
      <style>{`@keyframes stripeMove { from { background-position: 0 0; } to { background-position: 20px 20px; } }`}</style>
      <Sidebar items={navItems} active="Planning" role="Admin" user={{ name: "Admin Ops", org: "IZOX · Paris" }}/>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 22px", borderBottom: `1px solid ${TOK.line}`,
          background: showError ? `${TOK.danger}08` : TOK.surface, gap: 14, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button style={{ background: TOK.panel, border: `1px solid ${TOK.line}`, borderRadius: TOK.r2, padding: "6px 10px", cursor: "pointer", display: "inline-flex" }}><I.chevL s={14}/></button>
            <div style={{ padding: "6px 16px", background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r2, fontFamily: TOK.head, fontWeight: 600, fontSize: 14, color: TOK.ink, minWidth: 200, textAlign: "center" }}>
              Sem. du 9 au 13 Juin 2026
            </div>
            <button style={{ background: TOK.panel, border: `1px solid ${TOK.line}`, borderRadius: TOK.r2, padding: "6px 10px", cursor: "pointer", display: "inline-flex" }}><I.chevR s={14}/></button>
          </div>
          {showError && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: `${TOK.danger}12`, border: `1px solid ${TOK.danger}44`, borderRadius: TOK.r4 }}>
              <I.x s={14} c={TOK.danger}/>
              <span style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.danger, fontWeight: 600 }}>Impossible de déposer — créneau déjà occupé</span>
            </div>
          )}
          {showDrag && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: `${TOK.brand}12`, border: `1px solid ${TOK.brand}44`, borderRadius: TOK.r4 }}>
              <div style={{ width: 6, height: 6, borderRadius: 999, background: TOK.brand, animation: "pulse 1s ease-in-out infinite" }}/>
              <span style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.brand, fontWeight: 600 }}>Déplacement en cours · AB-123-CD</span>
            </div>
          )}
          <Btn kind="primary" size="sm" icon={<I.plus s={11}/>}>Nouvelle intervention</Btn>
        </div>
        {/* Colonnes */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", overflowX: "auto" }}>
          {Object.entries(OPERATORS).map(([name, op]) => (
            <OperatorColEnhanced key={name} name={name} op={op} showDrag={showDrag} showError={showError} showEmpty={showEmpty}/>
          ))}
        </div>
      </main>
    </Page>
  );
};

// ─── VUE MOBILE ──────────────────────────────────────────────────────────────
const PlanningMobile = () => {
  const [selOp, setSelOp] = React.useState("Karim B.");
  const op = OPERATORS[selOp];
  const dayData = PLAN[selOp]["LUN 09"];
  const load = _getLoad(selOp);

  return (
    <div style={{ width: 390, height: 844, background: TOK.paper, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
      <style>{`@keyframes stripeMove { from { background-position: 0 0; } to { background-position: 20px 20px; } }`}</style>
      {/* Status bar */}
      <div style={{ height: 44, background: TOK.surface, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 }}>
        <Mono size={10} weight={600} color={TOK.ink}>09:41</Mono>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Mono size={10} color={TOK.ink}>●●●</Mono>
          <Mono size={10} color={TOK.ink}>WiFi</Mono>
          <Mono size={10} color={TOK.ink}>🔋</Mono>
        </div>
      </div>

      {/* Topbar */}
      <div style={{ background: TOK.surface, padding: "10px 16px 0", borderBottom: `1px solid ${TOK.line}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px" }}>Planning</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Tag tone="warn" dot style={{ fontSize: 10 }}>Lun 9 Juin</Tag>
            <Btn kind="primary" size="sm" style={{ fontSize: 11, padding: "5px 10px" }} icon={<I.plus s={10}/>}>Créer</Btn>
          </div>
        </div>
        {/* Selector opérateur pills */}
        <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 10 }}>
          {Object.entries(OPERATORS).map(([name, o]) => {
            const l = _getLoad(name);
            const on = selOp === name;
            return (
              <button key={name} onClick={() => setSelOp(name)} style={{
                display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                padding: "6px 12px", borderRadius: 999,
                background: on ? o.color : o.bg,
                border: `1.5px solid ${on ? o.color : o.border}`,
                cursor: "pointer",
              }}>
                <div style={{ width: 22, height: 22, borderRadius: 999, background: on ? "rgba(255,255,255,.25)" : o.color, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: TOK.body, fontSize: 9, fontWeight: 700 }}>{o.initials}</div>
                <span style={{ fontFamily: TOK.body, fontSize: 12, fontWeight: 600, color: on ? "#fff" : o.color }}>{name.split(" ")[0]}</span>
                <span style={{ fontFamily: TOK.mono, fontSize: 10, color: on ? "rgba(255,255,255,.8)" : o.color }}>{l.filled}/{l.max}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barre charge */}
      <div style={{ padding: "8px 16px", background: TOK.surface, borderBottom: `1px solid ${TOK.line}`, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <Mono size={9} color={TOK.ink50}>Charge · {selOp}</Mono>
          <Mono size={9} color={op.color}>{Math.round((load.filled / load.max) * 100)}%</Mono>
        </div>
        <div style={{ height: 4, background: TOK.line, borderRadius: 999 }}>
          <div style={{ width: `${(load.filled / load.max) * 100}%`, height: "100%", background: op.color, borderRadius: 999 }}/>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>
        {/* Matin */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{ width: 3, height: 14, background: op.color, borderRadius: 2 }}/>
            <Mono size={9} color={TOK.ink50}>Matin · 08h–12h</Mono>
            <div style={{ flex: 1, height: 1, background: TOK.line }}/>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {dayData.m.map((s, i) => s ? (
              <div key={i} style={{
                background: TOK.surface, border: `1px solid ${TOK.line}`, borderLeft: `3px solid ${op.color}`,
                borderRadius: TOK.r4, padding: "10px 12px", display: "flex", gap: 10, alignItems: "center",
              }}>
                <div style={{ width: 42, height: 42, borderRadius: TOK.r2, overflow: "hidden", flex: "0 0 42px" }}>
                  <img src={PHOTOS.vito} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Data size={13} weight={700}>{s.immat}</Data>
                    <Tag tone={s.t} dot style={{ fontSize: 10 }}>{s.s}</Tag>
                  </div>
                  <div style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.client}</div>
                  <div style={{ display: "flex", gap: 5, marginTop: 3 }}>
                    <PackTag pack={s.pack} style={{ fontSize: 10 }}/>
                    <Mono size={9} color={TOK.ink30}>{s.time}</Mono>
                  </div>
                </div>
              </div>
            ) : (
              <DropZone key={i} opColor={op.color}/>
            ))}
          </div>
        </div>
        {/* Après-midi */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{ width: 3, height: 14, background: op.color, borderRadius: 2 }}/>
            <Mono size={9} color={TOK.ink50}>Après-midi · 14h–18h</Mono>
            <div style={{ flex: 1, height: 1, background: TOK.line }}/>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {dayData.a.map((s, i) => s ? (
              <div key={i} style={{
                background: TOK.surface, border: `1px solid ${TOK.line}`, borderLeft: `3px solid ${op.color}`,
                borderRadius: TOK.r4, padding: "10px 12px", display: "flex", gap: 10, alignItems: "center",
              }}>
                <div style={{ width: 42, height: 42, borderRadius: TOK.r2, overflow: "hidden", flex: "0 0 42px" }}>
                  <img src={PHOTOS.tesla} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Data size={13} weight={700}>{s.immat}</Data>
                    <Tag tone={s.t} dot style={{ fontSize: 10 }}>{s.s}</Tag>
                  </div>
                  <div style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink50 }}>{s.client}</div>
                  <div style={{ display: "flex", gap: 5, marginTop: 3 }}>
                    <PackTag pack={s.pack} style={{ fontSize: 10 }}/>
                    <Mono size={9} color={TOK.ink30}>{s.time}</Mono>
                  </div>
                </div>
              </div>
            ) : (
              <DropZone key={i} opColor={op.color}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrapper centré pour la vue mobile dans un artboard
const PlanningMobileWrapper = () => (
  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: TOK.paper }}>
    <PlanningMobile/>
  </div>
);

// Vues nommées exportées
const Planning_Loaded    = () => <PlanningVariant/>;
const Planning_DragDrop  = () => <PlanningVariant showDrag/>;
const Planning_Error     = () => <PlanningVariant showError/>;
const Planning_Empty     = () => <PlanningVariant showEmpty/>;

Object.assign(window, {
  Planning_Loaded, Planning_DragDrop, Planning_Error, Planning_Empty,
  PlanningMobileWrapper, DropZone,
});
