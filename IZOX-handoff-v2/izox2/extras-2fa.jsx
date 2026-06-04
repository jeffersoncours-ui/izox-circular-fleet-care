
// Extras · 2FA — états fixes étapes 2a/2b/3/3-erreur/4
// Chaque composant monte Setup2FA et simule l'état via un hook post-mount

// QR code SVG réutilisable
const QRBlock = () => {
  const seed = [
    [1,1,1,1,1,1,1,0,1,0,1,0,0,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,1,0,0,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,0,1,0,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,1,1,0,0,1,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0],
    [1,0,1,1,0,1,1,1,0,1,1,0,1,1,0,1,0,1,1,0,1],
    [0,1,0,1,1,0,0,0,1,0,0,1,0,0,1,0,1,0,0,1,0],
    [1,1,0,0,1,0,1,1,0,1,0,0,1,1,0,1,1,0,0,1,1],
    [0,0,1,0,0,1,0,0,1,0,1,0,0,0,1,0,0,1,0,0,0],
    [1,0,1,1,0,0,1,1,0,1,0,1,1,1,0,0,1,1,0,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,1,0,0,0,1,0],
    [1,1,1,1,1,1,1,0,0,0,1,0,0,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,0,1,0,1,1,0,1,1,0,0,0,1,0,0,0,0],
    [1,0,1,1,1,0,1,0,0,0,1,0,1,1,0,1,0,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,0,1,0,0,1,1,0,0,1,1,0],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,1,0,0,1,1,0,0,1],
    [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,0,0,0,1,0],
    [1,1,1,1,1,1,1,0,0,1,0,1,1,0,0,1,0,1,1,0,1],
  ];
  const size = 160;
  const cs = size / seed.length;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <rect width={size} height={size} fill="#fff" rx="8"/>
      {seed.map((row, ri) => row.map((cell, ci) =>
        cell ? <rect key={`${ri}-${ci}`} x={ci * cs} y={ri * cs} width={cs - 0.4} height={cs - 0.4} fill="#111827"/> : null
      ))}
      <rect x={size/2-14} y={size/2-14} width={28} height={28} fill="#fff" rx={4}/>
      <rect x={size/2-10} y={size/2-10} width={20} height={20} fill={TOK.brand} rx={3}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" fill="#fff" fontFamily="system-ui" fontSize="9" fontWeight="700">iz</text>
    </svg>
  );
};

