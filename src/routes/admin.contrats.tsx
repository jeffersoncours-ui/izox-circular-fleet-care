import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculerFactureFlotte, getPalier, getPackLabel } from "@/lib/pricing";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, StatTile } from "@/components/ui/page-header";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  FileText,
  Search,
  Eye,
  Pause,
  Sun,
  X,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  ResiliationContratDialog,
  type ResiliationContratInput,
} from "@/components/admin/ResiliationContratDialog";
import { GelContratDialog } from "@/components/admin/GelContratDialog";
import { ReactiverContratDialog } from "@/components/admin/ReactiverContratDialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/contrats")({
  component: ContratsPage,
});

interface ContratRow {
  id: string;
  numero_contrat: string | null;
  statut: string;
  passages_restants_mois: number;
  passages_reportes: number;
  engagement_annuel: boolean;
  entreprise: { id: string; nom: string } | null;
  lignes: Array<{ type_pack: string; nb_vehicules: number }>;
  vehiculesActifs: number;
  vehiculesEnAttente: number;
  mensualiteNetteHt: number;
  palier: string;
  gel_actif: boolean;
  gel_type: "programme" | "sinistre" | null;
  gel_date_debut: string | null;
  gel_date_fin: string | null;
  gel_commentaire: string | null;
  gel_notifier_client: boolean;
}


const PALIER_BADGE: Record<string, string> = {
  starter: "bg-muted text-muted-foreground",
  pro: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  business: "bg-primary/15 text-primary",
  premium: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
};

const PALIER_LABEL: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
  premium: "Premium",
};

const STATUT_LABEL: Record<string, string> = {
  actif: "Actif",
  en_cours_gel: "Gelé",
  resilie: "Résilié",
};

const STATUT_TONE: Record<string, string> = {
  actif: "bg-[#E7EFEA] text-[#1B4332] border-[#CBDDD2]",
  en_cours_gel: "bg-[#D5E2F6] text-[#2A6FDB] border-[#B3C8EF]",
  resilie: "bg-muted text-muted-foreground border-border",
};

function ContratsPage() {
  const location = useLocation();

  // Outlet pattern : si on est sur une sous-route, rendre l'Outlet
  if (location.pathname !== "/admin/contrats") {
    return <Outlet />;
  }

  return <ContratsList />;
}

