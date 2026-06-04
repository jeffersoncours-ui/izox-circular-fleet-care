// Desktop Client screens — Dashboard, Flotte, Fiche véhicule.

const D_Client_Dashboard = () => (
  <Page>
    <Sidebar items={NAV_CLIENT} active="Dashboard" role="Client"/>
    <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Topbar
        crumbs={["MARDI 11 JUIN 2026"]}
        title={<>Bonjour Léa, <span style={{ color: TOK.brand }}>tout est sous contrôle.</span></>}
        sub="12 véhicules suivis · 2 gelés · 4 RDV cette semaine"
        right={<>
          <Btn kind="ghost" size="sm" icon={<I.bell s={14}/>}>3</Btn>
          <Btn kind="ghost" size="sm" icon={<I.plus s={11}/>}>Véhicule</Btn>
          <Btn kind="primary" size="sm" icon={<I.clock s={11}/>}>Nouveau RDV</Btn>
        </>}
      />
      <div style={{ padding: 28, display:"flex", flexDirection:"column", gap: 22, overflowY:"auto" }}>
        <div style={{ display:"grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <Stat label="Véhicules suivis" value="12" sub="9 actifs · 2 gelés · 1 attente"/>
          <Stat label="Quota gel" value="44" suffix="/90" sub="22 en cours · 22 programmés" accent={TOK.brand}/>
          <Stat label="RDV cette semaine" value="4" sub="Prochain : jeudi 13 · 09:30" accent={TOK.warn}/>
          <Stat label="Mensualité" value="409" suffix="€" sub="HT · palier 11–20" accent={TOK.info}/>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr", gap: 14 }}>
          <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 22 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom: 14 }}>
              <div>
                <Mono size={10}>Votre flotte</Mono>
                <div style={{ fontFamily: TOK.head, fontSize: 22, fontWeight: 700, letterSpacing:"-0.4px", marginTop: 4 }}>3 véhicules nécessitent votre attention</div>
              </div>
              <Btn kind="ghost" size="sm" icon={<I.chevR s={12}/>}>Voir tout</Btn>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 12 }}>
              <VehicleCard immat="AB-123-CD" model="Mercedes Vito 116" pack="Standard" status="actif" statusTone="ok" photo={PHOTOS.vito}/>
              <VehicleCard immat="FR-987-XK" model="Tesla Model 3" pack="VTC" status="gelé" statusTone="info" photo={PHOTOS.tesla}/>
              <VehicleCard immat="PQ-567-RS" model="Renault Trafic" pack="Intérieur" status="en attente" statusTone="warn" photo={PHOTOS.trafic}/>
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
            <div style={{
              background: TOK.ink, color:"#fff", borderRadius: TOK.r4, padding: 22,
              display:"flex", flexDirection:"column", gap: 14, position:"relative", overflow:"hidden",
            }}>
              <Mono size={10} color="rgba(255,255,255,.55)">Contrat actif · IZ-2026-0148</Mono>
              <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 52, letterSpacing:"-0.6px", lineHeight: .9 }}>
                409<span style={{ color: TOK.brand }}>€</span>
              </div>
              <Mono size={10} color="rgba(255,255,255,.55)">HT / mois · palier 11–20</Mono>
              <div style={{ display:"flex", gap: 6, fontFamily: TOK.head, fontSize: 12, marginTop: 6 }}>
                <Tag tone="invert" dot>actif</Tag>
                <span style={{ color:"rgba(255,255,255,.55)" }}>renouv. 01 janv. 2027</span>
              </div>
              <div style={{ position:"absolute", right: -10, bottom: -10, opacity: .1 }}>
                <I.doc s={140} c="#fff"/>
              </div>
            </div>
            <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 18 }}>
              <Mono size={10} style={{ marginBottom: 10, display:"block" }}>Prochain RDV</Mono>
              <div style={{ display:"flex", gap: 12, alignItems:"center" }}>
                <div style={{ width: 56, height: 56, background: TOK.brandL, color: TOK.brand, borderRadius: TOK.r2, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily: TOK.head, fontWeight: 700 }}>
                  <span style={{ fontSize: 10, letterSpacing:".1em" }}>JEU</span>
                  <span style={{ fontSize: 22, letterSpacing:"-0.4px" }}>13</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: TOK.head, fontWeight: 700 }}>AB-123-CD · 09:30</div>
                  <div style={{ fontSize: 12, color: TOK.ink50 }}>Mercedes Vito · Lavage Standard</div>
                </div>
                <Tag tone="ok" dot>confirmée</Tag>
              </div>
            </div>
          </div>
        </div>

        {/* Activity log */}
        <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 22 }}>
          <Mono size={10} style={{ marginBottom: 14, display:"block" }}>Activité · 14 derniers jours</Mono>
          <div style={{ display:"grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, height: 80, alignItems: "end" }}>
            {[40,30,55,80,60,20,10, 25,45,70,90,75,15,30].map((h, i) => (
              <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap: 6 }}>
                <div style={{ width:"100%", height: `${h}%`, background: i === 12 ? TOK.brand : TOK.line, borderRadius: 2 }}/>
                <Mono size={8}>{i+1}</Mono>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  </Page>
);

const D_Client_Flotte = () => {
  const AccordionHead = ({ title, n, tone, open }) => (
    <div style={{
      display:"flex", justifyContent:"space-between", alignItems:"center",
      padding: "12px 18px", background: open ? TOK.surface : TOK.panel,
      border: `1px solid ${TOK.line}`, borderRadius: TOK.r4,
      borderBottomLeftRadius: open ? 0 : TOK.r4, borderBottomRightRadius: open ? 0 : TOK.r4,
      borderBottom: open ? "none" : `1px solid ${TOK.line}`, cursor:"pointer",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap: 12 }}>
        <I.chev s={14} c={TOK.ink50} style={{ transform: open ? "rotate(0)" : "rotate(-90deg)" }}/>
        <span style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 14, letterSpacing:"-0.01em" }}>{title}</span>
        <Tag tone={tone}>{n}</Tag>
      </div>
      <Mono size={9}>{open ? "REPLIER" : "DÉPLIER"}</Mono>
    </div>
  );
  return (
    <Page>
      <Sidebar items={NAV_CLIENT} active="Ma flotte" role="Client"/>
      <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Topbar crumbs={["Client","/client/flotte"]} title="Ma flotte" sub="12 véhicules · Cabify Paris SAS"
          right={<>
            <Search placeholder="Immatriculation, modèle…" style={{ minWidth: 260 }}/>
            <Btn kind="ghost" size="sm" icon={<I.filter s={12}/>}>Filtres</Btn>
            <Btn kind="primary" size="sm" icon={<I.plus s={11}/>}>Ajouter véhicule</Btn>
          </>}/>

        <div style={{ padding: 28, overflowY:"auto", display:"flex", flexDirection:"column", gap: 16 }}>
          {/* Actifs */}
          <div>
            <AccordionHead title="Actifs" n="9" tone="ok" open/>
            <div style={{
              background: TOK.surface, border: `1px solid ${TOK.line}`, borderTop: "none",
              borderBottomLeftRadius: TOK.r4, borderBottomRightRadius: TOK.r4, padding: 16,
              display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 12,
            }}>
              {[
                ["AB-123-CD","Mercedes Vito 116","Standard", PHOTOS.vito],
                ["DE-234-FG","Tesla Model 3","VTC", PHOTOS.tesla],
                ["HI-345-JK","BMW Série 5","Standard", PHOTOS.bmw],
                ["LM-456-NO","Mercedes Vito 116","Intérieur", PHOTOS.vitoSide],
                ["TU-678-VW","Renault Trafic L2","Standard", PHOTOS.trafic],
                ["WX-901-YZ","Range Rover Sport","VTC", PHOTOS.range],
                ["AA-111-BB","Audi A6","VTC", PHOTOS.audi],
                ["CC-222-DD","Mercedes Class S","VTC", PHOTOS.classS],
              ].map(([i,m,p,ph]) => (
                <VehicleCard key={i} immat={i} model={m} pack={p} status="actif" statusTone="ok" photo={ph}/>
              ))}
            </div>
          </div>

          <div>
            <AccordionHead title="Gelés" n="2" tone="info" open/>
            <div style={{
              background: TOK.surface, border: `1px solid ${TOK.line}`, borderTop: "none",
              borderBottomLeftRadius: TOK.r4, borderBottomRightRadius: TOK.r4, padding: 16,
              display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 12,
            }}>
              <VehicleCard immat="FR-987-XK" model="Tesla Model 3" pack="VTC" status="gelé" statusTone="info" photo={PHOTOS.tesla}/>
              <VehicleCard immat="PQ-567-RS" model="Renault Trafic" pack="Standard" status="gelé" statusTone="info" photo={PHOTOS.trafic}/>
            </div>
          </div>

          <div>
            <AccordionHead title="En attente de validation" n="1" tone="warn" open/>
            <div style={{
              background: TOK.surface, border: `1px solid ${TOK.line}`, borderTop: "none",
              borderBottomLeftRadius: TOK.r4, borderBottomRightRadius: TOK.r4, padding: 16,
              display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 12,
            }}>
              <VehicleCard immat="FG-901-HI" model="Audi A6" pack="VTC" status="en attente" statusTone="warn" photo={PHOTOS.audi}/>
            </div>
          </div>
        </div>
      </main>
    </Page>
  );
};

