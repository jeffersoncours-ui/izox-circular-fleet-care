import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Droplets, Wind, Recycle, Zap, Printer, ArrowLeft, Loader2, Leaf,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  fetchClientRecords,
  CATEGORY_META,
  type ImpactRecord,
} from "@/lib/impact";
import {
  format, parseISO, isBefore,
  startOfMonth, startOfQuarter, startOfYear,
} from "date-fns";
import { fr } from "date-fns/locale";

export const Route = createFileRoute("/client/impact/rapport")({
  component: ImpactRapportPage,
});

// ─── Périodes ────────────────────────────────────────────────

type PeriodKey = "month" | "quarter" | "year" | "all";

const PERIOD_OPTIONS: { value: PeriodKey; label: string; printLabel: string }[] = [
  { value: "month",   label: "Mois en cours",      printLabel: format(new Date(), "MMMM yyyy",     { locale: fr }) },
  { value: "quarter", label: "Trimestre en cours",  printLabel: `T${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}` },
  { value: "year",    label: "Année en cours",      printLabel: String(new Date().getFullYear()) },
  { value: "all",     label: "Tout l'historique",   printLabel: "Historique complet" },
];

function getPeriodCutoff(key: PeriodKey): Date | null {
  const now = new Date();
  if (key === "month")   return startOfMonth(now);
  if (key === "quarter") return startOfQuarter(now);
  if (key === "year")    return startOfYear(now);
  return null;
}

// ─── Helpers d'affichage ──────────────────────────────────────

function formatMonth(yyyyMM: string) {
  const [y, m] = yyyyMM.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return format(d, "MMMM yyyy", { locale: fr });
}

