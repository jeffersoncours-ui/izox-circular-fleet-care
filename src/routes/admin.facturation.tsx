import { useState, useEffect, useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { PageHeader, StatTile } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Facture,
  FactureLigne,
  FACTURE_SELECT,
  STATUT_FACTURE,
  StatutFacture,
  formatEuro,
  formatPeriode,
  formatDateFr,
} from "@/lib/factures";
import { FactureDocument } from "@/components/factures/FactureDocument";
import {
  Receipt,
  FileText,
  ChevronRight,
  Plus,
  CheckCircle,
  Send,
  Loader2,
  Printer,
  Trash2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/admin/facturation")({
  component: AdminFacturationPage,
});

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

type FactureListItem = {
  id: string;
  numero_facture: string | null;
  statut: StatutFacture;
  periode_debut: string;
  periode_fin: string;
  date_emission: string | null;
  montant_ttc: number;
  snapshot_client: Record<string, unknown> | null;
  entreprise_id: string | null;
  contrat_id: string | null;
  created_at: string;
};

type ContratActif = {
  id: string;
  numero_contrat: string;
  entreprise_nom: string;
};

type GenResult = {
  contrat_id: string;
  numero_contrat: string;
  entreprise_nom: string;
  result: "created" | "empty" | "error";
  error?: string;
};

const STATUT_PILLS: { key: StatutFacture | "tous"; label: string }[] = [
  { key: "tous", label: "Toutes" },
  { key: "brouillon", label: "Brouillons" },
  { key: "emise", label: "À régler" },
  { key: "payee", label: "Payées" },
  { key: "annulee", label: "Annulées" },
];

