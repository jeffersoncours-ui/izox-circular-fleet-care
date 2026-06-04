// /client/impact — RSE dashboard (populated + 2 empty states).

const NAV_CLIENT_IMPACT = [
  { label: "Dashboard",    icon: <I.doc s={15}/> },
  { label: "Ma flotte",    icon: <I.car s={15}/> },
  { label: "Prestations",  icon: <I.clock s={15}/> },
  { label: "Impact RSE",   icon: <I.leaf s={15}/> },
  { label: "Factures",     icon: <I.euro s={15}/> },
];

const ImpactHero = () => (
  <div style={{
    position:"relative", borderRadius: TOK.r6, overflow:"hidden",
    border: `1px solid ${TOK.line}`, minHeight: 168,
    display:"flex", alignItems:"stretch",
  }}>
    <div style={{ position:"absolute", inset: 0 }}>
      <img src={PHOTOS.forest} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
      <div style={{ position:"absolute", inset: 0, background: "linear-gradient(100deg, rgba(15,47,35,0.94) 0%, rgba(27,67,50,0.82) 48%, rgba(31,138,91,0.45) 100%)" }}/>
    </div>
    <div style={{ position:"relative", padding: 26, display:"flex", flexDirection:"column", justifyContent:"center", gap: 10, color:"#fff", flex: 1 }}>
      <span style={{ display:"inline-flex", alignItems:"center", gap: 8, fontFamily: TOK.body, fontSize: 11, fontWeight: 600, letterSpacing:".06em", textTransform:"uppercase", color:"#A7E0C4" }}>
        <I.leaf s={14} c="#A7E0C4"/> Impact environnemental · 2026
      </span>
      <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 30, letterSpacing:"-0.5px", lineHeight: 1.1, maxWidth: 520 }}>
        Votre flotte a économisé <span style={{ color:"#7CC9A5" }}>184 600 L d’eau</span> cette année
      </div>
      <div style={{ fontFamily: TOK.body, fontSize: 13, color:"rgba(255,255,255,.8)" }}>
        Soit l’équivalent de 1 230 lavages traditionnels évités · 38 interventions éco-responsables
      </div>
    </div>
    <div style={{ position:"relative", padding: 26, display:"flex", flexDirection:"column", justifyContent:"center", gap: 10, minWidth: 200 }}>
      <div style={{ background:"rgba(255,255,255,.12)", backdropFilter:"blur(4px)", border:"1px solid rgba(255,255,255,.2)", borderRadius: TOK.r4, padding: 14, color:"#fff" }}>
        <Mono size={9} color="rgba(255,255,255,.7)">Score RSE flotte</Mono>
        <div style={{ display:"flex", alignItems:"baseline", gap: 4, marginTop: 6 }}>
          <span style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 34, letterSpacing:"-1px" }}>A+</span>
          <span style={{ fontSize: 12, color:"rgba(255,255,255,.7)" }}>· top 8%</span>
        </div>
      </div>
    </div>
  </div>
);

const FiltersBar = ({ note }) => (
  <div style={{ display:"flex", alignItems:"center", gap: 10, flexWrap:"wrap" }}>
    <FilterPill label="Période" value="Jan – Déc 2026" icon={<I.cal s={14}/>}/>
    <FilterPill label="Véhicule" value="Toute la flotte" icon={<I.car s={14}/>}/>
    {note && <span style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink50, marginLeft: 4 }}>{note}</span>}
    <span style={{ flex: 1 }}/>
    <Btn kind="ghost" size="sm" icon={<I.download s={13}/>}>Export CSV</Btn>
    <Btn kind="ghost" size="sm" icon={<I.print s={13}/>}>Imprimer</Btn>
  </div>
);

const C_Impact = () => (
  <Page>
    <Sidebar items={NAV_CLIENT_IMPACT} active="Impact RSE" role="Client"/>
    <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Topbar crumbs={["Client","Impact RSE"]} title="Impact RSE"
        sub="Le bénéfice environnemental de vos lavages éco-responsables"
        right={<Tag tone="ok" dot>38 interventions validées</Tag>}/>
      <div style={{ padding: 28, overflowY:"auto", display:"flex", flexDirection:"column", gap: 20 }}>
        <ImpactHero/>
        <FiltersBar/>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 16 }}>
          <MetricCard eco={ECO.eau}       value="184 600" delta={12} series={[20,32,28,45,52,60,58,72,80,76,88,95]}/>
          <MetricCard eco={ECO.pollution} value="42 300"  delta={8}  series={[10,14,18,16,22,28,30,34,38,40,44,48]}/>
          <MetricCard eco={ECO.compost}   value="1 240"   delta={15} series={[4,8,10,14,18,20,26,30,32,38,42,46]}/>
          <MetricCard eco={ECO.co2}       value="3 180"   delta={6}  series={[30,34,32,40,44,48,52,50,58,62,66,70]}/>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1.6fr 1fr", gap: 16 }}>
          <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r6, padding: 22, boxShadow: TOK.shadow }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 16 }}>
              <div>
                <Mono size={10}>Eau économisée · mensuel</Mono>
                <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 18, letterSpacing:"-0.5px", marginTop: 6 }}>Évolution sur 12 mois</div>
              </div>
              <div style={{ display:"flex", gap: 6 }}>
                <Tag tone="brand">Eau</Tag>
                <Tag tone="neutral">CO₂</Tag>
              </div>
            </div>
            <MonthlyChart
              data={[8200,10400,9800,12600,14200,15800,15200,17600,19200,18400,21200,22000]}
              labels={["J","F","M","A","M","J","J","A","S","O","N","D"]}
              color={TOK.accent}/>
          </div>

          <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r6, padding: 22, boxShadow: TOK.shadow, display:"flex", flexDirection:"column", gap: 14 }}>
            <Mono size={10}>Équivalences concrètes</Mono>
            {[
              [I.drop,    "184 600 L d’eau",  "≈ 1 230 lavages classiques évités", "#2A6FDB", "#D5E2F6"],
              [I.leaf,    "42,3 kg de polluants", "≈ filtration de 6 piscines", "#1F8A5B", "#DCEEE4"],
              [I.cloud,   "3,18 t de CO₂",    "≈ 14 200 km en voiture thermique", "#0F2F23", "#E7EFEA"],
            ].map(([Ic, a, b, c, s], i) => (
              <div key={i} style={{ display:"flex", gap: 12, alignItems:"center", paddingBottom: 12, borderBottom: i<2?`1px solid ${TOK.line}`:"none" }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: s, display:"inline-flex", alignItems:"center", justifyContent:"center", flex:"0 0 40px" }}>{Ic({ s: 20, c: c })}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 15, letterSpacing:"-0.3px" }}>{a}</div>
                  <div style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink50 }}>{b}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  </Page>
);

