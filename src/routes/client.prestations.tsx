import { createFileRoute } from "@tanstack/react-router";
import { MesPrestationsPage } from "@/components/client/MesPrestationsPage";

export const Route = createFileRoute("/client/prestations")({
  component: MesPrestationsPage,
});
