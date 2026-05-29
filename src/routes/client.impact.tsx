import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Droplets, Wind, Recycle, Printer, Download, Leaf, Loader2 } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  getClientImpactSummary,
  fetchClientRecords,
  exportImpactCSV,
  CATEGORY_META,
  type ImpactSummaryResult,
  type ImpactRecord,
} from "@/lib/impact";
import { format, parseISO, subMonths, isAfter } from "date-fns";
import { fr } from "date-fns/locale";

export const Route = createFileRoute("/client/impact")({
  component: ClientImpactPage,
});

const PERIOD_OPTIONS = [
  { value: "3",  label: "3 derniers mois" },
  { value: "6",  label: "6 derniers mois" },
  { value: "12", label: "12 derniers mois" },
  { value: "all", label: "Tout l'historique" },
];

function formatMonth(yyyyMM: string) {
  const [y, m] = yyyyMM.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return format(d, "MMM yy", { locale: fr });
}

function ClientImpactPage() {
  const { profile } = useAuth();
  const [summary, setSummary] = useState<ImpactSummaryResult | null>(null);
  const [records, setRecords] = useState<ImpactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("12");
  const [vehicleFilter, setVehicleFilter] = useState("all");

  useEffect(() => {
    if (!profile?.entreprise_id) return;
    (async () => {
      setLoading(true);
      try {
        const [sum, recs] = await Promise.all([
          getClientImpactSummary(profile.entreprise_id!),
          fetchClientRecords(profile.entreprise_id!),
        ]);
        setSummary(sum);
        setRecords(recs);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.entreprise_id]);

  // Liste unique de véhicules pour le filtre
  const vehicles = useMemo(() => {
    const seen = new Map<string, string>();
    records.forEach((r) => {
      const immat = r.interventions?.vehicules?.immatriculation;
      const vid = r.interventions?.vehicule_id;
      if (immat && vid) seen.set(vid, immat);
    });
    return Array.from(seen.entries()).map(([id, immat]) => ({ id, immat }));
  }, [records]);

  // Records filtrés (période + véhicule)
  const filteredRecords = useMemo(() => {
    const cutoff = period !== "all" ? subMonths(new Date(), Number(period)) : null;
    return records.filter((r) => {
      if (cutoff && !isAfter(parseISO(r.created_at), cutoff)) return false;
      if (vehicleFilter !== "all" && r.interventions?.vehicule_id !== vehicleFilter) return false;
      return true;
    });
  }, [records, period, vehicleFilter]);

  // Totaux filtrés
  const totals = useMemo(() => {
    const t = { water: 0, pollution: 0, circular: 0, ghg: 0 };
    filteredRecords.forEach((r) => {
      if (r.category in t) t[r.category as keyof typeof t] += Number(r.quantity);
    });
    return t;
  }, [filteredRecords]);

  // Données graphe : série mensuelle des records filtrés
  const chartData = useMemo(() => {
    if (!summary?.timeline) return [];
    const cutoff = period !== "all" ? subMonths(new Date(), Number(period)) : null;
    return summary.timeline
      .filter((p) => {
        if (!cutoff) return true;
        const [y, m] = p.month.split("-");
        return isAfter(new Date(Number(y), Number(m) - 1, 1), cutoff);
      })
      .map((p) => ({
        month: formatMonth(p.month),
        "Eau (L)": p.water,
        "Pollution (L)": p.pollution,
        "Compost (kg)": p.circular,
      }));
  }, [summary, period]);

  const hasData = filteredRecords.length > 0;
  const entrepriseNom = (profile as any)?.entreprises?.nom ?? "IZOX";

  return (
    <>
      {/* ── PRINT HEADER (masqué à l'écran) ─────────────────────── */}
      <div className="hidden print:block mb-8">
        <div className="bg-[#1B4332] text-white px-8 py-6 -mx-4 -mt-4 mb-6 rounded-none">
          <div className="text-2xl font-bold tracking-widest">IZOX</div>
          <div className="text-xs text-emerald-300 mt-1">Nettoyage automobile éco-responsable</div>
        </div>
        <h1 className="text-2xl font-bold text-[#1B4332]">Rapport d'impact RSE</h1>
        <p className="text-sm text-gray-500 mt-1">
          {entrepriseNom} · Généré le {format(new Date(), "dd MMMM yyyy", { locale: fr })}
        </p>
        <hr className="my-4 border-gray-200" />
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto pb-24">
        {/* ── En-tête ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Leaf className="h-5 w-5 text-primary" /> Mon Impact RSE
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Prestations IZOX validées · eau récupérée · pollution évitée
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm" variant="outline" className="gap-1.5"
              onClick={() => exportImpactCSV(filteredRecords, entrepriseNom)}
              disabled={!hasData}
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Imprimer
            </Button>
          </div>
        </div>

        {/* ── Filtres ──────────────────────────────────────────────── */}
        <div className="flex gap-2 mb-5 print:hidden">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-8 text-xs w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="h-8 text-xs w-[160px]">
              <SelectValue placeholder="Tous les véhicules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Tous les véhicules</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id} className="text-xs">{v.immat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasData ? (
          <EmptyState />
        ) : (
          <>
            {/* ── Hero cards 3 catégories principales ──────────────── */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <HeroCard
                icon={Droplets}
                label="Eau économisée"
                value={totals.water}
                unit="L"
                color="#2563eb"
                fill="#dbeafe"
              />
              <HeroCard
                icon={Wind}
                label="Pollution évitée"
                value={totals.pollution}
                unit="L"
                color="#059669"
                fill="#d1fae5"
              />
              <HeroCard
                icon={Recycle}
                label="Compost"
                value={totals.circular}
                unit="kg"
                color="#d97706"
                fill="#fef3c7"
              />
            </div>

            {/* ── Graphe cumulatif ─────────────────────────────────── */}
            {chartData.length > 1 && (
              <Card className="p-4 mb-5 border-border/60 print:shadow-none">
                <p className="text-xs font-medium text-muted-foreground mb-3">
                  Évolution mensuelle (données validées)
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="Eau (L)"       stroke="#2563eb" fill="#dbeafe" strokeWidth={2} />
                    <Area type="monotone" dataKey="Pollution (L)" stroke="#059669" fill="#d1fae5" strokeWidth={2} />
                    <Area type="monotone" dataKey="Compost (kg)"  stroke="#d97706" fill="#fef3c7" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* ── Détail par catégorie ─────────────────────────────── */}
            <Card className="p-4 border-border/60 print:shadow-none">
              <p className="text-xs font-medium text-muted-foreground mb-3">
                Détail — {filteredRecords.length} prestation{filteredRecords.length > 1 ? "s" : ""} validée{filteredRecords.length > 1 ? "s" : ""}
              </p>
              <div className="space-y-2">
                {(["water", "pollution", "circular", "ghg"] as const).map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const val = totals[cat];
                  if (val === 0) return null;
                  return (
                    <div key={cat} className="flex items-center justify-between py-1.5
                      border-b border-border/30 last:border-0">
                      <span className="text-sm" style={{ color: meta.color }}>
                        {meta.label}
                      </span>
                      <span className="font-semibold text-sm">
                        {val % 1 === 0 ? val : val.toFixed(1)} {meta.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* ── Note de bas de page pour l'impression ────────────── */}
            <p className="hidden print:block text-[10px] text-gray-400 mt-8 border-t pt-4">
              Données calculées par IZOX sur la base de coefficients d'impact internes (placeholders provisoires).
              Les valeurs CO₂ sont à recalibrer avec la Base Empreinte ADEME avant toute communication
              officielle. © 2026 IZOX — izox.fr
            </p>
          </>
        )}
      </div>

      {/* ── CSS impression ───────────────────────────────────────── */}
      <style>{`
        @media print {
          header, nav, [data-bottom-nav], aside, footer { display: none !important; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </>
  );
}

function HeroCard({
  icon: Icon, label, value, unit, color, fill,
}: {
  icon: typeof Droplets;
  label: string;
  value: number;
  unit: string;
  color: string;
  fill: string;
}) {
  const displayValue = value >= 1000
    ? `${(value / 1000).toFixed(1)}k`
    : value % 1 === 0
    ? String(value)
    : value.toFixed(1);

  return (
    <Card
      className="p-3 text-center border-border/60 shadow-none"
      style={{ background: fill }}
    >
      <Icon className="h-5 w-5 mx-auto mb-1" style={{ color }} />
      <p className="text-lg font-bold leading-tight" style={{ color }}>
        {displayValue}
        <span className="text-xs font-normal ml-0.5">{unit}</span>
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="p-12 text-center border-border/60">
      <Leaf className="h-10 w-10 mx-auto text-primary mb-3" />
      <p className="font-medium">Aucun impact validé pour le moment</p>
      <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
        Vos données d'impact RSE apparaîtront ici après validation des prestations
        IZOX par votre équipe.
      </p>
    </Card>
  );
}
