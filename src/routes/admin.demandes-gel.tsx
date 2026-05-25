import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Snowflake } from "lucide-react";
import { format, parseISO } from "date-fns";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GererDemandeGelDialog } from "@/components/admin/GererDemandeGelDialog";
import { useAutoOpenFromSearch } from "@/hooks/useAutoOpenFromSearch";
import { computeQuotaGelDecompose, type DemandeGelRow } from "@/lib/quota-gel";

const demandesGelSearchSchema = z.object({
  demande: z.string().uuid().optional(),
});

export const Route = createFileRoute("/admin/demandes-gel")({
  component: DemandesGelPage,
  validateSearch: demandesGelSearchSchema,
});

interface Row {
  id: string;
  entreprise_nom: string | null;
  numero_contrat: string | null;
  type_demande: string;
  vehicule_ids: string[] | null;
  date_debut: string;
  date_fin_prevue: string;
  motif: string;
  statut: string;
  created_at: string;
  duree_jours_demandee: number | null;
  quota_consomme_actuel: number | null;
  entreprise_id: string;
}

const STATUTS = ["en_attente", "validee", "active", "close", "refusee", "annulee"];
const STATUT_LABEL: Record<string, string> = {
  en_attente: "En attente",
  validee: "Validée (programmée)",
  active: "Active",
  close: "Clôturée",
  refusee: "Refusée",
  annulee: "Annulée",
};

function DemandesGelPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("en_attente");
  const [selected, setSelected] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("v_demandes_gel_with_quota")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const search = Route.useSearch();
  useAutoOpenFromSearch<Row>(search.demande, rows, "id", (r) => setSelected(r));

  const filtered = filter === "all" ? rows : rows.filter((r) => r.statut === filter);
  const nbEnAttente = rows.filter((r) => r.statut === "en_attente").length;

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Snowflake className="h-7 w-7 text-blue-600" /> Demandes de gel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>{nbEnAttente}</strong> demande{nbEnAttente > 1 ? "s" : ""} en attente
            de traitement
          </p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {STATUTS.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUT_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-border/60">
          <p className="text-muted-foreground">Aucune demande.</p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() =>
                  r.statut === "en_attente" ? setSelected(r) : null
                }
                disabled={r.statut !== "en_attente"}
                className="w-full text-left"
              >
                <Card className="p-4 shadow-card hover:bg-muted/30 transition-colors disabled:hover:bg-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-sm">
                          {r.entreprise_nom ?? "—"}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {r.numero_contrat ?? "—"}
                        </span>
                        <Badge variant="outline" className="capitalize">
                          {r.type_demande === "contrat"
                            ? "Contrat"
                            : `${r.vehicule_ids?.length ?? 0} véh.`}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(r.date_debut), "dd/MM/yyyy")} →{" "}
                        {format(parseISO(r.date_fin_prevue), "dd/MM/yyyy")} ·{" "}
                        {r.duree_jours_demandee ?? "—"}j · Quota{" "}
                        {r.quota_consomme_actuel ?? 0}/90
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                        {r.motif}
                      </p>
                    </div>
                    <Badge variant="outline">{STATUT_LABEL[r.statut] ?? r.statut}</Badge>
                  </div>
                </Card>
              </button>
            </li>
          ))}
        </ul>
      )}

      <GererDemandeGelDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        demande={selected as any}
        onProcessed={() => {
          setSelected(null);
          load();
        }}
      />
    </div>
  );
}
