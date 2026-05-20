import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/client/rendez-vous")({
  beforeLoad: () => {
    throw redirect({ to: "/client/prestations" });
  },
});
