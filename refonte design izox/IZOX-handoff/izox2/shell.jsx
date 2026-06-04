// App shells — Sidebar, Topbar, MobileShell.

const NAV_CLIENT = [
  { label: "Dashboard",    icon: <I.doc s={15}/>, href: "/client" },
  { label: "Ma flotte",    icon: <I.car s={15}/>, href: "/client/flotte" },
  { label: "Prestations",  icon: <I.clock s={15}/>, href: "/client/prestations" },
  { label: "Factures",     icon: <I.euro s={15}/>, href: "/client/factures" },
];

const NAV_ADMIN = [
  { label: "Dashboard",        icon: <I.doc s={15}/> },
  { label: "Clients",          icon: <I.user s={15}/> },
  { label: "Contrats",         icon: <I.doc s={15}/> },
  { label: "Véhicules",        icon: <I.car s={15}/> },
  { label: "Demandes gel",     icon: <I.snow s={15}/>, badge: 4 },
  { label: "Demandes RDV",     icon: <I.clock s={15}/>, badge: 2 },
  { label: "Interventions",    icon: <I.check s={15}/> },
];

const Sidebar = ({ items, active, role = "Client", user = { name: "Léa Mercier", org: "Cabify Paris" } }) => (
  <aside style={{
    width: 232, flex: "0 0 232px",
    background: TOK.surface, borderRight: `1px solid ${TOK.line}`,
    padding: "20px 14px 18px", display:"flex", flexDirection:"column", gap: 18,
    boxSizing:"border-box",
  }}>
    <BrandBar size={14} sublabel={role.toUpperCase()}/>
    <div style={{ height: 1, background: TOK.line }}/>
    <nav style={{ display:"flex", flexDirection:"column", gap: 2 }}>
      {items.map(it => {
        const on = it.label === active;
        return (
          <a key={it.label} style={{
            display:"flex", alignItems:"center", gap: 11,
            padding: "10px 12px", borderRadius: TOK.r4,
            fontFamily: TOK.body, fontSize: 13, fontWeight: on ? 600 : 500,
            textTransform: "none", letterSpacing: "0",
            color: on ? TOK.brand : TOK.ink70,
            background: on ? TOK.brandL : "transparent",
            cursor: "pointer", textDecoration: "none",
            position: "relative",
          }}>
            {on && <span style={{ position:"absolute", left:0, top:7, bottom:7, width:3, background: TOK.brand, borderRadius: 2 }}/>}
            <span style={{ color: on ? TOK.brand : TOK.ink50, display:"inline-flex" }}>{it.icon}</span>
            <span>{it.label}</span>
            {it.badge && (
              <span style={{
                marginLeft:"auto", fontFamily: TOK.body, fontSize: 11,
                color: TOK.warn, background: TOK.warnL,
                padding: "1px 7px", borderRadius: 999, fontWeight: 700,
              }}>{it.badge}</span>
            )}
          </a>
        );
      })}
    </nav>

    <div style={{ marginTop: "auto", display:"flex", flexDirection:"column", gap: 8 }}>
      <div style={{
        padding: 14, background: TOK.panel, borderRadius: TOK.r4,
        display:"flex", flexDirection:"column", gap: 6, fontSize: 11,
      }}>
        <Mono size={9}>Quota gel · global</Mono>
        <div style={{ display:"flex", justifyContent:"space-between", fontFamily: TOK.mono, fontWeight: 600, fontSize: 13 }}>
          <span>44<span style={{ color: TOK.ink50 }}>/90 j</span></span>
          <span style={{ color: TOK.brand }}>49%</span>
        </div>
        <div style={{ height: 4, background: TOK.line, borderRadius: 999, overflow:"hidden" }}>
          <span style={{ display:"block", width:"49%", height:"100%", background: TOK.brand }}/>
        </div>
      </div>
      <div style={{ borderTop:`1px solid ${TOK.line}`, paddingTop: 12, display:"flex", alignItems:"center", gap: 10 }}>
        <div style={{ width: 32, height: 32, background: TOK.brand, color: "#fff", borderRadius: 999, fontFamily: TOK.body, fontSize: 12, fontWeight: 700, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
          {(user.name || "").split(" ").map(p=>p[0]).join("").slice(0,2)}
        </div>
        <div style={{ display:"flex", flexDirection:"column", minWidth: 0 }}>
          <span style={{ fontFamily: TOK.body, fontSize: 13, fontWeight: 600 }}>{user.name}</span>
          <Mono size={9}>{user.org}</Mono>
        </div>
      </div>
    </div>
  </aside>
);

const Topbar = ({ crumbs = [], title, sub, right }) => (
  <div style={{
    display:"flex", alignItems:"flex-end", justifyContent:"space-between",
    padding: "20px 28px 18px", borderBottom: `1px solid ${TOK.line}`,
    background: TOK.paper, gap: 18,
  }}>
    <div style={{ minWidth: 0 }}>
      {crumbs.length > 0 && (
        <div style={{ display:"flex", gap: 6, alignItems:"center", marginBottom: 6 }}>
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Mono size={9} color={TOK.ink30}>/</Mono>}
              <Mono size={9} color={i === crumbs.length - 1 ? TOK.ink : TOK.ink50}>{c}</Mono>
            </React.Fragment>
          ))}
        </div>
      )}
      <div style={{
        fontFamily: TOK.head, fontWeight: 700, fontSize: 28,
        letterSpacing: "-0.5px", color: TOK.ink, lineHeight: 1.1,
      }}>{title}</div>
      {sub && <div style={{ fontFamily: TOK.body, fontSize: 13, color: TOK.ink50, marginTop: 5, lineHeight: 1.5 }}>{sub}</div>}
    </div>
    {right && <div style={{ display:"flex", gap: 10, alignItems:"center" }}>{right}</div>}
  </div>
);

