// Empty states — reusable EmptyState + 6 key screens.
// Pattern: medallion icon · Outfit title · Inter body · brand CTA · panel backdrop.

const EmptyState = ({ icon, eyebrow, title, body, cta, secondary, chips, tone = "brand", compact }) => {
  const accent = tone === "warn" ? TOK.warn : tone === "info" ? TOK.info : TOK.brand;
  const accentL = tone === "warn" ? TOK.warnL : tone === "info" ? TOK.infoL : TOK.brandL;
  return (
    <div style={{
      flex: 1, display:"flex", alignItems:"center", justifyContent:"center",
      padding: compact ? 32 : 56, position:"relative", overflow:"hidden",
    }}>
      {/* faint backdrop grid of the icon */}
      <div aria-hidden style={{
        position:"absolute", inset: 0, opacity: 0.025, pointerEvents:"none",
        display:"grid", gridTemplateColumns:"repeat(auto-fill, 92px)",
        gridAutoRows: 92, justifyContent:"center", alignContent:"center", gap: 8,
        color: TOK.ink,
      }}>
        {Array.from({ length: 60 }).map((_, i) => (
          <span key={i} style={{ display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
            {React.cloneElement(icon, { s: 30, c: "currentColor" })}
          </span>
        ))}
      </div>

      <div style={{
        position:"relative", maxWidth: 440, textAlign:"center",
        display:"flex", flexDirection:"column", alignItems:"center", gap: 18,
      }}>
        {/* Medallion */}
        <div style={{
          width: 96, height: 96, borderRadius: 24,
          background: TOK.surface, border: `1px solid ${TOK.line}`,
          boxShadow: TOK.shadowMd, position:"relative",
          display:"inline-flex", alignItems:"center", justifyContent:"center",
        }}>
          <div style={{
            position:"absolute", inset: -9, borderRadius: 30,
            border: `1.5px dashed ${withAlpha(accent, 0.4)}`,
          }}/>
          <div style={{
            width: 60, height: 60, borderRadius: 16, background: accentL,
            display:"inline-flex", alignItems:"center", justifyContent:"center",
          }}>
            {React.cloneElement(icon, { s: 30, c: accent })}
          </div>
        </div>

        {eyebrow && <Mono size={10} color={accent}>{eyebrow}</Mono>}

        <div style={{ display:"flex", flexDirection:"column", gap: 10 }}>
          <h2 style={{
            margin: 0, fontFamily: TOK.head, fontWeight: 700, fontSize: 24,
            letterSpacing: "-0.5px", color: TOK.ink, lineHeight: 1.15,
          }}>{title}</h2>
          <p style={{
            margin: 0, fontFamily: TOK.body, fontSize: 14, lineHeight: 1.6,
            color: TOK.ink50,
          }}>{body}</p>
        </div>

        {chips && (
          <div style={{ display:"flex", gap: 8, flexWrap:"wrap", justifyContent:"center" }}>
            {chips.map((c, i) => (
              <span key={i} style={{
                display:"inline-flex", alignItems:"center", gap: 6,
                padding: "6px 11px", borderRadius: 999, background: TOK.panel,
                border: `1px solid ${TOK.line}`, fontFamily: TOK.body,
                fontSize: 12, color: TOK.ink70, fontWeight: 500,
              }}>{c}</span>
            ))}
          </div>
        )}

        <div style={{ display:"flex", gap: 10, marginTop: 4 }}>
          {cta && <Btn kind="primary" icon={cta.icon}>{cta.label}</Btn>}
          {secondary && <Btn kind="ghost">{secondary.label}</Btn>}
        </div>
      </div>
    </div>
  );
};

// Helper: full page shell with empty body
const EmptyPage = ({ role, items, active, user, topbar, children }) => (
  <Page>
    <Sidebar items={items} active={active} role={role} user={user}/>
    <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {topbar}
      {children}
    </main>
  </Page>
);

const ADMIN_USER = { name: "Admin Ops", org: "IZOX · Paris" };

// 1 · /admin/clients — zéro client
const E_AdminClients = () => (
  <EmptyPage role="Admin" items={NAV_ADMIN} active="Clients" user={ADMIN_USER}
    topbar={<Topbar crumbs={["Admin","Clients"]} title="Clients"
      right={<><Search placeholder="Nom, email, SIRET…" style={{ minWidth: 300 }}/><Btn kind="primary" size="sm" icon={<I.plus s={11}/>}>Nouveau client</Btn></>}/>}>
    <EmptyState icon={<I.user/>} eyebrow="Aucun résultat"
      title="Aucun client pour le moment"
      body="Créez votre premier client pour commencer à gérer ses véhicules, contrats et interventions depuis un espace dédié."
      cta={{ label: "Nouveau client", icon: <I.plus s={12}/> }}
      secondary={{ label: "Importer un CSV" }}
      chips={["VTC", "PME", "Location", "Concessionnaire"]}
    />
  </EmptyPage>
);

// 2 · /admin/véhicules — zéro véhicule
const E_AdminVehicules = () => (
  <EmptyPage role="Admin" items={NAV_ADMIN} active="Véhicules" user={ADMIN_USER}
    topbar={<Topbar crumbs={["Admin","Véhicules"]} title="Véhicules"
      right={<><Search placeholder="Immat, modèle, client…"/><Btn kind="primary" size="sm" icon={<I.plus s={11}/>}>Ajouter véhicule</Btn></>}/>}>
    <EmptyState icon={<I.car/>} eyebrow="Flotte vide"
      title="Aucun véhicule suivi"
      body="Dès qu’un client ajoute des véhicules à sa flotte, ils apparaissent ici groupés par compte, avec leur pack et leur statut."
      cta={{ label: "Ajouter un véhicule", icon: <I.plus s={12}/> }}
      secondary={{ label: "Voir les clients" }}
    />
  </EmptyPage>
);

// 3 · /admin/interventions — zéro intervention
const E_AdminInterventions = () => (
  <EmptyPage role="Admin" items={NAV_ADMIN} active="Interventions" user={ADMIN_USER}
    topbar={<Topbar crumbs={["Admin","Interventions"]} title="Interventions"
      right={<><Search placeholder="Immat, client…"/><Btn kind="primary" size="sm" icon={<I.plus s={11}/>}>Nouvelle intervention</Btn></>}/>}>
    <EmptyState icon={<I.check/>} eyebrow="Rien à afficher"
      title="Aucune intervention planifiée"
      body="Les interventions créées depuis les demandes de RDV confirmées s’afficheront ici, avec leur statut en temps réel."
      cta={{ label: "Planifier une intervention", icon: <I.plus s={12}/> }}
      secondary={{ label: "Demandes de RDV" }}
    />
  </EmptyPage>
);

// 4 · /client dashboard — pas de contrat actif
const E_ClientDashboard = () => (
  <EmptyPage role="Client" items={NAV_CLIENT} active="Dashboard"
    topbar={<Topbar crumbs={["MARDI 11 JUIN 2026"]} title="Bienvenue chez IZOX"
      sub="Activez un contrat pour démarrer le suivi de votre flotte"
      right={<><Btn kind="ghost" size="sm" icon={<I.bell s={14}/>}>0</Btn><Btn kind="primary" size="sm" icon={<I.spark s={12}/>}>Activer un contrat</Btn></>}/>}>
    <EmptyState icon={<I.doc/>} eyebrow="Aucun contrat actif"
      title="Activez votre premier contrat"
      body="Choisissez un palier adapté à la taille de votre flotte et débloquez la prise de rendez-vous, les gels et le suivi RSE de vos véhicules."
      cta={{ label: "Découvrir les paliers", icon: <I.arrow s={12} c="#fff"/> }}
      secondary={{ label: "Parler à un conseiller" }}
      chips={["1–5 véh.", "6–10 véh.", "11–20 véh.", "21–50 véh."]}
    />
  </EmptyPage>
);

// 5 · /client/flotte — zéro véhicule
const E_ClientFlotte = () => (
  <EmptyPage role="Client" items={NAV_CLIENT} active="Ma flotte"
    topbar={<Topbar crumbs={["Client","Ma flotte"]} title="Ma flotte"
      right={<><Search placeholder="Immatriculation, modèle…" style={{ minWidth: 240 }}/><Btn kind="primary" size="sm" icon={<I.plus s={11}/>}>Ajouter véhicule</Btn></>}/>}>
    <EmptyState icon={<I.car/>} eyebrow="Flotte vide"
      title="Ajoutez votre premier véhicule"
      body="Renseignez l’immatriculation et le pack souhaité. Votre véhicule sera validé par nos équipes puis prêt pour ses premiers rendez-vous."
      cta={{ label: "Ajouter un véhicule", icon: <I.plus s={12}/> }}
      secondary={{ label: "Importer ma flotte" }}
    />
  </EmptyPage>
);

// 6 · /admin/demandes-gel — zéro demande
const E_AdminGel = () => (
  <EmptyPage role="Admin" items={NAV_ADMIN} active="Demandes gel" user={ADMIN_USER}
    topbar={<Topbar crumbs={["Admin","Demandes de gel"]} title="Demandes de gel"
      right={<><Search placeholder="Immat, client…"/><Btn kind="ghost" size="sm" icon={<I.upload s={12}/>}>Exporter</Btn></>}/>}>
    <EmptyState icon={<I.snow/>} tone="info" eyebrow="File vide"
      title="Aucune demande de gel"
      body="Quand un client demande l’immobilisation temporaire d’un véhicule, la demande arrive ici pour validation, avec le décompte du quota."
      secondary={{ label: "Historique des gels" }}
      chips={["Quota global · 0 / 90 j"]}
    />
  </EmptyPage>
);

Object.assign(window, { EmptyState, EmptyPage, ADMIN_USER,
  E_AdminClients, E_AdminVehicules, E_AdminInterventions,
  E_ClientDashboard, E_ClientFlotte, E_AdminGel });
