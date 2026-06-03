import { createFileRoute, Link } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarRange, ListChecks, CalendarDays, Wrench, Map } from "lucide-react";
import { DemandesRdvList } from "@/components/admin/DemandesRdvList";
import { PlanningCalendar } from "@/components/admin/PlanningCalendar";
import { InterventionsListPanel } from "@/components/admin/InterventionsListPanel";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/lib/auth-context";
import { Route as PlanningRoute } from "@/routes/admin.planning";

export const Route = createFileRoute("/admin/planning/")({
  component: AdminPlanningIndexPage,
});

function AdminPlanningIndexPage() {
  const search = PlanningRoute.useSearch();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  // Une demande ciblée (?demande=) force l'onglet Demandes pour l'auto-ouverture.
  const defaultTab = search.demande ? "demandes" : search.tab ?? "demandes";

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <CalendarRange className="h-7 w-7 text-primary" /> Planning &amp; RDV
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Demandes de rendez-vous, planning des opérateurs et suivi des interventions.
        </p>
      </header>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList
          className={
            isAdmin
              ? "grid w-full grid-cols-3 max-w-2xl"
              : "grid w-full grid-cols-2 max-w-md"
          }
        >
          <TabsTrigger value="demandes" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Demandes
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="planning" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Planning
            </TabsTrigger>
          )}
          <TabsTrigger value="interventions" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Interventions
          </TabsTrigger>
        </TabsList>

        {/* forceMount : préserve lastHandledIdRef de useAutoOpenFromSearch
            (auto-ouverture via ?demande=). data-[state=inactive]:hidden masque
            visuellement quand l'onglet est inactif. */}
        <TabsContent
          value="demandes"
          forceMount
          className="mt-6 data-[state=inactive]:hidden"
        >
          <DemandesRdvList />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="planning" className="mt-6">
            <RoleGuard allowed={["admin"]}>
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button asChild variant="outline">
                    <Link to="/admin/planning/map">
                      <Map className="h-4 w-4" />
                      Voir la carte des routes
                    </Link>
                  </Button>
                </div>
                <PlanningCalendar />
              </div>
            </RoleGuard>
          </TabsContent>
        )}

        <TabsContent value="interventions" className="mt-6">
          <InterventionsListPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
