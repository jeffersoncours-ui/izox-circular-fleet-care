// Mobile Client — Flotte (M02), Fiche véhicule (M03), Prestations (M04), Factures (M05)

const M_Flotte = () => {
  const sectionTitle = (title, n, tone) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 0 10px" }}>
      <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 14, letterSpacing:"-0.01em" }}>{title}</div>
      <Tag tone={tone}>{n}</Tag>
    </div>
  );
  return (
    <MobileShell
      header={<MHead title="Ma flotte" sub="12 VÉHICULES · CABIFY PARIS" right={<Btn kind="primary" size="sm" icon={<I.plus s={11}/>}>Nouveau</Btn>}/>}
      tabbar={<MobileTabbar items={MTABS_CLIENT} active="Flotte"/>}
    >
      <div style={{ padding: "14px 18px 24px", display:"flex", flexDirection:"column", gap: 16 }}>
        <Search placeholder="Immatriculation, modèle…"/>

        <div style={{ display:"flex", gap: 6, flexWrap:"wrap" }}>
          <Tag tone="invert" dot>Tous · 12</Tag>
          <Tag tone="ok">Actifs · 9</Tag>
          <Tag tone="info">Gelés · 2</Tag>
          <Tag tone="warn">Attente · 1</Tag>
        </div>

        <div>
          {sectionTitle("Actifs", "9", "ok")}
          <div style={{ display:"flex", flexDirection:"column", gap: 10 }}>
            {[
              { i:"AB-123-CD", m:"Mercedes Vito 116",  p:"Standard",  ph: PHOTOS.vito },
              { i:"DE-234-FG", m:"Tesla Model 3",      p:"VTC",       ph: PHOTOS.tesla },
              { i:"HI-345-JK", m:"BMW Série 5",        p:"Standard",  ph: PHOTOS.bmw },
            ].map(v => (
              <MFleetRow key={v.i} immat={v.i} model={v.m} pack={v.p} status="actif" statusTone="ok" photo={v.ph}/>
            ))}
          </div>
        </div>

        <div>
          {sectionTitle("Gelés", "2", "info")}
          <MFleetRow immat="XY-789-ZA" model="Renault Trafic L2" pack="Standard" status="gelé" statusTone="info" photo={PHOTOS.trafic} extra="Du 11 juin → 02 juil. (22 j)"/>
        </div>

        <div>
          {sectionTitle("En attente", "1", "warn")}
          <MFleetRow immat="FG-901-HI" model="Audi A6" pack="VTC" status="en attente" statusTone="warn" photo={PHOTOS.audi}/>
        </div>
      </div>
    </MobileShell>
  );
};

const MFleetRow = ({ immat, model, pack, status, statusTone, photo, extra }) => (
  <a style={{
    background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4,
    padding: 10, display:"flex", gap: 12, alignItems:"center", textDecoration:"none", color: TOK.ink,
  }}>
    <PhotoFrame src={photo} ratio="1/1" style={{ width: 74, flex:"0 0 74px", height: 74, aspectRatio: "auto" }} frame={false}/>
    <div style={{ flex: 1, minWidth: 0, display:"flex", flexDirection:"column", gap: 4 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap: 8 }}>
        <span style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 15, letterSpacing:".01em" }}>{immat}</span>
        <Tag tone={statusTone} dot>{status}</Tag>
      </div>
      <div style={{ fontSize: 12, color: TOK.ink50 }}>{model}</div>
      <div style={{ display:"flex", alignItems:"center", gap: 8 }}>
        <PackTag pack={pack}/>
        {extra && <Mono size={9}>{extra}</Mono>}
      </div>
    </div>
    <I.chevR s={16} c={TOK.ink50}/>
  </a>
);

