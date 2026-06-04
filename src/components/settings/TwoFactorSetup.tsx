import { useState, useEffect, useCallback } from "react";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import {
  Loader2,
  Smartphone,
  KeyRound,
  Check,
  Copy,
  Download,
  Printer,
  Lock,
  AlertTriangle,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type Method = "totp" | "sms";
type Step = 1 | 2 | 3 | 4;

function generateRecoveryCodes(): string[] {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  );
}

// ─── Step 1 body: Method choice ───────────────────────────────────────────────

function MethodBody({
  method,
  onChange,
}: {
  method: Method;
  onChange: (m: Method) => void;
}) {
  const options: {
    key: Method;
    icon: typeof KeyRound;
    title: string;
    desc: string;
    badge: string;
  }[] = [
    {
      key: "totp",
      icon: KeyRound,
      title: "Application Authenticator",
      desc: "Google Authenticator, Authy ou 1Password génèrent les codes hors-ligne.",
      badge: "Recommandé",
    },
    {
      key: "sms",
      icon: Smartphone,
      title: "SMS",
      desc: "Recevez un code à 6 chiffres par SMS à chaque connexion.",
      badge: "Plus simple",
    },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      {options.map((o) => {
        const selected = method === o.key;
        const Icon = o.icon;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={cn(
              "flex items-start gap-3.5 rounded-md border-2 p-4 text-left transition-colors",
              selected
                ? "border-primary bg-primary-soft"
                : "border-border bg-background hover:bg-muted/40"
            )}
          >
            <span
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-md",
                selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="mb-1 flex items-center gap-2">
                <span className="font-display text-[15px] font-bold text-foreground">{o.title}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {o.badge}
                </span>
              </span>
              <span className="block text-[13px] leading-relaxed text-muted-foreground">
                {o.desc}
              </span>
            </span>
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                selected ? "border-primary bg-primary" : "border-border"
              )}
            >
              {selected && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Step 2 body: Config (QR or phone) ────────────────────────────────────────

function ConfigBody({
  method,
  totpData,
  phone,
  onPhoneChange,
  loading,
}: {
  method: Method;
  totpData: { secret: string; uri: string; qrDataUrl: string } | null;
  phone: string;
  onPhoneChange: (p: string) => void;
  loading: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopySecret = async () => {
    if (!totpData) return;
    await navigator.clipboard.writeText(totpData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (method === "totp") {
    if (loading || !totpData) {
      return (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-5">
        <div className="rounded-md border border-border bg-card p-5 shadow-elegant">
          <img src={totpData.qrDataUrl} alt="QR code 2FA" className="h-44 w-44" />
        </div>
        <div className="w-full rounded-md border border-border bg-muted/60 p-3.5">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Clé manuelle (si scan impossible)
          </p>
          <div className="flex items-center gap-2">
            <p className="flex-1 break-all font-mono text-[13px] font-semibold tracking-[0.08em] text-foreground">
              {totpData.secret}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySecret}
              className={cn("shrink-0", copied && "text-success")}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copié" : "Copier"}
            </Button>
          </div>
        </div>
        <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
          Ouvrez votre application et scannez ce QR code, ou saisissez la clé manuelle.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4.5">
      <div className="space-y-2">
        <Label htmlFor="phone" className="font-mono text-[10px] uppercase tracking-wider">
          Numéro de téléphone
        </Label>
        <div className="flex">
          <span className="flex items-center rounded-l-md border border-r-0 border-border bg-muted px-3 text-[13px] text-muted-foreground">
            🇫🇷 +33
          </span>
          <Input
            id="phone"
            type="tel"
            placeholder="6 12 34 56 78"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            className="rounded-l-none font-mono"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Un SMS de vérification sera envoyé à ce numéro. Format international requis (+33…).
        </p>
      </div>
      <div className="rounded-md border border-info/30 bg-info-soft p-3">
        <p className="text-[12px] leading-relaxed text-foreground/80">
          Votre numéro de téléphone ne sera jamais partagé. Il est utilisé uniquement pour la
          double authentification.
        </p>
      </div>
    </div>
  );
}

// ─── Step 3 body: Verification ────────────────────────────────────────────────

function VerifyBody({
  method,
  totpData,
  phone,
  onSuccess,
  loading,
  setLoading,
}: {
  method: Method;
  totpData: { secret: string; uri: string; qrDataUrl: string } | null;
  phone: string;
  onSuccess: () => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}) {
  const [code, setCode] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [shake, setShake] = useState(false);
  const maxAttempts = 3;

  const verify = useCallback(async () => {
    if (code.length !== 6 || locked) return;
    setLoading(true);

    let isValid = false;

    if (method === "totp" && totpData) {
      const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(totpData.secret) });
      const delta = totp.validate({ token: code, window: 1 });
      isValid = delta !== null;
    } else {
      // SMS: pour le MVP on considère le code "123456" comme valide
      // (en prod, valider via Twilio/Resend côté serveur)
      isValid = code === "123456";
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.rpc as any)("record_2fa_attempt", { p_success: isValid });
    const result = data as { success: boolean; locked: boolean; attempts: number } | null;

    if (isValid) {
      toast.success("Code vérifié !");
      onSuccess();
    } else {
      const newAttempts = (result?.attempts ?? attempts) + (result ? 0 : 1);
      setAttempts(newAttempts);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      if (result?.locked) {
        setLocked(true);
        toast.error("Compte temporairement verrouillé (15 minutes)");
      } else {
        toast.error(`Code incorrect — tentative ${newAttempts}/${maxAttempts}`);
      }
      setCode("");
    }
    setLoading(false);
  }, [code, locked, method, totpData, attempts, onSuccess, setLoading]);

  useEffect(() => {
    if (code.length === 6) verify();
  }, [code, verify]);

  if (locked) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-destructive/40 bg-destructive-soft p-5 text-center">
        <Lock className="h-7 w-7 text-destructive" />
        <div>
          <p className="font-semibold text-destructive">Compte verrouillé</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            3 tentatives échouées. Réessayez dans 15 minutes.
          </p>
        </div>
      </div>
    );
  }

  const remaining = maxAttempts - attempts;

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {method === "sms"
          ? `Code envoyé au +33 6 •• •• •• ${phone.slice(-2) || "··"}`
          : "Code depuis votre application"}
      </p>

      <div className={cn(shake && "animate-shake")}>
        <InputOTP maxLength={6} value={code} onChange={setCode} disabled={loading}>
          <InputOTPGroup className="gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className={cn(
                  "h-14 w-12 rounded-md border-2 font-mono text-xl font-bold shadow-none first:rounded-md last:rounded-md",
                  attempts > 0 && "border-destructive text-destructive"
                )}
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      {attempts > 0 && (
        <div className="flex items-center gap-1.5 text-[12px] text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" />
          Code incorrect. ({remaining} tentative{remaining > 1 ? "s" : ""} restante
          {remaining > 1 ? "s" : ""})
        </div>
      )}

      {loading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}

      <p className="text-center text-[12px] text-muted-foreground">
        Saisissez le code à 6 chiffres
        {method === "sms" ? " reçu par SMS." : " affiché dans votre application."}
      </p>
    </div>
  );
}

// ─── Step 4 body: Recovery codes ──────────────────────────────────────────────

function AnimatedCheck() {
  return (
    <span className="inline-flex h-[72px] w-[72px] animate-check-pop items-center justify-center rounded-full bg-success-soft">
      <svg width={36} height={36} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="18" fill="var(--color-success)" />
        <path
          d="M10 18l6 6L26 12"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-draw-check"
          style={{ strokeDasharray: 24 }}
        />
      </svg>
    </span>
  );
}

function RecoveryBody({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = [
      "IZOX — Codes de récupération 2FA",
      "Conservez ces codes en lieu sûr. Chaque code ne peut être utilisé qu'une seule fois.",
      "",
      ...codes,
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "izox-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <AnimatedCheck />
        <div>
          <p className="font-display text-[17px] font-bold text-success">
            Double authentification activée !
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Conservez ces codes. Chacun ne peut être utilisé qu'une seule fois en cas de perte
            d'accès.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-muted/50 p-4">
        {codes.map((code, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-sm border border-border bg-card px-2.5 py-1.5"
          >
            <span className="font-mono text-[9px] text-muted-foreground/70">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="font-mono text-[12px] font-semibold tracking-[0.04em] text-foreground">
              {code}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-warning/30 bg-warning-soft p-3 text-[12px] leading-relaxed text-foreground/80">
        ⚠ Ces codes ne seront affichés qu'une seule fois. Sauvegardez-les maintenant.
      </div>

      <div className="flex gap-2.5">
        <Button variant="outline" onClick={handleCopy} className={cn("flex-1", copied && "text-success")}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copié !" : "Copier"}
        </Button>
        <Button variant="outline" onClick={handleDownload} className="flex-1">
          <Download className="h-4 w-4" />
          Télécharger
        </Button>
        <Button variant="outline" onClick={() => window.print()} className="flex-1">
          <Printer className="h-4 w-4" />
          Imprimer
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TwoFactorSetup({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<Method>("totp");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [totpData, setTotpData] = useState<{
    secret: string;
    uri: string;
    qrDataUrl: string;
  } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  // Generate TOTP secret when method is totp
  useEffect(() => {
    if (method !== "totp") return;
    setLoading(true);
    const secret = new OTPAuth.Secret();
    const totp = new OTPAuth.TOTP({
      issuer: "IZOX",
      label: user?.email ?? "user",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret,
    });
    const uri = totp.toString();
    QRCode.toDataURL(uri, { width: 200, margin: 1 })
      .then((dataUrl) => {
        setTotpData({ secret: secret.base32, uri, qrDataUrl: dataUrl });
        setLoading(false);
      })
      .catch(() => {
        toast.error("Erreur génération QR code");
        setLoading(false);
      });
  }, [method, user?.email]);

  const handleStep2Next = async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)("setup_2fa", {
        p_method: method,
        p_totp_secret: method === "totp" ? totpData?.secret : null,
        p_phone: method === "sms" ? phone : null,
      });
      if (error) throw error;
      setStep(3);
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Erreur lors de la configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleVerified = async () => {
    const codes = generateRecoveryCodes();
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)("store_2fa_recovery_codes", { p_codes: codes });
      if (error) throw error;
      setRecoveryCodes(codes);
      setStep(4);
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Erreur lors de la sauvegarde des codes");
    } finally {
      setLoading(false);
    }
  };

  const STEPS = ["Méthode", "Configuration", "Vérification", "Codes de secours"];

  // Header title + description par étape (centralisé — design handoff v2)
  const header = (() => {
    if (step === 1)
      return {
        title: "Activer la double authentification",
        desc: "Choisissez la méthode d'authentification à deux facteurs pour sécuriser votre compte.",
      };
    if (step === 2 && method === "totp")
      return {
        title: "Scanner le QR code",
        desc: "Scannez ce code avec Google Authenticator, Authy ou 1Password.",
      };
    if (step === 2)
      return {
        title: "Ajouter votre numéro de téléphone",
        desc: "Un SMS contenant un code à 6 chiffres vous sera envoyé à chaque connexion.",
      };
    if (step === 3)
      return {
        title: "Saisir le code de vérification",
        desc: `Saisissez le code à 6 chiffres ${
          method === "sms" ? "reçu par SMS" : "depuis votre application"
        }.`,
      };
    return {
      title: "Codes de récupération",
      desc: "Conservez ces codes dans un endroit sûr. Chacun ne peut être utilisé qu'une seule fois.",
    };
  })();

  const phoneValid = /^\d[\d\s]{5,14}$/.test(phone.replace(/\s/g, "")) || /^\+\d{6,15}$/.test(phone);

  return (
    <div className="mx-auto w-full max-w-[520px] space-y-6">
      {/* Stepper carré */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-card">
        <div className="flex items-center">
          {STEPS.map((label, i) => {
            const done = step > i + 1;
            const active = step === i + 1;
            return (
              <div key={label} className="flex flex-1 items-center last:flex-none">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-sm text-[11px] font-semibold",
                      done
                        ? "bg-success text-success-foreground"
                        : active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "hidden truncate text-xs sm:block",
                      active ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn("mx-2 h-px flex-1", done ? "bg-success" : "bg-border")} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Carte principale */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        {/* En-tête */}
        <div
          className={cn(
            "border-b border-border px-6 pb-4 pt-5",
            step === 4 && "bg-success-soft"
          )}
        >
          <p
            className={cn(
              "mb-1 font-mono text-[10px] uppercase tracking-wider",
              step === 4 ? "text-success" : "text-primary"
            )}
          >
            Étape {step} sur {STEPS.length}
          </p>
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
            {header.title}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">{header.desc}</p>
        </div>

        {/* Corps */}
        <div className="px-6 py-7">
          {step === 1 && <MethodBody method={method} onChange={setMethod} />}
          {step === 2 && (
            <ConfigBody
              method={method}
              totpData={totpData}
              phone={phone}
              onPhoneChange={setPhone}
              loading={loading}
            />
          )}
          {step === 3 && (
            <VerifyBody
              method={method}
              totpData={totpData}
              phone={phone}
              onSuccess={handleVerified}
              loading={loading}
              setLoading={setLoading}
            />
          )}
          {step === 4 && <RecoveryBody codes={recoveryCodes} />}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-3.5">
          {step > 1 && step < 4 ? (
            <Button
              variant="ghost"
              onClick={() => setStep((s) => (s - 1) as Step)}
              disabled={loading}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Précédent
            </Button>
          ) : (
            <span />
          )}

          {step === 1 && (
            <Button onClick={() => setStep(2)}>
              Continuer
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
          {step === 2 && method === "totp" && (
            <Button onClick={handleStep2Next} disabled={!totpData || loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              J'ai scanné le code
            </Button>
          )}
          {step === 2 && method === "sms" && (
            <Button onClick={handleStep2Next} disabled={!phoneValid || loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              Envoyer le SMS
            </Button>
          )}
          {step === 3 && (
            <span className="font-mono text-[10px] text-muted-foreground/70">
              Saisir le code pour continuer
            </span>
          )}
          {step === 4 && (
            <Button onClick={onDone} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Terminer la configuration
            </Button>
          )}
        </div>
      </div>

      {/* Note sécurité */}
      {step < 4 && (
        <div className="flex items-start gap-2.5 rounded-md border border-warning/30 bg-warning-soft px-3.5 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <p className="text-[12px] leading-relaxed text-foreground/80">
            La double authentification protège votre compte même si votre mot de passe est
            compromis.
          </p>
        </div>
      )}
    </div>
  );
}
