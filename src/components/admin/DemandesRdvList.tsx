import { lazy, Suspense, useState, useCallback } from "react";
import { Loader2, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useNavigate } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { type AdminDemandeRdv } from "@/components/admin/demande-rdv-types";
import { AssignerRdvDialog } from "@/components/admin/AssignerRdvDialog";
import { GererRdvConfirmeDialog } from "@/components/admin/GererRdvConfirmeDialog";
import {
  AssignerReservationB2CDialog,
  type ReservationB2C,
} from "@/components/admin/AssignerReservationB2CDialog";
import { useAutoOpenFromSearch } from "@/hooks/useAutoOpenFromSearch";
import { useSupabaseQuery } from "@/lib/hooks/useSupabaseQuery";
import { Route as PlanningRoute } from "@/routes/admin.planning";

// Leaflet is browser-only — lazy-import to prevent SSR issues
const DemandesRdvMap = lazy(() =>
  import("@/components/admin/DemandesRdvMap").then((m) => ({ default: m.DemandesRdvMap })),
);

interface Row extends AdminDemandeRdv {
  entreprises?: { nom: string } | null;
}

const STATUTS = ["en_attente", "confirmee", "refusee", "annulee_client", "annulee_admin"] as const;

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
  annulee_client: "bg-gray-50 text-gray-600 border-gray-300",
  annulee_admin: "bg-gray-50 text-gray-600 border-gray-300",
};

const PILL_CONFIG = [
  { key: "all", label: "Toutes", base: "bg-muted text-foreground", active: "bg-foreground text-background" },
  { key: "en_attente", label: "En attente", base: "bg-orange-50 text-orange-700 border border-orange-200", active: "bg-orange-600 text-white" },
  { key: "confirmee", label: "Confirmées", base: "bg-green-50 text-green-700 border border-green-200", active: "bg-[#1B4332] text-white" },
  { key: "refusee", label: "Refusées", base: "bg-red-50 text-red-700 border border-red-200", active: "bg-red-600 text-white" },
  { key: "annulee_client", label: "Ann. client", base: "bg-gray-50 text-gray-600 border border-gray-200", active: "bg-gray-500 text-white" },
  { key: "annulee_admin", label: "Ann. IZOX", base: "bg-gray-50 text-gray-600 border border-gray-200", active: "bg-gray-500 text-white" },
] as const;

// ---------- B2C sub-list ----------

const B2C_STATUT_LABEL: Record<string, string> = {
  en_attente_paiement: "En attente",
  confirmee: "Confirmée",
  annulee: "Annulée",
};

const B2C_STATUT_COLOR: Record<string, string> = {
  en_attente_paiement: "bg-orange-50 text-orange-700 border-orange-300",
  confirmee: "bg-green-50 text-green-700 border-green-300",
  annulee: "bg-gray-50 text-gray-600 border-gray-300",
};

const B2C_PILL_CONFIG = [
  { key: "all", label: "Toutes", base: "bg-muted text-foreground", active: "bg-foreground text-background" },
  { key: "en_attente_paiement", label: "En attente", base: "bg-orange-50 text-orange-700 border border-orange-200", active: "bg-orange-600 text-white" },
  { key: "confirmee", label: "Confirmées", base: "bg-green-50 text-green-700 border border-green-200", active: "bg-[#1B4332] text-white" },
  { key: "annulee", label: "Annulées", base: "bg-gray-50 text-gray-600 border border-gray-200", active: "bg-gray-500 text-white" },
] as const;

