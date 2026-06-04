// Admin · Contrats + Véhicules + Demandes gel + Demandes RDV

const A_Contrats = () => {
  const rows = [
    ["IZ-2026-0148","Cabify Paris SAS","Standard · VTC",12,"11–20","409 €","actif"],
    ["IZ-2026-0142","LeasePlan France","Standard",44,"21–50","1 240 €","actif"],
    ["IZ-2026-0139","Heetch Operations","VTC",28,"21–50","1 480 €","en_cours_gel"],
    ["IZ-2026-0124","Restaurant Pavyllon","Intérieur",3,"1–5","180 €","actif"],
    ["IZ-2026-0119","Hertz CDG","Standard · VTC",82,"51–100","2 990 €","actif"],
    ["IZ-2026-0103","Bolt France","VTC",19,"11–20","640 €","actif"],
    ["IZ-2025-0091","Sixt SA","Standard",60,"51–100","—","résilié"],
  ];
  return (
    <Page>
      <Sidebar items={NAV_ADMIN} active="Contrats" role="Admin" user={{ name: "Admin Ops", org: "IZOX · Paris" }}/>
      <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Topbar crumbs={["Admin","Contrats"]} title="Contrats" sub="118 actifs · 9 en gel · 2 résiliés (30 j)"
          right={<>
            <Search placeholder="Numéro de contrat, entreprise…"/>
            <Btn kind="ghost" size="sm" icon={<I.upload s={12}/>}>Exporter</Btn>
            <Btn kind="primary" size="sm" icon={<I.plus s={11}/>}>Nouveau contrat</Btn>
          </>}/>
        <div style={{ padding: 28, overflowY:"auto", display:"flex", flexDirection:"column", gap: 16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 14 }}>
            <Stat label="Contrats actifs" value="118" sub="+6 ce mois"/>
            <Stat label="MRR contrats" value="51 240" suffix="€" sub="+ 2 240 € vs. mois pr." accent={TOK.brand}/>
            <Stat label="En gel" value="9" sub="3 levés cette sem." accent={TOK.info}/>
            <Stat label="Churn 30 j" value="2" sub="–1 vs. mois pr." accent={TOK.warn}/>
          </div>

          <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontFamily: TOK.body, fontSize: 13 }}>
              <thead>
                <tr style={{ background: TOK.panel }}>
                  {["Contrat","Entreprise","Packs","Véhicules","Palier","Mensualité","Statut","Actions"].map((h, i) => (
                    <th key={i} style={{
                      textAlign: i === 7 ? "right" : "left", padding: "12px 16px",
                      fontFamily: TOK.head, fontSize: 10, letterSpacing: ".14em",
                      textTransform: "uppercase", color: TOK.ink50, fontWeight: 600,
                      borderBottom: `1px solid ${TOK.line}`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderTop: i ? `1px solid ${TOK.line}` : "none" }}>
                    <td style={{ padding: "14px 16px", color: TOK.ink50 }}>{r[0]}</td>
                    <td style={{ padding: "14px 16px", fontWeight: 700 }}>{r[1]}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ display:"inline-flex", gap: 4, flexWrap:"wrap" }}>
                        {r[2].split(" · ").map(p => <PackTag key={p} pack={p}/>)}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 600 }}>{r[3]}</td>
                    <td style={{ padding: "14px 16px", color: TOK.ink50 }}>{r[4]}</td>
                    <td style={{ padding: "14px 16px", fontWeight: 700, color: r[6]==="résilié" ? TOK.ink30 : TOK.ink }}>{r[5]}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <Tag tone={r[6]==="actif"?"brand":r[6]==="en_cours_gel"?"info":"danger"} dot>{r[6]}</Tag>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign:"right" }}>
                      <span style={{ display:"inline-flex", gap: 4 }}>
                        <button style={{ background:"transparent", border:`1px solid ${TOK.line}`, color: TOK.ink50, borderRadius: TOK.r2, padding: 6, cursor:"pointer", display:"inline-flex" }}><I.eye s={14}/></button>
                        <button style={{ background:"transparent", border:`1px solid ${TOK.line}`, color: TOK.warn, borderRadius: TOK.r2, padding: 6, cursor:"pointer", display:"inline-flex" }}><I.pause s={12}/></button>
                        <button style={{ background:"transparent", border:`1px solid ${TOK.line}`, color: TOK.danger, borderRadius: TOK.r2, padding: 6, cursor:"pointer", display:"inline-flex" }}><I.trash s={12}/></button>
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

