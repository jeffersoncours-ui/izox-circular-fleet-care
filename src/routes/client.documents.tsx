import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";

export const Route = createFileRoute("/client/documents")({
  component: () => (
    <div className="px-4 py-5 max-w-2xl mx-auto pb-24 flex flex-col gap-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Partagés par IZOX</p>
        <h1 className="text-[24px] font-bold tracking-tight text-foreground mt-0.5">Mes documents</h1>
      </header>
      <Card className="p-10 text-center shadow-card border-border/60">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
          <FolderOpen className="h-5 w-5 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-medium text-foreground">Aucun document partagé</p>
        <p className="text-xs text-muted-foreground mt-1">Vos contrats et rapports apparaîtront ici.</p>
      </Card>
    </div>
  ),
});
