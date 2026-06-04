// Terrain · Mobile — Dashboard (T01) + Intervention 3-step (T02)

const T_TABS = [
  { label: "Recherche", icon: <I.search s={20}/> },
  { label: "En cours",  icon: <I.clock s={20}/> },
  { label: "Histoire",  icon: <I.doc s={20}/> },
  { label: "Profil",    icon: <I.user s={20}/> },
];

const T_Dashboard = () => (
  <MobileShell
    header={
      <div style={{ padding: "12px 18px 14px", background: TOK.ink, color: "#fff" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 14 }}>
          <div style={{ display:"flex", alignItems:"center", gap: 10 }}>
            <IzoxMark size={28}/>
            <div>
              <Mono size={9} color="rgba(255,255,255,.5)">TERRAIN · KARIM B.</Mono>
              <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 13, marginTop: 2 }}>Paris 17e</div>
            </div>
          </div>
          <span style={{ width: 10, height: 10, background: TOK.ok, borderRadius: 999, boxShadow: `0 0 0 4px ${TOK.ok}33` }}/>
        </div>
        <Mono size={10} color="rgba(255,255,255,.55)">Aujourd'hui · 11 juin</Mono>
        <div style={{ fontFamily: TOK.head, fontSize: 28, fontWeight: 700, letterSpacing:"-0.6px", marginTop: 6 }}>
          4 interventions <span style={{ color: TOK.brand }}>·</span> 2 en cours
        </div>
      </div>
    }
    tabbar={<MobileTabbar items={T_TABS} active="En cours"/>}
  >
    <div style={{ padding: "16px 18px 24px", display:"flex", flexDirection:"column", gap: 18 }}>
      <Search placeholder="Immat, marque, modèle…"/>

      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 10 }}>
          <div style={{ fontFamily: TOK.head, fontSize: 14, fontWeight: 700 }}>En cours <span style={{ color: TOK.brand }}>· 2</span></div>
          <Mono size={9}>auto-refresh 30s</Mono>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap: 10 }}>
          {[
            { i:"AB-123-CD", c:"Cabify Paris", m:"Vito Standard", t:"09:30 → en cours", st:"step 2/3", ph: PHOTOS.vito, brand:true },
            { i:"DE-234-FG", c:"Cabify Paris", m:"Tesla 3 · VTC", t:"11:00 → planifiée", st:"prêt à démarrer", ph: PHOTOS.tesla },
          ].map(r => (
            <div key={r.i} style={{
              background: r.brand ? TOK.ink : TOK.surface, color: r.brand ? "#fff" : TOK.ink,
              border: `1px solid ${r.brand ? TOK.ink : TOK.line}`, borderRadius: TOK.r4,
              padding: 12, display:"flex", gap: 12, alignItems:"center", position:"relative", overflow:"hidden",
            }}>
              <PhotoFrame src={r.ph} ratio="1/1" style={{ width: 74, flex:"0 0 74px", height: 74, aspectRatio: "auto" }} frame={false}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 15 }}>{r.i}</div>
                <div style={{ fontSize: 11, color: r.brand ? "rgba(255,255,255,.55)" : TOK.ink50 }}>{r.m} · {r.c}</div>
                <div style={{ display:"flex", alignItems:"center", gap: 8, marginTop: 4 }}>
                  <Mono size={9} color={r.brand ? TOK.brand : TOK.brand}>{r.t}</Mono>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap: 6 }}>
                <Tag tone={r.brand ? "invert" : "warn"} dot>{r.st}</Tag>
                <I.chevR s={16} c={r.brand ? "rgba(255,255,255,.5)" : TOK.ink50}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 10 }}>
          <div style={{ fontFamily: TOK.head, fontSize: 14, fontWeight: 700 }}>À venir · 2</div>
          <Mono size={9}>jusqu'à 18:00</Mono>
        </div>
        <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, overflow:"hidden" }}>
          {[
            ["14:00","BC-890-DE","Heetch · Class S VTC"],
            ["16:30","WX-333-YZ","Hertz · Range Sport"],
          ].map((r, i) => (
            <div key={i} style={{ padding: 14, display:"flex", alignItems:"center", gap: 10, borderTop: i ? `1px solid ${TOK.line}` : "none" }}>
              <div style={{ fontFamily: TOK.head, fontWeight: 700, color: TOK.brand, minWidth: 44 }}>{r[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 13 }}>{r[1]}</div>
                <div style={{ fontSize: 11, color: TOK.ink50 }}>{r[2]}</div>
              </div>
              <I.chevR s={14} c={TOK.ink50}/>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Mono size={10} style={{ marginBottom: 10, display:"block" }}>Historique · 7j</Mono>
        <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, overflow:"hidden" }}>
          {[
            ["10.06","BC-890-DE","Heetch · VTC","Yann L."],
            ["09.06","TU-678-VW","Cabify · Standard","Karim B."],
          ].map((r, i) => (
            <div key={i} style={{ padding: 12, display:"flex", alignItems:"center", gap: 10, borderTop: i ? `1px solid ${TOK.line}` : "none" }}>
              <div style={{ width: 26, height: 26, background: TOK.okL, color: TOK.ok, borderRadius: 999, display:"inline-flex", alignItems:"center", justifyContent:"center" }}><I.check s={12}/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: TOK.head, fontWeight: 600, fontSize: 13 }}>{r[1]}</div>
                <div style={{ fontSize: 11, color: TOK.ink50 }}>{r[2]} · {r[3]}</div>
              </div>
              <Mono size={9}>{r[0]}</Mono>
            </div>
          ))}
        </div>
      </div>
    </div>
  </MobileShell>
);

