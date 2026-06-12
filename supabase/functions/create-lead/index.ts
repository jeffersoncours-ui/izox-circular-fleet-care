// Public endpoint: capture des leads du site vitrine (landing B2C).
// - type "b2b"         : formulaire /entreprises → notification interne équipe
// - type "b2c_attente" : liste d'attente réservations /reservation
//
// Security: intentionnellement public (verify_jwt = false) — l'appelant est un
// visiteur anonyme. Garde-fous : whitelist de types, validation email, caps de
// longueur, anti-doublon DB (unique lower(email)+type → réponse ok idempotente,
// aucune énumération possible).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function corsFor(req: Request): Record<string, string> {
  const siteUrl = Deno.env.get("SITE_URL") ?? "https://izox.fr";
  const requestOrigin = req.headers.get("Origin") ?? "";
  let origin = siteUrl;
  try {
    const o = new URL(requestOrigin);
    const siteHost = new URL(siteUrl).hostname;
    if (o.hostname === siteHost || o.hostname.endsWith(".vercel.app")) {
      origin = requestOrigin;
    }
  } catch { /* keep siteUrl fallback */ }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 && t.length <= max ? t : null;
}

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const type = body.type;
    if (type !== "b2b" && type !== "b2c_attente") {
      return new Response(JSON.stringify({ error: "Type invalide" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const email = str(body.email, 254);
    if (!email || !EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: "Email invalide" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const lead: Record<string, unknown> = {
      type,
      email: email.toLowerCase(),
      nom: str(body.nom, 120),
      societe: str(body.societe, 160),
      taille_flotte: str(body.taille_flotte, 40),
      telephone: str(body.telephone, 30),
      code_postal: str(body.code_postal, 10),
    };

    if (type === "b2b" && (!lead.nom || !lead.societe || !lead.telephone)) {
      return new Response(JSON.stringify({ error: "Champs requis manquants" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await admin.from("leads_landing").insert(lead);
    // Doublon (email+type déjà inscrit) → réponse ok idempotente : on ne révèle
    // pas qu'un email est déjà en base, et l'UX visiteur reste positive.
    if (error && error.code !== "23505") throw error;
    const isDuplicate = error?.code === "23505";

    // Lead B2B inédit → notification interne pour l'équipe commerciale.
    if (type === "b2b" && !isDuplicate) {
      const { data: staff } = await admin
        .from("profiles")
        .select("id")
        .in("role", ["admin", "staff", "commercial"]);
      if (staff && staff.length > 0) {
        await admin.from("notifications_internes").insert(
          staff.map((p: { id: string }) => ({
            user_id: p.id,
            titre: `Nouveau lead flotte — ${lead.societe} (${lead.taille_flotte ?? "taille inconnue"})`,
            severite: "info",
            source_action: "lead_b2b_recu",
            action_requise: true,
            details: { nom: lead.nom, email: lead.email, telephone: lead.telephone },
          })),
        );
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-lead error:", e);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
