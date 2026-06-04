
// Sécurité · Setup 2FA — flow 4 étapes
// Étape 1 : choisir méthode (SMS / Authenticator)
// Étape 2a : saisir numéro de téléphone  |  Étape 2b : scanner QR code
// Étape 3 : confirmer code 6 chiffres
// Étape 4 : codes de récupération (téléchargement PDF)

// QR code SVG simulé (pattern réaliste)
const QRCodeSVG = ({ size = 160 }) => {
  const cells = [];
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
  const cs = size / seed.length;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="#fff" rx="8"/>
      {seed.map((row, ri) =>
        row.map((cell, ci) =>
          cell === 1 ? <rect key={`${ri}-${ci}`} x={ci*cs} y={ri*cs} width={cs-0.5} height={cs-0.5} fill="#111827"/> : null
        )
      )}
      {/* Zone logo central */}
      <rect x={size/2-14} y={size/2-14} width={28} height={28} fill="#fff" rx={4}/>
      <rect x={size/2-10} y={size/2-10} width={20} height={20} fill={TOK.brand} rx={3}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" fill="#fff" fontFamily="system-ui" fontSize="9" fontWeight="700">iz</text>
    </svg>
  );
};

// Champ OTP — 6 cases individuelles
const OTPInput = ({ value, onChange, hasError }) => {
  const inputs = React.useRef([]);
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);

  const handleKey = (e, i) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i-1]?.focus();
  };
  const handleChange = (e, i) => {
    const v = e.target.value.replace(/\D/g, "").slice(-1);
    const arr = digits.map((d, j) => j === i ? v : d);
    onChange(arr.join(""));
    if (v && i < 5) inputs.current[i+1]?.focus();
  };

  return (
    <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKey(e, i)}
          style={{
            width:46, height:54, textAlign:"center",
            fontFamily:TOK.mono, fontSize:22, fontWeight:700,
            border:`2px solid ${hasError ? TOK.danger : d ? TOK.brand : TOK.line}`,
            borderRadius:TOK.r4, background: d ? TOK.brandL : TOK.surface,
            color: hasError ? TOK.danger : TOK.ink,
            outline:"none", transition:"all .15s",
          }}
        />
      ))}
    </div>
  );
};

// Icône check animée (succès)
const AnimatedCheck = () => (
  <div style={{
    width:72, height:72, borderRadius:999, background:TOK.okL,
    display:"inline-flex", alignItems:"center", justifyContent:"center",
    animation:"checkPop .4s cubic-bezier(.36,.07,.19,.97)",
  }}>
    <svg width={36} height={36} viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="18" fill={TOK.ok}/>
      <path d="M10 18l6 6L26 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray:24, strokeDashoffset:0, animation:"drawCheck .35s .15s ease-out both" }}/>
    </svg>
  </div>
);

// Codes de récupération
const RECOVERY_CODES = ["4K2M-8XPL","9QRJ-1WZN","6TBV-3YCH","2DFG-7MSE","5NPA-4KLQ","8RVX-2GTB","1UWY-9JCM","3HZD-5NPF"];

