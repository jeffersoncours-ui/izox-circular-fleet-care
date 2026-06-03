import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout pur : la fiche détail /admin/interventions/$id rend ici via <Outlet/>.
// La redirection de /admin/interventions (path exact) vers l'onglet unifié
// est portée par admin.interventions.index.tsx — la mettre ici casserait le
// détail car le beforeLoad du parent s'exécute aussi pour les routes enfants.
export const Route = createFileRoute("/admin/interventions")({
  component: () => <Outlet />,
});
