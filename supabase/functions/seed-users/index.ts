// One-shot seed function: creates the 6 test accounts + 2 entreprises
// Idempotent: skips users that already exist.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SeedUser {
  email: string;
  password: string;
  prenom: string;
  nom: string;
  role: "admin" | "staff" | "commercial" | "operateur" | "client";
  entrepriseNom?: string;
}

const PASSWORD = "Izox2026!";

const USERS: SeedUser[] = [
  { email: "admin@izox.fr", password: PASSWORD, prenom: "Admin", nom: "IZOX", role: "admin" },
  { email: "staff@izox.fr", password: PASSWORD, prenom: "Staff", nom: "IZOX", role: "staff" },
  { email: "commercial@izox.fr", password: PASSWORD, prenom: "Commercial", nom: "IZOX", role: "commercial" },
  { email: "operateur@izox.fr", password: PASSWORD, prenom: "Opérateur", nom: "IZOX", role: "operateur" },
  { email: "client@durand.fr", password: PASSWORD, prenom: "Jean", nom: "Durand", role: "client", entrepriseNom: "Transport Durand" },
  { email: "client@vtc-express.fr", password: PASSWORD, prenom: "Marc", nom: "Leroy", role: "client", entrepriseNom: "VTC Express" },
];

const ENTREPRISES = [
  { nom: "Transport Durand", type_client: "flotte", ville: "Paris", code_postal: "75011", email_contact: "contact@durand.fr" },
  { nom: "VTC Express", type_client: "vtc", ville: "Lyon", code_postal: "69003", email_contact: "contact@vtc-express.fr" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const created: string[] = [];
    const skipped: string[] = [];

    // 1. Create entreprises (upsert by nom)
    const entrepriseMap = new Map<string, string>();
    for (const e of ENTREPRISES) {
      const { data: existing } = await supabase
        .from("entreprises")
        .select("id")
        .eq("nom", e.nom)
        .maybeSingle();

      if (existing) {
        entrepriseMap.set(e.nom, existing.id);
      } else {
        const { data, error } = await supabase
          .from("entreprises")
          .insert(e)
          .select("id")
          .single();
        if (error) throw new Error(`entreprise ${e.nom}: ${error.message}`);
        entrepriseMap.set(e.nom, data.id);
      }
    }

    // 2. Create users
    for (const u of USERS) {
      // Check existing
      const { data: list } = await supabase.auth.admin.listUsers();
      const exists = list?.users.find((x) => x.email === u.email);

      let userId: string;
      if (exists) {
        userId = exists.id;
        skipped.push(u.email);
      } else {
        const { data: created_user, error } = await supabase.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { prenom: u.prenom, nom: u.nom },
        });
        if (error) throw new Error(`auth ${u.email}: ${error.message}`);
        userId = created_user.user!.id;
        created.push(u.email);
      }

      // Upsert profile
      const entreprise_id = u.entrepriseNom ? entrepriseMap.get(u.entrepriseNom) : null;
      await supabase
        .from("profiles")
        .upsert({
          id: userId,
          prenom: u.prenom,
          nom: u.nom,
          role: u.role,
          entreprise_id,
        }, { onConflict: "id" });

      // Upsert role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", u.role)
        .maybeSingle();

      if (!existingRole) {
        await supabase.from("user_roles").insert({ user_id: userId, role: u.role });
      }
    }

    return new Response(JSON.stringify({ ok: true, created, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
