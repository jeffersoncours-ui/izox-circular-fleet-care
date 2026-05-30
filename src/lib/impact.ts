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
// Coefficients hardcodés (pas de DB)
// ─────────────────────────────────────────────────────────────

const COEFFICIENTS = {
  water_saved:     { code: "water_saved",     label: "Eau économisée / prestation",         category: "water"     as ImpactCategory, esrs_topic: "E3", value: 140,  unit: "L",      source: "IZOX estimate" },
  pollution_avoided: { code: "pollution_avoided", label: "Eaux polluées évitées / prestation", category: "pollution" as ImpactCategory, esrs_topic: "E2", value: 140,  unit: "L",      source: "IZOX estimate" },
  compost_produced:  { code: "compost_produced",  label: "Compost / terreau produit / prestation", category: "circular" as ImpactCategory, esrs_topic: "E5", value: 0.2,  unit: "kg",     source: "IZOX estimate" },
  co2_avoided:       { code: "co2_avoided",       label: "CO2 évité / prestation",              category: "ghg"      as ImpactCategory, esrs_topic: "E1", value: 0.5,  unit: "kgCO2e", source: "PLACEHOLDER" },
};

const COEFF_LIST = Object.values(COEFFICIENTS);

// ─────────────────────────────────────────────────────────────
// Helpers
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

// ─────────────────────────────────────────────────────────────
// Public APIs — calculated from interventions, no new table
// ─────────────────────────────────────────────────────────────

export async function getClientImpactSummary(entrepriseId: string): Promise<ImpactSummaryResult> {
  const interventions = await fetchValidatedInterventions(entrepriseId);

  const totals: ImpactCategoryTotal[] = COEFF_LIST.map((c) => ({
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
    entry.water    += COEFFICIENTS.water_saved.value;
    entry.pollution += COEFFICIENTS.pollution_avoided.value;
    entry.circular  += COEFFICIENTS.compost_produced.value;
    entry.ghg       += COEFFICIENTS.co2_avoided.value;
  });

  const timeline = Array.from(timelineMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((e) => ({
      month: e.month,
      water:    Math.round(e.water    * 100) / 100,
      pollution: Math.round(e.pollution * 100) / 100,
      circular: Math.round(e.circular  * 100) / 100,
      ghg:      Math.round(e.ghg       * 100) / 100,
    }));

  return { totals, timeline };
}

export async function fetchClientRecords(entrepriseId: string): Promise<ImpactRecord[]> {
  const interventions = await fetchValidatedInterventions(entrepriseId);
  const records: ImpactRecord[] = [];
  interventions.forEach((inter) => {
    COEFF_LIST.forEach((coeff) => {
      records.push({
        id: `${inter.id}-${coeff.code}`,
        intervention_id: inter.id,
        contrat_id: null,
        entreprise_id: inter.entreprise_id,
        coefficient_snapshot: coeff as Record<string, unknown>,
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

export async function fetchImpactCoefficients(): Promise<ImpactCoefficient[]> {
  return COEFF_LIST;
}

export async function generateImpactRecords(_interventionId: string): Promise<void> {
  // no-op: impact calculated on-the-fly
}

export async function validateRecordsByIntervention(_interventionId: string, _userId: string): Promise<void> {
  // no-op: all validated interventions are counted automatically
}

export async function fetchEstimatedRecords(): Promise<ImpactRecord[]> {
  return [];
}

export async function updateCoefficient(_id: string, _patch: unknown): Promise<void> {
  // no-op: coefficients are hardcoded
}

// ─────────────────────────────────────────────────────────────
// Labels et couleurs par catégorie
// ─────────────────────────────────────────────────────────────

export const CATEGORY_META: Record<
  ImpactCategory,
  { label: string; unit: string; color: string; fillColor: string }
> = {
  water:    { label: "Eau économisée", unit: "L",       color: "#2563eb", fillColor: "#dbeafe" },
  pollution: { label: "Pollution évitée", unit: "L",    color: "#059669", fillColor: "#d1fae5" },
  circular: { label: "Compost produit", unit: "kg",     color: "#d97706", fillColor: "#fef3c7" },
  ghg:      { label: "CO₂ évité",       unit: "kgCO₂e", color: "#7c3aed", fillColor: "#ede9fe" },
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
