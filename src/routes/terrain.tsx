import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Wrench } from "lucide-react";

export const Route = createFileRoute("/terrain")({
  component: TerrainPage,
});

function TerrainPage() {
  return (
    <RoleGuard allowed={["operateur"]}>
      <Inner />
    </RoleGuard>
  );
}

function Inner() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <img src="/logo-izox.png" alt="IZOX" className="h-7 w-auto object-contain" />
        <Button
          size="icon"
          variant="ghost"
          onClick={handleLogout}
          className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <main className="flex-1 px-4 py-6 max-w-xl mx-auto w-full">
        <p className="text-sm text-muted-foreground">Bonjour</p>
        <h1 className="text-2xl font-bold text-foreground mb-6">{profile?.prenom} {profile?.nom}</h1>

        <h2 className="text-sm uppercase tracking-wide text-muted-foreground font-semibold mb-3">
          Mes interventions du jour
        </h2>

        <Card className="p-10 text-center shadow-card border-border/60">
          <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aucune intervention planifiée aujourd'hui.</p>
        </Card>
      </main>
    </div>
  );
}
