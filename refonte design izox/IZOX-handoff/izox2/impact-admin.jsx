// /admin/impact — RSE coefficients + validation queue (populated + 2 empty states).

const NAV_ADMIN_IMPACT = [
  { label: "Dashboard",        icon: <I.doc s={15}/> },
  { label: "Clients",          icon: <I.user s={15}/> },
  { label: "Contrats",         icon: <I.doc s={15}/> },
  { label: "Véhicules",        icon: <I.car s={15}/> },
  { label: "Impact RSE",       icon: <I.leaf s={15}/>, badge: 3 },
  { label: "Demandes gel",     icon: <I.snow s={15}/>, badge: 4 },
  { label: "Interventions",    icon: <I.check s={15}/> },
];

// Editable coefficient row
const CoeffRow = ({ eco, value, last }) => (
  <div style={{
    display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr 90px", gap: 16, alignItems:"center",
    padding: "14px 16px", borderTop: last ? "none" : `1px solid ${TOK.line}`,
  }}>
    <div style={{ display:"flex", alignItems:"center", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: eco.soft, display:"inline-flex", alignItems:"center", justifyContent:"center", flex:"0 0 36px" }}>{eco.icon({ s: 18, c: eco.color })}</div>
      <div>
        <div style={{ fontFamily: TOK.body, fontWeight: 600, fontSize: 14 }}>{eco.label}</div>
        <Mono size={9}>par litre traité</Mono>
      </div>
    </div>
    <div style={{ display:"flex", alignItems:"center", gap: 8 }}>
      <div style={{
        display:"inline-flex", alignItems:"center", gap: 6,
        border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: "7px 10px", background: TOK.surface, minWidth: 110,
      }}>
        <Data size={13} weight={600}>{value}</Data>
        <span style={{ fontFamily: TOK.body, fontSize: 11, color: TOK.ink50 }}>{eco.unit}/L</span>
        <I.pen s={12} c={TOK.ink30} style={{ marginLeft:"auto" }}/>
      </div>
    </div>
    <div style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink50 }}>
      Modifié <Data size={11} color={TOK.ink70}>08.05.2026</Data>
    </div>
    <div style={{ textAlign:"right" }}>
      <Tag tone="ok" dot>actif</Tag>
    </div>
  </div>
);

const CoeffTable = () => (
  <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r6, overflow:"hidden", boxShadow: TOK.shadow }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding: "16px 18px", borderBottom: `1px solid ${TOK.line}`, background: TOK.panel }}>
      <div style={{ display:"flex", alignItems:"center", gap: 10 }}>
        <I.sliders s={16} c={TOK.brand}/>
        <div>
          <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 15, letterSpacing:"-0.3px" }}>Coefficients RSE</div>
          <Mono size={9}>Barème de calcul d’impact · v3</Mono>
        </div>
      </div>
      <Btn kind="ghost" size="sm" icon={<I.pen s={12}/>}>Éditer le barème</Btn>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr 90px", gap: 16, padding: "10px 16px", background: TOK.surface, borderBottom: `1px solid ${TOK.line}` }}>
      {["Indicateur","Coefficient","Dernière maj","Statut"].map((h,i)=>(
        <Mono key={i} size={9} style={{ textAlign: i===3?"right":"left" }}>{h}</Mono>
      ))}
    </div>
    <CoeffRow eco={{ ...ECO.eau, unit:"L" }}        value="0,82"/>
    <CoeffRow eco={{ ...ECO.pollution, unit:"g" }}  value="0,19"/>
    <CoeffRow eco={{ ...ECO.compost, unit:"g" }}    value="5,40"/>
    <CoeffRow eco={{ ...ECO.co2, unit:"g" }}        value="14,2" last/>
  </div>
);

