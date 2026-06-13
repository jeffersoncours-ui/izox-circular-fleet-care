// DISABLED — this one-shot dev seeder is permanently neutralized.
//
// SECURITY: a previous version was deployed with `verify_jwt = false` (public)
// and used the service-role key to create privileged accounts (admin/staff)
// with a hard-coded password. Anyone who knew the URL could mint an admin
// account. The endpoint now returns 410 Gone and creates nothing.
//
// Test accounts are managed exclusively via the SQL purge/seed flow documented
// in CLAUDE.md §7. Do NOT re-enable this function.
const corsHeaders = {
  "Access-Control-Allow-Origin": "null",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return new Response(
    JSON.stringify({ ok: false, error: "Gone — this endpoint is permanently disabled." }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
