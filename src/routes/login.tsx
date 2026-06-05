import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth, rolePath } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, KeyRound, ArrowLeft, Mail } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion — IZOX" },
      { name: "description", content: "Connectez-vous à votre espace IZOX." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  // isRecovery is managed at auth-context level so it is set before this
  // component mounts regardless of whether PKCE or implicit flow is used.
  const { signIn, profile, session, loading, isRecovery, clearRecovery } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  // Forgot password mode
  const [isForgot, setIsForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Redirect if already logged in (but not during password recovery)
  useEffect(() => {
    if (!loading && session && profile && !isRecovery) {
      navigate({ to: rolePath(profile.role) });
    }
  }, [loading, session, profile, navigate, isRecovery]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      toast.error("Identifiants incorrects");
    } else {
      toast.success("Connexion réussie");
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    // Use our own edge function (branded email via the Resend API) instead of
    // the native SMTP flow, which was failing with "535 Authentication
    // credentials invalid". The function is anti-enumeration: it always
    // succeeds, so we don't reveal whether the account exists.
    const { error } = await supabase.functions.invoke("request-password-reset", {
      body: {
        email: forgotEmail.trim(),
        redirect_to: `${window.location.origin}/reset-password`,
      },
    });
    setForgotLoading(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      setForgotSent(true);
    }
  };

  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Mot de passe défini avec succès — bienvenue !");
      clearRecovery();
      // The redirect effect will fire automatically once isRecovery is false
    }
  };

  const brandHeader = (
    <div className="bg-background border-b border-border py-10 sm:py-14 flex flex-col items-center justify-center px-6 gap-5">
      <img
        src="/logo-izox.png"
        alt="IZOX — Nettoyage circulaire"
        className="h-16 sm:h-20 w-auto object-contain"
      />
      <div className="text-center max-w-xs">
        <p className="text-[22px] font-bold tracking-tight text-foreground leading-snug">
          Une flotte propre,<br />sans friction.
        </p>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Lavage premium pour vos véhicules pros.
          Programmez, gelez, suivez — depuis votre poche.
        </p>
      </div>
    </div>
  );

  const brandFooter = (
    <footer className="py-6 text-center text-xs text-muted-foreground">
      © {new Date().getFullYear()} IZOX — Nettoyage circulaire
    </footer>
  );

  // --- Forgot password form ---
  if (isForgot) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {brandHeader}
        <div className="flex-1 flex items-start sm:items-center justify-center px-4 py-8 sm:py-12">
          <Card className="w-full max-w-md p-6 sm:p-8 shadow-strong border-border/60">
            {forgotSent ? (
              <div className="text-center py-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">Email envoyé !</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Si un compte existe pour <span className="font-medium text-foreground">{forgotEmail}</span>,
                  vous recevrez un lien de réinitialisation dans quelques instants.
                </p>
                <Button variant="outline" className="w-full" onClick={() => { setIsForgot(false); setForgotSent(false); setForgotEmail(""); }}>
                  <ArrowLeft className="h-4 w-4" />
                  Retour à la connexion
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <button
                    onClick={() => setIsForgot(false)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" /> Retour
                  </button>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">Mot de passe oublié</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Entrez votre email pour recevoir un lien de réinitialisation.
                  </p>
                </div>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email du compte</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="vous@entreprise.fr"
                      disabled={forgotLoading}
                    />
                  </div>
                  <Button type="submit" variant="izox" className="w-full" size="lg" disabled={forgotLoading}>
                    {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer le lien"}
                  </Button>
                </form>
              </>
            )}
          </Card>
        </div>
        {brandFooter}
      </div>
    );
  }

  // --- Set password form (after clicking invite/recovery link) ---
  if (isRecovery) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {brandHeader}
        <div className="flex-1 flex items-start sm:items-center justify-center px-4 py-8 sm:py-12">
          <Card className="w-full max-w-md p-6 sm:p-8 shadow-strong border-border/60">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <KeyRound className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Choisir un mot de passe</h1>
                <p className="text-sm text-muted-foreground">Définissez le mot de passe de votre compte IZOX.</p>
              </div>
            </div>

            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  required
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  disabled={saving}
                />
              </div>
              <Button
                type="submit"
                variant="izox"
                className="w-full"
                size="lg"
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Définir mon mot de passe"}
              </Button>
            </form>
          </Card>
        </div>
        {brandFooter}
      </div>
    );
  }

  // --- Regular login form ---
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {brandHeader}

      <div className="flex-1 flex items-start sm:items-center justify-center px-4 py-8 sm:py-12">
        <Card className="w-full max-w-md p-6 sm:p-8 shadow-strong border-border/60">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Bienvenue</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Connectez-vous à votre espace IZOX
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@entreprise.fr"
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
            </div>
            <Button
              type="submit"
              variant="izox"
              className="w-full"
              size="lg"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Se connecter"}
            </Button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <button
              type="button"
              onClick={() => setIsForgot(true)}
              className="text-sm text-primary hover:underline underline-offset-4 block w-full"
            >
              Mot de passe oublié ?
            </button>
            <p className="text-xs text-muted-foreground">
              Pas encore client IZOX ?{" "}
              <a
                href="mailto:contact@izox.fr"
                className="text-primary hover:underline underline-offset-4"
              >
                Contactez-nous
              </a>
            </p>
          </div>
        </Card>
      </div>

      {brandFooter}
    </div>
  );
}
