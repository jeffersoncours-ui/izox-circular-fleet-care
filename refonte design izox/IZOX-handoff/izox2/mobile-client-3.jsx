// Mobile Client — Prestations (M04) + Factures (M05) + Login (M06)

const M_Prestations = () => (
  <MobileShell
    header={<MHead title="Mes prestations" sub="RDV À VENIR & HISTORIQUE" right={<Btn kind="primary" size="sm" icon={<I.plus s={11}/>}>RDV</Btn>}/>}
    tabbar={<MobileTabbar items={MTABS_CLIENT} active="RDV"/>}
  >
    <div style={{ padding: "14px 18px 24px", display:"flex", flexDirection:"column", gap: 18 }}>
      <div style={{ display:"flex", gap: 6 }}>
        <Tag tone="invert">À venir · 4</Tag>
        <Tag tone="neutral">Réalisés · 28</Tag>
      </div>

      <div>
        <Mono size={10} style={{ marginBottom: 10, display:"block" }}>À venir</Mono>
        <div style={{ display:"flex", flexDirection:"column", gap: 10 }}>
          {[
            { d:"JEU 13", h:"09:30", i:"AB-123-CD", m:"Vito · Standard", st:"confirmée", t:"ok" },
            { d:"VEN 14", h:"14:00", i:"DE-234-FG", m:"Tesla 3 · VTC",   st:"en_attente", t:"warn" },
            { d:"LUN 17", h:"08:00", i:"BMW 5 · Standard".split(" ")[0], m:"BMW Série 5 · Standard", st:"confirmée", t:"ok" },
            { d:"MAR 18", h:"10:30", i:"IJ-789-KL", m:"Audi A6 · VTC",   st:"confirmée", t:"ok" },
          ].map((r, i) => (
            <div key={i} style={{
              background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4,
              padding: 12, display:"flex", gap: 12, alignItems:"center",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: TOK.r2,
                background: r.t === "ok" ? TOK.brandL : TOK.warnL,
                color: r.t === "ok" ? TOK.brand : TOK.warn,
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                fontFamily: TOK.head, fontWeight: 700,
              }}>
                <span style={{ fontSize: 9, letterSpacing:".1em" }}>{r.d.split(" ")[0]}</span>
                <span style={{ fontSize: 18, letterSpacing:"-0.4px" }}>{r.d.split(" ")[1]}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 14 }}>{r.i}</div>
                <div style={{ fontSize: 12, color: TOK.ink50 }}>{r.m}</div>
                <div style={{ display:"flex", alignItems:"center", gap: 8, marginTop: 4 }}>
                  <Mono size={9}><I.clock s={9}/> {r.h}</Mono>
                  <Tag tone={r.t} dot>{r.st}</Tag>
                </div>
              </div>
              <I.chevR s={14} c={TOK.ink50}/>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Mono size={10} style={{ marginBottom: 10, display:"block" }}>Réalisés · 7 derniers jours</Mono>
        <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, overflow:"hidden" }}>
          {[
            { d:"08 juin", i:"FG-901-HI", m:"Audi A6 · VTC", op:"Karim B." },
            { d:"06 juin", i:"PQ-567-RS", m:"Renault Trafic", op:"Sofia T." },
            { d:"04 juin", i:"AB-123-CD", m:"Vito · Standard", op:"Karim B." },
          ].map((r, i, a) => (
            <div key={i} style={{
              padding: 12, display:"flex", alignItems:"center", gap: 10,
              borderTop: i ? `1px solid ${TOK.line}` : "none",
            }}>
              <div style={{ width: 30, height: 30, borderRadius: 999, background: TOK.okL, color: TOK.ok, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
                <I.check s={14}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: TOK.head, fontWeight: 600, fontSize: 13 }}>{r.i}</div>
                <div style={{ fontSize: 11, color: TOK.ink50 }}>{r.m} · {r.op}</div>
              </div>
              <Mono size={9}>{r.d}</Mono>
            </div>
          ))}
        </div>
      </div>
    </div>
  </MobileShell>
);

