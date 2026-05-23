import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";

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
import {
  GererDemandeRdvDialog,
  type AdminDemandeRdv,
} from "@/components/admin/GererDemandeRdvDialog";
import { useAutoOpenFromSearch } from "@/hooks/useAutoOpenFromSearch";
import { Route as RendezVousRoute } from "@/routes/admin.rendez-vous";

interface Row extends AdminDemandeRdv {
  entreprises?: { nom: string } | null;
}

const STATUTS = ["en_attente", "confirmee", "refusee", "annulee_client"];
const STATUT_LABEL: Record<string, string> = {
  en_attente: "En attente",
  confirmee: "Confirmée",
  refusee: "Refusée",
  annulee_client: "Annulée",
};
const STATUT_COLOR: Record<string, string> = {
  en_attente: "bg-orange-50 text-orange-700 border-orange-300",
  confirmee: "bg-green-50 text-green-700 border-green-300",
  refusee: "bg-red-50 text-red-700 border-red-300",
  annulee_client: "bg-gray-50 text-gray-700 border-gray-300",
};

export function DemandesRdvList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("en_attente");
  const [selected, setSelected] = useState<AdminDemandeRdv | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("demandes_rdv")
      .select("*, entreprises(nom)")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.statut === filter);
  const nbEnAttente = rows.filter((r) => r.statut === "en_attente").length;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <p className="text-sm text-muted-foreground">
          <strong>{nbEnAttente}</strong> demande{nbEnAttente > 1 ? "s" : ""} en attente
        </p>
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
          {filtered.map((r) => {
            const creneaux: Array<{ date: string; plage: string }> = Array.isArray(
              r.creneaux_preferes,
            )
              ? r.creneaux_preferes
              : [];
            return (
              <li key={r.id}>
                <button
                  type="button"
                  disabled={r.statut !== "en_attente"}
                  onClick={() =>
                    r.statut === "en_attente"
                      ? setSelected({
                          ...r,
                          entreprise_nom: r.entreprises?.nom ?? null,
                        })
                      : null
                  }
                  className="w-full text-left"
                >
                  <Card className="p-4 shadow-card hover:bg-muted/30 transition-colors disabled:hover:bg-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-sm">
                            {r.entreprises?.nom ?? "—"}
                          </p>
                          <Badge variant="outline">
                            {r.nb_vehicules_rdv} véh.
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {creneaux.length} créneau
                          {creneaux.length > 1 ? "x" : ""} proposé
                          {creneaux.length > 1 ? "s" : ""}
                          {creneaux[0]?.date && (
                            <>
                              {" "}
                              · 1er :{" "}
                              {format(parseISO(creneaux[0].date), "dd/MM/yyyy")}{" "}
                              {creneaux[0].plage}
                            </>
                          )}
                        </p>
                        {r.commentaires && (
                          <p className="text-xs italic text-muted-foreground line-clamp-1 mt-1">
                            {r.commentaires}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className={STATUT_COLOR[r.statut]}>
                        {STATUT_LABEL[r.statut] ?? r.statut}
                      </Badge>
                    </div>
                  </Card>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <GererDemandeRdvDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        demande={selected}
        onProcessed={() => {
          setSelected(null);
          load();
        }}
      />
    </div>
  );
}
