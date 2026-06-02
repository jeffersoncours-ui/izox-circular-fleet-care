import { createFileRoute, redirect } from "@tanstack/react-router";

// Onglet fusionné dans /admin/planning (sous-onglet Interventions).
// Seul le path exact /admin/interventions redirige ; /admin/interventions/$id
// (fiche détail) reste accessible car ce n'est pas un enfant de cet index.
export const Route = createFileRoute("/admin/interventions/")({
  beforeLoad: () => {
    throw redirect({
      to: "/admin/planning",
      search: { tab: "interventions" },
    });
  },
});
