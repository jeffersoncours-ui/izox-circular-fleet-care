import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useNavigate } from "@tanstack/react-router";

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
import { type AdminDemandeRdv } from "@/components/admin/demande-rdv-types";
import { AssignerRdvDialog } from "@/components/admin/AssignerRdvDialog";
import { AnnulerRdvAdminDialog } from "@/components/admin/AnnulerRdvAdminDialog";
import { useAutoOpenFromSearch } from "@/hooks/useAutoOpenFromSearch";
import { Route as PlanningRoute } from "@/routes/admin.planning";

interface Row extends AdminDemandeRdv {
  entreprises?: { nom: string } | null;
}

const STATUTS = ["en_attente", "confirmee", "refusee", "annulee_client", "annulee_admin"];
const STATUT_LABEL: Record<string, string> = {
  en_attente: "En attente",
  confirmee: "Confirmée",
  refusee: "Refusée",
  annulee_client: "Annulée (client)",
  annulee_admin: "Annulée (IZOX)",
};
const STATUT_COLOR: Record<string, string> = {
  en_attente: "bg-orange-50 text-orange-700 border-orange-300",
  confirmee: "bg-green-50 text-green-700 border-green-300",
  refusee: "bg-red-50 text-red-700 border-red-300",
  annulee_client: "bg-gray-50 text-gray-700 border-gray-300",
  annulee_admin: "bg-gray-50 text-gray-700 border-gray-300",
};

export function DemandesRdvList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("en_attente");
  const [assigning, setAssigning] = useState<AdminDemandeRdv | null>(null);
  const [cancelling, setCancelling] = useState<AdminDemandeRdv | null>(null);
  const navigate = useNavigate();

  const clearDemandeParam = useCallback(() => {
    navigate({
      to: "/admin/planning",
      search: (prev: Record<string, unknown>) => {
        const { demande: _omit, ...rest } = prev ?? {};
        return rest;
      },
      replace: true,
    });
  }, [navigate]);

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

  const search = PlanningRoute.useSearch();
  useAutoOpenFromSearch<Row>(
    search.demande,
    rows,
    "id",
    (r) => setAssigning({ ...r, entreprise_nom: r.entreprises?.nom ?? null }),
    (r) => r.statut === "en_attente",
  );

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
                  disabled={r.statut !== "en_attente" && r.statut !== "confirmee"}
                  onClick={() => {
                    const withNom = { ...r, entreprise_nom: r.entreprises?.nom ?? null };
                    if (r.statut === "en_attente") setAssigning(withNom);
                    else if (r.statut === "confirmee") setCancelling(withNom);
                  }}
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
                        {(r.ville_intervention || r.code_postal_intervention) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            📍{" "}
                            {[r.code_postal_intervention, r.ville_intervention]
                              .filter(Boolean)
                              .join(" ")}
                          </p>
                        )}
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

      <AssignerRdvDialog
        open={!!assigning}
        onOpenChange={(o) => {
          if (!o) {
            setAssigning(null);
            clearDemandeParam();
          }
        }}
        demande={assigning}
        onAssigned={() => {
          setAssigning(null);
          clearDemandeParam();
          load();
        }}
      />

      <AnnulerRdvAdminDialog
        open={!!cancelling}
        onOpenChange={(o) => {
          if (!o) {
            setCancelling(null);
            clearDemandeParam();
          }
        }}
        demande={cancelling}
        onCancelled={() => {
          setCancelling(null);
          clearDemandeParam();
          load();
        }}
      />
    </div>
  );
}
