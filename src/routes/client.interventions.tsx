import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/client/interventions")({
  beforeLoad: () => {
    throw redirect({ to: "/client/prestations" });
  },
});
