import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, FolderOpen, ChevronRight } from "lucide-react";
import {
  type Facture,
  STATUT_FACTURE,
  formatEuro,
  formatPeriode,
  formatDateFr,
} from "@/lib/factures";

export const Route = createFileRoute("/client/documents")({
  component: MesDocuments,
});

// Sous-ensemble nécessaire à la liste (pas besoin des snapshots ici).
type FactureListItem = Pick<
  Facture,
  | "id"
  | "numero_facture"
  | "statut"
  | "periode_debut"
  | "periode_fin"
  | "date_emission"
  | "montant_ttc"
>;

function MesDocuments() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [factures, setFactures] = useState<FactureListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.entreprise_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    // RLS limite déjà aux factures emise/payee/annulee de l'entreprise.
    const { data, error } = await supabase
      .from("factures")
      .select("id, numero_facture, statut, periode_debut, periode_fin, date_emission, montant_ttc")
      .eq("entreprise_id", profile.entreprise_id)
      .order("date_emission", { ascending: false, nullsFirst: false })
      .order("periode_debut", { ascending: false });
    if (error) toast.error("Erreur lors du chargement des factures");
    setFactures((data as FactureListItem[]) ?? []);
    setLoading(false);
  }, [profile?.entreprise_id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto pb-24 flex flex-col gap-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Partagés par IZOX
        </p>
        <h1 className="text-[24px] font-bold tracking-tight text-foreground mt-0.5">
          Mes documents
        </h1>
      </header>

      <Tabs defaultValue="factures" className="w-full">
        <TabsList className="h-auto">
          <TabsTrigger value="factures">Factures</TabsTrigger>
          <TabsTrigger value="autres">Autres documents</TabsTrigger>
        </TabsList>

        <TabsContent value="factures" className="mt-4">
          {loading ? (
            <div className="flex flex-col gap-2.5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : factures.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-5 w-5 text-muted-foreground/60" />}
              title="Aucune facture disponible"
              sub="Les factures de votre contrat apparaîtront ici."
            />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {factures.map((f) => {
                const statut = STATUT_FACTURE[f.statut];
                return (
                  <li key={f.id}>
                    <button
                      onClick={() =>
                        navigate({ to: "/client/factures/$id", params: { id: f.id } })
                      }
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors text-left"
                    >
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {f.numero_facture ?? "Brouillon"}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0 ${statut.badge}`}
                          >
                            {statut.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {formatPeriode(f.periode_debut, f.periode_fin)}
                          {f.date_emission && <> · émise le {formatDateFr(f.date_emission)}</>}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-semibold text-sm text-foreground tabular-nums">
                          {formatEuro(f.montant_ttc)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="autres" className="mt-4">
          <EmptyState
            icon={<FolderOpen className="h-5 w-5 text-muted-foreground/60" />}
            title="Aucun document partagé"
            sub="Vos contrats et rapports apparaîtront ici."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <Card className="p-10 text-center shadow-card border-border/60">
      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </Card>
  );
}
