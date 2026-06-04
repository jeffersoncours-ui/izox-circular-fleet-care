
// Légal · RGPD / CGV — deux onglets, sidebar sections, bannière cookies
// Accessible depuis footer app + premier login

const CGV_SECTIONS = [
  { id:"objet",       title:"1. Objet du contrat",         content:`IZOX Pro est une plateforme SaaS de gestion de flotte dédiée au nettoyage automobile éco-responsable. Les présentes Conditions Générales de Vente (CGV) régissent l'ensemble des relations contractuelles entre IZOX SAS (ci-après « IZOX ») et ses clients professionnels (ci-après « le Client »).\n\nEn accédant à la plateforme IZOX Pro, en créant un compte ou en souscrivant à un abonnement, le Client accepte sans réserve les présentes CGV dans leur version en vigueur à la date de souscription.` },
  { id:"services",    title:"2. Description des services",  content:`IZOX Pro propose les services suivants dans le cadre des formules d'abonnement souscrites :\n\n• Gestion de flotte véhicules (ajout, suivi statut, gel temporaire)\n• Prise de rendez-vous en ligne pour les interventions de nettoyage\n• Accès au tableau de bord opérateur terrain (application mobile)\n• Suivi de l'impact RSE et des économies en eau réalisées\n• Génération de factures mensuelles et historique des prestations\n• API d'intégration avec les systèmes de gestion de flotte tiers\n\nLes fonctionnalités disponibles dépendent du palier souscrit (1–5, 6–10, 11–20, 21–50 ou 51–100 véhicules).` },
  { id:"paliers",     title:"3. Paliers tarifaires",        content:`Les abonnements IZOX Pro sont proposés selon les paliers suivants (tarifs HT, facturés mensuellement) :\n\n• Palier 1–5 véhicules : 90 € / mois\n• Palier 6–10 véhicules : 180 € / mois\n• Palier 11–20 véhicules : 320 € / mois\n• Palier 21–50 véhicules : 750 € / mois\n• Palier 51–100 véhicules : sur devis\n\nTous les prix sont indiqués en euros hors taxes. La TVA applicable est de 20 %. Les tarifs sont révisables annuellement avec un préavis de 30 jours.` },
  { id:"gel",         title:"4. Gel de véhicules",          content:`Le gel temporaire permet au Client de suspendre le suivi et la facturation d'un véhicule immobilisé. Les conditions applicables sont :\n\n• Quota annuel de 90 jours de gel par contrat (toutes immobilisations cumulées)\n• Délai de prévenance minimum de 48 heures avant prise d'effet\n• Validation par l'équipe IZOX sous 24 heures ouvrées\n• Non rétroactif : un gel ne peut pas prendre effet avant sa date de demande\n\nAu-delà du quota de 90 jours, les jours supplémentaires seront facturés au tarif de 2 € HT/jour/véhicule.` },
  { id:"paiement",    title:"5. Conditions de paiement",    content:`Les factures sont émises le 1er de chaque mois pour la période précédente. Le paiement est exigible sous 30 jours à compter de la date d'émission.\n\nModes de paiement acceptés : virement SEPA, carte bancaire (via Stripe), prélèvement automatique SEPA.\n\nTout retard de paiement entraîne l'application de pénalités égales à 3 fois le taux d'intérêt légal, ainsi qu'une indemnité forfaitaire de recouvrement de 40 €. En cas de non-paiement sous 15 jours après relance, l'accès à la plateforme peut être suspendu.` },
  { id:"resilier",    title:"6. Résiliation",               content:`Le Client peut résilier son abonnement à tout moment avec un préavis de 30 jours calendaires, adressé par e-mail à ops@izox.fr avec confirmation écrite.\n\nEn cas de résiliation en cours de mois, la facturation est proratisée au jour de prise d'effet. Les données du Client sont conservées pendant 90 jours après la résiliation, puis définitivement supprimées conformément à notre politique RGPD.` },
  { id:"responsabilite", title:"7. Limitation de responsabilité", content:`IZOX s'engage à fournir la plateforme avec une disponibilité cible de 99,5 % par mois (hors maintenances planifiées). En cas de défaillance, la responsabilité d'IZOX est limitée au montant des abonnements versés au cours des 3 derniers mois.\n\nIZOX ne saurait être tenu responsable des dommages indirects, perte d'exploitation, perte de données ou manque à gagner résultant de l'utilisation ou de l'indisponibilité temporaire de la plateforme.` },
  { id:"juridiction", title:"8. Juridiction et droit applicable", content:`Les présentes CGV sont soumises au droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable dans les 30 jours suivant la notification du différend. À défaut, le Tribunal de Commerce de Paris sera seul compétent.` },
];