// Stepper réutilisable
const TwoFAStepper = ({ step }) => {
  const STEPS = ["Méthode", "Configuration", "Vérification", "Codes de secours"];
  return (
    <div style={{ display: "flex", gap: 0, alignItems: "center", padding: "16px 20px", background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r6, marginBottom: 20 }}>
      {STEPS.map((s, i) => {
        const done = i + 1 < step, on = i + 1 === step;
        return (
          <React.Fragment key={s}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{
                width: 22, height: 22, borderRadius: 4,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: done ? TOK.ok : on ? TOK.brand : TOK.panel,
                color: (done || on) ? "#fff" : TOK.ink50,
                fontFamily: TOK.mono, fontSize: 10, fontWeight: 700,
              }}>{done ? "✓" : i + 1}</span>
              <span style={{ fontFamily: TOK.body, fontSize: 11, color: on ? TOK.ink : TOK.ink50, fontWeight: on ? 600 : 400 }}>{s}</span>
            </div>
            {i < 3 && <div style={{ flex: 1, height: 1, background: TOK.line, margin: "0 8px", minWidth: 12 }}/>}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Card wrapper
const TwoFACard = ({ step, title, subtitle, children, footer, successBg }) => (
  <div style={{ width: "100%", maxWidth: 500, margin: "0 auto" }}>
    <TwoFAStepper step={step}/>
    <div style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r6, overflow: "hidden", boxShadow: TOK.shadowMd }}>
      <div style={{
        padding: "20px 24px 16px", borderBottom: `1px solid ${TOK.line}`,
        background: successBg ? TOK.okL : TOK.surface,
      }}>
        <Mono size={10} color={successBg ? TOK.ok : TOK.brand} style={{ marginBottom: 4, display: "block" }}>Étape {step} sur 4</Mono>
        <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 20, letterSpacing: "-0.3px" }}>{title}</div>
        <div style={{ fontFamily: TOK.body, fontSize: 13, color: TOK.ink50, marginTop: 4 }}>{subtitle}</div>
      </div>
      <div style={{ padding: "24px 24px" }}>{children}</div>
      <div style={{ padding: "14px 24px", borderTop: `1px solid ${TOK.line}`, background: TOK.surface, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {footer}
      </div>
    </div>
  </div>
);

// Shell page 2FA
const TwoFAPage = ({ step, title, subtitle, children, footer, successBg }) => (
  <div style={{ width: "100%", height: "100%", background: TOK.paper, display: "flex", flexDirection: "column" }}>
    <style>{`@keyframes checkPop2{0%{transform:scale(0)}60%{transform:scale(1.15)}100%{transform:scale(1)}} @keyframes drawCheck2{from{stroke-dashoffset:24}to{stroke-dashoffset:0}}`}</style>
    <div style={{ padding: "14px 24px", borderBottom: `1px solid ${TOK.line}`, background: TOK.surface, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <BrandBar size={14} sublabel="CLIENT · SÉCURITÉ"/>
      <Tag tone="info" dot>Mon compte</Tag>
    </div>
    <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "36px 24px", overflowY: "auto" }}>
      <TwoFACard step={step} title={title} subtitle={subtitle} footer={footer} successBg={successBg}>{children}</TwoFACard>
    </div>
  </div>
);

// Boîtes OTP
const OTPBoxes = ({ values = ["","","","","",""], hasError = false }) => (
  <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
    {values.map((v, i) => (
      <div key={i} style={{
        width: 46, height: 54, textAlign: "center",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: TOK.mono, fontSize: 22, fontWeight: 700,
        border: `2px solid ${hasError ? TOK.danger : v ? TOK.brand : TOK.line}`,
        borderRadius: TOK.r4,
        background: hasError ? `${TOK.danger}08` : v ? TOK.brandL : TOK.surface,
        color: hasError ? TOK.danger : TOK.ink,
      }}>{v}</div>
    ))}
  </div>
);

// ─── ÉTAPE 2a — SMS (numéro saisi) ──────────────────────────────────────────
const TwoFA_Step2_SMS = () => (
  <TwoFAPage step={2}
    title="Ajouter votre numéro de téléphone"
    subtitle="Un SMS contenant un code à 6 chiffres vous sera envoyé à chaque connexion."
    footer={<>
      <Btn kind="ghost" icon={<I.chevL s={12}/>}>Précédent</Btn>
      <Btn kind="primary" icon={<I.arrow s={12}/>}>Envoyer le SMS</Btn>
    </>}
  >
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <Mono size={10} style={{ marginBottom: 6, display: "block" }}>Numéro de téléphone</Mono>
        <div style={{ display: "flex", gap: 0 }}>
          <div style={{ padding: "10px 12px", background: TOK.panel, border: `1px solid ${TOK.line}`, borderRight: "none", borderRadius: `${TOK.r4}px 0 0 ${TOK.r4}px`, fontFamily: TOK.body, fontSize: 13, color: TOK.ink50, display: "flex", alignItems: "center" }}>🇫🇷 +33</div>
          <div style={{ flex: 1, padding: "10px 14px", border: `1px solid ${TOK.brand}`, borderRadius: `0 ${TOK.r4}px ${TOK.r4}px 0`, fontFamily: TOK.mono, fontSize: 14, color: TOK.ink, background: TOK.brandL }}>6 12 34 56 78</div>
        </div>
        <div style={{ fontFamily: TOK.body, fontSize: 11, color: TOK.ink50, marginTop: 6 }}>Un SMS de vérification sera envoyé à ce numéro.</div>
      </div>
      <div style={{ background: TOK.brandL, border: `1px solid ${TOK.brand}33`, borderRadius: TOK.r4, padding: 12 }}>
        <div style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink70 }}>Votre numéro ne sera jamais partagé. Il est utilisé uniquement pour la 2FA.</div>
      </div>
    </div>
  </TwoFAPage>
);

// ─── ÉTAPE 2b — Authenticator QR ────────────────────────────────────────────
const TwoFA_Step2_App = () => {
  return (
    <TwoFAPage step={2}
      title="Scanner le QR code"
      subtitle="Scannez ce code avec Google Authenticator, Authy ou 1Password."
      footer={<>
        <Btn kind="ghost" icon={<I.chevL s={12}/>}>Précédent</Btn>
        <Btn kind="primary" icon={<I.arrow s={12}/>}>Code scanné</Btn>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "center" }}>
        <div style={{ padding: 18, background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, display: "inline-flex", boxShadow: TOK.shadow }}>
          <QRBlock/>
        </div>
        <div style={{ width: "100%", background: TOK.panel, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: 14 }}>
          <Mono size={9} color={TOK.ink50} style={{ marginBottom: 6, display: "block" }}>Clé manuelle (si scan impossible)</Mono>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Data size={13} weight={600} style={{ flex: 1, letterSpacing: ".08em" }}>IZOX-K9PX-4M2Q-8WRN</Data>
            <button style={{ background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r2, padding: "5px 10px", cursor: "pointer", fontFamily: TOK.body, fontSize: 11, color: TOK.ink50 }}>Copier</button>
          </div>
        </div>
        <div style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink50, textAlign: "center", lineHeight: 1.6 }}>
          Ouvrez votre application et scannez ce code QR, ou saisissez la clé manuelle.
        </div>
      </div>
    </TwoFAPage>
  );
};

