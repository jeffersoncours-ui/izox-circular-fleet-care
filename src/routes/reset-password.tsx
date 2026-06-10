import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, KeyRound, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — IZOX" },
      { name: "description", content: "Définissez votre nouveau mot de passe IZOX." },
    ],
  }),
  component: ResetPasswordPage,
});

type PageState = "loading" | "ready" | "error";

function ResetPasswordPage() {
  const navigate = useNavigate();
  // Capture URL params synchronously at init, before Supabase cleans them
  // via history.replaceState after PKCE code exchange.
  const [initialUrl] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    return {
      error: params.get("error"),
      errorDescription: params.get("error_description"),
      hasCode: !!params.get("code"),
      hasToken: hash.includes("access_token") || hash.includes("type=recovery"),
    };
  });
  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("Lien invalide ou expiré.");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { error, errorDescription, hasCode, hasToken } = initialUrl;

    // Supabase redirects with ?error=access_denied when the token is expired
    if (error) {
      const desc = (errorDescription ?? "Lien invalide ou expiré").replace(/\+/g, " ");
      setErrorMessage(desc);
      setPageState("error");
      return;
    }

    // No recovery data in URL — this page should not be accessed directly
    if (!hasCode && !hasToken) {
      navigate({ to: "/login" });
      return;
    }

    // Supabase-js exchanges the code/token automatically; wait for the event.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setPageState("ready");
      }
    });

    // Fallback: if the session is already established by the time this runs
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPageState("ready");
    });

    // Safety net: if nothing fires within 8s, show an error
    const timer = setTimeout(() => {
      setPageState((prev) => {
        if (prev === "loading") {
          setErrorMessage("Impossible de valider le lien. Veuillez en redemander un.");
          return "error";
        }
        return prev;
      });
    }, 8000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate, initialUrl]);

  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (newPassword !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setSaving(false);
      toast.error("Erreur : " + error.message);
    } else {
      // Destroy the recovery session — user must authenticate explicitly.
      await supabase.auth.signOut();
      setSaving(false);
      toast.success("Mot de passe défini. Connectez-vous pour accéder à votre espace.");
      navigate({ to: "/login" });
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

  if (pageState === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {brandHeader}
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        {brandFooter}
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {brandHeader}
        <div className="flex-1 flex items-start sm:items-center justify-center px-4 py-8 sm:py-12">
          <Card className="w-full max-w-md p-6 sm:p-8 shadow-strong border-border/60 text-center">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Lien expiré</h2>
            <p className="text-sm text-muted-foreground mb-6">{errorMessage}</p>
            <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/login" })}>
              Retour à la connexion
            </Button>
          </Card>
        </div>
        {brandFooter}
      </div>
    );
  }

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
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={saving}
              />
            </div>
            <Button type="submit" variant="izox" className="w-full" size="lg" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Définir mon mot de passe"}
            </Button>
          </form>
        </Card>
      </div>
      {brandFooter}
    </div>
  );
}
