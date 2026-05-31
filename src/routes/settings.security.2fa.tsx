import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { TwoFactorSetup } from "@/components/settings/TwoFactorSetup";

export const Route = createFileRoute("/settings/security/2fa")({
  component: TwoFactorPage,
});

function TwoFactorPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Authentification à deux facteurs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ajoutez une couche de sécurité supplémentaire à votre compte IZOX.
        </p>
      </div>

      <TwoFactorSetup onDone={() => navigate({ to: "/settings/security" })} />
    </div>
  );
}
