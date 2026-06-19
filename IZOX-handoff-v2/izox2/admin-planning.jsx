
// Admin · Planning opérateurs — vue semaine / vue jour
// Couleurs fixes opérateurs : Karim B. → blue, Sofia T. → teal, Yann L. → purple

const OPERATORS = {
  "Karim B.": { color: "#2A6FDB", bg: "#D5E2F6", border: "#A3BFF5", initials: "KB" },
  "Sofia T.": { color: "#0F766E", bg: "#CCFBF1", border: "#5EEAD4", initials: "ST" },
  "Yann L.":  { color: "#7C3AED", bg: "#EDE9FE", border: "#C4B5FD", initials: "YL" },
};

const DAYS = ["LUN 09", "MAR 10", "MER 11", "JEU 12", "VEN 13"];
const FULL_DAYS = ["Lundi 9", "Mardi 10", "Mercredi 11", "Jeudi 12", "Vendredi 13"];

// Slots data: null = créneau vide droppable
const PLAN = {
  "Karim B.": {
    "LUN 09": {
      m: [
        { time:"08:00", immat:"AB-123-CD", client:"Cabify Paris",  pack:"Standard", s:"terminée",  t:"ok",      ph: null },
        { time:"10:00", immat:"DE-234-FG", client:"LeasePlan FR",  pack:"VTC",      s:"en_cours",  t:"warn",    ph: null },
        null,
      ],
      a: [
        { time:"14:00", immat:"HI-345-JK", client:"Heetch Ops",    pack:"Standard", s:"planifiée", t:"neutral", ph: null },
        { time:"15:30", immat:"FR-987-XK", client:"Bolt France",   pack:"VTC",      s:"planifiée", t:"neutral", ph: null },
        null,
      ],
    },
    "MAR 10": {
      m: [{ time:"09:00", immat:"TU-678-VW", client:"Cabify Paris", pack:"VTC", s:"planifiée", t:"neutral", ph:null }, null, null],
      a: [{ time:"14:00", immat:"BC-890-DE", client:"Heetch Ops",   pack:"Standard", s:"planifiée", t:"neutral", ph:null }, null, null],
    },
    "MER 11": {
      m: [
        { time:"08:30", immat:"AA-111-BB", client:"Hertz CDG",    pack:"Standard", s:"planifiée", t:"neutral", ph:null },
        { time:"10:00", immat:"OP-111-QR", client:"LeasePlan FR", pack:"Standard", s:"planifiée", t:"neutral", ph:null },
        { time:"11:30", immat:"WX-333-YZ", client:"LeasePlan FR", pack:"Standard", s:"planifiée", t:"neutral", ph:null },
      ],
      a: [
        { time:"14:00", immat:"AB-444-CD", client:"LeasePlan FR", pack:"Intérieur", s:"planifiée", t:"neutral", ph:null },
        { time:"15:30", immat:"ST-222-UV", client:"LeasePlan FR", pack:"Standard",  s:"planifiée", t:"neutral", ph:null },
        null,
      ],
    },
    "JEU 12": {
      m: [{ time:"08:00", immat:"KL-678-MN", client:"Heetch Ops", pack:"VTC", s:"planifiée", t:"neutral", ph:null }, null, null],
      a: [null, null, null],
    },
    "VEN 13": {
      m: [
        { time:"09:00", immat:"GH-456-IJ", client:"Heetch Ops",  pack:"VTC", s:"planifiée", t:"neutral", ph:null },
        { time:"10:30", immat:"FG-901-HI", client:"Cabify Paris", pack:"VTC", s:"planifiée", t:"neutral", ph:null },
        null,
      ],
      a: [null, null, null],
    },
  },
  "Sofia T.": {
    "LUN 09": {
      m: [
        { time:"08:00", immat:"HI-345-JK", client:"Cabify Paris", pack:"Standard", s:"terminée",  t:"ok",      ph:null },
        { time:"10:00", immat:"AA-111-BB", client:"Hertz CDG",    pack:"VTC",      s:"terminée",  t:"ok",      ph:null },
        { time:"11:00", immat:"FG-901-HI", client:"Cabify Paris", pack:"VTC",      s:"planifiée", t:"neutral", ph:null },
      ],
      a: [
        { time:"14:00", immat:"OP-111-QR", client:"LeasePlan FR", pack:"Standard", s:"planifiée", t:"neutral", ph:null },
        { time:"15:30", immat:"WX-333-YZ", client:"LeasePlan FR", pack:"Standard", s:"planifiée", t:"neutral", ph:null },
        null,
      ],
    },
    "MAR 10": {
      m: [{ time:"09:00", immat:"GH-456-IJ", client:"Heetch Ops",  pack:"VTC", s:"planifiée", t:"neutral", ph:null }, null, null],
      a: [{ time:"14:00", immat:"AB-444-CD", client:"LeasePlan FR",pack:"Intérieur", s:"planifiée", t:"neutral", ph:null }, null, null],
    },
    "MER 11": {
      m: [
        { time:"08:30", immat:"DE-234-FG", client:"Cabify Paris",  pack:"VTC",     s:"planifiée", t:"neutral", ph:null },
        { time:"10:00", immat:"OP-111-QR", client:"LeasePlan FR",  pack:"Standard",s:"planifiée", t:"neutral", ph:null },
        null,
      ],
      a: [null, null, null],
    },
    "JEU 12": {
      m: [{ time:"09:00", immat:"BC-890-DE", client:"Heetch Ops",  pack:"VTC", s:"planifiée", t:"neutral", ph:null }, null, null],
      a: [{ time:"14:00", immat:"ST-222-UV", client:"LeasePlan FR",pack:"Standard", s:"planifiée", t:"neutral", ph:null }, null, null],
    },
    "VEN 13": {
      m: [null, null, null],
      a: [null, null, null],
    },
  },
  "Yann L.": {
    "LUN 09": {
      m: [{ time:"09:30", immat:"BC-890-DE", client:"Heetch Ops",   pack:"VTC",     s:"terminée",  t:"ok",      ph:null }, null, null],
      a: [{ time:"14:30", immat:"PQ-567-RS", client:"LeasePlan FR", pack:"Standard",s:"planifiée", t:"neutral", ph:null }, null, null],
    },
    "MAR 10": {
      m: [{ time:"08:00", immat:"WX-333-YZ", client:"LeasePlan FR", pack:"Standard", s:"planifiée", t:"neutral", ph:null }, null, null],
      a: [null, null, null],
    },
    "MER 11": {
      m: [{ time:"09:00", immat:"FR-987-XK", client:"Bolt France",  pack:"VTC",     s:"planifiée", t:"neutral", ph:null }, null, null],
      a: [{ time:"14:00", immat:"AB-123-CD", client:"Cabify Paris", pack:"Standard",s:"planifiée", t:"neutral", ph:null }, null, null],
    },
    "JEU 12": {
      m: [
        { time:"08:30", immat:"ST-222-UV", client:"LeasePlan FR", pack:"Standard", s:"planifiée", t:"neutral", ph:null },
        { time:"10:00", immat:"FG-901-HI", client:"Cabify Paris", pack:"VTC",      s:"planifiée", t:"neutral", ph:null },
        null,
      ],
      a: [null, null, null],
    },
    "VEN 13": {
      m: [null, null, null],
      a: [null, null, null],
    },
  },
};

