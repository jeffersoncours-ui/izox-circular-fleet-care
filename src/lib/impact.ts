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
// Call compute-impact Deno Edge Function
// ─────────────────────────────────────────────────────────────

async function callComputeImpact(action: string, payload: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("compute-impact", {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

// ─────────────────────────────────────────────────────────────
// Public APIs — all via Edge Function
// ─────────────────────────────────────────────────────────────

export async function getClientImpactSummary(
  entrepriseId: string
): Promise<ImpactSummaryResult> {
  return callComputeImpact("get_summary", { entreprise_id: entrepriseId });
}

export async function generateImpactRecords(interventionId: string): Promise<void> {
  await callComputeImpact("generate", { intervention_id: interventionId });
}

export async function fetchImpactCoefficients(): Promise<ImpactCoefficient[]> {
  return callComputeImpact("get_coefficients", {});
}

export async function updateCoefficient(
  id: string,
  patch: Partial<
    Pick<ImpactCoefficient, "label" | "value" | "unit" | "source" | "esrs_topic">
  >
): Promise<void> {
  console.warn("updateCoefficient: coefficients are hardcoded in Edge Function");
}

export async function fetchEstimatedRecords(): Promise<ImpactRecord[]> {
  return callComputeImpact("get_estimated", {});
}

export async function validateRecordsByIntervention(
  interventionId: string,
  userId: string
): Promise<void> {
  await callComputeImpact("validate_intervention", {
    intervention_id: interventionId,
    user_id: userId,
  });
}

export async function fetchClientRecords(entrepriseId: string): Promise<ImpactRecord[]> {
  const { data, error } = await supabase
    .from("impact_records")
    .select("*, interventions(date_intervention, vehicule_id, vehicules(immatriculation))")
    .eq("entreprise_id", entrepriseId)
    .eq("status", "validated")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ImpactRecord[];
}

// ─────────────────────────────────────────────────────────────
// Labels et couleurs par catégorie
// ─────────────────────────────────────────────────────────────

export const CATEGORY_META: Record<
  ImpactCategory,
  { label: string; unit: string; color: string; fillColor: string }
> = {
  water: { label: "Eau économisée", unit: "L", color: "#2563eb", fillColor: "#dbeafe" },
  pollution: {
    label: "Pollution évitée",
    unit: "L",
    color: "#059669",
    fillColor: "#d1fae5",
  },
  circular: { label: "Compost produit", unit: "kg", color: "#d97706", fillColor: "#fef3c7" },
  ghg: { label: "CO₂ évité", unit: "kgCO₂e", color: "#7c3aed", fillColor: "#ede9fe" },
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
