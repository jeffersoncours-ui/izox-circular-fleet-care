import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Map } from "lucide-react";
import { PlanningCalendar } from "@/components/admin/PlanningCalendar";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/admin/planning")({
  component: AdminPlanningPage,
});

function AdminPlanningPage() {
  return (
    <RoleGuard allowed={["admin"]}>
    <div className="p-6 lg:p-10 max-w-full mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-primary" />
            Planning opérateurs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Glissez-déposez les interventions pour organiser le planning hebdomadaire.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/planning/map">
            <Map className="h-4 w-4" />
            Voir la carte des routes
          </Link>
        </Button>
      </header>

      <PlanningCalendar />
    </div>
    </RoleGuard>
  );
}