// Calcul de charge par opérateur sur la semaine courante (LUN 09)
const getLoad = (opName) => {
  const day = PLAN[opName]["LUN 09"];
  const filled = [...day.m, ...day.a].filter(Boolean).length;
  return { filled, max: 6 };
};

// Carte de créneau rempli
const SlotCard = ({ slot, opColor }) => {
  const [hov, setHov] = React.useState(false);
  const photosMap = {
    "AB-123-CD": PHOTOS.vito,
    "DE-234-FG": PHOTOS.tesla,
    "HI-345-JK": PHOTOS.bmw,
    "BC-890-DE": PHOTOS.classS,
    "FR-987-XK": PHOTOS.tesla,
    "TU-678-VW": PHOTOS.vito,
    "AA-111-BB": PHOTOS.bmw,
    "OP-111-QR": PHOTOS.trafic,
    "WX-333-YZ": PHOTOS.range,
    "AB-444-CD": PHOTOS.vitoSide,
    "ST-222-UV": PHOTOS.trafic,
    "KL-678-MN": PHOTOS.audi,
    "GH-456-IJ": PHOTOS.audi,
    "FG-901-HI": PHOTOS.audi,
    "PQ-567-RS": PHOTOS.trafic,
  };
  const photo = photosMap[slot.immat] || PHOTOS.vito;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: TOK.surface,
        border: `1px solid ${hov ? opColor : TOK.line}`,
        borderLeft: `3px solid ${opColor}`,
        borderRadius: TOK.r4,
        padding: "9px 10px",
        display: "flex", gap: 8, alignItems: "center",
        cursor: "pointer",
        boxShadow: hov ? `0 2px 8px ${opColor}22` : TOK.shadow,
        transition: "all .15s",
      }}
    >
      {/* Miniature photo */}
      <div style={{
        width: 38, height: 38, borderRadius: TOK.r2, overflow: "hidden",
        flex: "0 0 38px", background: TOK.panel,
      }}>
        <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      {/* Contenu */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
          <Data size={12} weight={700}>{slot.immat}</Data>
          <Tag tone={slot.t} dot style={{ fontSize: 10 }}>{slot.s}</Tag>
        </div>
        <div style={{ fontFamily: TOK.body, fontSize: 11, color: TOK.ink50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {slot.client}
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <PackTag pack={slot.pack} style={{ fontSize: 10, padding: "2px 6px" }} />
          <Mono size={9} color={TOK.ink30}>{slot.time}</Mono>
        </div>
      </div>
    </div>
  );
};

// Zone vide droppable
const EmptySlot = ({ opColor }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        border: `1.5px dashed ${hov ? opColor : TOK.rule}`,
        borderRadius: TOK.r4,
        height: 62,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        background: hov ? `${opColor}08` : "transparent",
        transition: "all .15s",
        gap: 6,
        color: hov ? opColor : TOK.ink30,
      }}
    >
      <I.plus s={12} c={hov ? opColor : TOK.ink30} />
      {hov && <span style={{ fontFamily: TOK.body, fontSize: 11, fontWeight: 600 }}>Ajouter</span>}
    </div>
  );
};