// ─── COMPOSANT 2FA ──────────────────────────────────────────────────────────
const Setup2FA = ({ role = "client" }) => {
  const [step, setStep] = React.useState(1);
  const [method, setMethod] = React.useState(null);
  const [phone, setPhone] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [otpError, setOtpError] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const STEPS = ["Méthode", "Configuration", "Vérification", "Codes de secours"];
  const isAdmin = role === "admin";

  const handleVerify = () => {
    if (otp.length === 6 && otp !== "123456") {
      setOtpError(true);
      setTimeout(() => setOtpError(false), 2000);
    } else if (otp.length === 6) {
      setOtpError(false);
      setStep(4);
    }
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      width:"100%", height:"100%",
      background: TOK.paper,
      display:"flex", flexDirection:"column",
      fontFamily: TOK.body, color: TOK.ink,
    }}>
      <style>{`
        @keyframes checkPop { 0%{transform:scale(0)} 60%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes drawCheck { from{stroke-dashoffset:24} to{stroke-dashoffset:0} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
      `}</style>

      {/* Topbar slim */}
      <div style={{
        padding:"16px 24px", borderBottom:`1px solid ${TOK.line}`,
        background: TOK.surface,
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <BrandBar size={14} sublabel={isAdmin ? "STAFF · SÉCURITÉ" : "CLIENT · SÉCURITÉ"} />
        <Tag tone={isAdmin ? "brand" : "info"} dot>{isAdmin ? "Administration" : "Mon compte"}</Tag>
      </div>

      {/* Centrage */}
      <div style={{ flex:1, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"40px 24px", overflowY:"auto" }}>
        <div style={{ width:"100%", maxWidth:520 }}>

          {/* Stepper */}
          <div style={{
            background:TOK.surface, border:`1px solid ${TOK.line}`,
            borderRadius:TOK.r6, padding:"18px 22px", marginBottom:24,
          }}>
            <Stepper steps={STEPS} current={step-1} />
          </div>

          {/* Carte principale */}
          <div style={{
            background:TOK.surface, border:`1px solid ${TOK.line}`,
            borderRadius:TOK.r6, overflow:"hidden",
            boxShadow: TOK.shadowMd,
          }}>
            {/* En-tête carte */}
            <div style={{
              padding:"20px 24px 16px",
              borderBottom:`1px solid ${TOK.line}`,
              background: step === 4 ? TOK.okL : TOK.surface,
            }}>
              <Mono size={10} color={step===4 ? TOK.ok : TOK.brand} style={{ marginBottom:4, display:"block" }}>
                Étape {step} sur {STEPS.length}
              </Mono>
              <div style={{ fontFamily:TOK.head, fontWeight:700, fontSize:20, letterSpacing:"-0.3px" }}>
                {step===1 && "Activer la double authentification"}
                {step===2 && method==="sms" && "Ajouter votre numéro de téléphone"}
                {step===2 && method==="app" && "Scanner le QR code"}
                {step===3 && "Saisir le code de vérification"}
                {step===4 && "Codes de récupération"}
              </div>
              <div style={{ fontFamily:TOK.body, fontSize:13, color:TOK.ink50, marginTop:4 }}>
                {step===1 && "Choisissez la méthode d'authentification à deux facteurs pour sécuriser votre compte."}
                {step===2 && method==="sms" && "Un SMS contenant un code à 6 chiffres vous sera envoyé à chaque connexion."}
                {step===2 && method==="app" && "Scannez ce code avec Google Authenticator, Authy ou 1Password."}
                {step===3 && `Saisissez le code à 6 chiffres reçu ${method==="sms" ? "par SMS" : "depuis votre application"}.`}
                {step===4 && "Conservez ces codes dans un endroit sûr. Chacun ne peut être utilisé qu'une seule fois."}
              </div>
            </div>

            {/* Corps */}
            <div style={{ padding:"28px 24px" }}>

              {/* ÉTAPE 1 — Choix méthode */}
              {step === 1 && (
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  {[
                    {
                      key:"sms",
                      icon:<svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/></svg>,
                      title:"SMS",
                      desc:"Recevez un code à 6 chiffres par SMS à chaque connexion.",
                      badge:"Recommandé",
                    },
                    {
                      key:"app",
                      icon:<svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>,
                      title:"Application Authenticator",
                      desc:"Utilisez Google Authenticator, Authy ou 1Password pour générer les codes.",
                      badge:"Plus sécurisé",
                    },
                  ].map(m => (
                    <button key={m.key} onClick={() => setMethod(m.key)} style={{
                      display:"flex", alignItems:"flex-start", gap:14, padding:"16px 18px",
                      background: method===m.key ? TOK.brandL : TOK.paper,
                      border: `2px solid ${method===m.key ? TOK.brand : TOK.line}`,
                      borderRadius:TOK.r4, cursor:"pointer", textAlign:"left",
                      transition:"all .15s",
                    }}>
                      <div style={{
                        width:48, height:48, borderRadius:TOK.r4,
                        background: method===m.key ? TOK.brand : TOK.panel,
                        color: method===m.key ? "#fff" : TOK.ink50,
                        display:"inline-flex", alignItems:"center", justifyContent:"center",
                        flex:"0 0 48px",
                      }}>{m.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                          <span style={{ fontFamily:TOK.head, fontWeight:700, fontSize:15, color:TOK.ink }}>{m.title}</span>
                          <Tag tone={method===m.key ? "brand" : "neutral"} style={{ fontSize:10 }}>{m.badge}</Tag>
                        </div>
                        <div style={{ fontFamily:TOK.body, fontSize:13, color:TOK.ink50, lineHeight:1.5 }}>{m.desc}</div>
                      </div>
                      <div style={{
                        width:20, height:20, borderRadius:999, border:`2px solid ${method===m.key ? TOK.brand : TOK.line}`,
                        background: method===m.key ? TOK.brand : "transparent",
                        display:"inline-flex", alignItems:"center", justifyContent:"center",
                        flex:"0 0 20px", marginTop:2,
                      }}>
                        {method===m.key && <div style={{ width:8, height:8, borderRadius:999, background:"#fff" }}/>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* ÉTAPE 2 — Configuration */}
              {step === 2 && method === "sms" && (
                <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                  <div>
                    <Mono size={10} style={{ marginBottom:6, display:"block" }}>Numéro de téléphone</Mono>
                    <div style={{ display:"flex", gap:0 }}>
                      <div style={{
                        padding:"10px 12px", background:TOK.panel,
                        border:`1px solid ${TOK.line}`, borderRight:"none",
                        borderRadius:`${TOK.r4}px 0 0 ${TOK.r4}px`,
                        fontFamily:TOK.body, fontSize:13, color:TOK.ink50,
                        display:"flex", alignItems:"center",
                      }}>🇫🇷 +33</div>
                      <input
                        type="tel" placeholder="6 12 34 56 78" value={phone}
                        onChange={e => setPhone(e.target.value)}
                        style={{
                          flex:1, padding:"10px 14px",
                          border:`1px solid ${TOK.line}`,
                          borderRadius:`0 ${TOK.r4}px ${TOK.r4}px 0`,
                          fontFamily:TOK.mono, fontSize:14, color:TOK.ink, outline:"none",
                          background:TOK.surface,
                        }}
                      />
                    </div>
                    <div style={{ fontFamily:TOK.body, fontSize:11, color:TOK.ink50, marginTop:6 }}>
                      Un SMS de vérification sera envoyé à ce numéro.
                    </div>
                  </div>
                  <div style={{ background:TOK.infoL || TOK.brandL, border:`1px solid ${TOK.info || TOK.brand}33`, borderRadius:TOK.r4, padding:12 }}>
                    <div style={{ fontFamily:TOK.body, fontSize:12, color:TOK.ink70 }}>
                      Votre numéro de téléphone ne sera jamais partagé. Il est utilisé uniquement pour la 2FA.
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && method === "app" && (
                <div style={{ display:"flex", flexDirection:"column", gap:20, alignItems:"center" }}>
                  <div style={{
                    padding:20, background:TOK.surface, border:`1px solid ${TOK.line}`,
                    borderRadius:TOK.r4, display:"inline-flex",
                    boxShadow:TOK.shadow,
                  }}>
                    <QRCodeSVG size={160} />
                  </div>
                  <div style={{ width:"100%", background:TOK.panel, border:`1px solid ${TOK.line}`, borderRadius:TOK.r4, padding:14 }}>
                    <Mono size={9} color={TOK.ink50} style={{ marginBottom:6, display:"block" }}>Clé manuelle (si scan impossible)</Mono>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <Data size={13} weight={600} style={{ flex:1, letterSpacing:".08em" }}>IZOX-K9PX-4M2Q-8WRN</Data>
                      <button onClick={handleCopy} style={{
                        background:TOK.surface, border:`1px solid ${TOK.line}`, borderRadius:TOK.r2,
                        padding:"5px 10px", cursor:"pointer",
                        fontFamily:TOK.body, fontSize:11, color:copied ? TOK.ok : TOK.ink50,
                      }}>{copied ? "Copié ✓" : "Copier"}</button>
                    </div>
                  </div>
                  <div style={{ fontFamily:TOK.body, fontSize:12, color:TOK.ink50, textAlign:"center", lineHeight:1.6 }}>
                    Ouvrez votre application et scannez ce code QR, ou saisissez la clé manuelle.
                  </div>
                </div>
              )}

              {/* ÉTAPE 3 — Code OTP */}
              {step === 3 && (
                <div style={{ display:"flex", flexDirection:"column", gap:22, alignItems:"center" }}>
                  <div style={{ textAlign:"center" }}>
                    <Mono size={10} color={TOK.ink50} style={{ marginBottom:8, display:"block" }}>
                      {method==="sms" ? `Code envoyé au +33 6 •• •• •• ${phone.slice(-2)||"78"}` : "Code depuis votre application"}
                    </Mono>
                    <div style={{ animation: otpError ? "shake .4s ease" : "none" }}>
                      <OTPInput value={otp} onChange={setOtp} hasError={otpError} />
                    </div>
                    {otpError && (
                      <div style={{
                        display:"flex", alignItems:"center", gap:6, marginTop:12, justifyContent:"center",
                        fontFamily:TOK.body, fontSize:12, color:TOK.danger,
                      }}>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={TOK.danger} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg>
                        Code incorrect. Vérifiez et réessayez.
                      </div>
                    )}
                  </div>
                  <div style={{ fontFamily:TOK.body, fontSize:12, color:TOK.ink50, textAlign:"center" }}>
                    Saisissez <strong>123456</strong> pour simuler un code valide.{" "}
                    {method==="sms" && <a href="#" style={{ color:TOK.brand }}>Renvoyer le SMS</a>}
                  </div>
                </div>
              )}

              {/* ÉTAPE 4 — Codes de récupération */}
              {step === 4 && (
                <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                  <div style={{ display:"flex", justifyContent:"center" }}>
                    <AnimatedCheck />
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontFamily:TOK.head, fontWeight:700, fontSize:17, color:TOK.ok, marginBottom:4 }}>
                      Double authentification activée !
                    </div>
                    <div style={{ fontFamily:TOK.body, fontSize:13, color:TOK.ink50 }}>
                      Conservez ces codes. Chacun ne peut être utilisé qu'une seule fois en cas de perte d'accès.
                    </div>
                  </div>
                  <div style={{
                    background:TOK.panel, border:`1px solid ${TOK.line}`,
                    borderRadius:TOK.r4, padding:"14px 18px",
                    display:"grid", gridTemplateColumns:"1fr 1fr", gap:8,
                  }}>
                    {RECOVERY_CODES.map((c, i) => (
                      <div key={i} style={{
                        display:"flex", alignItems:"center", gap:8,
                        padding:"6px 10px", background:TOK.surface,
                        border:`1px solid ${TOK.line}`, borderRadius:TOK.r2,
                      }}>
                        <Mono size={9} color={TOK.ink30}>{String(i+1).padStart(2,"0")}</Mono>
                        <Data size={12} weight={600} style={{ letterSpacing:".04em" }}>{c}</Data>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <Btn kind="ghost" full icon={<I.download s={12}/>}>Télécharger PDF</Btn>
                    <Btn kind="ghost" full icon={<I.print s={12}/>}>Imprimer</Btn>
                  </div>
                </div>
              )}
            </div>

            {/* Footer boutons */}
            <div style={{
              padding:"14px 24px", borderTop:`1px solid ${TOK.line}`,
              background:TOK.surface, display:"flex",
              justifyContent:"space-between", alignItems:"center", gap:10,
            }}>
              {step > 1 && step < 4 ? (
                <Btn kind="ghost" icon={<I.chevL s={12}/>} onClick={() => setStep(s=>s-1)}>Précédent</Btn>
              ) : (
                <div/>
              )}
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {step < 4 && (
                  <Mono size={10} color={TOK.ink30}>
                    {step === 3 ? "Saisir le code pour continuer" : ""}
                  </Mono>
                )}
                {step === 1 && <Btn kind="primary" state={!method?"disabled":"default"} icon={<I.arrow s={12}/>} onClick={() => setStep(2)}>Continuer</Btn>}
                {step === 2 && method === "sms" && <Btn kind="primary" state={!phone?"disabled":"default"} icon={<I.arrow s={12}/>} onClick={() => setStep(3)}>Envoyer le SMS</Btn>}
                {step === 2 && method === "app" && <Btn kind="primary" icon={<I.arrow s={12}/>} onClick={() => setStep(3)}>Code scanné</Btn>}
                {step === 3 && <Btn kind="primary" state={otp.length<6?"disabled":"default"} icon={<I.check s={12}/>} onClick={handleVerify}>Vérifier le code</Btn>}
                {step === 4 && <Btn kind="primary" icon={<I.check s={12}/>} onClick={() => {}}>Terminer la configuration</Btn>}
              </div>
            </div>
          </div>

          {/* Note sécurité */}
          {step < 4 && (
            <div style={{
              marginTop:16, padding:"10px 14px",
              background:TOK.warnL, border:`1px solid ${TOK.warn}33`,
              borderRadius:TOK.r4, display:"flex", gap:8, alignItems:"flex-start",
            }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={TOK.warn} strokeWidth="2" strokeLinecap="round" style={{ marginTop:1, flexShrink:0 }}><path d="M12 2l9 16H3z"/><path d="M12 9v5M12 16h.01"/></svg>
              <div style={{ fontFamily:TOK.body, fontSize:12, color:TOK.ink70, lineHeight:1.5 }}>
                La double authentification protège votre compte {isAdmin ? "administrateur" : "client"} même si votre mot de passe est compromis.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Security2FA_Client = () => <Setup2FA role="client" />;
const Security2FA_Admin  = () => <Setup2FA role="admin"  />;

Object.assign(window, { Setup2FA, Security2FA_Client, Security2FA_Admin });