// ─── M03 · Fiche véhicule ─────────────────────────────────────────────
const M_Vehicule = () => (
  <MobileShell
    header={null}
    tabbar={<MobileTabbar items={MTABS_CLIENT} active="Flotte"/>}
  >
    {/* Photo hero */}
    <div style={{ position:"relative" }}>
      <PhotoFrame src={PHOTOS.vito} ratio="4/3" frame={false} style={{ borderRadius: 0 }}/>
      <div style={{ position:"absolute", top: 16, left: 16, right: 16, display:"flex", justifyContent:"space-between" }}>
        <button style={{ background:"#fff", border:"none", borderRadius: TOK.r2, padding: 8, cursor:"pointer", display:"inline-flex" }}><I.chevL s={16}/></button>
        <div style={{ display:"flex", gap: 8 }}>
          <button style={{ background:"#fff", border:"none", borderRadius: TOK.r2, padding: 8, cursor:"pointer", display:"inline-flex" }}><I.pen s={14}/></button>
          <button style={{ background:"#fff", border:"none", borderRadius: TOK.r2, padding: 8, cursor:"pointer", display:"inline-flex", color: TOK.danger }}><I.trash s={14}/></button>
        </div>
      </div>
      <div style={{ position:"absolute", left: 16, right: 16, bottom: 16, display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
        <div>
          <Mono size={9} color="rgba(255,255,255,.85)">Ma flotte · #VH-23CD</Mono>
          <div style={{ fontFamily: TOK.head, fontSize: 24, color:"#fff", fontWeight: 700, letterSpacing:"-0.4px", marginTop: 4 }}>Mercedes Vito 116</div>
          <div style={{ fontFamily: TOK.head, fontSize: 15, color: TOK.brand, fontWeight: 600 }}>AB-123-CD</div>
        </div>
        <Tag tone="info" dot>gelé</Tag>
      </div>
    </div>

    {/* Gel alert */}
    <div style={{ padding: "16px 18px 0" }}>
      <div style={{
        background: TOK.infoL, border: `1px solid ${TOK.info}33`,
        borderRadius: TOK.r4, padding: 14, display:"flex", flexDirection:"column", gap: 10,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap: 8 }}>
          <I.snow s={16} c={TOK.info}/>
          <Mono size={10} color={TOK.info}>Véhicule actuellement gelé</Mono>
        </div>
        <div style={{ fontSize: 13, color: TOK.ink }}>
          Du <strong>11 juin</strong> au <strong>02 juillet</strong>
          <span style={{ color: TOK.ink50 }}> · 22 jours</span>
        </div>
        <Btn kind="primary" size="sm" full>Lever le gel</Btn>
      </div>
    </div>

    {/* Infos */}
    <div style={{ padding: "16px 18px 0" }}>
      <Mono size={10} style={{ marginBottom: 10, display:"block" }}>Informations</Mono>
      <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 16, display:"grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {[
          ["Marque", "Mercedes-Benz"],
          ["Modèle", "Vito 116 CDI"],
          ["Type", "Utilitaire"],
          ["Année", "2023"],
          ["Couleur", "Noir obsidienne"],
          ["Km", "48 320"],
        ].map(([k,v]) => (
          <div key={k}>
            <Mono size={9}>{k}</Mono>
            <div style={{ fontFamily: TOK.head, fontWeight: 600, fontSize: 13, marginTop: 4 }}>{v}</div>
          </div>
        ))}
        <div style={{ gridColumn:"1 / span 2", paddingTop: 10, borderTop: `1px dashed ${TOK.line}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <Mono size={9}>Pack</Mono>
          <PackTag pack="Standard"/>
        </div>
      </div>
    </div>

    {/* Services */}
    <div style={{ padding: "16px 18px 0" }}>
      <Mono size={10} style={{ marginBottom: 10, display:"block" }}>Services inclus</Mono>
      <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 14, display:"flex", flexDirection:"column", gap: 10 }}>
        {[
          ["Lavage carrosserie", true],
          ["Lustrage & brillance", true],
          ["Aspiration intérieure", true],
          ["Nettoyage cabine", true],
          ["Cuir & sellerie", false],
          ["Décontamination ozone", false],
        ].map(([n, on], i) => (
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

    {/* Actions */}
    <div style={{ padding: "16px 18px 22px", display:"flex", flexDirection:"column", gap: 8 }}>
      <Btn kind="primary" full icon={<I.clock s={12}/>}>Demander un RDV</Btn>
      <Btn kind="ghost" full icon={<I.snow s={12}/>}>Demander un gel</Btn>
      <Btn kind="danger" full icon={<I.trash s={12}/>}>Supprimer le véhicule</Btn>
    </div>
  </MobileShell>
);

Object.assign(window, { M_Flotte, MFleetRow, M_Vehicule });
