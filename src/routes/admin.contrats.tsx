import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculerFactureFlotte, getPalier } from "@/lib/pricing";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Search,
  Eye,
  Pause,
  X,
  Calendar as CalendarIcon,
} from "lucide-react";
import { CreateContratDialog } from "@/components/admin/CreateContratDialog";
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
}

const PACK_LABELS: Record<string, string> = {
  pack_interieur: "Pack Intérieur",
  pack_standard: "Pack Standard",
  pack_vtc: "Pack VTC",
};

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
  const [statutFilter, setStatutFilter] = useState<string>("tous");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

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

  const handlePlaceholder = (label: string) => {
    toast.info(`${label} — bientôt disponible.`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contrats</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rows.length} contrat{rows.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePlaceholder("Clôture mensuelle")}
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Clôture mensuelle</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clôture mensuelle des passages</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="izox" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouveau contrat
          </Button>
        </div>
      </header>

      {/* Filtres */}
      <Card className="p-4 mb-6 shadow-card border-border/60">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom d'entreprise..."
              className="pl-10"
            />
          </div>
          <Select value={statutFilter} onValueChange={setStatutFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les statuts</SelectItem>
              <SelectItem value="actif">Actif</SelectItem>
              <SelectItem value="en_cours_gel">Gelé</SelectItem>
              <SelectItem value="resilie">Résilié</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <Card className="p-4 shadow-card border-border/60">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center shadow-card border-border/60">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {rows.length === 0
              ? "Aucun contrat pour le moment. Cliquez sur Nouveau contrat pour créer le premier contrat."
              : "Aucun résultat."}
          </p>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden lg:block shadow-card border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Packs</TableHead>
                  <TableHead className="text-right">Véh. actifs</TableHead>
                  <TableHead>Palier</TableHead>
                  <TableHead className="text-right">Mensualité nette HT</TableHead>
                  <TableHead className="text-right">Passages restants</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.entreprise?.nom ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
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
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.lignes
                        .map(
                          (l) =>
                            `${PACK_LABELS[l.type_pack] ?? l.type_pack} ×${l.nb_vehicules}`
                        )
                        .join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.vehiculesActifs}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(PALIER_BADGE[r.palier])}>
                        {PALIER_LABEL[r.palier]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {r.mensualiteNetteHt.toFixed(2)} €
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.passages_restants_mois}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.statut === "actif" ? "default" : "secondary"}>
                        {STATUT_LABEL[r.statut] ?? r.statut}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePlaceholder("Modification du contrat")}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Voir / Modifier</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button variant="ghost" size="icon" disabled>
                                  <Pause className="h-4 w-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Bientôt disponible</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handlePlaceholder("Résiliation")}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Résilier</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

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
                  <Badge variant={r.statut === "actif" ? "default" : "secondary"}>
                    {STATUT_LABEL[r.statut] ?? r.statut}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {r.lignes
                    .map(
                      (l) =>
                        `${PACK_LABELS[l.type_pack] ?? l.type_pack} ×${l.nb_vehicules}`
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
                <div className="flex justify-end gap-1 border-t pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlaceholder("Modification du contrat")}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" disabled>
                    <Pause className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handlePlaceholder("Résiliation")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <CreateContratDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={load}
      />
    </div>
  );
}