const RGPD_SECTIONS = [
  { id:"responsable",  title:"1. Responsable du traitement",   content:`IZOX SAS, société par actions simplifiée au capital de 50 000 €, immatriculée au RCS de Paris sous le numéro 987 654 321, dont le siège social est situé au 42 rue de la Paix, 75002 Paris, est le responsable du traitement de vos données personnelles.\n\nDélégué à la Protection des Données (DPO) : dpo@izox.fr\nAdresse postale : IZOX SAS – DPO, 42 rue de la Paix, 75002 Paris` },
  { id:"collecte",     title:"2. Données collectées",          content:`Dans le cadre de l'utilisation de la plateforme IZOX Pro, les données suivantes sont collectées :\n\n• Données d'identification : nom, prénom, adresse e-mail professionnelle, numéro de téléphone\n• Données de compte : identifiants de connexion, préférences utilisateur, journaux d'accès\n• Données de flotte : immatriculations, modèles, kilométrages, historiques d'interventions\n• Données de facturation : coordonnées bancaires (tokenisées via Stripe), SIRET, adresse de facturation\n• Données de localisation : adresses d'interventions (non collectées en temps réel)\n• Données techniques : adresses IP, identifiants de session, logs d'utilisation` },
  { id:"finalites",    title:"3. Finalités du traitement",     content:`Vos données sont traitées pour les finalités suivantes :\n\n• Exécution du contrat de service SaaS et fourniture des fonctionnalités\n• Gestion des comptes utilisateurs et authentification (base légale : exécution contractuelle)\n• Émission des factures et suivi des paiements (base légale : obligation légale)\n• Amélioration des services par analyse anonymisée des usages (base légale : intérêt légitime)\n• Communication d'informations relatives aux évolutions de la plateforme (base légale : intérêt légitime)\n• Sécurité et prévention de la fraude (base légale : intérêt légitime)` },
  { id:"conservation", title:"4. Durée de conservation",      content:`Données de compte actif : durée de la relation contractuelle + 3 ans.\nDonnées de facturation : 10 ans (obligation comptable).\nJournaux de connexion : 12 mois glissants.\nDonnées de flotte et interventions : 5 ans après la fin du contrat.\n\nPassé ces délais, les données sont soit supprimées définitivement, soit anonymisées à des fins statistiques.` },
  { id:"droits",       title:"5. Vos droits",                  content:`Conformément au RGPD (Règlement 2016/679) et à la loi Informatique et Libertés, vous disposez des droits suivants :\n\n• Droit d'accès : obtenir une copie de vos données personnelles\n• Droit de rectification : corriger des données inexactes ou incomplètes\n• Droit à l'effacement : demander la suppression de vos données dans les conditions légales\n• Droit à la portabilité : recevoir vos données dans un format structuré et lisible par machine\n• Droit d'opposition : vous opposer au traitement de vos données pour des raisons légitimes\n• Droit à la limitation : demander la suspension temporaire du traitement\n\nPour exercer vos droits, contactez notre DPO à dpo@izox.fr ou par courrier. Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).` },
  { id:"cookies",      title:"6. Cookies et traceurs",        content:`IZOX Pro utilise les types de cookies suivants :\n\n• Cookies strictement nécessaires : authentification, session, sécurité CSRF. Ces cookies ne peuvent pas être désactivés.\n• Cookies de performance (Matomo) : mesure d'audience anonymisée, hébergée en France. Soumis à consentement.\n• Cookies de fonctionnalité : mémorisation des préférences (langue, thème). Soumis à consentement.\n\nAucun cookie publicitaire ou de tracking cross-site n'est utilisé. Vous pouvez gérer vos préférences via le gestionnaire de cookies accessible depuis le pied de page.` },
  { id:"securite",     title:"7. Sécurité",                   content:`IZOX met en œuvre les mesures techniques et organisationnelles suivantes pour protéger vos données :\n\n• Chiffrement TLS 1.3 pour toutes les communications réseau\n• Chiffrement AES-256 des données au repos sur les serveurs\n• Authentification à deux facteurs disponible pour tous les comptes\n• Journalisation et surveillance continue des accès\n• Audits de sécurité annuels par un prestataire certifié ISO 27001\n• Hébergement OVH – datacenters France (Gravelines, Roubaix)\n• Plan de reprise d'activité avec RPO < 1h et RTO < 4h` },
  { id:"contact",      title:"8. Contact",                    content:`Pour toute question relative à la protection de vos données personnelles :\n\nDélégué à la Protection des Données\nIZOX SAS · 42 rue de la Paix · 75002 Paris\nE-mail : dpo@izox.fr\nTéléphone : +33 1 23 45 67 89\n\nDernière mise à jour de la présente politique : 1er juin 2026.` },
];

