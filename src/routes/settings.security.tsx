import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Smartphone, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/settings/security")({
  component: SecuritySettingsPage,
});

function SecuritySettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Sécurité du compte
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez vos paramètres de sécurité et d'authentification.
        </p>
      </div>

      <Link to="/settings/security/2fa">
        <Card className="p-4 hover:bg-muted/30 transition-colors cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Authentification à deux facteurs</p>
                <p className="text-xs text-muted-foreground">
                  Renforcez la sécurité de votre compte avec un second facteur
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
      </Link>
    </div>
  );
}
