import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export const Route = createFileRoute("/client/interventions")({
  component: () => (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-4">Mes prestations</h1>
      <Card className="p-10 text-center shadow-card border-border/60">
        <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Aucune prestation enregistrée.</p>
      </Card>
    </div>
  ),
});
