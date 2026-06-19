// Admin · Clients table + Fiche client (4 onglets).

const A_Clients = () => {
  const rows = [
    ["CL-104","Cabify Paris SAS","VTC","fleet@cabify.fr",12,1,"actif"],
    ["CL-097","LeasePlan France","Location","fleet@leaseplan.fr",44,3,"actif"],
    ["CL-082","Restaurant Pavyllon","PME","compta@pavyllon.com",3,0,"actif"],
    ["CL-079","Heetch Operations","VTC","ops@heetch.com",28,4,"en_cours_gel"],
    ["CL-061","Hertz Charles-de-Gaulle","Location","cdg@hertz.fr",82,2,"actif"],
    ["CL-040","Bolt France","VTC","fleet@bolt.eu",19,1,"actif"],
    ["CL-031","Air France Crew","PME","crew@airfrance.fr",6,0,"actif"],
    ["CL-018","Sixt SA","Location","compta@sixt.fr",60,0,"résilié"],
  ];
  return (
    <Page>
      <Sidebar items={NAV_ADMIN} active="Clients" role="Admin" user={{ name: "Admin Ops", org: "IZOX · Paris" }}/>
      <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Topbar crumbs={["Admin","Clients"]} title="Clients" sub="124 clients · 47 VTC · 39 Location · 38 PME"
          right={<>
            <Search placeholder="Nom, email, immatriculation…" style={{ minWidth: 300 }}/>
            <Btn kind="ghost" size="sm" icon={<I.filter s={12}/>}>Filtres</Btn>
            <Btn kind="primary" size="sm" icon={<I.plus s={11}/>}>Nouveau client</Btn>
          </>}/>
        <div style={{ padding: 28, overflowY:"auto", display:"flex", flexDirection:"column", gap: 16 }}>
          <div style={{ display:"flex", gap: 8, alignItems:"center", flexWrap:"wrap" }}>
            <Mono size={10}>Filtrer</Mono>
            <Tag tone="invert" dot>Tous · 124</Tag>
            <Tag tone="brand" square>VTC · 47</Tag>
            <Tag tone="info" square>Location · 39</Tag>
            <Tag tone="neutral" square>PME · 38</Tag>
            <span style={{ flex: 1 }}/>
            <Tag tone="ok" dot>Mes clients · 14</Tag>
          </div>

          <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontFamily: TOK.body, fontSize: 13 }}>
              <thead>
                <tr style={{ background: TOK.panel }}>
                  {["#","Entreprise","Type","Email","Véhicules","Gelés","Statut",""].map((h, i) => (
                    <th key={i} style={{
                      textAlign: i===7 ? "right" : "left", padding: "12px 16px",
                      fontFamily: TOK.head, fontSize: 10,
                      letterSpacing:".14em", textTransform:"uppercase",
                      color: TOK.ink50, fontWeight: 600, borderBottom: `1px solid ${TOK.line}`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderTop: i ? `1px solid ${TOK.line}` : "none" }}>
                    <td style={{ padding: "14px 16px", color: TOK.ink50 }}>{r[0]}</td>
                    <td style={{ padding: "14px 16px", fontWeight: 700, color: TOK.ink }}>{r[1]}</td>
                    <td style={{ padding: "14px 16px" }}><Tag tone={r[2]==="VTC"?"brand":r[2]==="Location"?"info":"neutral"} square>{r[2]}</Tag></td>
                    <td style={{ padding: "14px 16px", color: TOK.ink50 }}>{r[3]}</td>
                    <td style={{ padding: "14px 16px", color: TOK.ink, fontWeight: 600 }}>{r[4]}</td>
                    <td style={{ padding: "14px 16px", color: r[5] > 0 ? TOK.info : TOK.ink30, fontWeight: 600 }}>{r[5]}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <Tag tone={r[6]==="actif"?"brand":r[6]==="en_cours_gel"?"info":"danger"} dot>{r[6]}</Tag>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign:"right" }}>
                      <span style={{ display:"inline-flex", gap: 4 }}>
                        <button style={{ background:"transparent", border:`1px solid ${TOK.line}`, color: TOK.ink50, borderRadius: TOK.r2, padding: 6, cursor:"pointer", display:"inline-flex" }}><I.eye s={14}/></button>
                        <button style={{ background:"transparent", border:`1px solid ${TOK.line}`, color: TOK.ink50, borderRadius: TOK.r2, padding: 6, cursor:"pointer", display:"inline-flex" }}><I.pen s={13}/></button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </Page>
  );
};

