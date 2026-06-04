// System / spec boards: typography, buttons, badges, cards, forms.

// Typography spec
const TypeBoard = () => (
  <div style={{
    width:"100%", height:"100%", boxSizing:"border-box",
    background: TOK.paper, padding: 36, fontFamily: TOK.body, color: TOK.ink,
    display:"grid", gridTemplateColumns:"1.2fr 1fr", gap: 28,
  }}>
    <div style={{ display:"flex", flexDirection:"column", gap: 18 }}>
      <Mono size={11}>Typography · premium hierarchy</Mono>
      <div style={{ fontFamily: TOK.head, fontSize: 92, lineHeight: .92, letterSpacing: "-2px", fontWeight: 700 }}>
        Aa01<span style={{ color: TOK.brand }}>·</span>Éé
      </div>
      <div style={{ fontSize: 13, color: TOK.ink50, lineHeight: 1.7 }}>
        Headings — <strong style={{color:TOK.ink}}>Outfit</strong> 700 · letter-spacing −0.5px<br/>
        Body &amp; UI — <strong style={{color:TOK.ink}}>Inter</strong> 400 / 600<br/>
        Data (immat, IDs, codes, e-mail) — <strong style={{color:TOK.ink}}>JetBrains Mono</strong> 400
      </div>
    </div>
    <div style={{ display:"flex", flexDirection:"column", gap: 16, borderLeft: `1px solid ${TOK.line}`, paddingLeft: 28 }}>
      {[
        ["H1 · Outfit 700 · 32/40 · −0.5px", TOK.head, 32, 700, "-0.5px", "44 véhicules suivis"],
        ["H2 · Outfit 700 · 24/32 · −0.5px", TOK.head, 24, 700, "-0.5px", "Demandes de gel"],
        ["H3 · Outfit 700 · 18/28 · −0.5px", TOK.head, 18, 700, "-0.5px", "Mercedes Vito 116 CDI"],
        ["Body · Inter 400 · 13/22", TOK.body, 13, 400, "0", "Pack Standard — lavage carrosserie, brillance, cabine. Inclus dans le contrat mensuel."],
        ["Emphasis · Inter 600 · 13", TOK.body, 13, 600, "0", "Véhicule actuellement gelé"],
        ["Data · JetBrains Mono · 12/18", TOK.mono, 12, 500, "0", "AB-123-CD · contact@cabify.fr"],
      ].map(([spec, ff, size, w, ls, txt], i) => (
        <div key={i}>
          <Mono size={9}>{spec}</Mono>
          <div style={{
            marginTop: 6, fontFamily: ff, fontSize: size, fontWeight: w,
            letterSpacing: ls, color: TOK.ink, lineHeight: size >= 24 ? 1.15 : 1.5,
          }}>{txt}</div>
        </div>
      ))}
    </div>
  </div>
);

// Buttons spec — 5 states × 4 kinds
const ButtonsBoard = () => {
  const states = ["default", "hover", "active", "disabled", "loading"];
  const kinds = ["primary", "accent", "ghost", "danger"];
  return (
    <div style={{
      width:"100%", height:"100%", boxSizing:"border-box",
      background: TOK.paper, padding: 32, fontFamily: TOK.body, color: TOK.ink,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom: 22 }}>
        <Mono size={11}>Buttons · 5 states × 4 kinds × 3 sizes</Mono>
        <Mono size={10} color={TOK.brand}>Inter SemiBold · sentence case</Mono>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"80px repeat(4, 1fr)", gap: 12, alignItems:"center" }}>
        <div/>
        {kinds.map(k => <Mono key={k} size={9}>{k}</Mono>)}
        {states.map(s => (
          <React.Fragment key={s}>
            <Mono size={9}>{s}</Mono>
            {kinds.map(k => (
              <div key={k}>
                <Btn kind={k} state={s} size="md" icon={k === "primary" ? <I.arrow s={12}/> : null}>
                  {k === "primary" ? "Demander RDV" : k === "accent" ? "Valider" : k === "ghost" ? "Annuler" : "Résilier"}
                </Btn>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      <div style={{ marginTop: 24, paddingTop: 18, borderTop: `1px solid ${TOK.line}`, display:"flex", gap: 16, alignItems:"center" }}>
        <Mono size={10}>Sizes</Mono>
        <Btn size="sm">SM</Btn>
        <Btn size="md">Medium</Btn>
        <Btn size="lg">Large</Btn>
        <span style={{ flex: 1 }}/>
        <Btn kind="ghost" size="sm" icon={<I.plus s={11}/>}>Nouveau véhicule</Btn>
        <Btn kind="accent" icon={<I.check s={12}/>}>Valider la demande</Btn>
      </div>
    </div>
  );
};

// Badges spec
const BadgesBoard = () => (
  <div style={{
    width:"100%", height:"100%", boxSizing:"border-box",
    background: TOK.paper, padding: 32, fontFamily: TOK.body, color: TOK.ink,
  }}>
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom: 22 }}>
      <Mono size={11}>Badges · véhicule / gel / contrat / pack / RDV</Mono>
      <Mono size={10} color={TOK.brand}>Tag = micro-état | PackTag = pack distinct</Mono>
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"140px 1fr", rowGap: 16, columnGap: 24, alignItems:"center" }}>
      <Mono size={10}>Véhicule</Mono>
      <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
        <Tag tone="ok" dot>actif</Tag>
        <Tag tone="info" dot>gelé</Tag>
        <Tag tone="warn" dot>en attente</Tag>
      </div>

      <Mono size={10}>Gel</Mono>
      <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
        <Tag tone="warn" dot>en_attente</Tag>
        <Tag tone="info" dot>validée</Tag>
        <Tag tone="info" dot>active</Tag>
        <Tag tone="neutral" dot>clôturée</Tag>
      </div>

      <Mono size={10}>Contrat</Mono>
      <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
        <Tag tone="brand" dot>actif</Tag>
        <Tag tone="info" dot>en_cours_gel</Tag>
        <Tag tone="danger" dot>résilié</Tag>
      </div>

      <Mono size={10}>RDV</Mono>
      <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
        <Tag tone="warn" dot>en_attente</Tag>
        <Tag tone="ok" dot>confirmée</Tag>
        <Tag tone="danger" dot>refusée</Tag>
      </div>

      <Mono size={10}>Pack</Mono>
      <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
        <PackTag pack="Intérieur"/>
        <PackTag pack="Standard"/>
        <PackTag pack="VTC"/>
      </div>

      <Mono size={10}>Type client</Mono>
      <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
        <Tag tone="neutral" square>PME</Tag>
        <Tag tone="brand" square>VTC</Tag>
        <Tag tone="info" square>Location</Tag>
      </div>
    </div>
  </div>
);

Object.assign(window, { TypeBoard, ButtonsBoard, BadgesBoard });
