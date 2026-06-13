import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout pur : la fiche détail /client/factures/$id rend ici via <Outlet/>.
// La redirection de /client/factures (path exact) vers /client/documents est
// portée par client.factures.index.tsx — la mettre ici casserait le détail
// car le beforeLoad du parent s'exécute aussi pour les routes enfants.
export const Route = createFileRoute("/client/factures")({
  component: () => <Outlet />,
});
