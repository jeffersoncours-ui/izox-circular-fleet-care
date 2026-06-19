// Lets a logged-in client update their OWN account info.
// Only whitelisted fields are writable — never palier_remise, type_client,
// commercial_id, siret or compte_active (those stay admin-controlled).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://izox.fr";

function corsFor(req: Request): Record<string, string> {
  const requestOrigin = req.headers.get("Origin") ?? "";
  let allow = SITE_URL;
  try {
    const o = new URL(requestOrigin);
    if (
      requestOrigin === SITE_URL ||
      o.hostname === "izox.fr" ||
      o.hostname === "izox-circular-fleet-care.vercel.app" ||
      /^izox-circular-fleet-care[a-z0-9-]*\.vercel\.app$/.test(o.hostname)
    ) {
      allow = requestOrigin;
    }
  } catch { /* keep fallback */ }
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

type MaybeStr = string | null | undefined;
const clean = (v: MaybeStr): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
};

interface Payload {
  prenom?: MaybeStr;
  nom?: MaybeStr;
  entreprise?: {
    adresse?: MaybeStr;
    ville?: MaybeStr;
    code_postal?: MaybeStr;
    telephone?: MaybeStr;
    email_contact?: MaybeStr;
  };
}

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: jsonHeaders,
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Identify the caller from their JWT.
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData.user;
    if (!caller) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401, headers: jsonHeaders,
      });
    }

    const payload: Payload = await req.json().catch(() => ({}));
    const admin = createClient(url, serviceKey);

    // 1. Update the caller's own profile (personal identity fields only).
    const prenom = clean(payload.prenom);
    const nom = clean(payload.nom);
    const { error: profErr } = await admin
      .from("profiles")
      .update({ prenom, nom })
      .eq("id", caller.id);
    if (profErr) throw new Error(`Profil: ${profErr.message}`);

    // 2. Update the caller's entreprise — whitelisted contact fields only.
    const { data: prof } = await admin
      .from("profiles")
      .select("entreprise_id")
      .eq("id", caller.id)
      .maybeSingle();

    if (prof?.entreprise_id && payload.entreprise) {
      const { error: entErr } = await admin
        .from("entreprises")
        .update({
          adresse: clean(payload.entreprise.adresse),
          ville: clean(payload.entreprise.ville),
          code_postal: clean(payload.entreprise.code_postal),
          telephone: clean(payload.entreprise.telephone),
          email_contact: clean(payload.entreprise.email_contact),
        })
        .eq("id", prof.entreprise_id);
      if (entErr) throw new Error(`Entreprise: ${entErr.message}`);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
