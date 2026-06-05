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

    const query = encodeURIComponent(`${adresse}, ${code_postal} ${ville}, France`);
    const nominatimUrl =
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=fr`;

    const response = await fetch(nominatimUrl, {
      headers: {
        // Nominatim requires a valid User-Agent identifying the application
        "User-Agent": "IZOX-CircularFleetCare/1.0 (noreply@izox.fr)",
        "Accept-Language": "fr",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const results = await response.json();

    if (!results || results.length === 0) {
      return new Response(
        JSON.stringify({ error: "Adresse introuvable", latitude: null, longitude: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { lat, lon } = results[0];
    return new Response(
      JSON.stringify({ latitude: parseFloat(lat), longitude: parseFloat(lon) }),
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
