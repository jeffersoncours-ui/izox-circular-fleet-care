import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout pur : terrain.intervention.$id rend ici via <Outlet/>.
// Le dashboard opérateur (onglets Planning/Interventions/Suivi/Profil)
// est dans terrain.index.tsx — même pattern que admin.interventions.tsx.
export const Route = createFileRoute("/terrain")({
  component: () => <Outlet />,
});
