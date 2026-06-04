import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Edit2, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/lib/auth-context";
import {
  fetchImpactCoefficients,
  fetchEstimatedRecords,
  validateRecordsByIntervention,
  CATEGORY_META,
  type ImpactCoefficient,
  type ImpactRecord,
} from "@/lib/impact";
import { ImpactCoefficientDialog } from "@/components/admin/ImpactCoefficientDialog";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export const Route = createFileRoute("/admin/impact")({
  component: AdminImpactPage,
});

function AdminImpactPage() {
  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        crumbs={["Admin", "Impact RSE"]}
        title="Impact RSE"
        sub="Barème de calcul et validation des interventions éco-responsables"
      />

      <div className="p-6 lg:p-8 max-w-5xl w-full mx-auto flex flex-col gap-5">
        <Tabs defaultValue="coefficients" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-sm">
            <TabsTrigger value="coefficients">Coefficients</TabsTrigger>
            <TabsTrigger value="validation">File de validation</TabsTrigger>
          </TabsList>
          <TabsContent value="coefficients" className="mt-6">
            <CoefficientsTab />
          </TabsContent>
          <TabsContent value="validation" className="mt-6">
            <ValidationTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Onglet Coefficients ───────────────────────────────────────────────────

function CoefficientsTab() {
  const [coeffs, setCoeffs] = useState<ImpactCoefficient[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ImpactCoefficient | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setCoeffs(await fetchImpactCoefficients()); }
    catch (e: unknown) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center mt-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <>
      <p className="text-xs text-muted-foreground mb-4">
        Les coefficients sont appliqués à chaque prestation validée (multiplicateur = 1 véhicule).
        Les modifications sont sauvegardées localement et appliquées aux nouveaux calculs.
      </p>
      <Card className="overflow-hidden border-border/60 shadow-card p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                {[
                  { l: "Code", r: false },
                  { l: "Libellé", r: false },
                  { l: "Catégorie", r: false },
                  { l: "Valeur", r: true },
                  { l: "Unité", r: false },
                  { l: "ESRS", r: false },
                  { l: "Source", r: false },
                  { l: "", r: false },
                ].map((h, i) => (
                  <th
                    key={h.l || i}
                    className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground ${h.r ? "text-right" : "text-left"}`}
                  >
                    {h.l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {coeffs.map((c) => {
                const meta = CATEGORY_META[c.category];
                return (
                  <tr key={c.code}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.code}</td>
                    <td className="px-4 py-3 font-medium">{c.label}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" style={{ color: meta?.color, borderColor: meta?.color }}>
                        {meta?.label ?? c.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{c.value}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.unit}</td>
                    <td className="px-4 py-3">
                      {c.esrs_topic
                        ? <Badge variant="outline" className="text-xs">{c.esrs_topic}</Badge>
                        : <span className="text-muted-foreground text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <span className="text-xs text-muted-foreground line-clamp-2">{c.source ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => { setEditing(c); setDialogOpen(true); }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <ImpactCoefficientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        coefficient={editing}
        onSaved={load}
      />
    </>
  );
}

// ─── Onglet Validation ─────────────────────────────────────────────────────

function ValidationTab() {
  const { user } = useAuth();
  const [records, setRecords] = useState<ImpactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setRecords(await fetchEstimatedRecords()); }
    catch (e: unknown) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const grouped = records.reduce<Record<string, ImpactRecord[]>>((acc, r) => {
    if (!acc[r.intervention_id]) acc[r.intervention_id] = [];
    acc[r.intervention_id].push(r);
    return acc;
  }, {});

  const handleValidate = async (interventionId: string) => {
    if (!user) return;
    setValidating(interventionId);
    try {
      await validateRecordsByIntervention(interventionId, user.id);
      toast.success("Impact accusé réception");
      load();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setValidating(null);
    }
  };

  if (loading) return <div className="flex justify-center mt-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  if (Object.keys(grouped).length === 0) {
    return (
      <Card className="p-12 text-center border-border/60">
        <CheckCircle2 className="h-10 w-10 mx-auto text-primary mb-3" />
        <p className="font-medium">File de validation vide</p>
        <p className="text-sm text-muted-foreground mt-1">
          Toutes les prestations validées ont été accusées réception.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {Object.keys(grouped).length} prestation{Object.keys(grouped).length > 1 ? "s" : ""} en attente d'accusé réception.
      </p>
      {Object.entries(grouped).map(([interventionId, rows]) => {
        const first = rows[0];
        const dateStr = first.interventions?.date_intervention
          ? format(parseISO(first.interventions.date_intervention), "dd MMM yyyy", { locale: fr })
          : "—";
        const immat = first.interventions?.vehicules?.immatriculation ?? "—";
        const entreprise = first.entreprises?.nom ?? "—";

        return (
          <Card key={interventionId} className="p-5 border-border/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{entreprise}</p>
                <p className="text-sm text-muted-foreground">{immat} · {dateStr}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {rows.map((r) => {
                    const meta = CATEGORY_META[r.category];
                    return (
                      <div key={r.id} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border"
                        style={{ color: meta?.color, borderColor: meta?.fillColor, background: meta?.fillColor }}>
                        {r.quantity} {r.unit}
                        <span className="text-muted-foreground">{meta?.label ?? r.category}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Button size="sm" onClick={() => handleValidate(interventionId)}
                disabled={validating === interventionId} className="shrink-0">
                {validating === interventionId
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accuser réception</>
                }
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