const M_Factures = () => (
  <MobileShell
    header={<MHead title="Mes factures" sub="3 EN ATTENTE · 12 PAYÉES"/>}
    tabbar={<MobileTabbar items={MTABS_CLIENT} active="Factures"/>}
  >
    <div style={{ padding: "14px 18px 24px", display:"flex", flexDirection:"column", gap: 18 }}>
      <div style={{
        background: TOK.ink, color:"#fff", borderRadius: TOK.r6, padding: 20,
        display:"flex", flexDirection:"column", gap: 14, position:"relative", overflow:"hidden",
      }}>
        <Mono size={10} color="rgba(255,255,255,.6)">À régler · 30j</Mono>
        <div style={{ fontFamily: TOK.head, fontSize: 56, fontWeight: 700, letterSpacing:"-1px", lineHeight: .9 }}>
          1 227<span style={{ color: TOK.brand }}>€</span>
        </div>
        <Mono size={10} color="rgba(255,255,255,.55)">HT · 3 factures en attente</Mono>
        <Btn kind="accent" size="sm" style={{ marginTop: 6, alignSelf:"flex-start" }} icon={<I.arrow s={12}/>}>Régler maintenant</Btn>
        <div style={{ position:"absolute", right: 16, top: 16, opacity: .12 }}>
          <I.euro s={70} c="#fff"/>
        </div>
      </div>

      <div>
        <Mono size={10} style={{ marginBottom: 10, display:"block" }}>En attente</Mono>
        <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, overflow:"hidden" }}>
          {[
            { n:"FAC-2026-0118", d:"01 juin", a:"409,00 €", st:"warn", lab:"à régler" },
            { n:"FAC-2026-0117", d:"01 mai",  a:"409,00 €", st:"warn", lab:"à régler" },
            { n:"FAC-2026-0116", d:"01 avr.", a:"409,00 €", st:"warn", lab:"à régler" },
          ].map((f, i) => (
            <div key={i} style={{ padding: 14, display:"flex", alignItems:"center", gap: 10, borderTop: i ? `1px solid ${TOK.line}` : "none" }}>
              <div style={{ width: 36, height: 44, background: TOK.panel, borderRadius: TOK.r2, display:"inline-flex", alignItems:"center", justifyContent:"center", color: TOK.ink50 }}><I.doc s={14}/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 13 }}>{f.n}</div>
                <div style={{ fontSize: 11, color: TOK.ink50 }}>Émise le {f.d}</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap: 4 }}>
                <span style={{ fontFamily: TOK.head, fontWeight: 700 }}>{f.a}</span>
                <Tag tone={f.st}>{f.lab}</Tag>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Mono size={10} style={{ marginBottom: 10, display:"block" }}>Payées</Mono>
        <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, overflow:"hidden" }}>
          {[
            { n:"FAC-2026-0115", d:"01 mars 2026", a:"409,00 €" },
            { n:"FAC-2026-0114", d:"01 févr. 2026", a:"409,00 €" },
            { n:"FAC-2025-0113", d:"01 janv. 2026", a:"388,00 €" },
          ].map((f, i) => (
            <div key={i} style={{ padding: 14, display:"flex", alignItems:"center", gap: 10, borderTop: i ? `1px solid ${TOK.line}` : "none", opacity: 0.85 }}>
              <div style={{ width: 28, height: 28, background: TOK.okL, color: TOK.ok, borderRadius: 999, display:"inline-flex", alignItems:"center", justifyContent:"center" }}><I.check s={14}/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: TOK.head, fontWeight: 600, fontSize: 13 }}>{f.n}</div>
                <Mono size={9}>{f.d}</Mono>
              </div>
              <span style={{ fontFamily: TOK.head, fontWeight: 600, color: TOK.ink70 }}>{f.a}</span>
              <I.chevR s={14} c={TOK.ink50}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  </MobileShell>
);

// Bonus screen — login (often the first user moment)
const M_Login = () => (
  <MobileShell statusbar header={null} tabbar={null}>
    <div style={{ flex: 1, padding: "32px 28px", display:"flex", flexDirection:"column", justifyContent:"space-between", background: TOK.paper }}>
      <div>
        <IzoxWord size={32}/>
        <div style={{ fontFamily: TOK.head, fontSize: 30, fontWeight: 700, letterSpacing:"-0.6px", lineHeight: 1.05, marginTop: 60 }}>
          Une flotte propre,<br/>
          sans friction. <span style={{ color: TOK.brand }}>↵</span>
        </div>
        <div style={{ fontSize: 13, color: TOK.ink50, marginTop: 14, maxWidth: 280, lineHeight: 1.55 }}>
          Lavage premium pour vos véhicules pros. Programmez, gelez, suivez — depuis votre poche.
        </div>

        <div style={{ marginTop: 36, display:"flex", flexDirection:"column", gap: 12 }}>
          <label style={{ display:"flex", flexDirection:"column", gap: 6 }}>
            <Mono size={9}>Email</Mono>
            <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: "12px 14px", fontFamily: TOK.head, fontSize: 13 }}>
              lea@cabify.fr
            </div>
          </label>
          <label style={{ display:"flex", flexDirection:"column", gap: 6 }}>
            <Mono size={9}>Mot de passe</Mono>
            <div style={{ background: TOK.surface, border: `1px solid ${TOK.brand}`, borderRadius: TOK.r4, padding: "12px 14px", fontFamily: TOK.head, fontSize: 13, display:"flex", justifyContent:"space-between", boxShadow: `0 0 0 3px ${TOK.brand}25` }}>
              ●●●●●●●●●●<I.eye s={14} c={TOK.ink50}/>
            </div>
          </label>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap: 10 }}>
        <Btn kind="primary" full size="lg" icon={<I.arrow s={14}/>}>Connexion</Btn>
        <Btn kind="ghost" full size="md">Continuer avec SSO</Btn>
        <div style={{ textAlign:"center", marginTop: 4 }}>
          <Mono size={9}>Mot de passe oublié ?</Mono>
        </div>
      </div>
    </div>
  </MobileShell>
);

Object.assign(window, { M_Prestations, M_Factures, M_Login });