const D_Client_Vehicule = () => (
  <Page>
    <Sidebar items={NAV_CLIENT} active="Ma flotte" role="Client"/>
    <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Topbar
        crumbs={["Client","Ma flotte","/AB-123-CD"]}
        title="Mercedes Vito 116 CDI"
        sub="AB-123-CD · #VH-23CD · Pack Standard"
        right={<>
          <Tag tone="info" dot>gelé jusqu'au 02 juil.</Tag>
          <Btn kind="ghost" size="sm" icon={<I.snow s={12}/>}>Demander gel</Btn>
          <Btn kind="primary" size="sm" icon={<I.clock s={12}/>}>Demander RDV</Btn>
        </>}/>
      <div style={{ padding: 28, overflowY:"auto", display:"grid", gridTemplateColumns:"1.4fr 1fr", gap: 18, alignContent:"start" }}>
        <div style={{ display:"flex", flexDirection:"column", gap: 16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap: 10 }}>
            <PhotoFrame src={PHOTOS.vito} ratio="16/10"/>
            <div style={{ display:"flex", flexDirection:"column", gap: 10 }}>
              <PhotoFrame src={PHOTOS.cabin} ratio="16/10"/>
              <PhotoFrame src={PHOTOS.rim} ratio="16/10"/>
            </div>
          </div>

          {/* Gel alert */}
          <div style={{
            background: TOK.infoL, border: `1px solid ${TOK.info}33`,
            borderRadius: TOK.r4, padding: 18, display:"flex", flexDirection:"column", gap: 12,
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ display:"flex", alignItems:"center", gap: 10 }}>
                <div style={{ width: 36, height: 36, background: TOK.info, color:"#fff", borderRadius: TOK.r2, display:"inline-flex", alignItems:"center", justifyContent:"center" }}><I.snow s={16}/></div>
                <div>
                  <Mono size={10} color={TOK.info}>Véhicule actuellement gelé · active</Mono>
                  <div style={{ fontFamily: TOK.head, fontSize: 18, fontWeight: 700, marginTop: 4, letterSpacing:"-0.01em" }}>Du 11 juin au 02 juillet 2026 · 22 jours</div>
                </div>
              </div>
              <Tag tone="info" dot>active</Tag>
            </div>
            <div style={{ display:"flex", gap: 8 }}>
              <Btn kind="ghost" size="sm">Voir détails du gel</Btn>
              <Btn kind="primary" size="sm" icon={<I.snow s={12}/>}>Lever le gel</Btn>
            </div>
          </div>

          {/* Infos */}
          <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 22 }}>
            <Mono size={10} style={{ marginBottom: 14, display:"block" }}>Informations</Mono>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 18 }}>
              {[
                ["Marque", "Mercedes-Benz"],
                ["Modèle", "Vito 116 CDI"],
                ["Immatriculation", "AB-123-CD"],
                ["Type", "Utilitaire"],
                ["Année", "2023"],
                ["Couleur", "Noir obsidienne"],
                ["Kilométrage", "48 320 km"],
                ["Contrat", "IZ-2026-0148"],
              ].map(([k,v]) => (
                <div key={k}>
                  <Mono size={9}>{k}</Mono>
                  <div style={{ fontFamily: TOK.head, fontWeight: 600, fontSize: 14, marginTop: 4 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
          <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 14 }}>
              <Mono size={10}>Services inclus</Mono>
              <PackTag pack="Standard"/>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap: 10 }}>
              {[
                ["Lavage carrosserie", true],
                ["Lustrage & brillance", true],
                ["Aspiration intérieure", true],
                ["Nettoyage cabine", true],
                ["Cuir & sellerie", false],
                ["Décontamination ozone", false],
                ["Rénovation jantes", false],
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
            <div style={{ marginTop: 14, padding: 10, background: TOK.panel, borderRadius: TOK.r2, fontSize: 11, color: TOK.ink50 }}>
              <strong style={{ color: TOK.ink }}>↑ Pack VTC</strong> · 4 services supplémentaires
            </div>
          </div>

          <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 18 }}>
            <Mono size={10} style={{ marginBottom: 12, display:"block" }}>Actions</Mono>
            <div style={{ display:"flex", flexDirection:"column", gap: 8 }}>
              <Btn kind="primary" full icon={<I.clock s={12}/>}>Demander un RDV</Btn>
              <Btn kind="ghost" full icon={<I.snow s={12}/>}>Demander un gel</Btn>
              <Btn kind="danger" full icon={<I.trash s={12}/>}>Supprimer le véhicule</Btn>
            </div>
          </div>

          <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 18 }}>
            <Mono size={10} style={{ marginBottom: 12, display:"block" }}>Historique récent</Mono>
            <div style={{ display:"flex", flexDirection:"column", gap: 10 }}>
              {[
                ["04 juin","Nettoyage Standard","Karim B.","ok"],
                ["20 mai","Nettoyage Standard","Sofia T.","ok"],
                ["02 mai","Nettoyage Standard","Karim B.","ok"],
              ].map((r, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize: 12, paddingBottom: 8, borderBottom: i < 2 ? `1px dashed ${TOK.line}` : "none" }}>
                  <span><Mono size={9} style={{ marginRight: 8 }}>{r[0]}</Mono>{r[1]}</span>
                  <Mono size={9} color={TOK.ink50}>{r[2]}</Mono>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  </Page>
);

Object.assign(window, { D_Client_Dashboard, D_Client_Flotte, D_Client_Vehicule });
