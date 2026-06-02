import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

// Onglet fusionné dans /admin/planning. On redirige en préservant ?demande=
// (deep-links des notifications) vers le sous-onglet Demandes.
const legacySearchSchema = z.object({
  demande: z.string().uuid().optional(),
  tab: z.string().optional(),
});

export const Route = createFileRoute("/admin/rendez-vous")({
  validateSearch: legacySearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/admin/planning",
      search: { tab: "demandes", demande: search.demande },
    });
  },
});
