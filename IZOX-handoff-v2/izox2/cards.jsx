// Reusable cards — Vehicle, Demande, Client, Contrat, KPI.

const VehicleCard = ({ immat, model = "Mercedes Vito", pack = "Standard", status = "actif", statusTone = "ok", photo, mini }) => (
  <div style={{
    background: TOK.surface, color: TOK.ink, border: `1px solid ${TOK.line}`,
    borderRadius: TOK.r6, padding: 0, overflow:"hidden",
    display:"flex", flexDirection:"column", boxShadow: TOK.shadow,
  }}>
    <PhotoFrame src={photo || PHOTOS.vito} ratio={mini ? "16/9" : "16/10"} frame={false}>
      <div style={{ position:"absolute", top: 8, left: 8, right: 8, display:"flex", justifyContent:"space-between" }}>
        <Tag tone={statusTone} dot>{status}</Tag>
        <PackTag pack={pack}/>
      </div>
    </PhotoFrame>
    <div style={{ padding: "14px 16px 16px", display:"flex", flexDirection:"column", gap: 6 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <Data size={14} weight={600} style={{ letterSpacing:".02em" }}>{immat}</Data>
        <Mono size={9}>#VH-{(immat||"").replace(/[^A-Z0-9]/gi,"").slice(-4)}</Mono>
      </div>
      <div style={{ fontFamily: TOK.body, fontSize: 13, color: TOK.ink50 }}>{model}</div>
    </div>
  </div>
);

// KPI / stat tile
const Stat = ({ label, value, sub, accent, big, icon, prefix, suffix }) => (
  <div style={{
    background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r6,
    padding: big ? 24 : 20, display:"flex", flexDirection:"column", gap: big ? 14 : 10,
    minWidth: 0, boxShadow: TOK.shadow,
  }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <Mono size={9}>{label}</Mono>
      {icon}
    </div>
    <div style={{ display:"flex", alignItems:"baseline", gap: 6, fontFamily: TOK.head }}>
      {prefix && <span style={{ fontSize: big ? 22 : 16, color: TOK.ink50, fontWeight: 600 }}>{prefix}</span>}
      <span style={{
        fontSize: big ? 48 : 34, fontWeight: 700, letterSpacing: "-0.5px",
        color: accent || TOK.ink, lineHeight: 1,
      }}>{value}</span>
      {suffix && <span style={{ fontSize: big ? 22 : 16, color: TOK.ink50, fontWeight: 600 }}>{suffix}</span>}
    </div>
    {sub && <div style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink50, lineHeight: 1.5 }}>{sub}</div>}
  </div>
);

// Quota bar — used everywhere for gel quota visuals
const QuotaBar = ({ used = 22, scheduled = 22, max = 90, color = TOK.info, scheduledColor }) => {
  const u = (used / max) * 100;
  const s = (scheduled / max) * 100;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap: 6 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontFamily: TOK.body, fontSize: 12 }}>
        <span style={{ color: TOK.ink50, fontWeight: 600, letterSpacing: ".04em" }}>QUOTA</span>
        <span style={{ fontFamily: TOK.mono }}>
          <strong style={{ fontSize: 14, color: TOK.ink, letterSpacing: "-0.01em" }}>{used + scheduled}</strong>
          <span style={{ color: TOK.ink50 }}>/{max} jours</span>
        </span>
      </div>
      <div style={{ position:"relative", height: 6, background: TOK.line, borderRadius: 999, overflow:"hidden", display:"flex" }}>
        <span style={{ width: `${u}%`, background: color, height: "100%" }}/>
        <span style={{ width: `${s}%`, background: scheduledColor || withAlpha(color, .35), height: "100%" }}/>
      </div>
      <div style={{ display:"flex", gap: 12, fontSize: 10, fontFamily: TOK.body, color: TOK.ink50 }}>
        <span><span style={{ display:"inline-block", width:8, height:8, background: color, marginRight: 5, verticalAlign:"middle" }}/>{used} en cours</span>
        <span><span style={{ display:"inline-block", width:8, height:8, background: withAlpha(color, .35), marginRight: 5, verticalAlign:"middle" }}/>{scheduled} programmés</span>
      </div>
    </div>
  );
};

