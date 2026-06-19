// /client/flotte/$id/rdv — Booking calendar (desktop + mobile).

// Month grid helper. June 2026 starts on a Monday (2026-06-01 = Monday).
const CalMonth = ({ selected = 13, compact }) => {
  const days = 30;
  const firstDow = 0; // Monday-indexed: June 1 2026 is Monday → col 0
  const dowLabels = ["L","M","M","J","V","S","D"];
  const today = 11;
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const isAvail = (d) => d >= today && [1,6,0].indexOf((firstDow + d - 1) % 7) === -1; // weekdays from today
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 14 }}>
        <button style={{ background:"transparent", border:`1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 7, cursor:"pointer", color: TOK.ink, display:"inline-flex" }}><I.chevL s={14}/></button>
        <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 16, letterSpacing:"-0.3px" }}>Juin 2026</div>
        <button style={{ background:"transparent", border:`1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 7, cursor:"pointer", color: TOK.ink, display:"inline-flex" }}><I.chevR s={14}/></button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap: compact ? 4 : 6 }}>
        {dowLabels.map((l, i) => (
          <div key={"h"+i} style={{ textAlign:"center", fontFamily: TOK.body, fontSize: 10, fontWeight: 600, color: TOK.ink30, textTransform:"uppercase", paddingBottom: 4 }}>{l}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i}/>;
          const avail = isAvail(d);
          const sel = d === selected;
          const isToday = d === today;
          return (
            <div key={i} style={{
              aspectRatio: "1/1", borderRadius: TOK.r4,
              display:"flex", alignItems:"center", justifyContent:"center",
              position:"relative",
              background: sel ? TOK.brand : avail ? TOK.brandL : "transparent",
              color: sel ? "#fff" : avail ? TOK.brand : TOK.ink30,
              border: sel ? "none" : avail ? `1px solid ${withAlpha(TOK.brand,0.18)}` : `1px solid transparent`,
              fontFamily: TOK.body, fontSize: compact ? 13 : 14, fontWeight: sel ? 700 : avail ? 600 : 400,
              cursor: avail ? "pointer" : "default",
            }}>
              {d}
              {isToday && !sel && <span style={{ position:"absolute", bottom: 4, width: 4, height: 4, borderRadius: 999, background: TOK.brand }}/>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SLOTS_AM = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30"];
const SLOTS_PM = ["13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"];

const SlotGrid = ({ selected = "09:30", taken = ["08:00","10:30","14:00"] }) => {
  const Slot = ({ t }) => {
    const isTaken = taken.includes(t);
    const sel = t === selected;
    return (
      <button disabled={isTaken} style={{
        padding: "9px 0", borderRadius: TOK.r4, cursor: isTaken ? "not-allowed" : "pointer",
        fontFamily: TOK.body, fontSize: 13, fontWeight: 600,
        background: sel ? TOK.brand : isTaken ? TOK.panel : TOK.surface,
        color: sel ? "#fff" : isTaken ? TOK.ink30 : TOK.ink,
        border: `1px solid ${sel ? TOK.brand : TOK.line}`,
        textDecoration: isTaken ? "line-through" : "none",
      }}>{t}</button>
    );
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
      <div>
        <Mono size={9} style={{ marginBottom: 8, display:"block" }}>Matin</Mono>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 8 }}>{SLOTS_AM.map(t => <Slot key={t} t={t}/>)}</div>
      </div>
      <div>
        <Mono size={9} style={{ marginBottom: 8, display:"block" }}>Après-midi</Mono>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 8 }}>{SLOTS_PM.map(t => <Slot key={t} t={t}/>)}</div>
      </div>
    </div>
  );
};

