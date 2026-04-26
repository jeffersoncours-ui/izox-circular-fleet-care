import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";

export const Route = createFileRoute("/client/documents")({
  component: () => (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-4">Mes documents</h1>
      <Card className="p-10 text-center shadow-card border-border/60">
        <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Aucun document partagé.</p>
      </Card>
    </div>
  ),
});
