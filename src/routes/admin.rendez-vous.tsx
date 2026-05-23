import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, ListChecks } from "lucide-react";
import { CalendrierRdvPlaceholder } from "@/components/admin/CalendrierRdvPlaceholder";
import { DemandesRdvList } from "@/components/admin/DemandesRdvList";

const rendezVousSearchSchema = z.object({
  demande: z.string().uuid().optional(),
  tab: z.enum(["calendrier", "demandes"]).optional(),
});

export const Route = createFileRoute("/admin/rendez-vous")({
  component: AdminRendezVousPage,
  validateSearch: rendezVousSearchSchema,
});

function AdminRendezVousPage() {
  const search = Route.useSearch();
  const defaultTab = search.tab ?? (search.demande ? "demandes" : "demandes");

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="h-7 w-7 text-primary" /> Rendez-vous
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez les demandes de RDV entrantes et consultez le calendrier des
          interventions planifiées.
        </p>
      </header>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="calendrier" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Calendrier
          </TabsTrigger>
          <TabsTrigger value="demandes" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Demandes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendrier" className="mt-6">
          <CalendrierRdvPlaceholder />
        </TabsContent>

        <TabsContent value="demandes" className="mt-6">
          <DemandesRdvList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
