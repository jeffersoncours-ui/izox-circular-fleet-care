import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Map, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/components/RoleGuard";

// Leaflet is browser-only — dynamic import prevents SSR issues
const RouteMap = lazy(() =>
  import("@/components/admin/RouteMap").then((m) => ({ default: m.RouteMap }))
);

export const Route = createFileRoute("/admin/planning/map")({
  component: PlanningMapPage,
});

function PlanningMapPage() {
  return (
    <RoleGuard allowed={["admin"]}>
      <div className="p-6 lg:p-10 max-w-full mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Map className="h-7 w-7 text-primary" />
              Carte des routes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visualisation des routes d'intervention du jour par opérateur.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/admin/planning">
              <ChevronLeft className="h-4 w-4" />
              Retour au planning
            </Link>
          </Button>
        </header>

        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
        >
          <RouteMap />
        </Suspense>
      </div>
    </RoleGuard>
  );
}