// Desktop booking
const D_Booking = () => (
  <Page>
    <Sidebar items={NAV_CLIENT} active="Ma flotte" role="Client"/>
    <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Topbar crumbs={["Client","Ma flotte","AB-123-CD","Nouveau RDV"]} title="Prendre un rendez-vous"
        sub="Choisissez une date et un créneau pour le lavage de votre véhicule"
        right={<Btn kind="ghost" size="sm" icon={<I.x s={12}/>}>Annuler</Btn>}/>
      <div style={{ flex: 1, overflowY:"auto", padding: 28, display:"grid", gridTemplateColumns:"300px 1fr 320px", gap: 18, alignItems:"start" }}>
        {/* Summary */}
        <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
          <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r6, overflow:"hidden", boxShadow: TOK.shadow }}>
            <PhotoFrame src={PHOTOS.vito} ratio="16/10" frame={false}/>
            <div style={{ padding: 16, display:"flex", flexDirection:"column", gap: 8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <Data size={15} weight={600}>AB-123-CD</Data>
                <PackTag pack="Standard"/>
              </div>
              <div style={{ fontFamily: TOK.body, fontSize: 13, color: TOK.ink50 }}>Mercedes Vito 116 CDI</div>
            </div>
          </div>
          <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r6, padding: 16, boxShadow: TOK.shadow }}>
            <Mono size={9} style={{ marginBottom: 10, display:"block" }}>Prestation incluse</Mono>
            <div style={{ display:"flex", flexDirection:"column", gap: 8 }}>
              {["Lavage carrosserie","Lustrage & brillance","Aspiration intérieure","Nettoyage cabine"].map(s => (
                <div key={s} style={{ display:"flex", alignItems:"center", gap: 10, fontSize: 13, color: TOK.ink }}>
                  <I.check s={14} c={TOK.ok}/> {s}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${TOK.line}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink50 }}>Durée estimée</span>
              <Tag tone="neutral">≈ 45 min</Tag>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r6, padding: 22, boxShadow: TOK.shadow }}>
          <div style={{ display:"flex", alignItems:"center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: TOK.brand, color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", fontFamily: TOK.body, fontWeight: 700, fontSize: 13 }}>1</div>
            <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 16, letterSpacing:"-0.3px" }}>Choisir une date</div>
          </div>
          <CalMonth selected={13}/>
          <div style={{ display:"flex", gap: 16, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${TOK.line}` }}>
            {[["Disponible", TOK.brandL, TOK.brand],["Sélectionné", TOK.brand, "#fff"],["Indisponible", "transparent", TOK.ink30]].map(([l,bg,fg])=>(
              <div key={l} style={{ display:"flex", alignItems:"center", gap: 7, fontFamily: TOK.body, fontSize: 11.5, color: TOK.ink50 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: bg, border:`1px solid ${TOK.line}` }}/> {l}
              </div>
            ))}
          </div>
        </div>

        {/* Slots + confirm */}
        <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
          <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r6, padding: 20, boxShadow: TOK.shadow }}>
            <div style={{ display:"flex", alignItems:"center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: TOK.brand, color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", fontFamily: TOK.body, fontWeight: 700, fontSize: 13 }}>2</div>
              <div>
                <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 16, letterSpacing:"-0.3px" }}>Créneau</div>
                <Mono size={9}>Jeudi 13 juin</Mono>
              </div>
            </div>
            <SlotGrid selected="09:30"/>
          </div>

          <div style={{ background: TOK.brand, borderRadius: TOK.r6, padding: 20, color:"#fff", display:"flex", flexDirection:"column", gap: 12 }}>
            <Mono size={9} color="rgba(255,255,255,.7)">Récapitulatif</Mono>
            <div style={{ display:"flex", alignItems:"center", gap: 10 }}>
              <I.cal s={20} c="#7CC9A5"/>
              <div>
                <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 18, letterSpacing:"-0.3px" }}>Jeudi 13 juin · 09:30</div>
                <div style={{ fontFamily: TOK.body, fontSize: 12, color:"rgba(255,255,255,.7)" }}>AB-123-CD · Lavage Standard · Paris 17e</div>
              </div>
            </div>
            <Btn kind="accent" full size="lg" icon={<I.check s={14}/>}>Confirmer le rendez-vous</Btn>
            <span style={{ fontFamily: TOK.body, fontSize: 11, color:"rgba(255,255,255,.6)", textAlign:"center" }}>Demande envoyée à IZOX · confirmation sous 2h</span>
          </div>
        </div>
      </div>
    </main>
  </Page>
);

// Mobile booking
const M_Booking = () => (
  <MobileShell
    header={
      <div style={{ padding:"10px 18px 14px", borderBottom:`1px solid ${TOK.line}`, background: TOK.paper }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 10 }}>
          <button style={{ background:"transparent", border:`1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 6, cursor:"pointer", color: TOK.ink }}><I.chevL s={14}/></button>
          <Mono size={9}>Étape 2 / 3</Mono>
          <button style={{ background:"transparent", border:`1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 6, cursor:"pointer", color: TOK.ink }}><I.x s={14}/></button>
        </div>
        <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 22, letterSpacing:"-0.5px" }}>Choisir une date</div>
        <div style={{ display:"flex", alignItems:"center", gap: 8, marginTop: 6 }}>
          <Data size={13} weight={600}>AB-123-CD</Data>
          <PackTag pack="Standard"/>
        </div>
      </div>
    }
    tabbar={
      <div style={{ padding:"12px 16px calc(14px + env(safe-area-inset-bottom))", borderTop:`1px solid ${TOK.line}`, background: TOK.surface, display:"flex", alignItems:"center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Mono size={9}>Sélection</Mono>
          <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 14, letterSpacing:"-0.3px" }}>Jeu. 13 juin · 09:30</div>
        </div>
        <Btn kind="primary" size="lg" icon={<I.arrow s={13}/>}>Continuer</Btn>
      </div>
    }
  >
    <div style={{ padding: "16px 18px 22px", display:"flex", flexDirection:"column", gap: 20 }}>
      <div style={{ background: TOK.surface, border:`1px solid ${TOK.line}`, borderRadius: TOK.r6, padding: 18 }}>
        <CalMonth selected={13} compact/>
      </div>
      <div>
        <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 16, letterSpacing:"-0.3px", marginBottom: 4 }}>Créneaux · jeudi 13 juin</div>
        <Mono size={9} style={{ marginBottom: 14, display:"block" }}>6 créneaux disponibles</Mono>
        <SlotGrid selected="09:30"/>
      </div>
    </div>
  </MobileShell>
);

Object.assign(window, { D_Booking, M_Booking, CalMonth, SlotGrid });