// Validation queue row
const QueueRow = ({ immat, client, op, date, vol, last }) => (
  <div style={{ display:"flex", alignItems:"center", gap: 14, padding: "12px 16px", borderTop: last ? "none" : `1px solid ${TOK.line}` }}>
    <div style={{ width: 36, height: 36, borderRadius: 10, background: TOK.brandL, display:"inline-flex", alignItems:"center", justifyContent:"center", flex:"0 0 36px" }}><I.check s={16} c={TOK.brand}/></div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display:"flex", alignItems:"center", gap: 8 }}>
        <Data size={14} weight={600}>{immat}</Data>
        <Tag tone="warn" dot>à accuser réception</Tag>
      </div>
      <div style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink50, marginTop: 3 }}>{client} · op. {op} · {date}</div>
    </div>
    <div style={{ textAlign:"right" }}>
      <Mono size={9}>Volume traité</Mono>
      <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 16, letterSpacing:"-0.3px" }}>{vol} <span style={{ fontSize: 11, color: TOK.ink50, fontWeight: 500 }}>L</span></div>
    </div>
    <Btn kind="primary" size="sm" icon={<I.check s={11}/>}>Accuser réception</Btn>
  </div>
);

const A_Impact = () => (
  <Page>
    <Sidebar items={NAV_ADMIN_IMPACT} active="Impact RSE" role="Admin" user={ADMIN_USER}/>
    <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Topbar crumbs={["Admin","Impact RSE"]} title="Impact RSE"
        sub="Barème de calcul et validation des interventions éco-responsables"
        right={<><Tag tone="warn" dot>3 à valider</Tag><Btn kind="ghost" size="sm" icon={<I.download s={12}/>}>Rapport RSE</Btn></>}/>
      <div style={{ padding: 28, overflowY:"auto", display:"flex", flexDirection:"column", gap: 20 }}>
        {/* KPIs */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 16 }}>
          <Stat label="Interventions validées" value="1 842" sub="+128 ce mois" accent={TOK.brand}/>
          <Stat label="Eau économisée · total" value="2,4M" suffix="L" sub="depuis janv. 2026" accent={TOK.info}/>
          <Stat label="CO₂ évité · total" value="38,6" suffix="t" sub="≈ 172 000 km" accent={TOK.ink}/>
          <Stat label="À accuser réception" value="3" sub="file de validation" accent={TOK.warn}/>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr", gap: 16, alignItems:"start" }}>
          <CoeffTable/>

          <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r6, overflow:"hidden", boxShadow: TOK.shadow }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding: "16px 18px", borderBottom: `1px solid ${TOK.line}`, background: TOK.panel }}>
              <div style={{ display:"flex", alignItems:"center", gap: 10 }}>
                <I.inbox s={16} c={TOK.warn}/>
                <div>
                  <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 15, letterSpacing:"-0.3px" }}>File de validation</div>
                  <Mono size={9}>3 interventions à accuser réception</Mono>
                </div>
              </div>
              <Btn kind="ghost" size="sm">Tout valider</Btn>
            </div>
            <QueueRow immat="AB-123-CD" client="Cabify Paris" op="Karim B." date="11.06 · 09:30" vol="142"/>
            <QueueRow immat="DE-234-FG" client="Bolt France" op="Sofia T." date="11.06 · 11:00" vol="98"/>
            <QueueRow immat="HI-345-JK" client="LeasePlan FR" op="Yann L." date="10.06 · 16:00" vol="120" last/>
          </div>
        </div>
      </div>
    </main>
  </Page>
);