function AdminFacturationPage() {
  const [factures, setFactures] = useState<FactureListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statutFilter, setStatutFilter] = useState<StatutFacture | "tous">("tous");
  const [search, setSearch] = useState("");
  const [selectedFacture, setSelectedFacture] = useState<Facture | null>(null);
  const [selectedLignes, setSelectedLignes] = useState<FactureLigne[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [clotureOpen, setClotureOpen] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("factures")
      .select(
        "id, numero_facture, statut, periode_debut, periode_fin, date_emission, montant_ttc, snapshot_client, entreprise_id, contrat_id, created_at"
      )
      .order("date_emission", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    setFactures((data as unknown as FactureListItem[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = factures;
    if (statutFilter !== "tous") list = list.filter((f) => f.statut === statutFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) => {
        const nom = String(f.snapshot_client?.raison_sociale ?? "").toLowerCase();
        const num = (f.numero_facture ?? "").toLowerCase();
        return nom.includes(q) || num.includes(q);
      });
    }
    return list;
  }, [factures, statutFilter, search]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return {
      brouillons: factures.filter((f) => f.statut === "brouillon").length,
      emises: factures.filter((f) => f.statut === "emise").length,
      payees: factures.filter((f) => f.statut === "payee").length,
      caMois: factures
        .filter(
          (f) =>
            ["emise", "payee"].includes(f.statut) &&
            f.periode_debut.startsWith(thisMonth)
        )
        .reduce((s, f) => s + f.montant_ttc, 0),
    };
  }, [factures]);

  const openDetail = async (id: string) => {
    setLoadingDetail(true);
    setSelectedFacture(null);
    const [{ data: f }, { data: l }] = await Promise.all([
      supabase.from("factures").select(FACTURE_SELECT).eq("id", id).maybeSingle(),
      supabase
        .from("factures_lignes")
        .select(
          "id, ordre_affichage, type_ligne, libelle, quantite, prix_unitaire_ht, montant_ht, tva_taux"
        )
        .eq("facture_id", id)
        .order("ordre_affichage", { ascending: true }),
    ]);
    setSelectedFacture((f as unknown as Facture) ?? null);
    setSelectedLignes((l as FactureLigne[]) ?? []);
    setLoadingDetail(false);
  };

  const handleEmettre = async (factureId: string) => {
    setActingId(factureId);
    const { data, error } = await supabase.rpc("emettre_facture", {
      p_facture_id: factureId,
    });
    if (error) {
      toast.error("Erreur lors de l'émission", { description: error.message });
    } else {
      toast.success(`Facture émise : ${data}`);
      await load();
    }
    setActingId(null);
  };

  const handleMarquerPayee = async (factureId: string) => {
    setActingId(factureId);
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("factures")
      .update({ statut: "payee", date_paiement: today })
      .eq("id", factureId)
      .eq("statut", "emise");
    if (error) {
      toast.error("Erreur", { description: error.message });
    } else {
      toast.success("Facture marquée comme payée");
      await load();
    }
    setActingId(null);
  };

  const handleSupprimerBrouillon = async (factureId: string) => {
    setActingId(factureId);
    const { error } = await supabase
      .from("factures")
      .delete()
      .eq("id", factureId)
      .eq("statut", "brouillon");
    if (error) {
      toast.error("Erreur", { description: error.message });
    } else {
      toast.success("Brouillon supprimé");
      setFactures((prev) => prev.filter((f) => f.id !== factureId));
    }
    setActingId(null);
  };

  return (
    <RoleGuard allowed={["admin"]}>
      <div className="flex flex-col min-h-full">
        <PageHeader
          crumbs={["Admin", "Facturation"]}
          title="Facturation"
          sub="Génération et suivi des factures clients"
          right={
            <Button variant="izox" size="sm" onClick={() => setClotureOpen(true)}>
              <Plus className="h-4 w-4" />
              Clôture mensuelle
            </Button>
          }
        />

        <div className="p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile
              label="Brouillons"
              value={stats.brouillons}
              icon={<FileText className="h-4 w-4" />}
              accent="var(--muted-foreground)"
            />
            <StatTile
              label="À régler"
              value={stats.emises}
              icon={<Send className="h-4 w-4" />}
              accent="var(--warning)"
            />
            <StatTile
              label="Payées"
              value={stats.payees}
              icon={<CheckCircle className="h-4 w-4" />}
              accent="var(--success)"
            />
            <StatTile
              label="CA ce mois"
              value={formatEuro(stats.caMois)}
              icon={<TrendingUp className="h-4 w-4" />}
              accent="var(--primary)"
            />
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap items-center gap-2">
            {STATUT_PILLS.map((p) => (
              <button
                key={p.key}
                onClick={() => setStatutFilter(p.key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                  statutFilter === p.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                )}
              >
                {p.label}
              </button>
            ))}
            <input
              type="search"
              placeholder="Client ou n° facture…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ml-auto text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-52"
            />
          </div>

          {/* Liste */}
          <Card className="shadow-card border-border/60 overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Receipt className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {factures.length === 0
                    ? "Aucune facture. Lancez une clôture mensuelle pour démarrer."
                    : "Aucune facture ne correspond aux filtres."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {filtered.map((f) => (
                  <FactureRow
                    key={f.id}
                    facture={f}
                    isActing={actingId === f.id}
                    onView={() => openDetail(f.id)}
                    onEmettre={() => handleEmettre(f.id)}
                    onMarquerPayee={() => handleMarquerPayee(f.id)}
                    onDelete={() => handleSupprimerBrouillon(f.id)}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Dialog clôture mensuelle */}
        <ClotureDialog
          open={clotureOpen}
          onOpenChange={setClotureOpen}
          onDone={load}
        />

        {/* Dialog détail / impression */}
        <Dialog
          open={loadingDetail || !!selectedFacture}
          onOpenChange={(o) => {
            if (!o) {
              setSelectedFacture(null);
              setSelectedLignes([]);
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="no-print">
              <DialogTitle className="flex items-center justify-between gap-3 pr-6">
                <span>{selectedFacture?.numero_facture ?? "Facture"}</span>
                {selectedFacture && (
                  <Button variant="izox" size="sm" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />
                    Imprimer / PDF
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            {loadingDetail || !selectedFacture ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <FactureDocument facture={selectedFacture} lignes={selectedLignes} />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}

function FactureRow({
  facture,
  isActing,
  onView,
  onEmettre,
  onMarquerPayee,
  onDelete,
}: {
  facture: FactureListItem;
  isActing: boolean;
  onView: () => void;
  onEmettre: () => void;
  onMarquerPayee: () => void;
  onDelete: () => void;
}) {
  const statut = STATUT_FACTURE[facture.statut];
  const clientNom = String(facture.snapshot_client?.raison_sociale ?? "—");

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/20 transition-colors">
      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>
      <button onClick={onView} className="min-w-0 flex-1 text-left group">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
            {facture.numero_facture ?? "Brouillon"}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0",
              statut.badge
            )}
          >
            {statut.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {clientNom} · {formatPeriode(facture.periode_debut, facture.periode_fin)}
          {facture.date_emission && (
            <> · émise le {formatDateFr(facture.date_emission)}</>
          )}
        </p>
      </button>
      <p className="font-mono font-semibold text-sm text-foreground tabular-nums shrink-0">
        {formatEuro(facture.montant_ttc)}
      </p>
      <div className="flex items-center gap-1 shrink-0">
        {isActing ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-2" />
        ) : (
          <>
            {facture.statut === "brouillon" && (
              <>
                <Button
                  size="sm"
                  variant="izox"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEmettre();
                  }}
                  className="h-7 px-2.5 text-xs gap-1"
                >
                  <Send className="h-3 w-3" />
                  Émettre
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="h-7 w-7 text-destructive/50 hover:text-destructive hover:bg-destructive-soft"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {facture.statut === "emise" && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarquerPayee();
                }}
                className="h-7 px-2.5 text-xs gap-1 text-success border-success/30 hover:bg-success-soft"
              >
                <CheckCircle className="h-3 w-3" />
                Payée
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={onView}
              className="h-7 w-7 text-muted-foreground/40 hover:text-muted-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function ClotureDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const now = new Date();
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [contrats, setContrats] = useState<ContratActif[]>([]);
  const [loadingContrats, setLoadingContrats] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GenResult[] | null>(null);

  useEffect(() => {
    if (!open) {
      setResults(null);
      return;
    }
    const loadContrats = async () => {
      setLoadingContrats(true);
      const { data } = await supabase
        .from("contrats")
        .select("id, numero_contrat, entreprises!inner(nom)")
        .in("statut", ["actif", "en_cours_gel"])
        .order("entreprise_id");
      setContrats(
        (data ?? []).map((c: any) => ({
          id: c.id,
          numero_contrat: c.numero_contrat,
          entreprise_nom: c.entreprises?.nom ?? "—",
        }))
      );
      setLoadingContrats(false);
    };
    loadContrats();
  }, [open]);

  const handleGenerate = async () => {
    setGenerating(true);
    const res: GenResult[] = [];
    for (const c of contrats) {
      const { data, error } = await supabase.rpc("generer_facture", {
        p_contrat_id: c.id,
        p_mois: mois,
        p_annee: annee,
      });
      if (error) {
        res.push({ contrat_id: c.id, numero_contrat: c.numero_contrat, entreprise_nom: c.entreprise_nom, result: "error", error: error.message });
      } else if (data === null) {
        res.push({ contrat_id: c.id, numero_contrat: c.numero_contrat, entreprise_nom: c.entreprise_nom, result: "empty" });
      } else {
        res.push({ contrat_id: c.id, numero_contrat: c.numero_contrat, entreprise_nom: c.entreprise_nom, result: "created" });
      }
    }
    setResults(res);
    setGenerating(false);
    const created = res.filter((r) => r.result === "created").length;
    if (created > 0) {
      toast.success(
        `${created} brouillon${created > 1 ? "s" : ""} généré${created > 1 ? "s" : ""} · ${MOIS[mois - 1]} ${annee}`
      );
      onDone();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Clôture mensuelle</DialogTitle>
          <DialogDescription>
            Génère un brouillon de facture pour chaque contrat actif. L'opération est idempotente — elle ne crée pas de doublon si la facture existe déjà.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Mois
              </label>
              <select
                value={mois}
                onChange={(e) => setMois(Number(e.target.value))}
                disabled={!!results || generating}
                className="w-full border border-border rounded-md px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              >
                {MOIS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Année
              </label>
              <input
                type="number"
                value={annee}
                onChange={(e) => setAnnee(Number(e.target.value))}
                min={2026}
                max={2099}
                disabled={!!results || generating}
                className="w-full border border-border rounded-md px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              />
            </div>
          </div>

          {results ? (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {results.map((r) => (
                <div
                  key={r.contrat_id}
                  className="flex items-center gap-2 text-sm py-1.5 px-2.5 rounded-md bg-muted/30"
                >
                  {r.result === "created" && (
                    <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                  )}
                  {r.result === "empty" && (
                    <FileText className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                  )}
                  {r.result === "error" && (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  )}
                  <span className="truncate font-medium">{r.entreprise_nom}</span>
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">
                    {r.numero_contrat}
                  </span>
                  <span
                    className={cn(
                      "text-xs shrink-0",
                      r.result === "created" && "text-success",
                      r.result === "empty" && "text-muted-foreground/50",
                      r.result === "error" && "text-destructive"
                    )}
                  >
                    {r.result === "created" && "Créé"}
                    {r.result === "empty" && "Aucune prestation"}
                    {r.result === "error" && "Erreur"}
                  </span>
                </div>
              ))}
            </div>
          ) : loadingContrats ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : contrats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun contrat actif à facturer.
            </p>
          ) : (
            <div className="space-y-1 max-h-56 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {contrats.length} contrat{contrats.length > 1 ? "s" : ""} actif
                {contrats.length > 1 ? "s" : ""} :
              </p>
              {contrats.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between text-sm py-1.5 px-2.5 rounded-md bg-muted/30"
                >
                  <span className="font-medium">{c.entreprise_nom}</span>
                  <span className="text-xs text-muted-foreground">{c.numero_contrat}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {results ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={generating}
              >
                Annuler
              </Button>
              <Button
                variant="izox"
                onClick={handleGenerate}
                disabled={generating || contrats.length === 0 || loadingContrats}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Receipt className="h-4 w-4" />
                )}
                Générer · {MOIS[mois - 1]} {annee}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
