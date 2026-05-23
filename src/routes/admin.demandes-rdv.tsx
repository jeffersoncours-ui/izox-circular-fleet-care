import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/demandes-rdv")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/admin/rendez-vous",
      search: search as Record<string, unknown>,
    });
  },
});
