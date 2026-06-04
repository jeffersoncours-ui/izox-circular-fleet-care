import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
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
  const [decomposeByEnt, setDecomposeByEnt] = useState<
    Record<string, { joursActifs: number; joursProgrammes: number; total: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("en_attente");
  const [selected, setSelected] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("v_demandes_gel_with_quota")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as unknown as Row[];
    setRows(list);

    const entIds = Array.from(new Set(list.map((r) => r.entreprise_id))).filter(Boolean);
    if (entIds.length > 0) {
      const minDate = new Date();
      minDate.setDate(minDate.getDate() - 365);
      const minISO = minDate.toISOString().split("T")[0];
      const { data: gels } = await supabase
        .from("demandes_gel")
        .select("entreprise_id, statut, date_debut, date_fin_prevue, date_fin_effective")
        .in("entreprise_id", entIds)
        .in("statut", ["en_attente", "validee", "active", "close"])
        .gte("date_debut", minISO);
      const acc: Record<string, DemandeGelRow[]> = {};
      for (const g of (gels ?? []) as Array<DemandeGelRow & { entreprise_id: string }>) {
        (acc[g.entreprise_id] ??= []).push(g);
      }
      const map: Record<string, { joursActifs: number; joursProgrammes: number; total: number }> = {};
      for (const [eid, rs] of Object.entries(acc)) {
        map[eid] = computeQuotaGelDecompose(rs);
      }
      setDecomposeByEnt(map);
    } else {
      setDecomposeByEnt({});
    }
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
    <div className="flex flex-col min-h-full">
      <PageHeader
        crumbs={["Admin", "Demandes de gel"]}
        title="Demandes de gel"
        sub={`${nbEnAttente} demande${nbEnAttente > 1 ? "s" : ""} en attente de traitement`}
        right={
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48 h-9 text-sm">
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
        }
      />
      <div className="p-6 lg:p-8 max-w-6xl w-full mx-auto flex flex-col gap-4">

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
                        {(() => {
                          const d = decomposeByEnt[r.entreprise_id];
                          if (!d) return `${r.quota_consomme_actuel ?? 0}/90`;
                          return `${d.total}/90 (${d.joursActifs} en cours · ${d.joursProgrammes} programmés)`;
                        })()}
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
    </div>
  );
}
