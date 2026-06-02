import { createFileRoute, Outlet } from "@tanstack/react-router";
import { z } from "zod";

// Layout pur : expose validateSearch pour que les composants enfants
// (DemandesRdvList via PlanningRoute.useSearch()) lisent ?demande= et ?tab=.
// Le contenu des onglets est dans admin.planning.index.tsx.
// La carte est dans admin.planning.map.tsx.
const planningSearchSchema = z.object({
  demande: z.string().uuid().optional(),
  tab: z.enum(["demandes", "planning", "interventions"]).optional(),
});

export const Route = createFileRoute("/admin/planning")({
  validateSearch: planningSearchSchema,
  component: () => <Outlet />,
});
