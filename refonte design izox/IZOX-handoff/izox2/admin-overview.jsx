// Admin · Dashboard overview screen.

const A_Dashboard = () => (
  <Page>
    <Sidebar items={NAV_ADMIN} active="Dashboard" role="Admin" user={{ name: "Admin Ops", org: "IZOX · Paris" }}/>
    <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Topbar crumbs={["IZOX · STAFF · 11.06.2026 · 14:32"]}
        title="Vue d'ensemble"
        sub="Opérations · clients · contrats — la semaine en un écran"
        right={<>
          <Search placeholder="Client, véhicule, intervention…" style={{ minWidth: 280 }}/>
          <Btn kind="ghost" size="sm" icon={<I.filter s={12}/>}>Mes clients</Btn>
          <Btn kind="primary" size="sm" icon={<I.plus s={11}/>}>Nouveau client</Btn>
        </>}/>

      <div style={{ padding: 28, overflowY:"auto", display:"flex", flexDirection:"column", gap: 22 }}>
        {/* KPI row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap: 14 }}>
          <Stat label="Clients actifs" value="118" sub="+6 ce mois" accent={TOK.brand}/>
          <Stat label="Véhicules suivis" value="1 184" sub="palier moyen 21–50"/>
          <Stat label="RDV cette semaine" value="42" sub="9 confirmés · 4 attente · 1 refus" accent={TOK.warn}/>
          <Stat label="Interventions / jour" value="14" sub="moyenne 7j" accent={TOK.info}/>
          <Stat label="Demandes gel" value="4" sub="en attente de validation" accent={TOK.warn}/>
        </div>

        {/* Hero + side */}
        <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr", gap: 14 }}>
          <div style={{
            background: TOK.ink, color: "#fff", borderRadius: TOK.r4, padding: 26,
            display:"flex", flexDirection:"column", gap: 18, position:"relative", overflow:"hidden",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <Mono size={10} color="rgba(255,255,255,.6)">Quota gel global · 30 jours</Mono>
              <Mono size={10} color={TOK.brand}>49% utilisé</Mono>
            </div>
            <div style={{ display:"flex", alignItems:"baseline", gap: 8 }}>
              <span style={{ fontFamily: TOK.head, fontSize: 88, fontWeight: 700, letterSpacing:"-1px", lineHeight: .9 }}>44</span>
              <span style={{ fontSize: 22, color: "rgba(255,255,255,.55)" }}>/ 90 jours</span>
            </div>
            <div style={{ position:"relative", height: 8, background: "rgba(255,255,255,.12)", borderRadius: 999, overflow:"hidden", display:"flex" }}>
              <span style={{ width:"24%", background: TOK.brand }}/>
              <span style={{ width:"25%", background: withAlpha(TOK.brand, .45) }}/>
            </div>
            <div style={{ display:"flex", gap: 16, fontSize: 12, fontFamily: TOK.head }}>
              <span><span style={{ display:"inline-block", width:8, height:8, background: TOK.brand, marginRight: 6 }}/>22 en cours</span>
              <span><span style={{ display:"inline-block", width:8, height:8, background: withAlpha(TOK.brand, .45), marginRight: 6 }}/>22 programmés</span>
              <span><span style={{ display:"inline-block", width:8, height:8, background:"rgba(255,255,255,.2)", marginRight: 6 }}/>46 disponibles</span>
            </div>
            <div style={{ position:"absolute", right: -20, top: -10, opacity: .07 }}>
              <I.snow s={200} c="#fff"/>
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
            <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 18 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 14 }}>
                <Mono size={10}>À traiter</Mono>
                <Mono size={9} color={TOK.brand}>5 actions →</Mono>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap: 10 }}>
                {[
                  ["G-014","Cabify · gel 22j","attente","warn"],
                  ["G-013","Bolt · gel 21j","attente","warn"],
                  ["R-082","LeasePlan · RDV jeu.","attente","warn"],
                  ["INT-319","Heetch · signature","retard","danger"],
                  ["G-012","Pavyllon · validée","prêt","info"],
                ].map((r, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding: "6px 0", borderTop: i ? `1px dashed ${TOK.line}` : "none" }}>
                    <div style={{ display:"flex", flexDirection:"column", gap: 2 }}>
                      <Mono size={9}>#{r[0]}</Mono>
                      <span style={{ fontFamily: TOK.head, fontWeight: 600, fontSize: 12 }}>{r[1]}</span>
                    </div>
                    <Tag tone={r[3]} dot>{r[2]}</Tag>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent clients + Recent interventions */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 14 }}>
          <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 22 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom: 14 }}>
              <Mono size={10}>Top clients · CA mensuel</Mono>
              <Mono size={9} color={TOK.brand}>Voir tout →</Mono>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap: 10 }}>
              {[
                ["Hertz CDG","Location",82,"2 990 €"],
                ["LeasePlan FR","Location",44,"1 240 €"],
                ["Heetch Ops","VTC",28,"1 480 €"],
                ["Bolt France","VTC",19,"640 €"],
                ["Cabify Paris","VTC",12,"409 €"],
              ].map((r, i) => (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto", gap: 12, alignItems:"center", padding: "6px 0", borderTop: i ? `1px dashed ${TOK.line}` : "none" }}>
                  <span style={{ fontFamily: TOK.head, fontWeight: 600, fontSize: 13 }}>{r[0]}</span>
                  <Tag tone={r[1] === "VTC" ? "brand" : "info"} square>{r[1]}</Tag>
                  <Mono size={10}>{r[2]} véh.</Mono>
                  <span style={{ fontFamily: TOK.head, fontWeight: 700, color: TOK.brand }}>{r[3]}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 22 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom: 14 }}>
              <Mono size={10}>Interventions · aujourd'hui</Mono>
              <Mono size={9} color={TOK.brand}>Planning →</Mono>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap: 8 }}>
              {[
                ["08:00","AB-123-CD","Karim B.","terminée","ok"],
                ["09:30","DE-234-FG","Karim B.","en cours","warn"],
                ["10:15","HI-345-JK","Sofia T.","en cours","warn"],
                ["11:00","FR-987-XK","Sofia T.","planifiée","neutral"],
                ["13:30","BC-890-DE","Yann L.","planifiée","neutral"],
              ].map((r, i) => (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"60px 1fr 1fr auto", gap: 12, alignItems:"center", padding: "8px 0", borderTop: i ? `1px dashed ${TOK.line}` : "none" }}>
                  <Mono size={11} color={TOK.ink}>{r[0]}</Mono>
                  <span style={{ fontFamily: TOK.head, fontWeight: 600, fontSize: 13 }}>{r[1]}</span>
                  <Mono size={10} color={TOK.ink50}>op. {r[2]}</Mono>
                  <Tag tone={r[4]} dot>{r[3]}</Tag>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  </Page>
);

Object.assign(window, { A_Dashboard });