// Empty 1 — Aucune donnée (pas encore d'interventions validées)
const C_Impact_NoData = () => (
  <Page>
    <Sidebar items={NAV_CLIENT_IMPACT} active="Impact RSE" role="Client"/>
    <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Topbar crumbs={["Client","Impact RSE"]} title="Impact RSE"
        sub="Le bénéfice environnemental de vos lavages éco-responsables"
        right={<Tag tone="neutral" dot>0 intervention validée</Tag>}/>
      <div style={{ padding: 28, display:"flex", flexDirection:"column", gap: 20, flex: 1 }}>
        <FiltersBar/>
        {/* Ghost metric cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 16 }}>
          {Object.values(ECO).map(eco => (
            <div key={eco.key} style={{ background: TOK.surface, border:`1px solid ${TOK.line}`, borderRadius: TOK.r6, padding: 20, display:"flex", flexDirection:"column", gap: 14, opacity: .7 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: TOK.panel, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>{eco.icon({ s: 22, c: TOK.ink30 })}</div>
              <div>
                <Mono size={9} color={TOK.ink30}>{eco.label}</Mono>
                <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 34, letterSpacing:"-1px", color: TOK.ink30, marginTop: 8 }}>—</div>
              </div>
              <div style={{ height: 34, background: `repeating-linear-gradient(90deg, ${TOK.panel}, ${TOK.panel} 6px, transparent 6px, transparent 12px)`, borderRadius: 4 }}/>
            </div>
          ))}
        </div>
        <EmptyState icon={<I.leaf/>} eyebrow="Aucune donnée RSE"
          title="Vos premières interventions arrivent bientôt"
          body="Dès qu’une intervention sur l’un de vos véhicules sera validée par nos équipes, son impact environnemental sera calculé et affiché ici."
          cta={{ label: "Prendre un rendez-vous", icon: <I.cal s={12} c="#fff"/> }}
          secondary={{ label: "Comment c’est calculé ?" }}
          compact/>
      </div>
    </main>
  </Page>
);

// Empty 2 — Filtres sans résultat
const C_Impact_FilterEmpty = () => (
  <Page>
    <Sidebar items={NAV_CLIENT_IMPACT} active="Impact RSE" role="Client"/>
    <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Topbar crumbs={["Client","Impact RSE"]} title="Impact RSE"
        sub="Le bénéfice environnemental de vos lavages éco-responsables"
        right={<Tag tone="ok" dot>38 interventions validées</Tag>}/>
      <div style={{ padding: 28, display:"flex", flexDirection:"column", gap: 20, flex: 1 }}>
        <div style={{ display:"flex", alignItems:"center", gap: 10, flexWrap:"wrap" }}>
          <FilterPill label="Période" value="Févr. 2026" icon={<I.cal s={14}/>}/>
          <FilterPill label="Véhicule" value="FG-901-HI" icon={<I.car s={14}/>}/>
          <span style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.warn, marginLeft: 4, display:"inline-flex", alignItems:"center", gap: 6 }}>
            <I.filter s={13} c={TOK.warn}/> Aucun résultat pour cette combinaison
          </span>
          <span style={{ flex: 1 }}/>
          <Btn kind="ghost" size="sm" icon={<I.download s={13}/>}>Export CSV</Btn>
          <Btn kind="ghost" size="sm" icon={<I.print s={13}/>}>Imprimer</Btn>
        </div>
        <EmptyState icon={<I.filter/>} tone="warn" eyebrow="Filtres sans résultat"
          title="Aucune donnée sur cette période"
          body="Le véhicule FG-901-HI n’a pas d’intervention validée en février 2026. Élargissez la période ou choisissez un autre véhicule."
          cta={{ label: "Réinitialiser les filtres", icon: <I.x s={12} c="#fff"/> }}
          secondary={{ label: "Toute la flotte" }}
          compact/>
      </div>
    </main>
  </Page>
);

Object.assign(window, { NAV_CLIENT_IMPACT, C_Impact, C_Impact_NoData, C_Impact_FilterEmpty });
