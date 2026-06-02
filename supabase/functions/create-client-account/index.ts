// Creates entreprise + auth user + profile + user_role atomically.
// Rolls back on any failure. Admin/staff only.
// Sends a branded welcome email via Resend with a "set password" link.
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
  // Where the "set password" link should land. Passed by the frontend so the
  // link always points at the origin the app is actually served from
  // (Vercel today, izox.fr after migration). Falls back to SITE_URL.
  redirect_to?: string;
}

function buildWelcomeText(prenom: string, link: string): string {
  return `Bonjour ${prenom},

Votre compte IZOX vient d'être créé.

Cliquez sur le lien ci-dessous pour définir votre mot de passe et accéder à votre espace client :

${link}

Ce lien est valable 24 heures. Passé ce délai, contactez votre équipe IZOX pour obtenir un nouveau lien.

Si vous n'attendiez pas cet email, vous pouvez l'ignorer en toute sécurité.

---
© 2026 IZOX — izox.fr
Nettoyage automobile éco-responsable`;
}

function buildWelcomeHtml(prenom: string, link: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Bienvenue chez IZOX</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f0f4f0">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
          <tr>
            <td style="background:#1B4332;padding:28px 36px">
              <span style="color:#ffffff;font-size:26px;font-weight:700;letter-spacing:3px">IZOX</span>
              <p style="margin:4px 0 0;color:#6ee7b7;font-size:12px;letter-spacing:1px">Nettoyage automobile éco-responsable</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px">
              <h2 style="margin:0 0 8px;color:#1B4332;font-size:20px">Bienvenue chez IZOX ✓</h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px">Bonjour ${prenom},</p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">
                Votre compte IZOX vient d'être créé. Cliquez sur le bouton ci-dessous pour
                <strong style="color:#1B4332">définir votre mot de passe</strong> et accéder à votre espace client.
              </p>
              <div style="text-align:center;margin:28px 0">
                <a href="${link}"
                  style="display:inline-block;background:#1B4332;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px">
                  Définir mon mot de passe
                </a>
              </div>
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.6">
                Ce lien est valable <strong>24 heures</strong>. Passé ce délai, contactez votre équipe IZOX
                pour obtenir un nouveau lien.
              </p>
              <p style="margin:0;color:#9ca3af;font-size:12px">
                Si vous n'attendiez pas cet email, vous pouvez l'ignorer en toute sécurité.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8faf8;padding:18px 36px;border-top:1px solid #e5e7eb">
              <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center">
                © 2026 IZOX — <a href="https://izox.fr" style="color:#1B4332;text-decoration:none">izox.fr</a>
                &nbsp;·&nbsp; Cet email a été envoyé automatiquement, merci de ne pas y répondre.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendWelcomeEmail(
  resendKey: string,
  from: string,
  to: string,
  prenom: string,
  link: string,
): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: "contact@izox.fr",
        subject: "Bienvenue chez IZOX — Définissez votre mot de passe",
        html: buildWelcomeHtml(prenom, link),
        text: buildWelcomeText(prenom, link),
      }),
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, detail: `HTTP ${res.status} ${JSON.stringify(body)}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
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
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://izox.fr";
    const emailFrom = Deno.env.get("EMAIL_FROM") ?? "IZOX <noreply@izox.fr>";

    // Verify caller is admin or staff
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401, headers: jsonHeaders,
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
        status: 403, headers: jsonHeaders,
      });
    }

    const payload: Payload = await req.json();

    // 1. Create entreprise
    const { data: entreprise, error: entErr } = await admin
      .from("entreprises")
      .insert(payload.entreprise)
      .select("id")
      .single();
    if (entErr) throw new Error(`Entreprise: ${entErr.message}`);

    // 2. Create auth user (temp password never exposed; <72 bytes for bcrypt)
    const tempPassword = crypto.randomUUID();
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: payload.user.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { prenom: payload.user.prenom, nom: payload.user.nom },
    });
    if (authErr || !authUser.user) {
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
      await admin.auth.admin.deleteUser(userId);
      await admin.from("entreprises").delete().eq("id", entreprise.id);
      throw e;
    }

    // 5. Generate a "set password" recovery link (non-fatal if it fails)
    let inviteLink: string | null = null;
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: payload.user.email,
        options: { redirectTo: payload.redirect_to || `${siteUrl}/reset-password` },
      });
      inviteLink = linkData?.properties?.action_link ?? null;
    } catch {
      // Account was created — link generation failure is non-fatal
    }

    // 6. Send welcome email via Resend (non-fatal if it fails)
    let emailSent = false;
    let emailError: string | null = null;
    if (resendKey && inviteLink) {
      const r = await sendWelcomeEmail(resendKey, emailFrom, payload.user.email, payload.user.prenom, inviteLink);
      emailSent = r.ok;
      emailError = r.ok ? null : r.detail;
      try {
        await admin.from("email_logs").insert({
          type: "welcome_account",
          target_id: userId,
          email_to: payload.user.email,
          status: r.ok ? "sent" : "failed",
          error_message: r.detail,
        });
      } catch { /* log failure is non-fatal */ }
    } else if (!resendKey) {
      emailError = "RESEND_API_KEY non configurée";
    } else if (!inviteLink) {
      emailError = "Génération du lien échouée — email non envoyé";
    }

    return new Response(JSON.stringify({
      ok: true,
      entreprise_id: entreprise.id,
      user_id: userId,
      email: payload.user.email,
      email_sent: emailSent,
      email_error: emailError,
      // Expose link as fallback only if email sending failed
      invite_link: emailSent ? null : inviteLink,
    }), { headers: jsonHeaders });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
