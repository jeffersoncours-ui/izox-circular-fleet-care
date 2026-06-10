import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ImpactCategory = "water" | "pollution" | "circular" | "ghg";

export interface ImpactCoefficient {
  code: string;
  label: string;
  category: ImpactCategory;
  esrs_topic: string | null;
  value: number;
  unit: string;
  source: string | null;
}

export interface ImpactRecord {
  id: string;
  intervention_id: string;
  contrat_id: string | null;
  entreprise_id: string;
  coefficient_snapshot: Record<string, unknown>;
  category: ImpactCategory;
  quantity: number;
  unit: string;
  status: "estimated" | "validated";
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
  interventions?: {
    date_intervention: string | null;
    vehicule_id: string | null;
    vehicules?: { immatriculation: string } | null;
  } | null;
  entreprises?: { nom: string } | null;
}

export interface ImpactCategoryTotal {
  category: ImpactCategory;
  total: number;
  unit: string;
  records_count: number;
}

export interface ImpactTimepoint {
  month: string;
  water: number;
  pollution: number;
  circular: number;
  ghg: number;
}

export interface ImpactSummaryResult {
  totals: ImpactCategoryTotal[];
  timeline: ImpactTimepoint[];
}

// ─────────────────────────────────────────────────────────────
// Coefficients par défaut
// ─────────────────────────────────────────────────────────────

const DEFAULT_COEFFICIENTS: ImpactCoefficient[] = [
  { code: "water_saved",      label: "Eau économisée / prestation",          category: "water",     esrs_topic: "E3", value: 140,  unit: "L",      source: "IZOX estimate" },
  { code: "pollution_avoided",label: "Eaux polluées évitées / prestation",   category: "pollution", esrs_topic: "E2", value: 140,  unit: "L",      source: "IZOX estimate" },
  { code: "compost_produced", label: "Compost / terreau produit / prestation", category: "circular",esrs_topic: "E5", value: 0.2,  unit: "kg",     source: "IZOX estimate" },
  { code: "co2_avoided",      label: "CO2 évité / prestation",               category: "ghg",       esrs_topic: "E1", value: 0.5,  unit: "kgCO2e", source: "PLACEHOLDER"   },
];

// ─────────────────────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────────────────────

const LS_COEFFS   = "izox_impact_coeffs";
const LS_REVIEWED = "izox_impact_reviewed";

function getStoredOverrides(): Record<string, Partial<ImpactCoefficient>> {
  try { return JSON.parse(localStorage.getItem(LS_COEFFS) ?? "{}"); }
  catch { return {}; }
}

function getReviewedSet(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LS_REVIEWED) ?? "[]")); }
  catch { return new Set(); }
}

// ─────────────────────────────────────────────────────────────
// Coefficients — merged defaults + localStorage overrides
// ─────────────────────────────────────────────────────────────

function getActiveCoefficients(): ImpactCoefficient[] {
  const overrides = getStoredOverrides();
  return DEFAULT_COEFFICIENTS.map((c) => ({ ...c, ...(overrides[c.code] ?? {}) }));
}

export async function fetchImpactCoefficients(): Promise<ImpactCoefficient[]> {
  return getActiveCoefficients();
}

export async function updateCoefficient(
  code: string,
  patch: Partial<Pick<ImpactCoefficient, "label" | "value" | "unit" | "source" | "esrs_topic">>
): Promise<void> {
  const overrides = getStoredOverrides();
  overrides[code] = { ...(overrides[code] ?? {}), ...patch };
  localStorage.setItem(LS_COEFFS, JSON.stringify(overrides));
}

// ─────────────────────────────────────────────────────────────
// Validation queue (localStorage-tracked)
// ─────────────────────────────────────────────────────────────

