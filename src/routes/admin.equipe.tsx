import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { PageHeader } from "@/components/ui/page-header";

export const Route = createFileRoute("/admin/equipe")({
  component: AdminEquipePage,
});

function AdminEquipePage() {
  return (
    <RoleGuard allowed={["admin"]}>
      <div className="flex flex-col min-h-full">
        <PageHeader crumbs={["Admin", "Équipe"]} title="Équipe" sub="Gestion des opérateurs et accès" />
        <div className="p-6 lg:p-8 max-w-5xl w-full mx-auto">
          <Card className="p-12 text-center shadow-card border-border/60">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
              <Users className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium text-foreground">Module à venir</p>
            <p className="text-xs text-muted-foreground mt-1">La gestion de l'équipe arrive bientôt.</p>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}
