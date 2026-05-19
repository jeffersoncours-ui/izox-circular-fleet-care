import { createFileRoute } from "@tanstack/react-router";
import { FicheContratClient } from "@/components/client/FicheContratClient";

export const Route = createFileRoute("/client/contrats/$id")({
  component: FicheContratClient,
});
