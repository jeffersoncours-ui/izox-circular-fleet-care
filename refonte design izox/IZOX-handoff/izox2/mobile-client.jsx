// Mobile Client app — 5 screens (Pilo-style premium).
// Each screen is sized 390 wide. They share MobileShell.

const MTABS_CLIENT = [
  { label: "Flotte",       icon: <I.car  s={20}/> },
  { label: "RDV",          icon: <I.clock s={20}/> },
  { label: "Factures",     icon: <I.euro s={20}/> },
  { label: "Profil",       icon: <I.user s={20}/> },
];

const MHead = ({ title, sub, back, right }) => (
  <div style={{ padding: "10px 22px 14px", borderBottom: `1px solid ${TOK.line}`, background: TOK.paper }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 8 }}>
      {back ? <button style={{ background:"transparent", border:`1px solid ${TOK.line}`, borderRadius: TOK.r2, padding: 6, cursor:"pointer", color: TOK.ink }}><I.chevL s={14}/></button> : <IzoxMark size={28}/>}
      <div style={{ display:"inline-flex", gap: 8, alignItems:"center" }}>
        {right || <>
          <button style={{ background:"transparent", border:`1px solid ${TOK.line}`, borderRadius: TOK.r2, padding: 6, cursor:"pointer", color: TOK.ink, position:"relative" }}>
            <I.bell s={14}/>
            <span style={{ position:"absolute", top: -3, right: -3, width: 14, height: 14, background: TOK.brand, color: "#fff", fontSize: 9, fontFamily: TOK.head, fontWeight: 700, borderRadius: 999, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>3</span>
          </button>
        </>}
      </div>
    </div>
    {sub && <Mono size={9}>{sub}</Mono>}
    <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 26, letterSpacing:"-0.6px", lineHeight: 1.1, marginTop: sub ? 4 : 0 }}>{title}</div>
  </div>
);

