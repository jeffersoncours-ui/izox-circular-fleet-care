import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth, rolePath } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && session && profile) {
      navigate({ to: rolePath(profile.role) });
    }
  }, [loading, session, profile, navigate]);

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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top brand band */}
      <div className="bg-primary py-12 sm:py-16 flex items-center justify-center px-4">
        <img
          src="/logo-izox.png"
          alt="IZOX — Nettoyage circulaire"
          className="h-16 sm:h-20 w-auto object-contain"
        />
      </div>

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

      <footer className="py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} IZOX — Nettoyage circulaire
      </footer>
    </div>
  );
}