// Demande (gel) card
const DemandeCard = ({ id = "G-014", immat = "AB-123-CD", model = "Mercedes Vito", client = "Cabify Paris", dates = "11 juin → 02 juillet", days = 22, status = "en_attente", quota = { used: 22, sch: 22, max: 90 }, motif, photo }) => {
  const t = STATUS["gel" + status.charAt(0).toUpperCase() + status.slice(1)] || STATUS.gelAttente;
  const tone = t.tone === "neutral" ? "neutral" : t.tone;
  return (
    <div style={{
      background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r6,
      padding: 20, display:"flex", flexDirection:"column", gap: 16, boxShadow: TOK.shadow,
    }}>
      <div style={{ display:"flex", gap: 14 }}>
        <PhotoFrame src={photo || PHOTOS.vitoSide} ratio="1/1" style={{ width: 90, flex:"0 0 90px", height: 90, aspectRatio: "auto" }} frame={false}/>
        <div style={{ flex: 1, display:"flex", flexDirection:"column", gap: 4, minWidth: 0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap: 8 }}>
            <Mono size={9}>#{id} · {client}</Mono>
            <Tag tone={tone} dot>{t.label}</Tag>
          </div>
          <Data size={17} weight={600} style={{ letterSpacing:".01em" }}>{immat}</Data>
          <div style={{ fontFamily: TOK.body, fontSize: 13, color: TOK.ink50 }}>{model}</div>
          <div style={{ fontFamily: TOK.body, fontSize: 13, color: TOK.ink, marginTop: 4 }}>
            {dates} <span style={{ color: TOK.ink50 }}>· {days} j</span>
          </div>
        </div>
      </div>

      <QuotaBar used={quota.used} scheduled={quota.sch} max={quota.max}/>

      {motif && <div style={{
        fontFamily: TOK.body, fontSize: 12, color: TOK.ink70, background: TOK.panel,
        border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: "8px 10px",
      }}><Mono size={9} style={{marginRight:8}}>motif</Mono>{motif}</div>}

      <div style={{ display:"flex", gap: 8, paddingTop: 4, borderTop: `1px dashed ${TOK.line}` }}>
        {status === "attente" && <>
          <Btn kind="primary" size="sm" full icon={<I.check s={11}/>}>Valider</Btn>
          <Btn kind="ghost" size="sm" full>Refuser</Btn>
        </>}
        {status === "validee" && <>
          <Btn kind="ghost" size="sm" full>Annuler</Btn>
          <Btn kind="primary" size="sm" full>Voir détails</Btn>
        </>}
        {status === "active" && <>
          <Btn kind="ghost" size="sm" full>Voir détails</Btn>
          <Btn kind="danger" size="sm" full>Lever le gel</Btn>
        </>}
        {status === "cloturee" && <>
          <Btn kind="ghost" size="sm" full>Historique</Btn>
        </>}
      </div>
    </div>
  );
};

// Client card (admin list)
const ClientCard = ({ id = "CL-104", name = "Cabify Paris SAS", type = "VTC", email, vehicles = 12, frozen = 1, contractMrr }) => (
  <div style={{
    background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r6,
    padding: 20, display:"flex", flexDirection:"column", gap: 12, boxShadow: TOK.shadow,
  }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <Mono size={9}>#{id}</Mono>
      <Tag tone={type === "VTC" ? "brand" : type === "Location" ? "info" : "neutral"} square>{type}</Tag>
    </div>
    <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 17, letterSpacing: "-0.5px" }}>{name}</div>
    {email && <Data size={12} color={TOK.ink50}>{email}</Data>}
    <div style={{ display:"flex", gap: 14, paddingTop: 8, borderTop: `1px dashed ${TOK.line}`, fontFamily: TOK.body, fontSize: 13 }}>
      <span><strong>{vehicles}</strong> <span style={{ color: TOK.ink50 }}>véh.</span></span>
      <span><strong style={{ color: TOK.info }}>{frozen}</strong> <span style={{ color: TOK.ink50 }}>gelés</span></span>
      {contractMrr && <span style={{ marginLeft:"auto", color: TOK.brand, fontWeight: 600 }}>{contractMrr}€/mo</span>}
    </div>
  </div>
);

// Contrat card
const ContratCard = ({ num = "IZ-2026-0148", palier = "11–20", mensualite = "409", actifs = 3, geles = 1, attente = 1, status = "actif" }) => {
  const t = STATUS["ct" + ({ actif:"Actif", en_cours_gel:"EnGel", resilie:"Resilie" })[status]];
  return (
    <div style={{
      background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r6,
      padding: 20, display:"flex", flexDirection:"column", gap: 14, boxShadow: TOK.shadow,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <Mono size={9}>Contrat · {num}</Mono>
          <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 18, marginTop: 6, letterSpacing:"-0.5px" }}>
            Palier <span style={{ color: TOK.brand }}>{palier}</span>
          </div>
        </div>
        <Tag tone={t.tone} dot>{t.label}</Tag>
      </div>
      <div style={{ display:"flex", alignItems:"baseline", gap: 6 }}>
        <div style={{ fontSize: 34, fontFamily: TOK.head, fontWeight: 700, letterSpacing:"-0.5px" }}>{mensualite}<span style={{ color: TOK.brand, marginLeft: 2 }}>€</span></div>
        <div style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink50 }}>HT / mois</div>
      </div>
      <div style={{ display:"flex", gap: 8, paddingTop: 6, borderTop: `1px dashed ${TOK.line}`, fontFamily: TOK.body, fontSize: 13 }}>
        <span><strong style={{color:TOK.ok}}>{actifs}</strong> <span style={{color:TOK.ink50}}>actifs</span></span>
        <span style={{color:TOK.line}}>·</span>
        <span><strong style={{color:TOK.info}}>{geles}</strong> <span style={{color:TOK.ink50}}>gelés</span></span>
        <span style={{color:TOK.line}}>·</span>
        <span><strong style={{color:TOK.warn}}>{attente}</strong> <span style={{color:TOK.ink50}}>attente</span></span>
      </div>
    </div>
  );
};

Object.assign(window, { VehicleCard, Stat, QuotaBar, DemandeCard, ClientCard, ContratCard });
