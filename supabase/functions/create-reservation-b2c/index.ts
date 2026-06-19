import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Inline pricing catalog — kept in sync with src/lib/pricing-b2c.ts.
const PRIX_BASE: Record<string, Record<string, number>> = {
  interieur: { citadine: 80, berline: 110, suv: 140, utilitaire: 170 },
  interieur_exterieur: { citadine: 110, berline: 140, suv: 170, utilitaire: 200 },
};
const PRIX_OPTIONS: Record<string, Record<string, number>> = {
  puzzi: { citadine: 40, berline: 47, suv: 53, utilitaire: 60 },
  ozone: { citadine: 40, berline: 40, suv: 40, utilitaire: 40 },
};

function calculerPrix(vehicule: string, formule: string, options: string[]): number {
  const base = PRIX_BASE[formule]?.[vehicule] ?? 0;
  const opts = options.reduce((sum, o) => sum + (PRIX_OPTIONS[o]?.[vehicule] ?? 0), 0);
  return base + opts;
}

const ALLOWED_ORIGINS = [
  "https://izox-circular-fleet-care.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function str(v: unknown, field: string): string {
  if (typeof v !== "string" || v.trim() === "") throw new Error(`Champ manquant : ${field}`);
  return v.trim();
}

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée" }), {
      status: 405, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    const prenom = str(body.prenom, "prenom");
    const nom = str(body.nom, "nom");
    const email = str(body.email, "email");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email invalide");
    const telephone = str(body.telephone, "telephone");
    const adresse = str(body.adresse, "adresse");
    const ville = str(body.ville, "ville");
    const code_postal = str(body.code_postal, "code_postal");

    const vehicule = str(body.vehicule, "vehicule");
    if (!["citadine","berline","suv","utilitaire"].includes(vehicule))
      throw new Error("Type véhicule invalide");

    const formule = str(body.formule, "formule");
    if (!["interieur","interieur_exterieur"].includes(formule))
      throw new Error("Formule invalide");

    const options = Array.isArray(body.options) ? body.options : [];
    for (const o of options) {
      if (!["puzzi","ozone"].includes(o)) throw new Error(`Option invalide : ${o}`);
    }

    // Price is always recalculated server-side — never trusted from the client.
    const montant_ttc = calculerPrix(vehicule, formule, options);
    if (montant_ttc <= 0) throw new Error("Montant invalide");

    const creneaux = Array.isArray(body.creneaux_preferes) ? body.creneaux_preferes : [];
    if (creneaux.length < 2) throw new Error("Minimum 2 créneaux requis");

    const dates = creneaux.map((c: { date: string }) => c.date);
    const uniqueDates = new Set(dates);
    if (uniqueDates.size < 2) throw new Error("Les créneaux doivent être sur au moins 2 dates différentes");
    if (uniqueDates.size !== creneaux.length) throw new Error("Un seul créneau par date autorisé");

    const VALID_HEURES = ["08:00","10:00","14:00","16:00"];
    for (const c of creneaux) {
      if (!c.date || !/^\d{4}-\d{2}-\d{2}$/.test(c.date))
        throw new Error("Date créneau invalide");
      if (!VALID_HEURES.includes(c.heure))
        throw new Error(`Heure invalide : ${c.heure}`);
      const dayOfWeek = new Date(c.date + "T12:00:00Z").getUTCDay();
      if (dayOfWeek === 0) throw new Error("Les dimanches ne sont pas disponibles");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("reservations_b2c")
      .insert({
        prenom, nom, email, telephone,
        adresse, ville, code_postal,
        vehicule, formule,
        options: JSON.stringify(options),
        montant_ttc,
        creneaux_preferes: JSON.stringify(creneaux),
        statut: "en_attente_paiement",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    // Alerte équipe : notif in-app (1 ligne / membre staff) + email.
    // Awaited (best-effort) car l'isolate Deno peut être recyclé après la réponse ;
    // la réservation est déjà persistée, ces étapes ne peuvent plus la faire échouer.
    try {
      const { data: staff } = await supabase
        .from("profiles")
        .select("id")
        .in("role", ["admin", "staff", "commercial"]);
      if (staff && staff.length > 0) {
        await supabase.from("notifications_internes").insert(
          staff.map((p: { id: string }) => ({
            user_id: p.id,
            titre: `Nouvelle réservation B2C — ${prenom} ${nom}`,
            severite: "info",
            source_action: "reservation_b2c_recue",
            action_requise: true,
            link_url: "/admin/planning?tab=demandes",
            details: { reservation_id: data.id, vehicule, formule, montant_ttc },
          })),
        );
      }
    } catch (_e) { /* notif interne best-effort */ }

    try {
      // Service-to-service : le client service-role est porteur du SERVICE_ROLE_KEY,
      // reconnu comme appel interne de confiance par send-email.
      await supabase.functions.invoke("send-email", {
        body: { type: "reservation_b2c_recue", target_id: data.id },
      });
    } catch (_e) { /* email best-effort */ }

    return new Response(JSON.stringify({ id: data.id }), {
      status: 201,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
