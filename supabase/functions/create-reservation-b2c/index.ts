import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

    const montant_ttc = Number(body.montant_ttc);
    if (!isFinite(montant_ttc) || montant_ttc <= 0) throw new Error("Montant invalide");

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

    // Fire-and-forget: notif interne équipe
    supabase.from("notifications_internes").insert({
      type: "reservation_b2c",
      message: `Nouvelle réservation B2C — ${prenom} ${nom} (${vehicule}, ${formule}) — ${montant_ttc} € TTC`,
      target_id: data.id,
      target_type: "reservation_b2c",
    }).then(() => {});

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
