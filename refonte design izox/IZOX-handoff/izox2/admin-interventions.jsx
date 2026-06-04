// Admin · Interventions list + Fiche intervention (3-step stepper).

const A_Interventions = () => {
  const rows = [
    { i:"AB-123-CD", s:"en_cours", t:"warn", type:"Standard", c:"Cabify Paris", d:"11.06 · 09:30", op:"Karim B." },
    { i:"DE-234-FG", s:"planifiée", t:"neutral", type:"VTC", c:"Cabify Paris", d:"11.06 · 11:00", op:"Sofia T." },
    { i:"HI-345-JK", s:"terminée", t:"ok", type:"Standard", c:"LeasePlan FR", d:"11.06 · 08:00", op:"Karim B." },
    { i:"BC-890-DE", s:"terminée", t:"ok", type:"VTC", c:"Heetch Ops", d:"10.06 · 16:00", op:"Yann L." },
    { i:"PQ-567-RS", s:"refus", t:"danger", type:"Standard", c:"LeasePlan FR", d:"10.06 · 14:30", op:"—" },
    { i:"AA-111-BB", s:"terminée", t:"ok", type:"VTC", c:"Bolt France", d:"10.06 · 10:00", op:"Sofia T." },
    { i:"TU-678-VW", s:"terminée", t:"ok", type:"Standard", c:"Cabify Paris", d:"09.06 · 09:00", op:"Karim B." },
  ];
  return (
    <Page>
      <Sidebar items={NAV_ADMIN} active="Interventions" role="Admin" user={{ name: "Admin Ops", org: "IZOX · Paris" }}/>
      <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Topbar crumbs={["Admin","Interventions"]} title="Interventions" sub="2 en cours · 14 aujourd'hui · 86 cette semaine"
          right={<>
            <Search placeholder="Immat, client…"/>
            <Btn kind="ghost" size="sm" icon={<I.filter s={12}/>}>Statut</Btn>
            <Btn kind="primary" size="sm" icon={<I.plus s={11}/>}>Nouvelle intervention</Btn>
          </>}/>
        <div style={{ padding: 28, overflowY:"auto", display:"flex", flexDirection:"column", gap: 16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 14 }}>
            <Stat label="En cours" value="2" sub="Karim B. · Sofia T." accent={TOK.warn}/>
            <Stat label="Aujourd'hui" value="14" sub="3 op. en route" accent={TOK.brand}/>
            <Stat label="Cette semaine" value="86" sub="+12 vs sem. préc." accent={TOK.ok}/>
            <Stat label="Refus 7j" value="1" sub="Stable" accent={TOK.danger}/>
          </div>

          <div style={{ display:"flex", gap: 8, alignItems:"center", flexWrap:"wrap" }}>
            <Mono size={10}>Statut</Mono>
            <Tag tone="invert" dot>Toutes</Tag>
            <Tag tone="warn" dot>En cours · 2</Tag>
            <Tag tone="neutral" dot>Planifiées · 8</Tag>
            <Tag tone="ok" dot>Terminées · 76</Tag>
            <Tag tone="danger" dot>Refus · 1</Tag>
          </div>

          <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontFamily: TOK.body, fontSize: 13 }}>
              <thead>
                <tr style={{ background: TOK.panel }}>
                  {["Immat.","Statut","Type","Client","Date","Opérateur","Actions"].map((h, i) => (
                    <th key={i} style={{
                      textAlign: i === 6 ? "right" : "left", padding: "12px 16px",
                      fontFamily: TOK.head, fontSize: 10, letterSpacing:".14em",
                      textTransform: "uppercase", color: TOK.ink50, fontWeight: 600,
                      borderBottom: `1px solid ${TOK.line}`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderTop: i ? `1px solid ${TOK.line}` : "none" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 700 }}>{r.i}</td>
                    <td style={{ padding: "14px 16px" }}><Tag tone={r.t} dot>{r.s}</Tag></td>
                    <td style={{ padding: "14px 16px" }}><PackTag pack={r.type}/></td>
                    <td style={{ padding: "14px 16px", color: TOK.ink70 }}>{r.c}</td>
                    <td style={{ padding: "14px 16px", color: TOK.ink50 }}>{r.d}</td>
                    <td style={{ padding: "14px 16px", color: TOK.ink50 }}>{r.op}</td>
                    <td style={{ padding: "14px 16px", textAlign:"right" }}>
                      <button style={{ background:"transparent", border:`1px solid ${TOK.line}`, color: TOK.ink50, borderRadius: TOK.r2, padding: 6, cursor:"pointer", display:"inline-flex" }}><I.eye s={14}/></button>
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

const A_Intervention_Fiche = () => {
  const zones = [
    { z:"Pare-chocs avant", on: true, ph: PHOTOS.detail },
    { z:"Capot",            on: true, ph: PHOTOS.bmw },
    { z:"Carrosserie G",    on: true, ph: PHOTOS.vitoSide },
    { z:"Carrosserie D",    on: true, ph: PHOTOS.range },
    { z:"Toit",             on: false, ph: null },
    { z:"Coffre",           on: false, ph: null },
  ];
  return (
    <Page>
      <Sidebar items={NAV_ADMIN} active="Interventions" role="Admin" user={{ name: "Admin Ops", org: "IZOX · Paris" }}/>
      <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Topbar crumbs={["Interventions","#INT-2026-0319"]} title={<>AB-123-CD · <span style={{ color: TOK.brand }}>Mercedes Vito 116</span></>}
          sub="Cabify Paris · Pack Standard · démarrée 09:32 par Karim B."
          right={<>
            <Tag tone="warn" dot>en cours</Tag>
            <Btn kind="ghost" size="sm">Annuler</Btn>
            <Btn kind="primary" size="sm" icon={<I.check s={12}/>}>Marquer terminée</Btn>
          </>}/>

        <div style={{ padding: "20px 28px 0" }}>
          <Stepper steps={["Contrôle pré-intervention","Photos & checklists","Signature & validation"]} current={1}/>
        </div>

        <div style={{ padding: 28, overflowY:"auto", display:"grid", gridTemplateColumns:"1.5fr 1fr", gap: 18 }}>
          <div style={{ display:"flex", flexDirection:"column", gap: 18 }}>
            {/* Pré-contrôle — collapsed, done */}
            <div style={{
              background: TOK.okL, border: `1px solid ${TOK.ok}33`,
              borderRadius: TOK.r4, padding: 16, display:"flex", alignItems:"center", gap: 12,
            }}>
              <div style={{ width: 32, height: 32, background: TOK.ok, color:"#fff", borderRadius: TOK.r2, display:"inline-flex", alignItems:"center", justifyContent:"center" }}><I.check s={16}/></div>
              <div style={{ flex: 1 }}>
                <Mono size={10} color={TOK.ok}>Étape 1 · Complétée à 09:34</Mono>
                <div style={{ fontFamily: TOK.head, fontWeight: 600, fontSize: 14, marginTop: 4 }}>Pré-contrôle validé · 3 / 3 points</div>
              </div>
              <Btn kind="ghost" size="sm">Voir</Btn>
            </div>

            {/* Photos */}
            <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 22 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 14 }}>
                <Mono size={10}>Zones photos · avant / après</Mono>
                <Mono size={9} color={TOK.brand}>4/6 zones complètes</Mono>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap: 12 }}>
                {zones.map((z, i) => (
                  <div key={i} style={{
                    background: TOK.panel, border: `1px ${z.on ? "solid" : "dashed"} ${z.on ? TOK.line : TOK.rule}`,
                    borderRadius: TOK.r4, padding: 10,
                    display:"flex", flexDirection:"column", gap: 8,
                  }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontFamily: TOK.head, fontWeight: 600, fontSize: 12 }}>{z.z}</span>
                      {z.on ? <Tag tone="ok" dot>ok</Tag> : <Tag tone="neutral">à faire</Tag>}
                    </div>
                    <div style={{ display:"flex", gap: 6 }}>
                      {[0,1].map(k => (
                        <div key={k} style={{
                          flex: 1, height: 60, borderRadius: TOK.r2,
                          background: z.on ? TOK.surface : TOK.line,
                          backgroundImage: z.on && z.ph ? `url(${z.ph})` : "none",
                          backgroundSize:"cover", backgroundPosition:"center",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          color: TOK.ink50, position:"relative",
                        }}>
                          {!z.on && <I.cam s={16}/>}
                          {z.on && (
                            <span style={{ position:"absolute", top: 4, left: 4, fontFamily: TOK.head, fontSize: 8, color:"#fff", background:"rgba(0,0,0,.6)", padding: "1px 4px", borderRadius: 2 }}>{k===0?"AV":"AP"}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 22 }}>
              <Mono size={10} style={{ marginBottom: 12, display:"block" }}>Notes opérateur</Mono>
              <div style={{
                background: TOK.paper, border: `1px solid ${TOK.line}`, borderRadius: TOK.r2,
                padding: 14, fontFamily: TOK.head, fontSize: 13, color: TOK.ink70, lineHeight: 1.6,
              }}>
                RAS — léger résidu de goudron sur l'aile arrière droite, traité au solvant.
                Tapis arrière à remplacer (signalé client).
              </div>
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
            <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 18 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 12 }}>
                <Mono size={10}>Checklist intérieur</Mono>
                <Mono size={9} color={TOK.ok}>3/5</Mono>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap: 9 }}>
                {[
                  ["Aspiration tapis & sièges", true],
                  ["Tableau de bord dépoussiéré", true],
                  ["Plastiques nettoyés", true],
                  ["Vitres intérieures", false],
                  ["Désodorisation cabine", false],
                ].map(([n,on], i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap: 10, fontSize: 13, color: on ? TOK.ink : TOK.ink50 }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: TOK.r2,
                      background: on ? TOK.ok : "transparent",
                      border: `1.5px solid ${on ? TOK.ok : TOK.line}`,
                      display:"inline-flex", alignItems:"center", justifyContent:"center", flex:"0 0 18px",
                    }}>{on && <I.check s={10} c="#fff"/>}</span>
                    {n}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 18 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 12 }}>
                <Mono size={10}>Checklist extérieur</Mono>
                <Mono size={9} color={TOK.ok}>3/5</Mono>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap: 9 }}>
                {[
                  ["Pré-lavage haute pression", true],
                  ["Shampoing & rinçage", true],
                  ["Jantes & passages de roues", true],
                  ["Séchage microfibre", false],
                  ["Brillance plastiques", false],
                ].map(([n,on], i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap: 10, fontSize: 13, color: on ? TOK.ink : TOK.ink50 }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: TOK.r2,
                      background: on ? TOK.ok : "transparent",
                      border: `1.5px solid ${on ? TOK.ok : TOK.line}`,
                      display:"inline-flex", alignItems:"center", justifyContent:"center", flex:"0 0 18px",
                    }}>{on && <I.check s={10} c="#fff"/>}</span>
                    {n}
                  </div>
                ))}
              </div>
            </div>

            {/* Signature preview (locked until step 3) */}
            <div style={{
              background: TOK.panel, border: `1px dashed ${TOK.rule}`, borderRadius: TOK.r4,
              padding: 18, opacity: .65, display:"flex", flexDirection:"column", gap: 10,
            }}>
              <Mono size={10}>Étape 3 · Signature client</Mono>
              <div style={{ fontSize: 12, color: TOK.ink50 }}>Disponible une fois les photos & checklists complètes.</div>
              <div style={{
                height: 80, background: TOK.surface, borderRadius: TOK.r2, border: `1px solid ${TOK.line}`,
                display:"flex", alignItems:"center", justifyContent:"center", color: TOK.ink30,
              }}><I.sig s={18}/> <span style={{ marginLeft: 8, fontFamily: TOK.head, fontSize: 11 }}>SIGNATURE PAD</span></div>
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 28px", borderTop: `1px solid ${TOK.line}`, background: TOK.surface, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <Btn kind="ghost" icon={<I.chevL s={12}/>}>Précédent</Btn>
          <Mono size={10}>Étape 2 sur 3 · enregistrement automatique</Mono>
          <Btn kind="primary" icon={<I.arrow s={12}/>}>Continuer → Signature</Btn>
        </div>
      </main>
    </Page>
  );
};

Object.assign(window, { A_Interventions, A_Intervention_Fiche });