// En-tête opérateur avec barre de charge
const OperatorHeader = ({ name, op, day }) => {
  const { filled, max } = getLoad(name);
  const pct = (filled / max) * 100;
  const warnLevel = filled >= 5;
  return (
    <div style={{
      padding: "14px 14px 12px",
      borderBottom: `2px solid ${op.color}`,
      background: op.bg,
      display: "flex", flexDirection: "column", gap: 8,
      position: "sticky", top: 0, zIndex: 2,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 999,
          background: op.color, color: "#fff",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: TOK.body, fontSize: 11, fontWeight: 700,
          flex: "0 0 34px",
        }}>{op.initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 14, color: TOK.ink }}>{name}</div>
          <Mono size={9} color={TOK.ink50}>Opérateur terrain</Mono>
        </div>
        <div style={{
          background: warnLevel ? TOK.warnL : TOK.brandL,
          color: warnLevel ? TOK.warn : TOK.brand,
          fontFamily: TOK.mono, fontSize: 11, fontWeight: 700,
          padding: "2px 8px", borderRadius: 999,
        }}>{filled}/{max}</div>
      </div>
      {/* Barre de charge */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <Mono size={9} color={TOK.ink50}>Charge · {FULL_DAYS[day] || "aujourd'hui"}</Mono>
          <Mono size={9} color={warnLevel ? TOK.warn : op.color}>{Math.round(pct)}%</Mono>
        </div>
        <div style={{ height: 5, background: TOK.line, borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: op.color, borderRadius: 999, transition: "width .3s" }} />
        </div>
      </div>
    </div>
  );
};

