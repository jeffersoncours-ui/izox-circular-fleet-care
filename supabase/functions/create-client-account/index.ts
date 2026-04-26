// Creates entreprise + auth user + profile + user_role atomically.
// Rolls back on any failure. Admin/staff only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  entreprise: {
    nom: string;
    siret?: string | null;
    adresse?: string | null;
    ville?: string | null;
    code_postal?: string | null;
    email_contact?: string | null;
    telephone?: string | null;
    type_client?: "flotte" | "concession" | "vtc" | "autre";
    commercial_id?: string | null;
  };
  user: {
    prenom: string;
    nom: string;
    email: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin or staff
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(url, serviceKey);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);

    const isAuthorized = roles?.some((r) => r.role === "admin" || r.role === "staff");
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: Payload = await req.json();

    // Generate temp password
    const tempPassword = `Izox-${crypto.randomUUID().slice(0, 8)}!`;

    // 1. Create entreprise
    const { data: entreprise, error: entErr } = await admin
      .from("entreprises")
      .insert(payload.entreprise)
      .select("id")
      .single();
    if (entErr) throw new Error(`Entreprise: ${entErr.message}`);

    // 2. Create auth user
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: payload.user.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { prenom: payload.user.prenom, nom: payload.user.nom },
    });
    if (authErr || !authUser.user) {
      // rollback entreprise
      await admin.from("entreprises").delete().eq("id", entreprise.id);
      throw new Error(`Auth: ${authErr?.message ?? "création utilisateur échouée"}`);
    }

    const userId = authUser.user.id;

    try {
      // 3. Update profile (auto-created by trigger)
      const { error: profErr } = await admin
        .from("profiles")
        .upsert({
          id: userId,
          prenom: payload.user.prenom,
          nom: payload.user.nom,
          entreprise_id: entreprise.id,
          role: "client",
        }, { onConflict: "id" });
      if (profErr) throw new Error(`Profile: ${profErr.message}`);

      // 4. Insert user_role
      const { error: roleErr } = await admin
        .from("user_roles")
        .insert({ user_id: userId, role: "client" });
      if (roleErr) throw new Error(`Role: ${roleErr.message}`);
    } catch (e) {
      // Rollback all
      await admin.auth.admin.deleteUser(userId);
      await admin.from("entreprises").delete().eq("id", entreprise.id);
      throw e;
    }

    return new Response(JSON.stringify({
      ok: true,
      entreprise_id: entreprise.id,
      user_id: userId,
      email: payload.user.email,
      temp_password: tempPassword,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