// ─── ÉTAPE 3 — OTP valide (en cours de saisie) ───────────────────────────────
const TwoFA_Step3_OTP = () => (
  <TwoFAPage step={3}
    title="Saisir le code de vérification"
    subtitle="Saisissez le code à 6 chiffres depuis votre application."
    footer={<>
      <Btn kind="ghost" icon={<I.chevL s={12}/>}>Précédent</Btn>
      <Btn kind="primary" icon={<I.check s={12}/>}>Vérifier le code</Btn>
    </>}
  >
    <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
      <Mono size={10} color={TOK.ink50} style={{ textAlign: "center" }}>Code depuis votre application Authenticator</Mono>
      <OTPBoxes values={["1","2","3","4","5","6"]}/>
      <div style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink50, textAlign: "center" }}>
        Code de démonstration · <strong>123456</strong>
      </div>
    </div>
  </TwoFAPage>
);

// ─── ÉTAPE 3 — OTP erreur ────────────────────────────────────────────────────
const TwoFA_Step3_Error = () => (
  <TwoFAPage step={3}
    title="Saisir le code de vérification"
    subtitle="Saisissez le code à 6 chiffres depuis votre application."
    footer={<>
      <Btn kind="ghost" icon={<I.chevL s={12}/>}>Précédent</Btn>
      <Btn kind="primary" icon={<I.check s={12}/>}>Réessayer</Btn>
    </>}
  >
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
      <Mono size={10} color={TOK.ink50} style={{ textAlign: "center" }}>Code depuis votre application Authenticator</Mono>
      <OTPBoxes values={["6","5","4","3","2","1"]} hasError/>
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", background: `${TOK.danger}10`, border: `1px solid ${TOK.danger}44`, borderRadius: TOK.r4 }}>
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={TOK.danger} strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/>
        </svg>
        <span style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.danger, fontWeight: 600 }}>Code incorrect. Vérifiez et réessayez. (2 tentatives restantes)</span>
      </div>
      <div style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink50, textAlign: "center" }}>
        Problème avec votre application ?{" "}
        <span style={{ color: TOK.brand, cursor: "pointer", fontWeight: 600 }}>Utiliser un code de récupération</span>
      </div>
    </div>
  </TwoFAPage>
);

// ─── ÉTAPE 4 — Codes de récupération ────────────────────────────────────────
const RCODES = ["4K2M-8XPL","9QRJ-1WZN","6TBV-3YCH","2DFG-7MSE","5NPA-4KLQ","8RVX-2GTB","1UWY-9JCM","3HZD-5NPF"];

const TwoFA_Step4 = () => (
  <TwoFAPage step={4}
    title="Codes de récupération"
    subtitle="Conservez ces codes dans un endroit sûr. Chacun ne peut être utilisé qu'une seule fois."
    successBg
    footer={<>
      <Btn kind="ghost" icon={<I.download s={12}/>}>Télécharger PDF</Btn>
      <Btn kind="primary" icon={<I.check s={12}/>}>Terminer la configuration</Btn>
    </>}
  >
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Check animé */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, background: TOK.okL, display: "inline-flex", alignItems: "center", justifyContent: "center", animation: "checkPop2 .4s cubic-bezier(.36,.07,.19,.97)" }}>
          <svg width={32} height={32} viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="18" fill={TOK.ok}/>
            <path d="M10 18l6 6L26 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ strokeDasharray: 24, strokeDashoffset: 0, animation: "drawCheck2 .35s .15s ease-out both" }}/>
          </svg>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 16, color: TOK.ok, marginBottom: 4 }}>Double authentification activée !</div>
        <div style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink50 }}>Conservez ces 8 codes. Chacun ne peut être utilisé qu'une seule fois.</div>
      </div>
      {/* Grille codes */}
      <div style={{ background: TOK.panel, border: `1px solid ${TOK.line}`, borderRadius: TOK.r4, padding: "12px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {RCODES.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: TOK.surface, border: `1px solid ${TOK.line}`, borderRadius: TOK.r2 }}>
            <Mono size={9} color={TOK.ink30}>{String(i + 1).padStart(2, "0")}</Mono>
            <Data size={12} weight={600} style={{ letterSpacing: ".04em" }}>{c}</Data>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn kind="ghost" full icon={<I.download s={12}/>}>Télécharger PDF</Btn>
        <Btn kind="ghost" full icon={<I.print s={12}/>}>Imprimer</Btn>
      </div>
    </div>
  </TwoFAPage>
);

Object.assign(window, {
  TwoFA_Step2_SMS, TwoFA_Step2_App,
  TwoFA_Step3_OTP, TwoFA_Step3_Error,
  TwoFA_Step4,
});