// ─── M01 · Dashboard ───────────────────────────────────────────────────
const M_Dashboard = () => (
  <MobileShell
    header={<MHead title={<>Bonjour Léa <span style={{ color: TOK.brand }}>↵</span></>} sub="MARDI 11 JUIN · CABIFY PARIS"/>}
    tabbar={<MobileTabbar items={MTABS_CLIENT} active="Flotte"/>}
  >
    <div style={{ padding: "18px 18px 24px", display:"flex", flexDirection:"column", gap: 16 }}>
      {/* Hero stat */}
      <div style={{
        background: TOK.ink, color: "#fff", borderRadius: TOK.r6, padding: 22,
        display:"flex", flexDirection:"column", gap: 16, position:"relative", overflow:"hidden",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <Mono size={10} color="rgba(255,255,255,.6)">Votre flotte</Mono>
          <Mono size={10} color={TOK.brand}>+2 ce mois</Mono>
        </div>
        <div style={{ display:"flex", alignItems:"baseline", gap: 6 }}>
          <span style={{ fontSize: 72, fontWeight: 700, fontFamily: TOK.head, letterSpacing:"-1px", lineHeight: .9 }}>12</span>
          <span style={{ fontSize: 14, color: "rgba(255,255,255,.6)" }}>véhicules</span>
        </div>
        <div style={{ display:"flex", gap: 10, fontSize: 12, fontFamily: TOK.head }}>
          <span style={{ display:"flex", alignItems:"center", gap: 6 }}><span style={{ width:8, height:8, background: TOK.brand, borderRadius:2 }}/>9 actifs</span>
          <span style={{ display:"flex", alignItems:"center", gap: 6 }}><span style={{ width:8, height:8, background: "#fff", opacity:.45, borderRadius:2 }}/>2 gelés</span>
          <span style={{ display:"flex", alignItems:"center", gap: 6 }}><span style={{ width:8, height:8, background: TOK.warn, borderRadius:2 }}/>1 attente</span>
        </div>
        <div style={{ position:"absolute", right: -20, bottom: -10, opacity:.07 }}>
          <I.car s={160} c="#fff"/>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 10 }}>
        <QuickTile label="Demander RDV" sub="Nettoyage premium" icon={<I.clock s={16}/>} accent/>
        <QuickTile label="Demander gel" sub="Immobiliser" icon={<I.snow s={16}/>}/>
        <QuickTile label="Ajouter véhicule" sub="Sous votre contrat" icon={<I.plus s={16}/>}/>
        <QuickTile label="Voir factures" sub="3 en attente" icon={<I.euro s={16}/>}/>
      </div>

      {/* Upcoming RDV */}
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom: 10 }}>
          <div style={{ fontFamily: TOK.head, fontSize: 16, fontWeight: 700, letterSpacing:"-0.01em" }}>Prochain RDV</div>
          <Mono size={10} color={TOK.brand}>Tout voir →</Mono>
        </div>
        <div style={{
          background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4,
          padding: 14, display:"flex", gap: 14, alignItems:"center",
        }}>
          <div style={{
            width: 56, height: 56, background: TOK.brandL, color: TOK.brand,
            borderRadius: TOK.r4, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            fontFamily: TOK.head, fontWeight: 700,
          }}>
            <span style={{ fontSize: 10, letterSpacing:".1em" }}>JEU</span>
            <span style={{ fontSize: 22, letterSpacing:"-0.4px" }}>13</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 15 }}>AB-123-CD</div>
            <div style={{ fontSize: 12, color: TOK.ink50 }}>Vito · Lavage Standard · 09:30</div>
            <div style={{ display:"flex", gap: 6, marginTop: 6 }}>
              <Tag tone="ok" dot>confirmée</Tag>
              <Mono size={9}><I.loc s={10}/> Paris 17e</Mono>
            </div>
          </div>
          <I.chevR s={16} c={TOK.ink50}/>
        </div>
      </div>

      {/* My fleet preview */}
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom: 10 }}>
          <div style={{ fontFamily: TOK.head, fontSize: 16, fontWeight: 700, letterSpacing:"-0.01em" }}>Ma flotte</div>
          <Mono size={10} color={TOK.brand}>12 véh. →</Mono>
        </div>
        <div style={{ display:"flex", gap: 10, overflowX:"auto", scrollSnapType:"x mandatory", margin: "0 -18px", padding: "0 18px 4px" }}>
          {[
            { i:"AB-123-CD", p:"Standard", s:"actif", st:"ok", ph: PHOTOS.vito },
            { i:"FR-987-XK", p:"VTC",      s:"gelé",  st:"info", ph: PHOTOS.tesla },
            { i:"PQ-567-RS", p:"Intérieur", s:"en attente", st:"warn", ph: PHOTOS.trafic },
          ].map((v,i) => (
            <div key={i} style={{ flex:"0 0 240px", scrollSnapAlign: "start" }}>
              <VehicleCard immat={v.i} pack={v.p} status={v.s} statusTone={v.st} photo={v.ph} model="—"/>
            </div>
          ))}
        </div>
      </div>

      {/* Contract footer */}
      <div style={{
        background: TOK.panel, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4,
        padding: 14, display:"flex", flexDirection:"column", gap: 8,
      }}>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <Mono size={9}>Contrat · IZ-2026-0148</Mono>
          <Tag tone="brand" dot>actif</Tag>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
          <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 24 }}>409<span style={{ color: TOK.brand }}>€</span> <span style={{ fontSize: 12, color: TOK.ink50, fontWeight: 500 }}>HT/mo</span></div>
          <Mono size={9}>palier 11–20</Mono>
        </div>
      </div>
    </div>
  </MobileShell>
);

// Quick-tile (reused on dashboard)
const QuickTile = ({ label, sub, icon, accent }) => (
  <button style={{
    background: accent ? TOK.ink : TOK.surface,
    color: accent ? "#fff" : TOK.ink,
    border: accent ? "none" : `1px solid ${TOK.line}`,
    borderRadius: TOK.r4, padding: 14, textAlign:"left", cursor:"pointer",
    display:"flex", flexDirection:"column", gap: 10, fontFamily: TOK.head,
  }}>
    <span style={{ color: accent ? TOK.brand : TOK.brand, display:"inline-flex" }}>{icon}</span>
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing:"-0.01em" }}>{label}</div>
      <div style={{ fontSize: 10, color: accent ? "rgba(255,255,255,.55)" : TOK.ink50, marginTop: 3 }}>{sub}</div>
    </div>
  </button>
);

Object.assign(window, { M_Dashboard, MTABS_CLIENT, MHead, QuickTile });