const A_Vehicules = () => (
  <Page>
    <Sidebar items={NAV_ADMIN} active="Véhicules" role="Admin" user={{ name: "Admin Ops", org: "IZOX · Paris" }}/>
    <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Topbar crumbs={["Admin","Véhicules"]} title="Véhicules" sub="1 184 suivis · 89 % d'occupation flotte"
        right={<>
          <Search placeholder="Immat, modèle, client…"/>
          <Btn kind="ghost" size="sm" icon={<I.filter s={12}/>}>Filtres</Btn>
          <Btn kind="primary" size="sm" icon={<I.plus s={11}/>}>Ajouter véhicule</Btn>
        </>}/>
      <div style={{ padding: 28, overflowY:"auto", display:"flex", flexDirection:"column", gap: 18 }}>
        {[
          { client: "Cabify Paris SAS", type: "VTC", n: 12, vehicles: [
            { i:"AB-123-CD",m:"Vito",p:"Standard",s:"actif",t:"ok",ph: PHOTOS.vito },
            { i:"DE-234-FG",m:"Tesla 3",p:"VTC",s:"actif",t:"ok",ph: PHOTOS.tesla },
            { i:"HI-345-JK",m:"BMW 5",p:"Standard",s:"actif",t:"ok",ph: PHOTOS.bmw },
            { i:"FR-987-XK",m:"Tesla 3",p:"VTC",s:"gelé",t:"info",ph: PHOTOS.tesla },
            { i:"FG-901-HI",m:"Audi A6",p:"VTC",s:"en attente",t:"warn",ph: PHOTOS.audi },
          ]},
          { client: "Heetch Operations", type: "VTC", n: 28, vehicles: [
            { i:"BC-890-DE",m:"Class S",p:"VTC",s:"gelé",t:"info",ph: PHOTOS.classS },
            { i:"GH-456-IJ",m:"BMW 5",p:"VTC",s:"actif",t:"ok",ph: PHOTOS.bmw },
            { i:"KL-678-MN",m:"Audi A6",p:"VTC",s:"actif",t:"ok",ph: PHOTOS.audi },
          ]},
          { client: "LeasePlan France", type: "Location", n: 44, vehicles: [
            { i:"OP-111-QR",m:"Trafic",p:"Standard",s:"actif",t:"ok",ph: PHOTOS.trafic },
            { i:"ST-222-UV",m:"Trafic",p:"Standard",s:"actif",t:"ok",ph: PHOTOS.trafic },
            { i:"WX-333-YZ",m:"Range Sport",p:"Standard",s:"actif",t:"ok",ph: PHOTOS.range },
            { i:"AB-444-CD",m:"Vito",p:"Intérieur",s:"actif",t:"ok",ph: PHOTOS.vitoSide },
          ]},
        ].map(group => (
          <div key={group.client}>
            <div style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding: "10px 16px", background: TOK.panel,
              border: `1px solid ${TOK.line}`, borderRadius: TOK.r4,
              borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom:"none",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap: 12 }}>
                <I.chev s={14} c={TOK.ink50}/>
                <span style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 14 }}>{group.client}</span>
                <Tag tone={group.type === "VTC" ? "brand" : "info"} square>{group.type}</Tag>
                <Mono size={9}>· {group.n} véhicules</Mono>
              </div>
              <Mono size={9} color={TOK.brand}>Voir le client →</Mono>
            </div>
            <div style={{
              background: TOK.surface, border: `1px solid ${TOK.line}`,
              borderBottomLeftRadius: TOK.r4, borderBottomRightRadius: TOK.r4,
              padding: 16, display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap: 12,
            }}>
              {group.vehicles.map(v => (
                <VehicleCard key={v.i} immat={v.i} model={v.m} pack={v.p} status={v.s} statusTone={v.t} photo={v.ph}/>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  </Page>
);

const A_Gel = () => {
  const demandes = [
    { id:"G-014",immat:"AB-123-CD",model:"Mercedes Vito 116",client:"Cabify Paris",dates:"11 juin → 02 juil.",days:22,status:"attente",quota:{ used:22, sch:22, max:90 },motif:"Immobilisation atelier — boîte de vitesses.",photo: PHOTOS.vito },
    { id:"G-013",immat:"FR-987-XK",model:"Tesla Model 3",client:"Bolt France",dates:"03 juin → 24 juin",days:21,status:"active",quota:{ used:21, sch:10, max:90 },motif:"Conducteur en congé pour 3 sem.",photo: PHOTOS.tesla },
    { id:"G-012",immat:"PQ-567-RS",model:"Renault Trafic",client:"LeasePlan FR",dates:"01 juil. → 15 juil.",days:14,status:"validee",quota:{ used:0, sch:14, max:90 },motif:"Saison creuse — flotte ajustée.",photo: PHOTOS.trafic },
    { id:"G-011",immat:"BC-890-DE",model:"Mercedes Class S",client:"Heetch Ops",dates:"08 juin → 28 juin",days:20,status:"attente",quota:{ used:20, sch:0, max:90 },motif:"Réparation carrosserie.",photo: PHOTOS.classS },
  ];
  return (
    <Page>
      <Sidebar items={NAV_ADMIN} active="Demandes gel" role="Admin" user={{ name: "Admin Ops", org: "IZOX · Paris" }}/>
      <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Topbar crumbs={["Admin","Demandes de gel"]} title="Demandes de gel" sub="4 en attente · 5 actives · 12 validées"
          right={<>
            <Search placeholder="Immat, client…"/>
            <Btn kind="ghost" size="sm" icon={<I.upload s={12}/>}>Exporter</Btn>
          </>}/>
        <div style={{ padding: 28, overflowY:"auto", display:"flex", flexDirection:"column", gap: 18 }}>
          <div style={{ display:"flex", gap: 8, alignItems:"center", flexWrap:"wrap" }}>
            <Mono size={10}>Statut</Mono>
            <Tag tone="warn" dot>En attente · 4</Tag>
            <Tag tone="info" dot>Actives · 5</Tag>
            <Tag tone="info" dot>Validées · 12</Tag>
            <Tag tone="neutral" dot>Clôturées · 60</Tag>
            <span style={{ flex:1 }}/>
            <Mono size={10} color={TOK.brand}>QUOTA GLOBAL · 44/90 jours</Mono>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap: 14 }}>
            {demandes.map(d => <DemandeCard key={d.id} {...d}/>)}
          </div>
        </div>
      </main>
    </Page>
  );
};

