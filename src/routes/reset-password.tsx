import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";
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
  // Capture URL params synchronously at init, before Supabase / the router
  // can clean them via history.replaceState.
  const [initialUrl] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    return {
      error: params.get("error"),
      errorDescription: params.get("error_description"),
      // New robust flow: token_hash + type in the query string.
      tokenHash: params.get("token_hash"),
      type: params.get("type"),
      // Legacy implicit flow (in-flight emails): code in query / token in hash.
      hasCode: !!params.get("code"),
      hasHashToken: hash.includes("access_token") || hash.includes("type=recovery"),
    };
  });
  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("Lien invalide ou expiré.");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  // Guard so verifyOtp runs only once (StrictMode double-mount, refresh).
  const verifyStarted = useRef(false);

  useEffect(() => {
    let active = true;
    const { error, errorDescription, tokenHash, type, hasCode, hasHashToken } = initialUrl;

    // Supabase redirects with ?error=access_denied when the token is expired.
    if (error) {
      const desc = (errorDescription ?? "Lien invalide ou expiré").replace(/\+/g, " ");
      setErrorMessage(desc);
      setPageState("error");
      return;
    }

    // --- Primary path: token_hash in the query string → verifyOtp ---
    // This goes directly to our app (no Supabase /verify redirect, no URL hash),
    // so it survives SSR and any server-side redirect. Independent of the
    // Supabase redirect allowlist.
    if (tokenHash) {
      if (verifyStarted.current) return;
      verifyStarted.current = true;
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: (type as EmailOtpType) || "recovery" })
        .then(({ error: verifyErr }) => {
          if (!active) return;
          if (verifyErr) {
            setErrorMessage("Ce lien est invalide ou a déjà été utilisé. Veuillez en redemander un.");
            setPageState("error");
          } else {
            // Strip the token from the URL so a refresh doesn't retry a
            // now-consumed one-time token.
            window.history.replaceState({}, "", window.location.pathname);
            setPageState("ready");
          }
        });
      return () => {
        active = false;
      };
    }

    // --- Legacy path: implicit-flow hash / PKCE code (in-flight emails) ---
    if (hasCode || hasHashToken) {
      const { data: sub } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setPageState("ready");
        }
      });
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (active && session) setPageState("ready");
      });
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
        active = false;
        sub.subscription.unsubscribe();
        clearTimeout(timer);
      };
    }

    // --- No token in URL: maybe the session is already established ---
    // (e.g. user refreshed after verifyOtp cleaned the URL). Otherwise this
    // page was reached directly → send back to login.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session) setPageState("ready");
      else navigate({ to: "/login" });
    });

    return () => {
      active = false;
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
