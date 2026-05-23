import { Card } from "@/components/ui/card";
import { CalendarDays, Sparkles } from "lucide-react";

export function CalendrierRdvPlaceholder() {
  return (
    <Card className="p-8 flex flex-col items-center justify-center text-center gap-4 bg-muted/30 border-dashed">
      <div className="rounded-full bg-primary/10 p-4">
        <CalendarDays className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="text-lg font-semibold flex items-center gap-2 justify-center">
          Vue calendrier
          <Sparkles className="h-4 w-4 text-primary" />
        </h3>
        <p className="text-sm text-muted-foreground">
          La vue calendrier des interventions et RDV confirmés sera disponible
          prochainement. En attendant, utilisez l'onglet « Demandes » pour gérer
          les demandes RDV entrantes.
        </p>
      </div>
    </Card>
  );
}