const A_RDV = () => {
  const rows = [
    { d:"JEU 13 · 09:30", c:"Cabify Paris", i:"AB-123-CD", m:"Mercedes Vito", p:"Standard", op:"Karim B.", s:"confirmée", t:"ok" },
    { d:"JEU 13 · 14:00", c:"LeasePlan FR", i:"OP-111-QR", m:"Renault Trafic", p:"Standard", op:"Sofia T.", s:"en_attente", t:"warn" },
    { d:"VEN 14 · 08:00", c:"Heetch Ops",   i:"BC-890-DE", m:"Class S", p:"VTC", op:"Karim B.", s:"confirmée", t:"ok" },
    { d:"VEN 14 · 11:30", c:"Bolt France",  i:"FR-987-XK", m:"Tesla 3", p:"VTC", op:"Yann L.", s:"en_attente", t:"warn" },
    { d:"LUN 17 · 09:00", c:"Hertz CDG",    i:"WX-333-YZ", m:"Range Sport", p:"Standard", op:"—", s:"refusée", t:"danger" },
    { d:"LUN 17 · 14:00", c:"Cabify Paris", i:"DE-234-FG", m:"Tesla 3", p:"VTC", op:"Sofia T.", s:"confirmée", t:"ok" },
  ];
  return (
    <Page>
      <Sidebar items={NAV_ADMIN} active="Demandes RDV" role="Admin" user={{ name: "Admin Ops", org: "IZOX · Paris" }}/>
      <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Topbar crumbs={["Admin","Demandes RDV"]} title="Demandes de RDV" sub="2 en attente · 12 confirmés cette semaine"
          right={<>
            <Search placeholder="Client, immatriculation…"/>
            <Btn kind="ghost" size="sm" icon={<I.filter s={12}/>}>Filtres</Btn>
          </>}/>
        <div style={{ padding: 28, overflowY:"auto", display:"flex", flexDirection:"column", gap: 16 }}>
          <div style={{ display:"flex", gap: 8, alignItems:"center", flexWrap:"wrap" }}>
            <Tag tone="warn" dot>En attente · 2</Tag>
            <Tag tone="ok" dot>Confirmées · 12</Tag>
            <Tag tone="danger" dot>Refusées · 1</Tag>
          </div>

          <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontFamily: TOK.body, fontSize: 13 }}>
              <thead>
                <tr style={{ background: TOK.panel }}>
                  {["Date","Client","Immat.","Modèle","Pack","Opérateur","Statut","Actions"].map((h, i) => (
                    <th key={i} style={{
                      textAlign: i === 7 ? "right" : "left", padding: "12px 16px",
                      fontFamily: TOK.head, fontSize: 10, letterSpacing: ".14em",
                      textTransform: "uppercase", color: TOK.ink50, fontWeight: 600,
                      borderBottom: `1px solid ${TOK.line}`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderTop: i ? `1px solid ${TOK.line}` : "none" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 700 }}>{r.d}</td>
                    <td style={{ padding: "14px 16px", color: TOK.ink70 }}>{r.c}</td>
                    <td style={{ padding: "14px 16px", fontWeight: 700 }}>{r.i}</td>
                    <td style={{ padding: "14px 16px", color: TOK.ink50 }}>{r.m}</td>
                    <td style={{ padding: "14px 16px" }}><PackTag pack={r.p}/></td>
                    <td style={{ padding: "14px 16px", color: TOK.ink50 }}>{r.op}</td>
                    <td style={{ padding: "14px 16px" }}><Tag tone={r.t} dot>{r.s}</Tag></td>
                    <td style={{ padding: "14px 16px", textAlign:"right" }}>
                      {r.s === "en_attente" ? (
                        <span style={{ display:"inline-flex", gap: 6 }}>
                          <Btn kind="primary" size="sm" icon={<I.check s={11}/>}>Confirmer</Btn>
                          <Btn kind="ghost" size="sm">Refuser</Btn>
                        </span>
                      ) : (
                        <button style={{ background:"transparent", border:`1px solid ${TOK.line}`, color: TOK.ink50, borderRadius: TOK.r2, padding: 6, cursor:"pointer", display:"inline-flex" }}><I.eye s={14}/></button>
                      )}
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

Object.assign(window, { A_Contrats, A_Vehicules, A_Gel, A_RDV });