export async function fetchEstimatedRecords(): Promise<ImpactRecord[]> {
  const reviewed = getReviewedSet();

  const { data, error } = await supabase
    .from("interventions")
    .select("id, date_intervention, entreprise_id, vehicule_id, vehicules(immatriculation), entreprises(nom)")
    .eq("statut", "validee")
    .order("date_intervention", { ascending: false })
    .limit(200);

  if (error) throw error;

  const coeffs = getActiveCoefficients();
  const records: ImpactRecord[] = [];

  (data ?? [])
    .filter((inter) => !reviewed.has(inter.id) && inter.entreprise_id !== null)
    .forEach((inter) => {
      coeffs.forEach((coeff) => {
        records.push({
          id: `${inter.id}-${coeff.code}`,
          intervention_id: inter.id,
          contrat_id: null,
          entreprise_id: inter.entreprise_id as string,
          coefficient_snapshot: coeff as unknown as Record<string, unknown>,
          category: coeff.category,
          quantity: coeff.value,
          unit: coeff.unit,
          status: "estimated",
          validated_by: null,
          validated_at: null,
          created_at: inter.date_intervention ?? new Date().toISOString(),
          interventions: {
            date_intervention: inter.date_intervention,
            vehicule_id: inter.vehicule_id,
            vehicules: (inter.vehicules as { immatriculation: string } | null),
          },
          entreprises: (inter.entreprises as { nom: string } | null),
        });
      });
    });

  return records;
}

export async function validateRecordsByIntervention(interventionId: string, _userId: string): Promise<void> {
  const reviewed = getReviewedSet();
  reviewed.add(interventionId);
  localStorage.setItem(LS_REVIEWED, JSON.stringify(Array.from(reviewed)));
}

// ─────────────────────────────────────────────────────────────
// Client impact — calculated from validated interventions
// ─────────────────────────────────────────────────────────────

