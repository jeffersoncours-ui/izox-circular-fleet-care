import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

// Ancien alias — redirige vers l'onglet unifié Planning & RDV (sous-onglet Demandes).
export const Route = createFileRoute("/admin/demandes-rdv")({
  validateSearch: z.object({
    demande: z.string().uuid().optional(),
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/admin/planning",
      search: { tab: "demandes", demande: search.demande },
    });
  },
});