// Fiche client — 4 tabs
const A_Client_Fiche = () => {
  const tabs = ["Véhicules", "Contrats", "Factures", "Interventions"];
  return (
    <Page>
      <Sidebar items={NAV_ADMIN} active="Clients" role="Admin" user={{ name: "Admin Ops", org: "IZOX · Paris" }}/>
      <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Topbar crumbs={["Clients","#CL-104"]} title="Cabify Paris SAS" sub="VTC · 12 véhicules · 1 contrat actif · fleet@cabify.fr"
          right={<>
            <Btn kind="ghost" size="sm" icon={<I.pen s={12}/>}>Modifier</Btn>
            <Btn kind="primary" size="sm" icon={<I.plus s={11}/>}>Nouveau contrat</Btn>
          </>}/>

        {/* Header summary */}
        <div style={{ padding: "20px 28px 0", display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 14 }}>
          <Stat label="Véhicules" value="12" sub="9 actifs · 2 gelés · 1 attente"/>
          <Stat label="Contrat" value="409" suffix="€" sub="HT/mois · palier 11–20" accent={TOK.brand}/>
          <Stat label="Quota gel utilisé" value="44" suffix="/90" sub="22 en cours · 22 programmés" accent={TOK.info}/>
          <Stat label="Interventions / mois" value="38" sub="moyenne 6 mois" accent={TOK.ok}/>
        </div>

        {/* Tabs */}
        <div style={{ padding: "20px 28px 0" }}>
          <div style={{ display:"flex", gap: 0, borderBottom: `1px solid ${TOK.line}` }}>
            {tabs.map((t, i) => {
              const on = i === 0;
              return (
                <button key={t} style={{
                  background:"transparent", border:"none", cursor:"pointer",
                  padding: "12px 18px", fontFamily: TOK.head, fontWeight: 600, fontSize: 12,
                  letterSpacing:".08em", textTransform:"uppercase",
                  color: on ? TOK.ink : TOK.ink50,
                  borderBottom: on ? `2px solid ${TOK.brand}` : "2px solid transparent",
                  marginBottom: -1,
                }}>{t}{i===0 ? <span style={{ marginLeft: 6, color: TOK.brand }}>· 12</span> : ""}</button>
              );
            })}
          </div>
        </div>

        {/* Tab content — Véhicules with accordion */}
        <div style={{ padding: 28, overflowY:"auto", display:"flex", flexDirection:"column", gap: 16 }}>
          {[
            { label:"Actifs", n: 9, tone: "ok", vehicles: [
              { i:"AB-123-CD",m:"Mercedes Vito 116",p:"Standard",ph: PHOTOS.vito },
              { i:"DE-234-FG",m:"Tesla Model 3",p:"VTC",ph: PHOTOS.tesla },
              { i:"HI-345-JK",m:"BMW Série 5",p:"Standard",ph: PHOTOS.bmw },
              { i:"LM-456-NO",m:"Audi A6",p:"VTC",ph: PHOTOS.audi },
            ]},
            { label:"Gelés", n: 2, tone: "info", vehicles: [
              { i:"FR-987-XK",m:"Tesla Model 3",p:"VTC",ph: PHOTOS.tesla },
              { i:"PQ-567-RS",m:"Renault Trafic",p:"Standard",ph: PHOTOS.trafic },
            ]},
            { label:"En attente", n: 1, tone: "warn", vehicles: [
              { i:"FG-901-HI",m:"Audi A6",p:"VTC",ph: PHOTOS.audi },
            ]},
          ].map(group => (
            <div key={group.label}>
              <div style={{
                display:"flex", alignItems:"center", gap: 12, padding: "10px 16px",
                background: TOK.panel, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4,
                borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom:"none",
              }}>
                <I.chev s={14} c={TOK.ink50}/>
                <span style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 14 }}>{group.label}</span>
                <Tag tone={group.tone}>{group.n}</Tag>
              </div>
              <div style={{
                background: TOK.surface, border: `1px solid ${TOK.line}`,
                borderBottomLeftRadius: TOK.r4, borderBottomRightRadius: TOK.r4,
                padding: 16, display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 12,
              }}>
                {group.vehicles.map(v => (
                  <VehicleCard key={v.i} immat={v.i} model={v.m} pack={v.p} status={group.label === "En attente" ? "en attente" : group.label === "Gelés" ? "gelé" : "actif"} statusTone={group.tone} photo={v.ph}/>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </Page>
  );
};

Object.assign(window, { A_Clients, A_Client_Fiche });
