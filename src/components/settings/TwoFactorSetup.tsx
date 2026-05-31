import { useState, useEffect, useCallback } from "react";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { Loader2, Smartphone, KeyRound, CheckCircle2, Copy, Download, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
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

// ─── Step 1: Method choice ────────────────────────────────────────────────────

function MethodStep({
  method,
  onChange,
  onNext,
}: {
  method: Method;
  onChange: (m: Method) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Choisissez une méthode</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Comment souhaitez-vous recevoir vos codes de vérification ?
        </p>
      </div>

      <RadioGroup
        value={method}
        onValueChange={(v) => onChange(v as Method)}
        className="space-y-3"
      >
        <label
          htmlFor="totp"
          className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
            method === "totp" ? "border-primary bg-primary/5" : "hover:bg-muted/30"
          }`}
        >
          <RadioGroupItem id="totp" value="totp" className="mt-0.5" />
          <div className="flex items-start gap-3">
            <KeyRound className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Application Authenticator</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Google Authenticator, Authy, 1Password… Recommandé.
              </p>
            </div>
          </div>
        </label>

        <label
          htmlFor="sms"
          className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
            method === "sms" ? "border-primary bg-primary/5" : "hover:bg-muted/30"
          }`}
        >
          <RadioGroupItem id="sms" value="sms" className="mt-0.5" />
          <div className="flex items-start gap-3">
            <Smartphone className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">SMS</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recevez un code par SMS sur votre numéro de téléphone.
              </p>
            </div>
          </div>
        </label>
      </RadioGroup>

      <Button onClick={onNext} className="w-full">
        Continuer
      </Button>
    </div>
  );
}

// ─── Step 2: Config (QR or phone) ────────────────────────────────────────────

function ConfigStep({
  method,
  totpData,
  phone,
  onPhoneChange,
  onNext,
  loading,
}: {
  method: Method;
  totpData: { secret: string; uri: string; qrDataUrl: string } | null;
  phone: string;
  onPhoneChange: (p: string) => void;
  onNext: () => void;
  loading: boolean;
}) {
  if (method === "totp") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Scannez le QR code</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ouvrez votre application Authenticator et scannez ce code.
          </p>
        </div>

        {loading || !totpData ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="border-2 border-border rounded-lg p-3 bg-white">
                <img src={totpData.qrDataUrl} alt="QR Code 2FA" className="w-48 h-48" />
              </div>
            </div>

            <div className="rounded-md bg-muted/50 p-3 space-y-1">
              <p className="text-xs text-muted-foreground">
                Vous ne pouvez pas scanner ? Entrez ce code manuellement :
              </p>
              <p className="font-mono text-sm font-semibold tracking-widest break-all">
                {totpData.secret}
              </p>
            </div>
          </div>
        )}

        <Button onClick={onNext} disabled={!totpData} className="w-full">
          J'ai scanné le code
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Votre numéro de téléphone</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Vous recevrez un SMS de vérification à ce numéro.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Numéro de téléphone</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+33 6 12 34 56 78"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">Format international requis (+33…)</p>
      </div>

      <Button
        onClick={onNext}
        disabled={!phone.match(/^\+\d{6,15}$/)}
        className="w-full"
      >
        Envoyer le code SMS
      </Button>
    </div>
  );
}

// ─── Step 3: Verification ─────────────────────────────────────────────────────

function VerifyStep({
  method,
  totpData,
  onSuccess,
  loading,
  setLoading,
}: {
  method: Method;
  totpData: { secret: string; uri: string; qrDataUrl: string } | null;
  onSuccess: () => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}) {
  const [code, setCode] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Vérification</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {method === "totp"
            ? "Entrez le code affiché dans votre application Authenticator."
            : "Entrez le code reçu par SMS."}
        </p>
      </div>

      {locked ? (
        <Card className="p-4 border-destructive/40 bg-destructive/5 flex items-center gap-3">
          <Lock className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Compte verrouillé</p>
            <p className="text-xs text-muted-foreground">
              3 tentatives échouées. Réessayez dans 15 minutes.
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <InputOTP maxLength={6} value={code} onChange={setCode} disabled={loading}>
            <InputOTPGroup>
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>

          {attempts > 0 && (
            <p className="text-xs text-destructive">
              {attempts}/{maxAttempts} tentatives
            </p>
          )}

          {loading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Recovery codes ───────────────────────────────────────────────────

function RecoveryStep({
  codes,
  onDone,
  loading,
}: {
  codes: string[];
  onDone: () => void;
  loading: boolean;
}) {
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
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-lg font-semibold">2FA activé avec succès !</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Conservez ces codes de récupération. Ils vous permettront d'accéder à votre
            compte si vous perdez accès à votre méthode d'authentification.
          </p>
        </div>
      </div>

      <Card className="p-4 bg-muted/30">
        <div className="grid grid-cols-2 gap-1.5">
          {codes.map((code, i) => (
            <p key={i} className="font-mono text-sm tracking-wider text-center py-1">
              {code}
            </p>
          ))}
        </div>
      </Card>

      <p className="text-xs text-destructive font-medium">
        ⚠ Ces codes ne seront affichés qu'une seule fois. Sauvegardez-les maintenant.
      </p>

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleCopy} className="flex-1">
          {copied ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copié !" : "Copier"}
        </Button>
        <Button variant="outline" onClick={handleDownload} className="flex-1">
          <Download className="h-4 w-4" />
          Télécharger .txt
        </Button>
      </div>

      <Button onClick={onDone} className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Terminer"}
      </Button>
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

  const handleStep1Next = () => {
    setStep(2);
  };

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

  const steps: { label: string }[] = [
    { label: "Méthode" },
    { label: "Configuration" },
    { label: "Vérification" },
    { label: "Codes de récupération" },
  ];

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div
              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                step > i + 1
                  ? "bg-primary text-primary-foreground"
                  : step === i + 1
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > i + 1 ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={`text-xs hidden sm:block ${
                step === i + 1 ? "font-semibold text-foreground" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-px ${step > i + 1 ? "bg-primary" : "bg-border"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 1 && (
        <MethodStep method={method} onChange={setMethod} onNext={handleStep1Next} />
      )}
      {step === 2 && (
        <ConfigStep
          method={method}
          totpData={totpData}
          phone={phone}
          onPhoneChange={setPhone}
          onNext={handleStep2Next}
          loading={loading}
        />
      )}
      {step === 3 && (
        <VerifyStep
          method={method}
          totpData={totpData}
          onSuccess={handleVerified}
          loading={loading}
          setLoading={setLoading}
        />
      )}
      {step === 4 && (
        <RecoveryStep codes={recoveryCodes} onDone={onDone} loading={loading} />
      )}
    </div>
  );
}
