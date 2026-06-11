import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") ?? "https://izox.fr",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { adresse, ville, code_postal } = body ?? {};

    if (!adresse || !ville || !code_postal) {
      return new Response(
        JSON.stringify({ error: "adresse, ville et code_postal sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Étend les abréviations FR courantes : Nominatim échoue souvent sur
    // "Av. du Gén Leclerc" mais réussit sur "Avenue du Général Leclerc".
    const ABBREV: Record<string, string> = {
      "av": "Avenue", "ave": "Avenue", "bd": "Boulevard", "bld": "Boulevard",
      "bvd": "Boulevard", "boul": "Boulevard", "gén": "Général", "gen": "Général",
      "st": "Saint", "ste": "Sainte", "pl": "Place", "imp": "Impasse",
      "rte": "Route", "fbg": "Faubourg", "all": "Allée", "che": "Chemin",
      "chem": "Chemin", "sq": "Square", "pass": "Passage", "qu": "Quai",
    };
    const normaliser = (s: string): string =>
      s
        .split(/\s+/)
        .map((mot) => {
          const clean = mot.replace(/\.$/, "").toLowerCase();
          return ABBREV[clean] ?? mot;
        })
        .join(" ");

    const geocode = async (q: string) => {
      const url =
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=fr`;
      const r = await fetch(url, {
        headers: {
          // Nominatim requires a valid User-Agent identifying the application
          "User-Agent": "IZOX-CircularFleetCare/1.0 (noreply@izox.fr)",
          "Accept-Language": "fr",
        },
      });
      if (!r.ok) throw new Error(`Nominatim error: ${r.status}`);
      const results = await r.json();
      return results && results.length > 0 ? results[0] : null;
    };

    // Tentatives en cascade : adresse exacte → adresse normalisée →
    // ville + code postal (point ville par défaut, mieux que rien sur la carte).
    const adresseNorm = normaliser(adresse);
    const tentatives = [
      `${adresse}, ${code_postal} ${ville}, France`,
      ...(adresseNorm !== adresse ? [`${adresseNorm}, ${code_postal} ${ville}, France`] : []),
      `${code_postal} ${ville}, France`,
    ];

    let hit = null;
    for (const q of tentatives) {
      hit = await geocode(q);
      if (hit) break;
    }

    if (!hit) {
      return new Response(
        JSON.stringify({ error: "Adresse introuvable", latitude: null, longitude: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ latitude: parseFloat(hit.lat), longitude: parseFloat(hit.lon) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("geocode-address error:", err);
    return new Response(
      JSON.stringify({ error: String(err), latitude: null, longitude: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