function ContratsList() {
  const [rows, setRows] = useState<ContratRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statutFilter, setStatutFilter] = useState<string>("actif");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [resilTarget, setResilTarget] = useState<ResiliationContratInput | null>(null);
  const [gelDialogOpen, setGelDialogOpen] = useState(false);
  const [gelTarget, setGelTarget] = useState<ContratRow | null>(null);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [reactivateTarget, setReactivateTarget] = useState<ContratRow | null>(null);

  const openGel = (r: ContratRow) => {
    setGelTarget(r);
    setGelDialogOpen(true);
  };

  const openReactivate = (r: ContratRow) => {
    setReactivateTarget(r);
    setReactivateDialogOpen(true);
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = async () => {
    setLoading(true);

    const { data: contrats, error } = await supabase
      .from("contrats")
      .select(
        `
        id, numero_contrat, statut, passages_restants_mois, passages_reportes,
        engagement_annuel, entreprise_id,
        gel_actif, gel_type, gel_date_debut, gel_date_fin,
        gel_commentaire, gel_notifier_client,
        entreprise:entreprises ( id, nom ),
        lignes:contrat_lignes ( type_pack, nb_vehicules )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement des contrats");
      setLoading(false);
      return;
    }

    // Fetch vehicule counts grouped by entreprise
    const entrepriseIds = Array.from(
      new Set(
        (contrats ?? [])
          .map((c: any) => c.entreprise_id)
          .filter((x: string | null): x is string => !!x)
      )
    );

    const counts: Record<string, { actifs: number; enAttente: number }> = {};
    if (entrepriseIds.length > 0) {
      const { data: veh } = await supabase
        .from("vehicules")
        .select("entreprise_id, statut")
        .in("entreprise_id", entrepriseIds);
      for (const v of (veh as any[]) ?? []) {
        const e = v.entreprise_id as string;
        if (!counts[e]) counts[e] = { actifs: 0, enAttente: 0 };
        if (v.statut === "actif") counts[e].actifs++;
        else if (v.statut === "en_attente_validation") counts[e].enAttente++;
      }
    }

    const computed: ContratRow[] = (contrats ?? []).map((c: any) => {
      const lignes = (c.lignes ?? []) as Array<{
        type_pack: string;
        nb_vehicules: number;
      }>;
      const facture =
        lignes.length > 0
          ? calculerFactureFlotte({
              lignes: lignes.map((l) => ({
                typePack: l.type_pack,
                nbVehicules: l.nb_vehicules,
              })),
              engagementAnnuel: c.engagement_annuel,
            })
          : null;
      const totalVeh = lignes.reduce((s, l) => s + l.nb_vehicules, 0);
      const ent = c.entreprise_id as string | null;
      return {
        id: c.id,
        numero_contrat: c.numero_contrat,
        statut: c.statut,
        passages_restants_mois: c.passages_restants_mois,
        passages_reportes: c.passages_reportes,
        engagement_annuel: c.engagement_annuel,
        entreprise: c.entreprise,
        lignes,
        gel_actif: c.gel_actif ?? false,
        gel_type: c.gel_type ?? null,
        gel_date_debut: c.gel_date_debut ?? null,
        gel_date_fin: c.gel_date_fin ?? null,
        gel_commentaire: c.gel_commentaire ?? null,
        gel_notifier_client: c.gel_notifier_client ?? false,
        vehiculesActifs: ent ? counts[ent]?.actifs ?? 0 : 0,
        vehiculesEnAttente: ent ? counts[ent]?.enAttente ?? 0 : 0,
        mensualiteNetteHt: facture?.totalAbonnementHt ?? 0,
        palier: facture?.palier ?? getPalier(totalVeh),
      };
    });

    setRows(computed);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statutFilter !== "tous" && r.statut !== statutFilter) return false;
      if (
        debouncedSearch &&
        !(r.entreprise?.nom ?? "")
          .toLowerCase()
          .includes(debouncedSearch.toLowerCase())
      )
        return false;
      return true;
    });
  }, [rows, statutFilter, debouncedSearch]);

  const stats = useMemo(() => {
    const actifs = rows.filter((r) => r.statut === "actif");
    const mrr = actifs.reduce((s, r) => s + r.mensualiteNetteHt, 0);
    return {
      actifs: actifs.length,
      mrr,
      gel: rows.filter((r) => r.statut === "en_cours_gel").length,
      resilies: rows.filter((r) => r.statut === "resilie").length,
    };
  }, [rows]);

  const statutFilters: { key: string; label: string }[] = [
    { key: "tous", label: `Tous · ${rows.length}` },
    { key: "actif", label: `Actifs · ${stats.actifs}` },
    { key: "en_cours_gel", label: `Gelés · ${stats.gel}` },
    { key: "resilie", label: `Résiliés · ${stats.resilies}` },
  ];

  const handlePlaceholder = (label: string) => {
    toast.info(`${label} — bientôt disponible.`);
  };

  const openResil = (r: ContratRow) => {
    setResilTarget({
      id: r.id,
      numero_contrat: r.numero_contrat,
      entreprise_id: r.entreprise?.id ?? "",
      entreprise_nom: r.entreprise?.nom ?? null,
      engagement_annuel: r.engagement_annuel,
      lignes: r.lignes,
    });
  };

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        crumbs={["Admin", "Contrats"]}
        title="Contrats"
        sub={`${rows.length} contrat${rows.length > 1 ? "s" : ""} suivi${rows.length > 1 ? "s" : ""}`}
        right={
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handlePlaceholder("Clôture mensuelle")}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Clôture mensuelle</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clôture mensuelle des passages</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      />

      <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <StatTile label="Contrats actifs" value={stats.actifs} />
          <StatTile
            label="MRR contrats"
            value={stats.mrr.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
            suffix="€"
            sub="net HT / mois"
            accent="var(--color-primary)"
          />
          <StatTile label="En gel" value={stats.gel} accent="#2A6FDB" />
          <StatTile label="Résiliés" value={stats.resilies} accent="#C7811E" />
        </div>

        {/* Search + filter pills */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom d'entreprise…"
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {statutFilters.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatutFilter(key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors",
                  statutFilter === key
                    ? "bg-primary text-white border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <Card className="p-4 shadow-card border-border/60">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </Card>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center shadow-card">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {rows.length === 0
                ? "Aucun contrat pour le moment. Les contrats sont créés automatiquement à l'ajout du premier véhicule depuis la fiche client."
                : "Aucun résultat."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block bg-card border border-border rounded-lg overflow-hidden shadow-card">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {[
                      "Entreprise",
                      "Packs",
                      "Véh. actifs",
                      "Palier",
                      "Mensualité nette HT",
                      "Passages restants",
                      "Statut",
                      "Actions",
                    ].map((h, i) => (
                      <th
                        key={h}
                        className={cn(
                          "px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground",
                          i === 2 || i === 4 || i === 5 || i === 7
                            ? "text-right"
                            : "text-left"
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-t border-border/60 hover:bg-muted/30 transition-colors",
                        idx === 0 && "border-t-0"
                      )}
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-foreground">{r.entreprise?.nom ?? "—"}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {r.numero_contrat ?? "Sans numéro"}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {r.vehiculesEnAttente > 0 && (
                            <Badge variant="destructive" className="text-[10px]">
                              {r.vehiculesEnAttente} véh. en attente
                            </Badge>
                          )}
                          {r.passages_reportes > 0 && (
                            <Badge className="text-[10px] bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                              {r.passages_reportes} passage(s) reporté(s)
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {r.lignes
                          .map(
                            (l) =>
                              `${getPackLabel(l.type_pack)} ×${l.nb_vehicules}`
                          )
                          .join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {r.vehiculesActifs}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge className={cn(PALIER_BADGE[r.palier])}>
                          {PALIER_LABEL[r.palier]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-semibold">
                        {r.mensualiteNetteHt.toFixed(2)} €
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {r.passages_restants_mois}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                            STATUT_TONE[r.statut] ?? STATUT_TONE.resilie
                          )}
                        >
                          {STATUT_LABEL[r.statut] ?? r.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  asChild
                                >
                                  <Link to="/admin/contrats/$id" params={{ id: r.id }}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Voir / Modifier</TooltipContent>
                            </Tooltip>
                            {r.statut === "actif" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => openGel(r)}>
                                    <Pause className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Mettre en veille</TooltipContent>
                              </Tooltip>
                            )}
                            {r.statut === "en_cours_gel" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => openReactivate(r)}>
                                    <Sun className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Réactiver le contrat</TooltipContent>
                              </Tooltip>
                            )}
                            {r.statut !== "actif" && r.statut !== "en_cours_gel" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span tabIndex={0}>
                                    <Button variant="ghost" size="icon" disabled>
                                      <Pause className="h-4 w-4" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {r.statut === "resilie" ? "Contrat clôturé" : "Action indisponible"}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => openResil(r)}
                                  disabled={r.statut === "resilie"}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Résilier</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          {/* Mobile cards */}
          <div className="lg:hidden grid gap-3">
            {filtered.map((r) => (
              <Card key={r.id} className="p-4 shadow-card border-border/60">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{r.entreprise?.nom ?? "—"}</h3>
                    <p className="text-xs text-muted-foreground">
                      {r.numero_contrat ?? "Sans numéro"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0",
                      STATUT_TONE[r.statut] ?? STATUT_TONE.resilie
                    )}
                  >
                    {STATUT_LABEL[r.statut] ?? r.statut}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {r.lignes
                    .map(
                      (l) =>
                        `${getPackLabel(l.type_pack)} ×${l.nb_vehicules}`
                    )
                    .join(", ") || "—"}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Véh. actifs</p>
                    <p className="font-medium">{r.vehiculesActifs}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Palier</p>
                    <Badge className={cn("mt-0.5", PALIER_BADGE[r.palier])}>
                      {PALIER_LABEL[r.palier]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mensualité HT</p>
                    <p className="font-semibold">{r.mensualiteNetteHt.toFixed(2)} €</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Passages restants</p>
                    <p className="font-medium">{r.passages_restants_mois}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {r.vehiculesEnAttente > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {r.vehiculesEnAttente} véh. en attente
                    </Badge>
                  )}
                  {r.passages_reportes > 0 && (
                    <Badge className="text-[10px] bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                      {r.passages_reportes} reporté(s)
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2 border-t pt-3">
                  <Button variant="outline" size="sm" asChild className="h-8 px-3 text-xs">
                    <Link to="/admin/contrats/$id" params={{ id: r.id }}>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Voir
                    </Link>
                  </Button>
                  {r.statut === "actif" && (
                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => openGel(r)}>
                      <Pause className="h-3.5 w-3.5 mr-1" />
                      Geler
                    </Button>
                  )}
                  {r.statut === "en_cours_gel" && (
                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => openReactivate(r)}>
                      <Sun className="h-3.5 w-3.5 mr-1" />
                      Réactiver
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => openResil(r)}
                    disabled={r.statut === "resilie"}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Résilier
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
        )}
      </div>
      <ResiliationContratDialog
        open={!!resilTarget}
        onOpenChange={(o) => !o && setResilTarget(null)}
        contrat={resilTarget}
        onResiliated={() => {
          setResilTarget(null);
          load();
        }}
      />

      <GelContratDialog
        open={gelDialogOpen}
        onOpenChange={setGelDialogOpen}
        contrat={
          gelTarget
            ? {
                id: gelTarget.id,
                numero_contrat: gelTarget.numero_contrat,
                raison_sociale_client: gelTarget.entreprise?.nom ?? "Client inconnu",
              }
            : null
        }
        onGeled={() => {
          setGelTarget(null);
          load();
        }}
      />

      <ReactiverContratDialog
        open={reactivateDialogOpen}
        onOpenChange={setReactivateDialogOpen}
        contrat={
          reactivateTarget
            ? {
                id: reactivateTarget.id,
                numero_contrat: reactivateTarget.numero_contrat,
                raison_sociale_client: reactivateTarget.entreprise?.nom ?? "Client inconnu",
                gel_date_debut: reactivateTarget.gel_date_debut,
                gel_date_fin: reactivateTarget.gel_date_fin,
                gel_commentaire: reactivateTarget.gel_commentaire,
              }
            : null
        }
        onReactivated={() => {
          setReactivateTarget(null);
          load();
        }}
      />
    </div>
  );
}
