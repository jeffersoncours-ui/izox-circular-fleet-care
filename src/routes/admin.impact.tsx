import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Edit2, Loader2, CheckCircle2, Leaf } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/lib/auth-context";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  fetchImpactCoefficients,
  fetchEstimatedRecords,
  fetchGlobalImpactSummary,
  validateRecordsByIntervention,
  CATEGORY_META,
  type ImpactCoefficient,
  type ImpactRecord,
  type GlobalImpactSummary,
} from "@/lib/impact";
import { ImpactCoefficientDialog } from "@/components/admin/ImpactCoefficientDialog";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export const Route = createFileRoute("/admin/impact")({
  component: AdminImpactPage,
});

function formatMonth(yyyyMM: string) {
  const [y, m] = yyyyMM.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return format(d, "MMM yy", { locale: fr });
}

function AdminImpactPage() {
  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        crumbs={["Admin", "Impact RSE"]}
        title="Impact RSE"
        sub="Barème de calcul et validation des interventions éco-responsables"
      />

      <div className="p-6 lg:p-8 max-w-5xl w-full mx-auto flex flex-col gap-5">
        <Tabs defaultValue="global" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="global">Vue globale</TabsTrigger>
            <TabsTrigger value="coefficients">Coefficients</TabsTrigger>
            <TabsTrigger value="validation">File de validation</TabsTrigger>
          </TabsList>
          <TabsContent value="global" className="mt-6">
            <GlobalTab />
          </TabsContent>
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

// ─── Onglet Vue globale ────────────────────────────────────────────────────

function GlobalTab() {
  const [summary, setSummary] = useState<GlobalImpactSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { setSummary(await fetchGlobalImpactSummary()); }
      catch (e: unknown) { toast.error((e as Error).message); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center mt-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!summary || summary.totalInterventions === 0) {
    return (
      <Card className="p-12 text-center border-border/60">
        <Leaf className="h-10 w-10 mx-auto text-primary mb-3" />
        <p className="font-medium">Aucune intervention validée</p>
        <p className="text-sm text-muted-foreground mt-1">
          Les données d'impact apparaîtront ici dès la première validation.
        </p>
      </Card>
    );
  }

  const waterDisplay = summary.totals.water >= 1000
    ? `${(summary.totals.water / 1000).toFixed(1)}k`
    : String(summary.totals.water);

  return (
    <div className="space-y-5">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Interventions validées" value={String(summary.totalInterventions)} unit="" color="#1B4332" />
        <KpiCard label="Eau économisée" value={waterDisplay} unit="L" color="#2563eb" />
        <KpiCard label="CO₂ évité" value={summary.totals.ghg.toFixed(1)} unit="kg" color="#7c3aed" />
        <KpiCard label="Clients actifs" value={String(summary.activeClients)} unit="" color="#059669" />
      </div>

      {/* Monthly bar chart */}
      {summary.timeline.length > 0 && (
        <Card className="p-4 border-border/60">
          <p className="text-xs font-medium text-muted-foreground mb-4">
            Interventions validées par mois
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={summary.timeline.map((t) => ({ ...t, month: formatMonth(t.month) }))}
              margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 11 }}
                formatter={(v: number) => [v, "Interventions"]}
              />
              <Bar dataKey="interventions" fill="#1B4332" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* By client — horizontal bar chart */}
      {summary.byClient.length > 0 && (
        <Card className="p-4 border-border/60">
          <p className="text-xs font-medium text-muted-foreground mb-4">
            Eau économisée par client (L)
          </p>
          <ResponsiveContainer
            width="100%"
            height={Math.max(summary.byClient.length * 38 + 20, 120)}
          >
            <BarChart
              data={summary.byClient}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 0, left: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="nom" tick={{ fontSize: 10 }} width={80} />
              <Tooltip
                contentStyle={{ fontSize: 11 }}
                formatter={(v: number) => [`${v} L`, "Eau économisée"]}
              />
              <Bar dataKey="water" fill="#2563eb" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ label, value, unit, color }: {
  label: string; value: string; unit: string; color: string;
}) {
  return (
    <Card className="p-4 border-border/60">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>
        {value}
        {unit && <span className="text-sm font-normal ml-1 text-muted-foreground">{unit}</span>}
      </p>
    </Card>
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
