import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Coefficients constants — pas de DB
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

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }

  try {
    const { action, intervention_id, entreprise_id, user_id } = await req.json();

    // 1. Generate impact records for an intervention
    if (action === "generate") {
      const { data: inter, error: interErr } = await db
        .from("interventions")
        .select("*")
        .eq("id", intervention_id)
        .single();

      if (interErr || !inter) {
        throw new Error(`Intervention not found: ${intervention_id}`);
      }

      if (inter.statut !== "validee") {
        throw new Error(`Intervention not validated: ${inter.statut}`);
      }

      // Check if already generated (idempotent)
      const { count } = await db
        .from("impact_records")
        .select("id", { count: "exact", head: true })
        .eq("intervention_id", intervention_id);

      if (count && count > 0) {
        return new Response(
          JSON.stringify({ success: true, inserted: 0, note: "already_generated" }),
          { status: 200 }
        );
      }

      // Get contrat_id if exists
      let contrat_id = null;
      if (inter.contrat_ligne_id) {
        const { data: ligne } = await db
          .from("contrat_lignes")
          .select("contrat_id")
          .eq("id", inter.contrat_ligne_id)
          .single();
        if (ligne) contrat_id = ligne.contrat_id;
      }

      // Generate 1 record per coefficient
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

      return new Response(
        JSON.stringify({ success: true, inserted: records.length }),
        { status: 200 }
      );
    }

    // 2. Get coefficients (admin)
    if (action === "get_coefficients") {
      return new Response(JSON.stringify(Object.values(COEFFICIENTS)), { status: 200 });
    }

    // 3. Get client impact summary
    if (action === "get_summary") {
      const { data: records, error: err } = await db
        .from("impact_records")
        .select("category, quantity, unit")
        .eq("entreprise_id", entreprise_id)
        .eq("status", "validated");

      if (err) throw err;

      // Totals by category
      const totals = records
        ? Object.values(
            (records as any[]).reduce(
              (acc, r) => {
                if (!acc[r.category]) {
                  acc[r.category] = { category: r.category, total: 0, unit: r.unit, records_count: 0 };
                }
                acc[r.category].total += r.quantity;
                acc[r.category].records_count += 1;
                return acc;
              },
              {} as Record<string, any>
            )
          ).sort((a, b) => a.category.localeCompare(b.category))
        : [];

      // Timeline (12 months)
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
        if (!timelineMap.has(month)) {
          timelineMap.set(month, {
            month,
            water: 0,
            pollution: 0,
            circular: 0,
            ghg: 0,
          });
        }
        const entry = timelineMap.get(month)!;
        entry[r.category] = (entry[r.category] || 0) + r.quantity;
      });

      const timeline = Array.from(timelineMap.values())
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((entry) => ({
          month: entry.month,
          water: Math.round(entry.water * 100) / 100,
          pollution: Math.round(entry.pollution * 100) / 100,
          circular: Math.round(entry.circular * 100) / 100,
          ghg: Math.round(entry.ghg * 100) / 100,
        }));

      return new Response(
        JSON.stringify({ totals, timeline }),
        { status: 200 }
      );
    }

    // 4. Validate records by intervention
    if (action === "validate_intervention") {
      const now = new Date().toISOString();
      const { error: err } = await db
        .from("impact_records")
        .update({ status: "validated", validated_by: user_id, validated_at: now })
        .eq("intervention_id", intervention_id)
        .eq("status", "estimated");

      if (err) throw err;
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // 5. Get estimated records
    if (action === "get_estimated") {
      const { data, error: err } = await db
        .from("impact_records")
        .select(
          `*,
           interventions(date_intervention, vehicule_id, vehicules(immatriculation)),
           entreprises(nom)`
        )
        .eq("status", "estimated")
        .order("created_at", { ascending: false });

      if (err) throw err;
      return new Response(JSON.stringify(data || []), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400 });
  } catch (error: any) {
    console.error("Impact function error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
