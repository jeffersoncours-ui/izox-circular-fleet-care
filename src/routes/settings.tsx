import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth, rolePath } from "@/lib/auth-context";
import { Shield, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  const { profile } = useAuth();
  return (
    <RoleGuard allowed={["admin", "staff", "commercial", "operateur", "client"]}>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border px-6 py-4 flex items-center gap-4">
          <Link
            to={rolePath(profile?.role)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Paramètres</span>
          </div>
        </header>
        <main className="max-w-2xl mx-auto p-6">
          <Outlet />
        </main>
      </div>
    </RoleGuard>
  );
}
