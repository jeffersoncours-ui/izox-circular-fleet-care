import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────
// Types (tables non encore dans le types.ts auto-généré)
// ─────────────────────────────────────────────────────────────

export type ImpactCategory = "water" | "pollution" | "circular" | "ghg";

export interface ImpactCoefficient {
  id: string;
  code: string;
  label: string;
  category: ImpactCategory;
  esrs_topic: string | null;
  ghg_scope: number | null;
  value: number;
  unit: string;
  source: string | null;
  valid_from: string;
  valid_to: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ImpactRecord {
  id: string;
  intervention_id: string;
  contrat_id: string | null;
  entreprise_id: string;
  coefficient_id: string | null;
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
// Client Supabase casté pour les nouvelles tables/RPCs
// (à remplacer par la régénération des types Supabase en prod)
// ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as SupabaseClient<any>;

// ─────────────────────────────────────────────────────────────
// Wrappers typés pour les nouvelles RPCs
// ─────────────────────────────────────────────────────────────

export async function getClientImpactSummary(
  entrepriseId: string,
): Promise<ImpactSummaryResult> {
  const { data, error } = await db.rpc("get_client_impact_summary", {
    p_entreprise_id: entrepriseId,
  });
  if (error) throw error;
  return data as ImpactSummaryResult;
}

/** Fire-and-forget — appelé après validation admin d'une intervention. */
export async function generateImpactRecords(interventionId: string): Promise<void> {
  const { error } = await db.rpc("generate_impact_records", {
    p_intervention_id: interventionId,
  });
  if (error) console.warn("[impact] generate_impact_records failed", error);
}

export async function fetchImpactCoefficients(): Promise<ImpactCoefficient[]> {
  const { data, error } = await db
    .from("impact_coefficients")
    .select("*")
    .order("category")
    .order("code");
  if (error) throw error;
  return (data ?? []) as ImpactCoefficient[];
}

export async function updateCoefficient(
  id: string,
  patch: Partial<Pick<ImpactCoefficient, "label" | "value" | "unit" | "source" | "esrs_topic" | "active">>,
): Promise<void> {
  const { error } = await db
    .from("impact_coefficients")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function fetchEstimatedRecords(): Promise<ImpactRecord[]> {
  const { data, error } = await db
    .from("impact_records")
    .select("*, interventions(date_intervention, vehicule_id, vehicules(immatriculation)), entreprises(nom)")
    .eq("status", "estimated")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ImpactRecord[];
}

export async function validateRecordsByIntervention(
  interventionId: string,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await db
    .from("impact_records")
    .update({ status: "validated", validated_by: userId, validated_at: now })
    .eq("intervention_id", interventionId)
    .eq("status", "estimated");
  if (error) throw error;
}

export async function fetchClientRecords(entrepriseId: string): Promise<ImpactRecord[]> {
  const { data, error } = await db
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
  water:     { label: "Eau économisée",  unit: "L",      color: "#2563eb", fillColor: "#dbeafe" },
  pollution: { label: "Pollution évitée", unit: "L",     color: "#059669", fillColor: "#d1fae5" },
  circular:  { label: "Compost produit", unit: "kg",     color: "#d97706", fillColor: "#fef3c7" },
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