// T02 · Intervention — step 2 (photos + checklists)
const T_Intervention = () => (
  <MobileShell
    header={
      <div style={{ background: TOK.surface, padding: "10px 18px 14px", borderBottom: `1px solid ${TOK.line}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 12 }}>
          <button style={{ background:"transparent", border:`1px solid ${TOK.line}`, borderRadius: TOK.r2, padding: 6, cursor:"pointer", color: TOK.ink }}><I.chevL s={14}/></button>
          <Mono size={9}>#INT-2026-0319 · Karim B.</Mono>
          <Tag tone="warn" dot>en cours</Tag>
        </div>
        <Mono size={9}>Cabify Paris · Pack Standard</Mono>
        <div style={{ fontFamily: TOK.head, fontSize: 22, fontWeight: 700, letterSpacing:"-0.4px", marginTop: 4 }}>AB-123-CD <span style={{ color: TOK.brand }}>·</span> Vito 116</div>
        {/* Stepper bar */}
        <div style={{ display:"flex", gap: 6, marginTop: 14 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ flex: 1, display:"flex", flexDirection:"column", gap: 4 }}>
              <div style={{ height: 5, borderRadius: 999, background: i <= 1 ? TOK.brand : TOK.line }}/>
              <Mono size={8} color={i <= 1 ? TOK.ink : TOK.ink50}>
                {i === 0 ? "1 · PRÉ-CONTRÔLE" : i === 1 ? "2 · PHOTOS" : "3 · SIGNATURE"}
              </Mono>
            </div>
          ))}
        </div>
      </div>
    }
    tabbar={
      <div style={{ padding: "12px 16px calc(14px + env(safe-area-inset-bottom))", borderTop: `1px solid ${TOK.line}`, background: TOK.surface, display:"flex", gap: 8 }}>
        <Btn kind="ghost" size="md" full icon={<I.chevL s={12}/>}>Précéd.</Btn>
        <Btn kind="primary" size="md" full icon={<I.arrow s={12}/>}>Continuer</Btn>
      </div>
    }
  >
    <div style={{ padding: "16px 18px 22px", display:"flex", flexDirection:"column", gap: 16 }}>
      {/* Pré-contrôle — done collapsed */}
      <div style={{
        background: TOK.okL, border: `1px solid ${TOK.ok}33`, borderRadius: TOK.r4,
        padding: 12, display:"flex", alignItems:"center", gap: 10,
      }}>
        <div style={{ width: 28, height: 28, background: TOK.ok, color: "#fff", borderRadius: TOK.r2, display:"inline-flex", alignItems:"center", justifyContent:"center" }}><I.check s={14}/></div>
        <div style={{ flex: 1, fontSize: 12, color: TOK.ink70 }}>
          <strong style={{ color: TOK.ink }}>Pré-contrôle</strong> · 3/3 points validés
        </div>
        <I.chev s={14} c={TOK.ink50}/>
      </div>

      {/* Photos */}
      <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 12 }}>
          <div style={{ fontFamily: TOK.head, fontSize: 13, fontWeight: 700 }}>Photos · avant / après</div>
          <Mono size={9} color={TOK.brand}>4/6</Mono>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 10 }}>
          {[
            { z:"Pare-chocs AV", on: true, ph: PHOTOS.detail },
            { z:"Capot",         on: true, ph: PHOTOS.bmw },
            { z:"Côté gauche",   on: true, ph: PHOTOS.vitoSide },
            { z:"Côté droit",    on: true, ph: PHOTOS.range },
            { z:"Toit",          on: false },
            { z:"Coffre",        on: false },
          ].map((zone, i) => (
            <div key={i} style={{
              border: `1px ${zone.on ? "solid" : "dashed"} ${zone.on ? TOK.line : TOK.rule}`,
              borderRadius: TOK.r2, padding: 8,
              display:"flex", flexDirection:"column", gap: 6,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <Mono size={9}>{zone.z}</Mono>
                {zone.on ? <Tag tone="ok" dot>ok</Tag> : <Tag tone="neutral">à faire</Tag>}
              </div>
              <div style={{ display:"flex", gap: 4 }}>
                <div style={{
                  flex: 1, aspectRatio: "1/1", borderRadius: TOK.r2, background: zone.on ? `url(${zone.ph})` : TOK.panel,
                  backgroundSize:"cover", backgroundPosition:"center", display:"flex", alignItems:"center", justifyContent:"center", color: TOK.ink50,
                  position:"relative",
                }}>
                  {!zone.on && <I.cam s={14}/>}
                  {zone.on && <span style={{ position:"absolute", top: 2, left: 2, fontFamily: TOK.head, fontSize: 7, color:"#fff", background:"rgba(0,0,0,.6)", padding: "1px 3px", borderRadius: 2 }}>AV</span>}
                </div>
                <div style={{
                  flex: 1, aspectRatio: "1/1", borderRadius: TOK.r2, background: zone.on ? TOK.brandL : TOK.panel,
                  display:"flex", alignItems:"center", justifyContent:"center", color: TOK.ink50,
                  position:"relative",
                }}>
                  <I.cam s={14}/>
                  {zone.on && <span style={{ position:"absolute", top: 2, left: 2, fontFamily: TOK.head, fontSize: 7, color: TOK.brand, fontWeight:700, background:"#fff", padding: "1px 3px", borderRadius: 2 }}>AP</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Checklists */}
      <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 10 }}>
          <div style={{ fontFamily: TOK.head, fontSize: 13, fontWeight: 700 }}>Checklist intérieur</div>
          <Mono size={9} color={TOK.ok}>3/5</Mono>
        </div>
        {[
          ["Aspiration tapis & sièges", true],
          ["Tableau de bord", true],
          ["Plastiques nettoyés", true],
          ["Vitres intérieures", false],
          ["Désodorisation", false],
        ].map(([n,on], i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap: 12, padding: "8px 0", borderTop: i ? `1px dashed ${TOK.line}` : "none", fontSize: 13, color: on ? TOK.ink : TOK.ink50 }}>
            <span style={{
              width: 20, height: 20, borderRadius: TOK.r2,
              background: on ? TOK.ok : "transparent",
              border: `1.5px solid ${on ? TOK.ok : TOK.line}`,
              display:"inline-flex", alignItems:"center", justifyContent:"center", flex:"0 0 20px",
            }}>{on && <I.check s={12} c="#fff"/>}</span>
            {n}
          </div>
        ))}
      </div>

      {/* Notes */}
      <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 14 }}>
        <Mono size={10} style={{ marginBottom: 8, display:"block" }}>Notes</Mono>
        <div style={{ fontSize: 13, color: TOK.ink70, lineHeight: 1.5 }}>
          Résidu de goudron sur aile arr. droite — traité au solvant. Tapis arrière à remplacer.
        </div>
      </div>
    </div>
  </MobileShell>
);

Object.assign(window, { T_Dashboard, T_Intervention });