function fmtVal(v: number) {
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

function fmtBig(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return fmtVal(v);
}

// ─── Page ────────────────────────────────────────────────────

function ImpactRapportPage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<ImpactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState<PeriodKey>("year");

  const entrepriseNom = (profile as any)?.entreprises?.nom ?? "Mon entreprise";
  const generatedAt   = format(new Date(), "dd MMMM yyyy", { locale: fr });
  const periodMeta    = PERIOD_OPTIONS.find((o) => o.value === period)!;

  useEffect(() => {
    if (!profile?.entreprise_id) return;
    (async () => {
      setLoading(true);
      try {
        const recs = await fetchClientRecords(profile.entreprise_id!);
        setRecords(recs);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.entreprise_id]);

  // Filtrage par période — borne incluse (>= début de période).
  // isAfter (strict) excluait à tort une prestation datée le 1er du mois/trimestre/année
  // car cutoff = minuit du 1er jour = exactement la date de la prestation.
  const filteredRecords = useMemo(() => {
    const cutoff = getPeriodCutoff(period);
    if (!cutoff) return records;
    return records.filter((r) => !isBefore(parseISO(r.created_at), cutoff));
  }, [records, period]);

  // Totaux par catégorie
  const totals = useMemo(() => {
    const t = { water: 0, pollution: 0, circular: 0, ghg: 0 };
    filteredRecords.forEach((r) => {
      if (r.category in t) t[r.category as keyof typeof t] += Number(r.quantity);
    });
    return t;
  }, [filteredRecords]);

  // Tableau mensuel : { month, interventions, water, pollution, circular, ghg }
  const monthlyRows = useMemo(() => {
    const map = new Map<string, {
      month: string;
      interventions: Set<string>;
      water: number; pollution: number; circular: number; ghg: number;
    }>();

    filteredRecords.forEach((r) => {
      const month = r.created_at.slice(0, 7);
      if (!month) return;
      if (!map.has(month)) {
        map.set(month, {
          month,
          interventions: new Set(),
          water: 0, pollution: 0, circular: 0, ghg: 0,
        });
      }
      const entry = map.get(month)!;
      entry.interventions.add(r.intervention_id);
      if (r.category in entry) (entry as any)[r.category] += Number(r.quantity);
    });

    return Array.from(map.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((e) => ({
        month:         e.month,
        monthLabel:    formatMonth(e.month),
        interventions: e.interventions.size,
        water:     Math.round(e.water     * 100) / 100,
        pollution: Math.round(e.pollution * 100) / 100,
        circular:  Math.round(e.circular  * 100) / 100,
        ghg:       Math.round(e.ghg       * 100) / 100,
      }));
  }, [filteredRecords]);

  // Données graphe (pour l'aperçu écran)
  const chartData = useMemo(() =>
    monthlyRows.map((r) => ({
      month:           format(new Date(r.month + "-01"), "MMM yy", { locale: fr }),
      "Eau (L)":       r.water,
      "Pollution (L)": r.pollution,
      "Compost (kg)":  r.circular,
      "CO₂ (kg)":      r.ghg,
    })),
  [monthlyRows]);

  // Nombre d'interventions uniques total
  const totalInterventions = useMemo(() => {
    const ids = new Set(filteredRecords.map((r) => r.intervention_id));
    return ids.size;
  }, [filteredRecords]);

  const hasData = filteredRecords.length > 0;

  return (
    <>
      {/* ════════════════════════════════════════════════════════
          CONTRÔLES ÉCRAN (masqués à l'impression)
      ════════════════════════════════════════════════════════ */}
      <div className="print:hidden px-4 pt-4 pb-2 flex items-center justify-between gap-3 max-w-2xl mx-auto">
        <Link to="/client/impact">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Mon Impact
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="h-8 text-xs w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => window.print()}
            disabled={!hasData}
          >
            <Printer className="h-3.5 w-3.5" /> Télécharger PDF
          </Button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          CORPS DU RAPPORT (visible écran + impression)
      ════════════════════════════════════════════════════════ */}
      <div className="px-4 pb-24 max-w-2xl mx-auto" id="rapport-rse">

        {/* ── En-tête IZOX (visible à l'impression, discret à l'écran) ── */}
        <div className="report-header mb-6 mt-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-bold tracking-widest text-[#1B4332] screen-text-lg">
                IZOX
              </div>
              <div className="text-xs text-[#1B4332]/70">Nettoyage automobile éco-responsable</div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Généré le {generatedAt}</p>
            </div>
          </div>
          <hr className="mt-3 mb-4 border-[#1B4332]/20" />
          <h1 className="text-2xl font-bold text-[#1B4332] flex items-center gap-2">
            <Leaf className="h-6 w-6" /> Rapport d'impact RSE
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {entrepriseNom} · Période : <strong>{periodMeta.printLabel}</strong>
          </p>
        </div>

        {/* ── Chargement ────────────────────────────────────────── */}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && !hasData && (
          <Card className="p-12 text-center border-border/60">
            <Leaf className="h-10 w-10 mx-auto text-primary mb-3" />
            <p className="font-medium">Aucun impact validé sur cette période</p>
            <p className="text-sm text-muted-foreground mt-2">
              Sélectionnez une autre période ou attendez la validation de vos prestations.
            </p>
          </Card>
        )}

        {!loading && hasData && (
          <>
            {/* ── Section 1 : KPIs ─────────────────────────────── */}
            <section className="mb-6 report-section">
              <h2 className="report-section-title">Indicateurs clés</h2>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <KpiCard icon={Droplets} label="Eau économisée"  value={totals.water}     unit="L"      color="#2563eb" fill="#dbeafe" />
                <KpiCard icon={Wind}     label="Pollution évitée" value={totals.pollution} unit="L"      color="#059669" fill="#d1fae5" />
                <KpiCard icon={Recycle}  label="Compost produit"  value={totals.circular}  unit="kg"     color="#d97706" fill="#fef3c7" />
                <KpiCard icon={Zap}      label="CO₂ évité"        value={totals.ghg}       unit="kgCO₂e" color="#7c3aed" fill="#ede9fe" />
              </div>

              {/* Équivalences */}
              <div className="flex gap-3 mt-3 flex-wrap">
                <div className="flex-1 min-w-[130px] bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-center">
                  <p className="text-xl font-bold text-blue-700">{Math.round(totals.water / 60)}</p>
                  <p className="text-[11px] text-blue-600 leading-tight">douches économisées<br />(≈ 60 L/douche)</p>
                </div>
                <div className="flex-1 min-w-[130px] bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-center">
                  <p className="text-xl font-bold text-violet-700">{Math.round(totals.ghg / 0.12)}</p>
                  <p className="text-[11px] text-violet-600 leading-tight">km voiture évités<br />(≈ 0,12 kgCO₂/km)</p>
                </div>
                <div className="flex-1 min-w-[130px] bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-center">
                  <p className="text-xl font-bold text-emerald-700">{totalInterventions}</p>
                  <p className="text-[11px] text-emerald-600 leading-tight">prestation{totalInterventions > 1 ? "s" : ""} validée{totalInterventions > 1 ? "s" : ""}</p>
                </div>
              </div>
            </section>

            {/* ── Section 2 : Graphe ───────────────────────────── */}
            {chartData.length > 1 && (
              <section className="mb-6 report-section">
                <h2 className="report-section-title">Évolution mensuelle</h2>
                <Card className="p-4 mt-3 border-border/60 print:border-gray-200 print:shadow-none">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="Eau (L)"       stroke="#2563eb" fill="#dbeafe" strokeWidth={2} />
                      <Area type="monotone" dataKey="Pollution (L)" stroke="#059669" fill="#d1fae5" strokeWidth={2} />
                      <Area type="monotone" dataKey="Compost (kg)"  stroke="#d97706" fill="#fef3c7" strokeWidth={2} />
                      <Area type="monotone" dataKey="CO₂ (kg)"      stroke="#7c3aed" fill="#ede9fe" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </section>
            )}

            {/* ── Section 3 : Tableau mensuel ──────────────────── */}
            <section className="mb-6 report-section">
              <h2 className="report-section-title">Détail par mois</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/50 print:bg-gray-100">
                      <th className="text-left px-3 py-2 font-semibold text-xs text-muted-foreground border-b border-border/60 print:border-gray-200">
                        Mois
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-xs text-muted-foreground border-b border-border/60 print:border-gray-200">
                        Prest.
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-xs text-[#2563eb] border-b border-border/60 print:border-gray-200">
                        Eau (L)
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-xs text-[#059669] border-b border-border/60 print:border-gray-200">
                        Pollution (L)
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-xs text-[#d97706] border-b border-border/60 print:border-gray-200">
                        Compost (kg)
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-xs text-[#7c3aed] border-b border-border/60 print:border-gray-200">
                        CO₂ (kg)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRows.map((row, i) => (
                      <tr
                        key={row.month}
                        className={i % 2 === 0 ? "bg-background" : "bg-muted/20 print:bg-gray-50"}
                      >
                        <td className="px-3 py-2 border-b border-border/30 print:border-gray-100 font-medium capitalize">
                          {row.monthLabel}
                        </td>
                        <td className="px-3 py-2 border-b border-border/30 print:border-gray-100 text-right text-muted-foreground">
                          {row.interventions}
                        </td>
                        <td className="px-3 py-2 border-b border-border/30 print:border-gray-100 text-right font-medium text-[#2563eb]">
                          {fmtBig(row.water)}
                        </td>
                        <td className="px-3 py-2 border-b border-border/30 print:border-gray-100 text-right font-medium text-[#059669]">
                          {fmtBig(row.pollution)}
                        </td>
                        <td className="px-3 py-2 border-b border-border/30 print:border-gray-100 text-right font-medium text-[#d97706]">
                          {fmtVal(row.circular)}
                        </td>
                        <td className="px-3 py-2 border-b border-border/30 print:border-gray-100 text-right font-medium text-[#7c3aed]">
                          {fmtVal(row.ghg)}
                        </td>
                      </tr>
                    ))}
                    {/* Ligne total */}
                    <tr className="bg-muted/30 print:bg-gray-100 font-semibold">
                      <td className="px-3 py-2.5 border-t-2 border-border/60 print:border-gray-400">Total</td>
                      <td className="px-3 py-2.5 border-t-2 border-border/60 print:border-gray-400 text-right">
                        {totalInterventions}
                      </td>
                      <td className="px-3 py-2.5 border-t-2 border-border/60 print:border-gray-400 text-right text-[#2563eb]">
                        {fmtBig(totals.water)}
                      </td>
                      <td className="px-3 py-2.5 border-t-2 border-border/60 print:border-gray-400 text-right text-[#059669]">
                        {fmtBig(totals.pollution)}
                      </td>
                      <td className="px-3 py-2.5 border-t-2 border-border/60 print:border-gray-400 text-right text-[#d97706]">
                        {fmtVal(totals.circular)}
                      </td>
                      <td className="px-3 py-2.5 border-t-2 border-border/60 print:border-gray-400 text-right text-[#7c3aed]">
                        {fmtVal(totals.ghg)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Section 4 : Détail catégories ────────────────── */}
            <section className="mb-6 report-section">
              <h2 className="report-section-title">Méthodologie</h2>
              <div className="mt-3 space-y-2">
                {(["water", "pollution", "circular", "ghg"] as const).map((cat) => {
                  const meta = CATEGORY_META[cat];
                  return (
                    <div
                      key={cat}
                      className="flex items-center justify-between py-2 border-b border-border/30 print:border-gray-200 last:border-0"
                    >
                      <div>
                        <span className="text-sm font-medium" style={{ color: meta.color }}>{meta.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {cat === "water"     && "140 L / prestation (estimation IZOX)"}
                          {cat === "pollution" && "140 L d'eaux polluées évitées / prestation"}
                          {cat === "circular"  && "0,2 kg de terreau produit / prestation"}
                          {cat === "ghg"       && "0,5 kgCO₂e / prestation (PLACEHOLDER ADEME)"}
                        </span>
                      </div>
                      <span className="font-semibold text-sm whitespace-nowrap ml-4">
                        {totals[cat] % 1 === 0 ? totals[cat] : totals[cat].toFixed(1)} {meta.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Pied de page ─────────────────────────────────── */}
            <div className="report-footer mt-8 pt-4 border-t border-border/30 print:border-gray-300">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <strong>Note :</strong> Les données d'impact sont calculées par IZOX sur la base de
                coefficients d'impact internes (estimations provisoires, non certifiées).
                Les valeurs CO₂ (kgCO₂e) sont des <em>placeholders</em> à recalibrer avec la Base
                Empreinte ADEME avant toute communication officielle ou reporting CSRD/ESRS.
                Ce rapport ne constitue pas un bilan carbone certifié.
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                © 2026 IZOX · izox.fr · {generatedAt}
              </p>
            </div>
          </>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          CSS DÉDIÉ À CETTE ROUTE (print + utilitaires rapport)
      ════════════════════════════════════════════════════════ */}
      <style>{`
        /* ── Typographie rapport (écran) ── */
        .report-section-title {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #1B4332;
          padding-bottom: 0.25rem;
          border-bottom: 2px solid #1B4332;
          margin-top: 0.25rem;
        }

        /* ── Print général ── */
        @media print {
          /* Masquer l'interface */
          header, nav, [data-bottom-nav], aside, footer,
          .print\\:hidden { display: none !important; }

          /* Reset body */
          body { background: white !important; margin: 0; }
          #rapport-rse { padding: 0 !important; max-width: 100% !important; }

          /* En-tête branché vert IZOX */
          .report-header {
            background: #1B4332;
            color: white;
            padding: 1.5rem 2rem 1rem;
            margin: -1rem -1rem 1.5rem;
          }
          .report-header .text-xl,
          .report-header .text-2xl { color: white !important; }
          .report-header .text-xs,
          .report-header .text-sm,
          .report-header .text-muted-foreground { color: rgba(255,255,255,0.7) !important; }
          .report-header hr { border-color: rgba(255,255,255,0.2) !important; }
          .report-header svg { color: white !important; }

          /* Sections */
          .report-section { page-break-inside: avoid; }
          .report-section-title { color: #1B4332; border-color: #1B4332; }

          /* Tableau */
          table { font-size: 11px !important; }

          /* Pied de page */
          .report-footer { page-break-inside: avoid; }

          /* Graphe : forcer une hauteur fixe pour print */
          .recharts-wrapper { height: 180px !important; }

          /* Contrôles écran */
          .print\\:hidden { display: none !important; }
        }

        /* ── Page break avant section 3 si tableau long ── */
        @media print {
          .report-section:nth-child(3) { page-break-before: auto; }
        }
      `}</style>
    </>
  );
}

function KpiCard({
  icon: Icon, label, value, unit, color, fill,
}: {
  icon: typeof Droplets;
  label: string;
  value: number;
  unit: string;
  color: string;
  fill: string;
}) {
  return (
    <Card
      className="p-4 text-center border-border/60 shadow-none print:border-gray-200"
      style={{ background: fill }}
    >
      <Icon className="h-6 w-6 mx-auto mb-1.5" style={{ color }} />
      <p className="text-2xl font-bold leading-tight" style={{ color }}>
        {fmtBig(value)}
        <span className="text-xs font-normal ml-0.5">{unit}</span>
      </p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </Card>
  );
}
