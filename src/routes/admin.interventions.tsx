import { createFileRoute, redirect } from "@tanstack/react-router";

// Onglet fusionné dans /admin/planning (sous-onglet Interventions).
// La fiche détail /admin/interventions/$id reste inchangée.
export const Route = createFileRoute("/admin/interventions")({
  beforeLoad: () => {
    throw redirect({
      to: "/admin/planning",
      search: { tab: "interventions" },
    });
  },
});