// Empty 1 — Aucune intervention validée → coefficients visibles, stats vides
const A_Impact_NoData = () => (
  <Page>
    <Sidebar items={NAV_ADMIN_IMPACT.map(n => n.label==="Impact RSE" ? {...n, badge: undefined} : n)} active="Impact RSE" role="Admin" user={ADMIN_USER}/>
    <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Topbar crumbs={["Admin","Impact RSE"]} title="Impact RSE"
        sub="Barème de calcul et validation des interventions éco-responsables"
        right={<Tag tone="neutral" dot>0 intervention validée</Tag>}/>
      <div style={{ padding: 28, overflowY:"auto", display:"flex", flexDirection:"column", gap: 20 }}>
        {/* Ghost KPIs */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 16 }}>
          {["Interventions validées","Eau économisée · total","CO₂ évité · total","Ce mois"].map((l,i)=>(
            <div key={i} style={{ background: TOK.surface, border:`1px solid ${TOK.line}`, borderRadius: TOK.r6, padding: 20, display:"flex", flexDirection:"column", gap: 10, opacity:.75 }}>
              <Mono size={9} color={TOK.ink30}>{l}</Mono>
              <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 34, letterSpacing:"-1px", color: TOK.ink30 }}>—</div>
              <div style={{ fontFamily: TOK.body, fontSize: 11, color: TOK.ink30 }}>Aucune donnée</div>
            </div>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr", gap: 16, alignItems:"start" }}>
          {/* Coefficients STAY visible */}
          <div style={{ display:"flex", flexDirection:"column", gap: 8 }}>
            <CoeffTable/>
            <div style={{ display:"flex", alignItems:"center", gap: 8, padding:"2px 4px" }}>
              <I.check s={13} c={TOK.ok}/>
              <span style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink50 }}>Le barème reste éditable même sans données — il s’appliquera aux futures interventions.</span>
            </div>
          </div>

          {/* Stats/graph zone empty */}
          <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r6, minHeight: 300, boxShadow: TOK.shadow }}>
            <EmptyState icon={<I.chart/>} eyebrow="Statistiques vides"
              title="Aucune donnée RSE à afficher"
              body="Les graphiques et totaux d’impact se rempliront automatiquement dès la première intervention accusée réception."
              secondary={{ label: "Voir les interventions" }}
              compact/>
          </div>
        </div>
      </div>
    </main>
  </Page>
);

// Empty 2 — File de validation vide (toutes accusées réception)
const A_Impact_QueueEmpty = () => (
  <Page>
    <Sidebar items={NAV_ADMIN_IMPACT.map(n => n.label==="Impact RSE" ? {...n, badge: undefined} : n)} active="Impact RSE" role="Admin" user={ADMIN_USER}/>
    <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Topbar crumbs={["Admin","Impact RSE"]} title="Impact RSE"
        sub="Barème de calcul et validation des interventions éco-responsables"
        right={<><Tag tone="ok" dot>File à jour</Tag><Btn kind="ghost" size="sm" icon={<I.download s={12}/>}>Rapport RSE</Btn></>}/>
      <div style={{ padding: 28, overflowY:"auto", display:"flex", flexDirection:"column", gap: 20 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 16 }}>
          <Stat label="Interventions validées" value="1 845" sub="+131 ce mois" accent={TOK.brand}/>
          <Stat label="Eau économisée · total" value="2,4M" suffix="L" sub="depuis janv. 2026" accent={TOK.info}/>
          <Stat label="CO₂ évité · total" value="38,7" suffix="t" sub="≈ 172 400 km" accent={TOK.ink}/>
          <Stat label="À accuser réception" value="0" sub="file vide" accent={TOK.ok}/>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr", gap: 16, alignItems:"start" }}>
          <CoeffTable/>
          <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r6, minHeight: 320, boxShadow: TOK.shadow, display:"flex", flexDirection:"column" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding: "16px 18px", borderBottom: `1px solid ${TOK.line}`, background: TOK.panel }}>
              <div style={{ display:"flex", alignItems:"center", gap: 10 }}>
                <I.inbox s={16} c={TOK.ok}/>
                <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 15, letterSpacing:"-0.3px" }}>File de validation</div>
              </div>
              <Tag tone="ok" dot>0 en attente</Tag>
            </div>
            <EmptyState icon={<I.check/>} tone="info" eyebrow="Tout est à jour"
              title="File de validation vide"
              body="Toutes les interventions ont été accusées réception. Leur impact est désormais comptabilisé dans les statistiques RSE."
              secondary={{ label: "Voir l’historique" }}
              compact/>
          </div>
        </div>
      </div>
    </main>
  </Page>
);

Object.assign(window, { NAV_ADMIN_IMPACT, A_Impact, A_Impact_NoData, A_Impact_QueueEmpty });
