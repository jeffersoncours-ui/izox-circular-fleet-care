import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") ?? "https://izox.fr",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const COEFFICIENTS = {
  water_saved: {
    code: "water_saved",
    label: "Eau économisée / prestation",
    category: "water",
    esrs_topic: "E3",
    value: 140,
    unit: "L",
    source: "IZOX estimate",
  },
  pollution_avoided: {
    code: "pollution_avoided",
    label: "Eaux polluées évitées / prestation",
    category: "pollution",
    esrs_topic: "E2",
    value: 140,
    unit: "L",
    source: "IZOX estimate",
  },
  compost_produced: {
    code: "compost_produced",
    label: "Compost / terreau produit / prestation",
    category: "circular",
    esrs_topic: "E5",
    value: 0.2,
    unit: "kg",
    source: "IZOX estimate",
  },
  co2_avoided: {
    code: "co2_avoided",
    label: "CO2 évité / prestation",
    category: "ghg",
    esrs_topic: "E1",
    value: 0.5,
    unit: "kgCO2e",
    source: "PLACEHOLDER",
  },
} as const;

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: CORS });

async function getCallerRole(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(SUPABASE_URL, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) return null;
  const { data: profile } = await db.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
  return profile?.role ?? null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const { action, intervention_id, entreprise_id, user_id } = await req.json();
    const authHeader = req.headers.get("Authorization");

    // 1. Generate impact records for an intervention
    if (action === "generate") {
      const role = await getCallerRole(authHeader);
      if (!role || !["admin", "staff"].includes(role)) return json({ error: "Accès refusé" }, 403);
      const { data: inter, error: interErr } = await db
        .from("interventions")
        .select("*")
        .eq("id", intervention_id)
        .single();

      if (interErr || !inter) throw new Error(`Intervention not found: ${intervention_id}`);
      if (inter.statut !== "validee") throw new Error(`Intervention not validated: ${inter.statut}`);

      const { count } = await db
        .from("impact_records")
        .select("id", { count: "exact", head: true })
        .eq("intervention_id", intervention_id);

      if (count && count > 0) return json({ success: true, inserted: 0, note: "already_generated" });

      let contrat_id = null;
      if (inter.contrat_ligne_id) {
        const { data: ligne } = await db
          .from("contrat_lignes")
          .select("contrat_id")
          .eq("id", inter.contrat_ligne_id)
          .single();
        if (ligne) contrat_id = ligne.contrat_id;
      }

      const records = Object.values(COEFFICIENTS).map((coeff) => ({
        intervention_id,
        contrat_id,
        entreprise_id: inter.entreprise_id,
        coefficient_snapshot: coeff,
        category: coeff.category,
        quantity: coeff.value,
        unit: coeff.unit,
        status: "estimated",
      }));

      const { error: insertErr } = await db.from("impact_records").insert(records);
      if (insertErr) throw insertErr;

      return json({ success: true, inserted: records.length });
    }

    // 2. Get coefficients (admin)
    if (action === "get_coefficients") return json(Object.values(COEFFICIENTS));

    // 3. Get client impact summary
    if (action === "get_summary") {
      const { data: records, error: err } = await db
        .from("impact_records")
        .select("category, quantity, unit")
        .eq("entreprise_id", entreprise_id)
        .eq("status", "validated");

      if (err) throw err;

      const totals = records
        ? Object.values(
            (records as any[]).reduce((acc, r) => {
              if (!acc[r.category]) acc[r.category] = { category: r.category, total: 0, unit: r.unit, records_count: 0 };
              acc[r.category].total += r.quantity;
              acc[r.category].records_count += 1;
              return acc;
            }, {} as Record<string, any>)
          ).sort((a: any, b: any) => a.category.localeCompare(b.category))
        : [];

      const now = new Date();
      const twelveMonthsAgo = new Date(now.setFullYear(now.getFullYear() - 1));

      const { data: timelineRecords } = await db
        .from("impact_records")
        .select("category, quantity, created_at")
        .eq("entreprise_id", entreprise_id)
        .eq("status", "validated")
        .gte("created_at", twelveMonthsAgo.toISOString());

      const timelineMap = new Map<string, Record<string, number>>();
      timelineRecords?.forEach((r) => {
        const month = r.created_at.slice(0, 7);
        if (!timelineMap.has(month)) timelineMap.set(month, { month, water: 0, pollution: 0, circular: 0, ghg: 0 });
        const entry = timelineMap.get(month)!;
        entry[r.category] = (entry[r.category] || 0) + r.quantity;
      });

      const timeline = Array.from(timelineMap.values())
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((e) => ({
          month: e.month,
          water: Math.round(e.water * 100) / 100,
          pollution: Math.round(e.pollution * 100) / 100,
          circular: Math.round(e.circular * 100) / 100,
          ghg: Math.round(e.ghg * 100) / 100,
        }));

      return json({ totals, timeline });
    }

    // 4. Validate records by intervention
    if (action === "validate_intervention") {
      const role = await getCallerRole(authHeader);
      if (!role || !["admin", "staff"].includes(role)) return json({ error: "Accès refusé" }, 403);
      const now = new Date().toISOString();
      const { error: err } = await db
        .from("impact_records")
        .update({ status: "validated", validated_by: user_id, validated_at: now })
        .eq("intervention_id", intervention_id)
        .eq("status", "estimated");

      if (err) throw err;
      return json({ success: true });
    }

    // 5. Get client records (validated, with joins)
    if (action === "get_client_records") {
      const { data, error: err } = await db
        .from("impact_records")
        .select(`*, interventions(date_intervention, vehicule_id, vehicules(immatriculation))`)
        .eq("entreprise_id", entreprise_id)
        .eq("status", "validated")
        .order("created_at", { ascending: false });

      if (err) throw err;
      return json(data || []);
    }

    // 6. Get estimated records (admin validation queue)
    if (action === "get_estimated") {
      const role = await getCallerRole(authHeader);
      if (!role || !["admin", "staff"].includes(role)) return json({ error: "Accès refusé" }, 403);
      const { data, error: err } = await db
        .from("impact_records")
        .select(`*, interventions(date_intervention, vehicule_id, vehicules(immatriculation)), entreprises(nom)`)
        .eq("status", "estimated")
        .order("created_at", { ascending: false });

      if (err) throw err;
      return json(data || []);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error: any) {
    console.error("Impact function error:", error);
    return json({ error: error.message }, 500);
  }
});