const Page = ({ children, style }) => (
  <div style={{
    width:"100%", height:"100%", background: TOK.paper,
    color: TOK.ink, fontFamily: TOK.body, display:"flex", overflow:"hidden",
    ...style,
  }}>{children}</div>
);

// Generic mobile shell (390 wide)
const MobileShell = ({ statusbar = true, header, children, tabbar }) => (
  <div style={{
    width:"100%", height:"100%", background: TOK.paper,
    display:"flex", flexDirection:"column", overflow:"hidden",
    fontFamily: TOK.body, color: TOK.ink,
  }}>
    {statusbar && (
      <div style={{
        height: 30, padding: "8px 22px 0", display:"flex",
        justifyContent:"space-between", alignItems:"center",
        fontFamily: TOK.body, fontSize: 12, fontWeight: 600,
      }}>
        <span>9:41</span>
        <span style={{ display:"inline-flex", gap: 6, alignItems:"center", fontSize: 11 }}>
          ●●●●● <span style={{ width:18, height:9, border:`1px solid ${TOK.ink}`, borderRadius:2, position:"relative" }}>
            <span style={{ position:"absolute", inset:1, background: TOK.ink, width:"80%" }}/>
          </span>
        </span>
      </div>
    )}
    {header}
    <div style={{ flex: 1, overflowY: "auto", display:"flex", flexDirection:"column" }}>
      {children}
    </div>
    {tabbar}
  </div>
);

const MobileTabbar = ({ items, active }) => (
  <div style={{
    display:"flex", justifyContent:"space-around",
    padding: "10px 14px calc(14px + env(safe-area-inset-bottom))",
    borderTop: `1px solid ${TOK.line}`, background: TOK.surface,
  }}>
    {items.map(it => {
      const on = it.label === active;
      return (
        <button key={it.label} style={{
          background: "transparent", border: "none", cursor: "pointer",
          display:"flex", flexDirection:"column", alignItems:"center", gap: 4,
          color: on ? TOK.ink : TOK.ink50, padding: 0,
        }}>
          {it.icon}
          <Mono size={9} color={on ? TOK.ink : TOK.ink50}>{it.label}</Mono>
        </button>
      );
    })}
  </div>
);

// Searchbar
const Search = ({ placeholder = "Rechercher…", style }) => (
  <div style={{
    display:"flex", alignItems:"center", gap: 8,
    background: TOK.surface, border: `1px solid ${TOK.line}`,
    borderRadius: TOK.r4, padding: "8px 12px",
    flex: 1, minWidth: 220, ...style,
  }}>
    <I.search s={14} c={TOK.ink50}/>
    <input placeholder={placeholder} style={{
      border:"none", outline:"none", background:"transparent",
      flex: 1, color: TOK.ink, fontFamily: TOK.body, fontSize: 13,
    }}/>
    <Mono size={9} color={TOK.ink30} style={{ padding: "2px 6px", border: `1px solid ${TOK.line}`, borderRadius: 4 }}>⌘K</Mono>
  </div>
);

// Stepper used by interventions
const Stepper = ({ steps, current }) => (
  <div style={{ display:"flex", alignItems:"center", gap: 0 }}>
    {steps.map((s, i) => {
      const done = i < current, on = i === current;
      const c = done ? TOK.ok : on ? TOK.brand : TOK.ink30;
      return (
        <React.Fragment key={s}>
          <div style={{ display:"flex", alignItems:"center", gap: 12, minWidth: 0 }}>
            <span style={{
              width: 32, height: 32, borderRadius: TOK.r4,
              background: done ? TOK.ok : on ? TOK.brand : TOK.surface,
              color: (done || on) ? "#fff" : TOK.ink50,
              border: `1px solid ${done ? TOK.ok : on ? TOK.brand : TOK.line}`,
              display:"inline-flex", alignItems:"center", justifyContent:"center",
              fontFamily: TOK.mono, fontSize: 12, fontWeight: 700, flex:"0 0 32px",
            }}>{done ? "✓" : String(i+1).padStart(2,"0")}</span>
            <div style={{ display:"flex", flexDirection:"column", gap: 2, minWidth: 0 }}>
              <Mono size={9} color={c}>Étape {i+1}/{steps.length}</Mono>
              <span style={{ fontFamily: TOK.head, fontSize: 14, fontWeight: 600, color: on ? TOK.ink : TOK.ink50, letterSpacing:"-0.2px" }}>{s}</span>
            </div>
          </div>
          {i < steps.length-1 && (
            <div style={{ flex: 1, height: 1, background: done ? TOK.ok : TOK.line, margin: "0 18px", position:"relative", top: -8 }}/>
          )}
        </React.Fragment>
      );
    })}
  </div>
);

Object.assign(window, { NAV_CLIENT, NAV_ADMIN, Sidebar, Topbar, Page, MobileShell, MobileTabbar, Search, Stepper });