// Bannière cookies persistante
const CookieBanner = ({ onAccept, onRefuse, onManage }) => (
  <div style={{
    position:"fixed", bottom:0, left:0, right:0, zIndex:200,
    background:TOK.surface, borderTop:`1px solid ${TOK.line}`,
    padding:"14px 24px",
    display:"flex", alignItems:"center", gap:16, flexWrap:"wrap",
    boxShadow:"0 -4px 24px rgba(17,24,39,.08)",
  }}>
    <div style={{ flex:1, minWidth:260 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
        <span style={{ fontSize:16 }}>🍪</span>
        <span style={{ fontFamily:TOK.head, fontWeight:700, fontSize:13, color:TOK.ink }}>Gestion des cookies</span>
      </div>
      <div style={{ fontFamily:TOK.body, fontSize:12, color:TOK.ink50, lineHeight:1.5 }}>
        Nous utilisons des cookies nécessaires au fonctionnement de la plateforme, ainsi que des cookies d'analyse anonymisée (Matomo, hébergé en France).{" "}
        <button onClick={onManage} style={{ background:"none", border:"none", color:TOK.brand, cursor:"pointer", fontSize:12, fontFamily:TOK.body, padding:0, fontWeight:600 }}>
          Personnaliser mes choix
        </button>
      </div>
    </div>
    <div style={{ display:"flex", gap:8, flexShrink:0 }}>
      <Btn kind="ghost" size="sm" onClick={onRefuse}>Refuser les optionnels</Btn>
      <Btn kind="primary" size="sm" icon={<I.check s={11}/>} onClick={onAccept}>Accepter</Btn>
    </div>
  </div>
);

// ─── PAGE LÉGALE ─────────────────────────────────────────────────────────────
const LegalPage = ({ role = "client" }) => {
  const [tab, setTab]       = React.useState("cgv");
  const [active, setActive] = React.useState(null);
  const [accepted, setAccepted] = React.useState(false);
  const [acceptDate, setAcceptDate] = React.useState(null);
  const [showCookie, setShowCookie] = React.useState(true);
  const [cookieAccepted, setCookieAccepted] = React.useState(false);
  const scrollRef = React.useRef(null);

  const sections = tab === "cgv" ? CGV_SECTIONS : RGPD_SECTIONS;

  React.useEffect(() => {
    setActive(sections[0].id);
  }, [tab]);

  const scrollToSection = (id) => {
    setActive(id);
    const el = document.getElementById(`legal-${id}`);
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({ top: el.offsetTop - 16, behavior:"smooth" });
    }
  };

  const handleAcceptCGV = () => {
    setAccepted(true);
    setAcceptDate(new Date().toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" }));
  };

  const handleAcceptCookies = () => {
    setCookieAccepted(true);
    setShowCookie(false);
    try { localStorage.setItem("izox_cookie_consent", Date.now()); } catch(e){}
  };

  const isAdmin = role === "admin";
  const navItems = isAdmin ? NAV_ADMIN : NAV_CLIENT;

  return (
    <div style={{ width:"100%", height:"100%", background:TOK.paper, display:"flex", flexDirection:"column", fontFamily:TOK.body, color:TOK.ink, overflow:"hidden" }}>

      {/* Topbar */}
      <div style={{
        padding:"14px 24px", borderBottom:`1px solid ${TOK.line}`,
        background:TOK.surface, display:"flex", alignItems:"center", justifyContent:"space-between",
        flexShrink:0,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <BrandBar size={14} sublabel={isAdmin ? "STAFF · LÉGAL" : "CLIENT · LÉGAL"} />
          <div style={{ width:1, height:18, background:TOK.line }}/>
          <span style={{ fontFamily:TOK.head, fontWeight:700, fontSize:16, letterSpacing:"-0.3px" }}>Informations légales</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {accepted && (
            <Tag tone="ok" dot style={{ fontSize:11 }}>
              CGV acceptées le {acceptDate}
            </Tag>
          )}
          <Btn kind="ghost" size="sm" icon={<I.download s={12}/>}>Télécharger PDF</Btn>
        </div>
      </div>

      {/* Onglets */}
      <div style={{
        display:"flex", padding:"0 24px", gap:0,
        borderBottom:`1px solid ${TOK.line}`,
        background:TOK.surface, flexShrink:0,
      }}>
        {[
          { key:"cgv",  label:"Conditions Générales de Vente" },
          { key:"rgpd", label:"Politique de confidentialité" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background:"transparent", border:"none",
            borderBottom:`2px solid ${tab===t.key ? TOK.brand : "transparent"}`,
            padding:"12px 20px", cursor:"pointer",
            fontFamily:TOK.body, fontSize:13,
            fontWeight:tab===t.key ? 600 : 400,
            color:tab===t.key ? TOK.brand : TOK.ink50,
            transition:"all .15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Corps split : nav latérale + contenu */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* Sidebar navigation sections */}
        <div style={{
          width:220, flexShrink:0, borderRight:`1px solid ${TOK.line}`,
          background:TOK.surface, overflowY:"auto", padding:"12px 0",
        }}>
          <Mono size={9} color={TOK.ink30} style={{ padding:"4px 16px 8px", display:"block" }}>
            {tab==="cgv" ? "CHAPITRES" : "SECTIONS"}
          </Mono>
          {sections.map(s => (
            <button key={s.id} onClick={() => scrollToSection(s.id)} style={{
              display:"block", width:"100%", textAlign:"left",
              padding:"8px 16px", background:"transparent", border:"none",
              cursor:"pointer", position:"relative",
              fontFamily:TOK.body, fontSize:12,
              fontWeight:active===s.id ? 600 : 400,
              color:active===s.id ? TOK.brand : TOK.ink70,
              transition:"all .1s",
            }}>
              {active===s.id && (
                <span style={{ position:"absolute", left:0, top:4, bottom:4, width:3, background:TOK.brand, borderRadius:2 }}/>
              )}
              <span style={{ paddingLeft: active===s.id ? 4 : 0 }}>{s.title}</span>
            </button>
          ))}
        </div>

        {/* Contenu scrollable */}
        <div ref={scrollRef} style={{ flex:1, overflowY:"auto", padding:"28px 32px" }}>
          <div style={{ maxWidth:680 }}>

            {/* En-tête document */}
            <div style={{ marginBottom:28 }}>
              <Mono size={10} color={TOK.brand} style={{ marginBottom:8, display:"block" }}>
                {tab==="cgv" ? "CONDITIONS GÉNÉRALES DE VENTE" : "POLITIQUE DE CONFIDENTIALITÉ"}
              </Mono>
              <h1 style={{ margin:0, fontFamily:TOK.head, fontWeight:700, fontSize:26, letterSpacing:"-0.5px", lineHeight:1.2, marginBottom:8 }}>
                {tab==="cgv" ? "Conditions Générales de Vente IZOX Pro" : "Politique de confidentialité & Protection des données"}
              </h1>
              <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
                <Mono size={9} color={TOK.ink50}>Version 3.2 · En vigueur au 1er juin 2026</Mono>
                <Btn kind="ghost" size="sm" icon={<I.download s={11}/>} style={{ padding:"4px 10px", fontSize:11 }}>Télécharger PDF</Btn>
              </div>
            </div>

            {/* Sections */}
            {sections.map((s, i) => (
              <div key={s.id} id={`legal-${s.id}`} style={{ marginBottom:32 }}>
                <h2 style={{
                  margin:"0 0 12px", fontFamily:TOK.head, fontWeight:700,
                  fontSize:17, letterSpacing:"-0.3px", color:TOK.ink,
                  paddingBottom:8, borderBottom:`1px solid ${TOK.line}`,
                }}>{s.title}</h2>
                <div style={{
                  fontFamily:TOK.body, fontSize:13, color:TOK.ink70, lineHeight:1.75,
                  whiteSpace:"pre-line",
                }}>{s.content}</div>
              </div>
            ))}

            {/* Bloc acceptation CGV */}
            {tab === "cgv" && (
              <div style={{
                background: accepted ? TOK.okL : TOK.surface,
                border:`1.5px solid ${accepted ? TOK.ok : TOK.line}`,
                borderRadius:TOK.r4, padding:20, marginTop:8,
              }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
                  {/* Checkbox */}
                  <button onClick={handleAcceptCGV} style={{
                    width:22, height:22, borderRadius:TOK.r2, border:`2px solid ${accepted ? TOK.ok : TOK.line}`,
                    background: accepted ? TOK.ok : "transparent",
                    display:"inline-flex", alignItems:"center", justifyContent:"center",
                    cursor:"pointer", flex:"0 0 22px", marginTop:1,
                  }}>
                    {accepted && <I.check s={12} c="#fff"/>}
                  </button>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:TOK.body, fontSize:13, fontWeight:600, color:TOK.ink, marginBottom:4 }}>
                      J'accepte les Conditions Générales de Vente IZOX Pro
                    </div>
                    <div style={{ fontFamily:TOK.body, fontSize:12, color:TOK.ink50, lineHeight:1.5 }}>
                      En cochant cette case, vous confirmez avoir lu et accepté les présentes CGV dans leur intégralité.
                    </div>
                    {accepted && acceptDate && (
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:8 }}>
                        <Tag tone="ok" dot style={{ fontSize:11 }}>Accepté le {acceptDate}</Tag>
                        <Mono size={9} color={TOK.ink50}>· Enregistré sur votre compte</Mono>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div style={{ height:60 }}/>
          </div>
        </div>
      </div>

      {/* Bannière cookies */}
      {showCookie && !cookieAccepted && (
        <CookieBanner
          onAccept={handleAcceptCookies}
          onRefuse={() => setShowCookie(false)}
          onManage={() => setTab("rgpd")}
        />
      )}
    </div>
  );
};

const LegalPage_Client = () => <LegalPage role="client" />;
const LegalPage_Admin  = () => <LegalPage role="admin"  />;

Object.assign(window, { LegalPage, LegalPage_Client, LegalPage_Admin, CookieBanner });
