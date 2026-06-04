import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/components/RoleGuard";
import { PageHeader } from "@/components/ui/page-header";

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
      <div className="flex flex-col min-h-full">
        <PageHeader
          crumbs={["Planning"]}
          title="Carte des routes"
          sub="Tournées du jour par opérateur · coordonnées GPS"
          right={
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/planning">← Retour au planning</Link>
            </Button>
          }
        />
        <div className="p-6 lg:p-8">
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
      </div>
    </RoleGuard>
  );
}
