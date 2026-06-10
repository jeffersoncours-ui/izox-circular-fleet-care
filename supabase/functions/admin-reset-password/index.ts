// Admin-only: generate a magic recovery link for a user.
// Also sends a branded password-reset email via Resend automatically.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://izox.fr";

// Dynamic CORS — reflect the request origin when it is a known IZOX frontend
// (production site, or any *.vercel.app deploy: canonical app + preview URLs).
// The static SITE_URL value broke this endpoint when the app is served from a
// vercel.app domain: the OPTIONS preflight passed but the browser blocked the
// POST because the allowed origin (izox.fr) didn't match. Authorization is
// still enforced server-side via JWT + admin role, so reflecting a trusted
// frontend origin here is safe.
function corsFor(req: Request): Record<string, string> {
  const requestOrigin = req.headers.get("Origin") ?? "";
  let allow = SITE_URL;
  try {
    const o = new URL(requestOrigin);
    const siteHost = new URL(SITE_URL).hostname;
    if (o.hostname === siteHost || o.hostname.endsWith(".vercel.app")) {
      allow = requestOrigin;
    }
  } catch {
    /* malformed/absent Origin — keep SITE_URL fallback */
  }
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function safeRedirectTo(raw: unknown): string {
  const fallback = `${SITE_URL}/reset-password`;
  if (!raw || typeof raw !== "string") return fallback;
  try {
    const parsed = new URL(raw);
    const allowed = new Set([
      new URL(SITE_URL).origin,
      new URL("https://izox-circular-fleet-care.vercel.app").origin,
    ]);
    return allowed.has(parsed.origin) ? raw : fallback;
  } catch {
    return fallback;
  }
}

function buildResetText(link: string): string {
  return `Bonjour,

Une demande de réinitialisation de mot de passe a été effectuée pour votre compte IZOX.

Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe :

${link}

Ce lien est valable 24 heures. Passé ce délai, une nouvelle demande sera nécessaire.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email — votre mot de passe reste inchangé.

---
© 2026 IZOX — izox.fr
Nettoyage automobile éco-responsable`;
}

function buildResetHtml(link: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Réinitialisation de votre mot de passe — IZOX</title>
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
              <h2 style="margin:0 0 8px;color:#1B4332;font-size:20px">Réinitialisation de votre mot de passe</h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px">Bonjour,</p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">
                Une demande de réinitialisation de mot de passe a été effectuée pour votre compte IZOX.
                Cliquez sur le bouton ci-dessous pour choisir un <strong style="color:#1B4332">nouveau mot de passe</strong>.
              </p>
              <div style="text-align:center;margin:28px 0">
                <a href="${link}"
                  style="display:inline-block;background:#1B4332;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px">
                  Réinitialiser mon mot de passe
                </a>
              </div>
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.6">
                Ce lien est valable <strong>24 heures</strong>. Passé ce délai, une nouvelle demande sera nécessaire.
              </p>
              <p style="margin:0;color:#9ca3af;font-size:12px">
                Si vous n'avez pas demandé cette réinitialisation, ignorez cet email — votre mot de passe reste inchangé.
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

async function sendResetEmail(
  resendKey: string,
  from: string,
  to: string,
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
        subject: "Réinitialisation de votre mot de passe IZOX",
        html: buildResetHtml(link),
        text: buildResetText(link),
      }),
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, detail: `HTTP ${res.status} ${JSON.stringify(body)}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
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
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://izox.fr";
    const emailFrom = Deno.env.get("EMAIL_FROM") ?? "IZOX <noreply@izox.fr>";

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401, headers: jsonHeaders,
      });
    }

    const admin = createClient(url, serviceKey);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Réservé aux administrateurs" }), {
        status: 403, headers: jsonHeaders,
      });
    }

    const { email: directEmail, user_id, redirect_to } = await req.json();

    // Resolve email: accept either email directly or user_id (look up from auth)
    let email: string | undefined = directEmail;
    if (!email && user_id) {
      const { data: { user } } = await admin.auth.admin.getUserById(user_id);
      email = user?.email;
    }

    if (!email) {
      return new Response(JSON.stringify({ error: "Email ou user_id requis" }), {
        status: 400, headers: jsonHeaders,
      });
    }

    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: safeRedirectTo(redirect_to) },
    });

    if (error) throw error;

    const actionLink = data.properties?.action_link ?? null;

    // Auto-send reset email via Resend
    let emailSent = false;
    let emailError: string | null = null;
    if (resendKey && actionLink) {
      const r = await sendResetEmail(resendKey, emailFrom, email, actionLink);
      emailSent = r.ok;
      emailError = r.ok ? null : r.detail;
      try {
        await admin.from("email_logs").insert({
          type: "password_reset",
          target_id: data.user?.id ?? null,
          email_to: email,
          status: r.ok ? "sent" : "failed",
          error_message: r.detail,
        });
      } catch { /* log failure is non-fatal */ }
    } else if (!resendKey) {
      emailError = "RESEND_API_KEY non configurée";
    }

    return new Response(JSON.stringify({
      ok: true,
      link: emailSent ? null : actionLink,
      email_sent: emailSent,
      email_error: emailError,
    }), { headers: jsonHeaders });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
