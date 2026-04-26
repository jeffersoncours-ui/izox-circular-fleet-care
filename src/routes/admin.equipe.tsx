import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";

export const Route = createFileRoute("/admin/equipe")({
  component: () => (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-6">Équipe</h1>
      <Card className="p-12 text-center shadow-card border-border/60">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">La gestion de l'équipe arrive bientôt.</p>
      </Card>
    </div>
  ),
});