function B2CReservationsList() {
  const [filter, setFilter] = useState<string>("en_attente_paiement");
  const [managing, setManaging] = useState<ReservationB2C | null>(null);

  const { data: rows, loading, refetch } = useSupabaseQuery<ReservationB2C[]>(
    async () =>
      await supabase
        .from("reservations_b2c")
        .select("*")
        .order("created_at", { ascending: false }),
    { defaultValue: [] },
  );

  const filtered = filter === "all" ? rows : rows.filter((r) => r.statut === filter);
  const counts: Record<string, number> = { all: rows.length };
  ["en_attente_paiement", "confirmee", "annulee"].forEach((s) => {
    counts[s] = rows.filter((r) => r.statut === s).length;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap pb-4">
        {B2C_PILL_CONFIG.map((p) => {
          const isActive = filter === p.key;
          const count = counts[p.key] ?? 0;
          return (
            <button
              key={p.key}
              onClick={() => setFilter(p.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive ? p.active : p.base + " hover:opacity-80"
              }`}
            >
              {p.label}
              <span className={`text-[10px] font-mono ${isActive ? "opacity-80" : "opacity-60"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden" style={{ minHeight: 200 }}>
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Aucune réservation B2C.</p>
            </div>
          ) : (
            <ul>
              {filtered.map((r, i) => {
                const creneaux = Array.isArray(r.creneaux_preferes)
                  ? (r.creneaux_preferes as Array<{ date: string; heure: string }>)
                  : [];
                const isClickable = r.statut === "en_attente_paiement";
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      disabled={!isClickable}
                      onClick={() => isClickable && setManaging(r)}
                      className={`w-full text-left px-4 py-3 transition-colors border-l-[3px] ${
                        i > 0 ? "border-t border-border" : ""
                      } border-l-transparent hover:bg-muted/30 ${!isClickable ? "cursor-default" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-sm leading-tight">
                              {r.prenom} {r.nom}
                            </p>
                            <Badge variant="outline" className="text-[10px] py-0 capitalize">
                              {r.vehicule}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] py-0 bg-blue-50 text-blue-700 border-blue-200">
                              B2C
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {r.montant_ttc} € TTC · {creneaux.length} créneau{creneaux.length > 1 ? "x" : ""}
                            {creneaux[0]?.date && (
                              <>
                                {" "}· 1er : {format(parseISO(creneaux[0].date), "dd/MM/yyyy")}{" "}
                                {creneaux[0].heure.replace(":", "h")}
                              </>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {r.code_postal} {r.ville}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] flex-shrink-0 ${B2C_STATUT_COLOR[r.statut] ?? ""}`}
                        >
                          {B2C_STATUT_LABEL[r.statut] ?? r.statut}
                        </Badge>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <AssignerReservationB2CDialog
        open={!!managing}
        onOpenChange={(o) => { if (!o) setManaging(null); }}
        reservation={managing}
        onConfirmed={() => {
          setManaging(null);
          refetch();
        }}
      />
    </div>
  );
}

// ---------- main component ----------

export function DemandesRdvList() {
  const [source, setSource] = useState<"b2b" | "b2c">("b2b");
  const [filter, setFilter] = useState<string>("en_attente");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<AdminDemandeRdv | null>(null);
  const [managing, setManaging] = useState<AdminDemandeRdv | null>(null);
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

  const { data: rows, loading, refetch } = useSupabaseQuery<Row[]>(
    async () =>
      await supabase
        .from("demandes_rdv")
        .select("*, entreprises(nom)")
        .order("created_at", { ascending: false }),
    { defaultValue: [] }
  );

  const search = PlanningRoute.useSearch();
  useAutoOpenFromSearch<Row>(
    search.demande,
    rows,
    "id",
    (r) => setAssigning({ ...r, entreprise_nom: r.entreprises?.nom ?? null }),
    (r) => r.statut === "en_attente",
  );
  useAutoOpenFromSearch<Row>(
    search.demande,
    rows,
    "id",
    (r) => setManaging({ ...r, entreprise_nom: r.entreprises?.nom ?? null }),
    (r) => r.statut === "confirmee",
  );

  const filtered = filter === "all" ? rows : rows.filter((r) => r.statut === filter);
  const counts: Record<string, number> = { all: rows.length };
  STATUTS.forEach((s) => {
    counts[s] = rows.filter((r) => r.statut === s).length;
  });

  const mapRows = filtered.map((r) => ({
    ...r,
    entreprise_nom: r.entreprises?.nom ?? null,
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Source toggle B2B / B2C */}
      <div className="flex items-center gap-1 mb-4 p-1 rounded-lg bg-muted/40 w-fit">
        {(["b2b", "b2c"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              source === s
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {source === "b2c" ? (
        <B2CReservationsList />
      ) : (
        <>
          {/* B2B filter pills */}
          <div className="flex items-center gap-2 flex-wrap pb-4">
            {PILL_CONFIG.map((p) => {
              const isActive = filter === p.key;
              const count = counts[p.key] ?? 0;
              return (
                <button
                  key={p.key}
                  onClick={() => setFilter(p.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    isActive ? p.active : p.base + " hover:opacity-80"
                  }`}
                >
                  {p.label}
                  <span className={`text-[10px] font-mono ${isActive ? "opacity-80" : "opacity-60"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            /* Split view: 40% list + 60% map */
            <div className="flex overflow-hidden rounded-lg border border-border shadow-card" style={{ height: "520px" }}>
              {/* List — 40% */}
              <div className="flex flex-col w-[40%] flex-shrink-0 border-r border-border overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
                      <p className="text-sm text-muted-foreground">Aucune demande.</p>
                    </div>
                  ) : (
                    <ul>
                      {filtered.map((r, i) => {
                        const creneaux: Array<{ date: string; plage: string }> = Array.isArray(
                          r.creneaux_preferes,
                        )
                          ? r.creneaux_preferes
                          : [];
                        const isActive = hoveredId === r.id;
                        const isClickable = r.statut === "en_attente" || r.statut === "confirmee";
                        return (
                          <li key={r.id}>
                            <button
                              type="button"
                              disabled={!isClickable}
                              onMouseEnter={() => setHoveredId(r.id)}
                              onMouseLeave={() => setHoveredId(null)}
                              onClick={() => {
                                if (!isClickable) return;
                                const withNom = {
                                  ...r,
                                  entreprise_nom: r.entreprises?.nom ?? null,
                                };
                                if (r.statut === "en_attente") setAssigning(withNom);
                                else if (r.statut === "confirmee") setManaging(withNom);
                              }}
                              className={`w-full text-left px-4 py-3 transition-colors border-l-[3px] ${
                                i > 0 ? "border-t border-border" : ""
                              } ${
                                isActive
                                  ? "bg-primary/5 border-l-primary"
                                  : "border-l-transparent hover:bg-muted/30"
                              } ${!isClickable ? "cursor-default" : ""}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <p className="font-semibold text-sm leading-tight">
                                      {r.entreprises?.nom ?? "—"}
                                    </p>
                                    <Badge variant="outline" className="text-[10px] py-0">
                                      {r.nb_vehicules_rdv} véh.
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {creneaux.length} créneau{creneaux.length > 1 ? "x" : ""} proposé
                                    {creneaux.length > 1 ? "s" : ""}
                                    {creneaux[0]?.date && (
                                      <>
                                        {" "}· 1er :{" "}
                                        {format(parseISO(creneaux[0].date), "dd/MM/yyyy")}{" "}
                                        {creneaux[0].plage}
                                      </>
                                    )}
                                  </p>
                                  {(r.ville_intervention || r.code_postal_intervention) && (
                                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                      <MapPin className="h-3 w-3 flex-shrink-0" />
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
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] flex-shrink-0 ${STATUT_COLOR[r.statut] ?? ""}`}
                                >
                                  {STATUT_LABEL[r.statut] ?? r.statut}
                                </Badge>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                {/* List footer */}
                <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {filtered.length} demande{filtered.length > 1 ? "s" : ""}
                  </span>
                  {hoveredId && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Survolé · voir pin carte →
                    </span>
                  )}
                </div>
              </div>

              {/* Map — 60% : isolation:isolate confine les z-indexes Leaflet (600-800) pour ne pas transpercer le Dialog (z-50) */}
              <div className="flex-1 relative overflow-hidden" style={{ isolation: "isolate" }}>
                <Suspense
                  fallback={
                    <div className="w-full h-full flex items-center justify-center bg-muted/10">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  }
                >
                  <DemandesRdvMap rows={mapRows} hoveredId={hoveredId} />
                </Suspense>
              </div>
            </div>
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
              refetch();
            }}
          />

          <GererRdvConfirmeDialog
            open={!!managing}
            onOpenChange={(o) => {
              if (!o) {
                setManaging(null);
                clearDemandeParam();
              }
            }}
            demande={managing}
            onUpdated={() => {
              setManaging(null);
              clearDemandeParam();
              refetch();
            }}
          />
        </>
      )}
    </div>
  );
}