// Bloc demi-journée (matin ou après-midi)
const HalfDayBlock = ({ label, hours, slots, opColor }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{
      display: "flex", alignItems: "center", gap: 6, marginBottom: 6,
      padding: "4px 0",
    }}>
      <div style={{ width: 3, height: 14, background: opColor, borderRadius: 2 }} />
      <Mono size={9} color={TOK.ink50}>{label} · {hours}</Mono>
      <div style={{ flex: 1, height: 1, background: TOK.line }} />
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {slots.map((s, i) =>
        s ? <SlotCard key={i} slot={s} opColor={opColor} /> : <EmptySlot key={i} opColor={opColor} />
      )}
    </div>
  </div>
);

// Colonne complète d'un opérateur (tous les jours)
const OperatorColumn = ({ name, op, dayIndex }) => {
  const opDays = PLAN[name];
  const dayKey = DAYS[dayIndex];
  const dayData = opDays[dayKey] || { m: [null,null,null], a: [null,null,null] };
  return (
    <div style={{
      flex: "0 0 370px", width: 370,
      background: TOK.paper,
      borderRight: `1px solid ${TOK.line}`,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <OperatorHeader name={name} op={op} day={dayIndex} />
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
        {DAYS.map((day, di) => {
          const data = opDays[day] || { m: [null,null,null], a: [null,null,null] };
          return (
            <div key={day} style={{ marginBottom: 14 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
                padding: "6px 8px",
                background: di === dayIndex ? op.bg : TOK.panel,
                borderRadius: TOK.r2,
                border: `1px solid ${di === dayIndex ? op.border : TOK.line}`,
              }}>
                <I.cal s={12} c={di === dayIndex ? op.color : TOK.ink50} />
                <span style={{ fontFamily: TOK.head, fontWeight: 600, fontSize: 12, color: di === dayIndex ? op.color : TOK.ink70 }}>
                  {day} Juin
                </span>
                {di === 0 && <Tag tone="warn" style={{ marginLeft: "auto", fontSize: 10, padding: "1px 6px" }}>Aujourd'hui</Tag>}
              </div>
              <HalfDayBlock label="Matin" hours="08h–12h" slots={data.m} opColor={op.color} />
              <HalfDayBlock label="Après-midi" hours="14h–18h" slots={data.a} opColor={op.color} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Skeleton loader
const PlanningSkeletonCol = () => (
  <div style={{ flex: "0 0 370px", borderRight: `1px solid ${TOK.line}`, padding: 14 }}>
    {[...Array(3)].map((_, i) => (
      <div key={i} style={{ marginBottom: 10, height: 64, background: TOK.line, borderRadius: TOK.r4,
        animation: "pulse 1.5s ease-in-out infinite",
        opacity: 1 - i * 0.2 }} />
    ))}
  </div>
);

// ─── VUE PLANNING SEMAINE ───────────────────────────────────────────────────
const A_Planning = () => {
  const [view, setView] = React.useState("semaine");
  const [dayIndex, setDayIndex] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const navItems = [...NAV_ADMIN, { label: "Planning", icon: <I.cal s={15}/> }];

  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <Page>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }
      `}</style>
      <Sidebar items={navItems} active="Planning" role="Admin" user={{ name: "Admin Ops", org: "IZOX · Paris" }} />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header fixe */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 22px", borderBottom: `1px solid ${TOK.line}`,
          background: TOK.surface, gap: 14, flexShrink: 0,
        }}>
          {/* Navigation semaine */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => {}} style={{
              background: TOK.panel, border: `1px solid ${TOK.line}`, borderRadius: TOK.r2,
              padding: "6px 10px", cursor: "pointer", display: "inline-flex",
            }}><I.chevL s={14} /></button>
            <div style={{
              padding: "6px 16px", background: TOK.surface, border: `1px solid ${TOK.line}`,
              borderRadius: TOK.r2, fontFamily: TOK.head, fontWeight: 600, fontSize: 14, color: TOK.ink,
              minWidth: 200, textAlign: "center",
            }}>
              Sem. du 9 au 13 Juin 2026
            </div>
            <button onClick={() => {}} style={{
              background: TOK.panel, border: `1px solid ${TOK.line}`, borderRadius: TOK.r2,
              padding: "6px 10px", cursor: "pointer", display: "inline-flex",
            }}><I.chevR s={14} /></button>
            <button onClick={() => setDayIndex(0)} style={{
              background: TOK.brandL, border: `1px solid ${TOK.brand}33`, borderRadius: TOK.r2,
              padding: "6px 12px", cursor: "pointer", fontFamily: TOK.body, fontSize: 12,
              fontWeight: 600, color: TOK.brand,
            }}>Aujourd'hui</button>
          </div>

          {/* Switcher vue */}
          <div style={{
            display: "flex", gap: 0, background: TOK.panel,
            border: `1px solid ${TOK.line}`, borderRadius: TOK.r2, overflow: "hidden",
          }}>
            {["semaine", "jour"].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                background: view === v ? TOK.surface : "transparent",
                border: "none", padding: "7px 14px", cursor: "pointer",
                fontFamily: TOK.body, fontSize: 12, fontWeight: view === v ? 600 : 500,
                color: view === v ? TOK.ink : TOK.ink50,
                borderRight: v === "semaine" ? `1px solid ${TOK.line}` : "none",
                transition: "all .15s",
              }}>{v.charAt(0).toUpperCase() + v.slice(1)}</button>
            ))}
          </div>

          {/* Indicateurs opérateurs */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {Object.entries(OPERATORS).map(([name, op]) => {
              const { filled, max } = getLoad(name);
              return (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 999, background: op.color }} />
                  <Mono size={9} color={TOK.ink50}>{op.initials}</Mono>
                  <span style={{ fontFamily: TOK.mono, fontSize: 10, fontWeight: 600, color: TOK.ink }}>{filled}/{max}</span>
                </div>
              );
            })}
          </div>

          <Btn kind="primary" size="sm" icon={<I.plus s={11} />}>Nouvelle intervention</Btn>
        </div>

        {/* Vue jour : navigation par onglets */}
        {view === "jour" && (
          <div style={{
            display: "flex", gap: 0, padding: "0 22px",
            borderBottom: `1px solid ${TOK.line}`, background: TOK.surface,
          }}>
            {DAYS.map((d, i) => (
              <button key={d} onClick={() => setDayIndex(i)} style={{
                background: "transparent", border: "none",
                borderBottom: `2px solid ${dayIndex === i ? TOK.brand : "transparent"}`,
                padding: "10px 16px", cursor: "pointer",
                fontFamily: TOK.body, fontSize: 13,
                fontWeight: dayIndex === i ? 600 : 400,
                color: dayIndex === i ? TOK.brand : TOK.ink50,
                transition: "all .15s",
              }}>{d} Juin</button>
            ))}
          </div>
        )}

        {/* Corps : 3 colonnes opérateurs */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          {loading ? (
            <div style={{ display: "flex", width: "100%", overflow: "hidden" }}>
              <PlanningSkeletonCol /><PlanningSkeletonCol /><PlanningSkeletonCol />
            </div>
          ) : (
            <div style={{
              display: "flex", flex: 1,
              overflowX: "auto", overflowY: "hidden",
            }}>
              {Object.entries(OPERATORS).map(([name, op]) => (
                <OperatorColumn key={name} name={name} op={op} dayIndex={dayIndex} />
              ))}
            </div>
          )}
        </div>
      </main>
    </Page>
  );
};

Object.assign(window, { OPERATORS, PLAN, DAYS, A_Planning });
