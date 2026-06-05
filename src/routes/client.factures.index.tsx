import { createFileRoute, redirect } from "@tanstack/react-router";

// Les factures sont regroupées dans /client/documents (sous-onglet Factures).
// Seul le path exact /client/factures redirige ; /client/factures/$id (détail)
// reste accessible car ce n'est pas un enfant de cet index.
export const Route = createFileRoute("/client/factures/")({
  beforeLoad: () => {
    throw redirect({ to: "/client/documents" });
  },
});
