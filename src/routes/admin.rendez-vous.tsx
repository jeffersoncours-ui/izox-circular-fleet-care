import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

export const Route = createFileRoute("/admin/rendez-vous")({
  component: () => (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-6">Rendez-vous</h1>
      <Card className="p-12 text-center shadow-card border-border/60">
        <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Le calendrier des rendez-vous arrive bientôt.</p>
      </Card>
    </div>
  ),
});
