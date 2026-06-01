import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth, rolePath } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";

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
  const { signIn, profile, session, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Password recovery mode (triggered when user clicks a reset/invite link)
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  // Detect PASSWORD_RECOVERY event from Supabase (magic link click)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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
      setIsRecovery(false);
      // The redirect effect will fire automatically once isRecovery is false
    }
  };

  const brandHeader = (
    <div className="bg-primary py-12 sm:py-16 flex items-center justify-center px-4">
      <img
        src="/logo-izox.png"
        alt="IZOX — Nettoyage circulaire"
        className="h-16 sm:h-20 w-auto object-contain"
      />
    </div>
  );

  const brandFooter = (
    <footer className="py-6 text-center text-xs text-muted-foreground">
      © {new Date().getFullYear()} IZOX — Nettoyage circulaire
    </footer>
  );

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
                <h1 className="text-xl font-semibold text-foreground">Choisir un mot de passe</h1>
                <p className="text-sm text-muted-foreground">Définissez le mot de passe de votre compte IZOX.</p>
              </div>
            </div>

            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
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
                <Input
                  id="confirm-password"
                  type="password"
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
            <h1 className="text-2xl font-semibold text-foreground">Bienvenue</h1>
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
              <Input
                id="password"
                type="password"
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

          <p className="mt-6 text-xs text-muted-foreground text-center">
            Pas de compte ? Contactez votre administrateur IZOX.
          </p>
        </Card>
      </div>

      {brandFooter}
    </div>
  );
}