async function fetchValidatedInterventions(entrepriseId: string) {
  const { data, error } = await supabase
    .from("interventions")
    .select("id, date_intervention, entreprise_id, vehicule_id, vehicules(immatriculation)")
    .eq("entreprise_id", entrepriseId)
    .eq("statut", "validee")
    .order("date_intervention", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getClientImpactSummary(entrepriseId: string): Promise<ImpactSummaryResult> {
  const interventions = await fetchValidatedInterventions(entrepriseId);
  const coeffs = getActiveCoefficients();

  const totals: ImpactCategoryTotal[] = coeffs.map((c) => ({
    category: c.category,
    total: Math.round(interventions.length * c.value * 100) / 100,
    unit: c.unit,
    records_count: interventions.length,
  }));

  const timelineMap = new Map<string, ImpactTimepoint>();
  interventions.forEach((inter) => {
    const month = (inter.date_intervention ?? "").slice(0, 7);
    if (!month) return;
    if (!timelineMap.has(month)) {
      timelineMap.set(month, { month, water: 0, pollution: 0, circular: 0, ghg: 0 });
    }
    const entry = timelineMap.get(month)!;
    coeffs.forEach((c) => { (entry as any)[c.category] += c.value; });
  });

  const timeline = Array.from(timelineMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((e) => ({
      month: e.month,
      water:     Math.round(e.water     * 100) / 100,
      pollution: Math.round(e.pollution * 100) / 100,
      circular:  Math.round(e.circular  * 100) / 100,
      ghg:       Math.round(e.ghg       * 100) / 100,
    }));

  return { totals, timeline };
}

export async function fetchClientRecords(entrepriseId: string): Promise<ImpactRecord[]> {
  const interventions = await fetchValidatedInterventions(entrepriseId);
  const coeffs = getActiveCoefficients();
  const records: ImpactRecord[] = [];

  interventions.forEach((inter) => {
    coeffs.forEach((coeff) => {
      records.push({
        id: `${inter.id}-${coeff.code}`,
        intervention_id: inter.id,
        contrat_id: null,
        entreprise_id: inter.entreprise_id as string,
        coefficient_snapshot: coeff as unknown as Record<string, unknown>,
        category: coeff.category,
        quantity: coeff.value,
        unit: coeff.unit,
        status: "validated",
        validated_by: null,
        validated_at: null,
        created_at: inter.date_intervention ?? new Date().toISOString(),
        interventions: {
          date_intervention: inter.date_intervention,
          vehicule_id: inter.vehicule_id,
          vehicules: (inter.vehicules as { immatriculation: string } | null),
        },
      });
    });
  });

  return records;
}

export async function generateImpactRecords(_interventionId: string): Promise<void> {
  // no-op: impact calculated on-the-fly
}

// ─────────────────────────────────────────────────────────────
// Admin — global impact across all clients
// ─────────────────────────────────────────────────────────────

export interface GlobalImpactSummary {
  totalInterventions: number;
  activeClients: number;
  totals: { water: number; pollution: number; circular: number; ghg: number };
  timeline: Array<{ month: string; interventions: number; water: number; co2: number }>;
  byClient: Array<{ nom: string; interventions: number; water: number }>;
}

export async function fetchGlobalImpactSummary(): Promise<GlobalImpactSummary> {
  const { data, error } = await supabase
    .from("interventions")
    .select("id, date_intervention, entreprise_id, entreprises(nom)")
    .eq("statut", "validee")
    .order("date_intervention", { ascending: false })
    .limit(500);
  if (error) throw error;

  const interventions = data ?? [];
  const coeffs = getActiveCoefficients();
  const waterCoeff     = coeffs.find((c) => c.category === "water")?.value     ?? 140;
  const ghgCoeff       = coeffs.find((c) => c.category === "ghg")?.value       ?? 0.5;
  const pollutionCoeff = coeffs.find((c) => c.category === "pollution")?.value ?? 140;
  const circularCoeff  = coeffs.find((c) => c.category === "circular")?.value  ?? 0.2;

  const clientIds = new Set<string>();
  const timelineMap = new Map<string, { interventions: number; water: number; co2: number }>();
  const clientMap   = new Map<string, { nom: string; interventions: number; water: number }>();

  interventions.forEach((inter) => {
    if (inter.entreprise_id) clientIds.add(inter.entreprise_id);

    const month = (inter.date_intervention ?? "").slice(0, 7);
    if (month) {
      const e = timelineMap.get(month) ?? { interventions: 0, water: 0, co2: 0 };
      e.interventions += 1;
      e.water += waterCoeff;
      e.co2   += ghgCoeff;
      timelineMap.set(month, e);
    }

    const nom = ((inter.entreprises as { nom: string } | null)?.nom) ?? "—";
    const key = inter.entreprise_id ?? nom;
    const c = clientMap.get(key) ?? { nom, interventions: 0, water: 0 };
    c.interventions += 1;
    c.water += waterCoeff;
    clientMap.set(key, c);
  });

  const n = interventions.length;
  return {
    totalInterventions: n,
    activeClients: clientIds.size,
    totals: {
      water:     Math.round(n * waterCoeff),
      pollution: Math.round(n * pollutionCoeff),
      circular:  Math.round(n * circularCoeff * 100) / 100,
      ghg:       Math.round(n * ghgCoeff * 100) / 100,
    },
    timeline: Array.from(timelineMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, v]) => ({ month, ...v })),
    byClient: Array.from(clientMap.values())
      .sort((a, b) => b.interventions - a.interventions)
      .slice(0, 6),
  };
}

// ─────────────────────────────────────────────────────────────
// Labels et couleurs par catégorie
// ─────────────────────────────────────────────────────────────

export const CATEGORY_META: Record<
  ImpactCategory,
  { label: string; unit: string; color: string; fillColor: string }
> = {
  water:     { label: "Eau économisée",  unit: "L",       color: "#2563eb", fillColor: "#dbeafe" },
  pollution: { label: "Pollution évitée", unit: "L",      color: "#059669", fillColor: "#d1fae5" },
  circular:  { label: "Compost produit", unit: "kg",      color: "#d97706", fillColor: "#fef3c7" },
  ghg:       { label: "CO₂ évité",       unit: "kgCO₂e", color: "#7c3aed", fillColor: "#ede9fe" },
};

// ─────────────────────────────────────────────────────────────
// Export CSV
// ─────────────────────────────────────────────────────────────

export function exportImpactCSV(records: ImpactRecord[], entrepriseNom: string): void {
  const BOM = "﻿";
  const headers = ["Date", "Catégorie", "Quantité", "Unité", "Immatriculation", "Statut"];
  const rows = records.map((r) => [
    r.created_at.slice(0, 10),
    CATEGORY_META[r.category]?.label ?? r.category,
    String(r.quantity),
    r.unit,
    r.interventions?.vehicules?.immatriculation ?? "—",
    r.status === "validated" ? "Validé" : "Estimé",
  ]);
  const csv = BOM + [headers, ...rows].map((row) => row.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `izox-impact-${entrepriseNom.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
