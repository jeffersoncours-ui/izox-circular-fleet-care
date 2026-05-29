import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EmailType =
  | "gel_validee"
  | "rdv_confirmee"
  | "intervention_close"
  | "rappel_24h"
  | "staff_notification";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function wrapHtml(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>${title} — IZOX</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f0f4f0">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
          <!-- Header -->
          <tr>
            <td style="background:#1B4332;padding:28px 36px">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <span style="color:#ffffff;font-size:26px;font-weight:700;letter-spacing:3px">IZOX</span>
                    <p style="margin:4px 0 0;color:#6ee7b7;font-size:12px;letter-spacing:1px">
                      Nettoyage automobile éco-responsable
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:36px">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
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

function buildGelValideeHtml(d: Record<string, unknown>): string {
  const ent = d.entreprises as Record<string, string> | null;
  const nom = ent?.nom ?? "Votre entreprise";
  const dateDebut = formatDate(d.date_debut as string);
  const dateFin = formatDate(d.date_fin_prevue as string);
  const type = d.type_demande === "contrat" ? "Contrat complet" : "Véhicules spécifiques";
  return wrapHtml("Demande de gel validée", `
    <h2 style="margin:0 0 8px;color:#1B4332;font-size:20px">Votre demande de gel a été validée ✓</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px">Bonjour ${nom},</p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">
      Bonne nouvelle — votre demande de gel de contrat a été <strong style="color:#1B4332">acceptée</strong>
      par votre équipe IZOX.
    </p>
    <table cellpadding="12" cellspacing="0" border="0" width="100%"
      style="background:#f0fdf4;border-radius:8px;border-left:4px solid #1B4332;margin-bottom:24px">
      <tr>
        <td>
          <p style="margin:0 0 6px;font-size:13px;color:#6b7280">Type de gel</p>
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827">${type}</p>
          <p style="margin:0 0 6px;font-size:13px;color:#6b7280">Période</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:#111827">${dateDebut} → ${dateFin}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6">
      Durant cette période, vos prestations IZOX sont suspendues. Pour toute question,
      contactez votre équipe IZOX.
    </p>
  `);
}

function buildRdvConfirmeeHtml(d: Record<string, unknown>): string {
  const ent = d.entreprises as Record<string, string> | null;
  const nom = ent?.nom ?? "Votre entreprise";
  const dateConf = d.date_confirmee ? formatDate(d.date_confirmee as string) : "Date à préciser";
  const nbVeh = d.nb_vehicules_rdv ?? 1;
  return wrapHtml("RDV confirmé", `
    <h2 style="margin:0 0 8px;color:#1B4332;font-size:20px">Votre rendez-vous est confirmé ✓</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px">Bonjour ${nom},</p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">
      Votre demande de rendez-vous a été <strong style="color:#1B4332">confirmée</strong>.
      Notre équipe sera présente au rendez-vous suivant :
    </p>
    <table cellpadding="12" cellspacing="0" border="0" width="100%"
      style="background:#f0fdf4;border-radius:8px;border-left:4px solid #1B4332;margin-bottom:24px">
      <tr>
        <td>
          <p style="margin:0 0 6px;font-size:13px;color:#6b7280">Date confirmée</p>
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827">${dateConf}</p>
          <p style="margin:0 0 6px;font-size:13px;color:#6b7280">Nombre de véhicules</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:#111827">${nbVeh} véhicule${Number(nbVeh) > 1 ? "s" : ""}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6">
      Assurez-vous que les véhicules concernés soient disponibles à la date indiquée.
      Pour toute modification, contactez votre équipe IZOX.
    </p>
  `);
}

function buildInterventionCloseHtml(d: Record<string, unknown>): string {
  const ent = d.entreprises as Record<string, string> | null;
  const veh = d.vehicules as Record<string, string> | null;
  const nom = ent?.nom ?? "Votre entreprise";
  const immat = veh?.immatriculation ?? "—";
  const marque = [veh?.marque, veh?.modele].filter(Boolean).join(" ") || "—";
  const dateInter = d.date_intervention ? formatDate(d.date_intervention as string) : "—";
  const prestationLabels: Record<string, string> = {
    interieur: "Nettoyage Intérieur",
    standard: "Nettoyage Standard",
    vtc: "Nettoyage VTC Premium",
  };
  const type = prestationLabels[d.type_prestation as string] ?? d.type_prestation as string ?? "Prestation";
  return wrapHtml("Prestation terminée", `
    <h2 style="margin:0 0 8px;color:#1B4332;font-size:20px">Votre prestation est terminée ✓</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px">Bonjour ${nom},</p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">
      La prestation IZOX sur votre véhicule a été <strong style="color:#1B4332">réalisée et validée</strong>.
      Voici le récapitulatif :
    </p>
    <table cellpadding="12" cellspacing="0" border="0" width="100%"
      style="background:#f0fdf4;border-radius:8px;border-left:4px solid #1B4332;margin-bottom:24px">
      <tr>
        <td>
          <p style="margin:0 0 6px;font-size:13px;color:#6b7280">Véhicule</p>
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827">${immat} — ${marque}</p>
          <p style="margin:0 0 6px;font-size:13px;color:#6b7280">Type de prestation</p>
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827">${type}</p>
          <p style="margin:0 0 6px;font-size:13px;color:#6b7280">Date d'intervention</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:#111827">${dateInter}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6">
      Merci de votre confiance. Pour consulter le détail de vos prestations,
      connectez-vous à votre espace client IZOX.
    </p>
  `);
}

function buildRappel24hHtml(d: Record<string, unknown>): string {
  const ent = d.entreprises as Record<string, string> | null;
  const nom = ent?.nom ?? "Votre entreprise";
  const dateDebut = formatDate(d.date_debut as string);
  const dateFin = formatDate(d.date_fin_prevue as string);
  return wrapHtml("Rappel gel demain", `
    <h2 style="margin:0 0 8px;color:#1B4332;font-size:20px">Votre gel démarre demain ⚠</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px">Bonjour ${nom},</p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">
      Rappel — votre période de gel de contrat commence <strong style="color:#1B4332">demain</strong>.
      Durant cette période, vos prestations IZOX seront suspendues.
    </p>
    <table cellpadding="12" cellspacing="0" border="0" width="100%"
      style="background:#fefce8;border-radius:8px;border-left:4px solid #ca8a04;margin-bottom:24px">
      <tr>
        <td>
          <p style="margin:0 0 6px;font-size:13px;color:#6b7280">Début du gel</p>
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827">${dateDebut}</p>
          <p style="margin:0 0 6px;font-size:13px;color:#6b7280">Fin prévue</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:#111827">${dateFin}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6">
      Pour lever ou modifier votre gel, contactez votre équipe IZOX avant la date de début.
    </p>
  `);
}

function buildStaffNotificationHtml(d: Record<string, unknown>): string {
  const ent = d.entreprises as Record<string, string> | null;
  const nom = ent?.nom ?? "—";
  const dateDebut = formatDate(d.date_debut as string);
  const dateFin = formatDate(d.date_fin_prevue as string);
  const type = d.type_demande === "contrat" ? "Contrat complet" : "Véhicules spécifiques";
  const motif = d.motif as string ?? "—";
  return wrapHtml("Nouvelle demande de gel", `
    <h2 style="margin:0 0 8px;color:#1B4332;font-size:20px">⚡ Nouvelle demande de gel à traiter</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px">Notification équipe IZOX</p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">
      Un client vient de soumettre une demande de gel nécessitant votre traitement.
    </p>
    <table cellpadding="12" cellspacing="0" border="0" width="100%"
      style="background:#f0fdf4;border-radius:8px;border-left:4px solid #1B4332;margin-bottom:24px">
      <tr>
        <td>
          <p style="margin:0 0 6px;font-size:13px;color:#6b7280">Client</p>
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827">${nom}</p>
          <p style="margin:0 0 6px;font-size:13px;color:#6b7280">Type de gel</p>
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827">${type}</p>
          <p style="margin:0 0 6px;font-size:13px;color:#6b7280">Période demandée</p>
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827">${dateDebut} → ${dateFin}</p>
          <p style="margin:0 0 6px;font-size:13px;color:#6b7280">Motif</p>
          <p style="margin:0;font-size:14px;color:#374151;font-style:italic">${motif}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#6b7280;font-size:13px">
      Connectez-vous à l'interface admin IZOX pour traiter cette demande.
    </p>
  `);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: jsonHeaders });
    }
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), { status: 401, headers: jsonHeaders });
    }

    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY non configurée" }), { status: 500, headers: jsonHeaders });
    }

    const { type, target_id }: { type: EmailType; target_id: string } = await req.json();
    const admin = createClient(url, serviceKey);

    let emailTo: string[];
    let subject: string;
    let html: string;

    switch (type) {
      case "gel_validee":
      case "rappel_24h": {
        const { data: demande, error } = await admin
          .from("demandes_gel")
          .select("*, entreprises(nom, email_contact)")
          .eq("id", target_id)
          .single();
        if (error || !demande) throw new Error("Demande gel introuvable");
        const email = (demande.entreprises as Record<string, string> | null)?.email_contact;
        emailTo = email ? [email] : [];
        subject = type === "gel_validee"
          ? "✓ Votre demande de gel a été validée — IZOX"
          : "⚠ Rappel — Votre gel IZOX démarre demain";
        html = type === "gel_validee"
          ? buildGelValideeHtml(demande as Record<string, unknown>)
          : buildRappel24hHtml(demande as Record<string, unknown>);
        break;
      }

      case "rdv_confirmee": {
        const { data: rdv, error } = await admin
          .from("demandes_rdv")
          .select("*, entreprises(nom, email_contact)")
          .eq("id", target_id)
          .single();
        if (error || !rdv) throw new Error("Demande RDV introuvable");
        const email = (rdv.entreprises as Record<string, string> | null)?.email_contact;
        emailTo = email ? [email] : [];
        subject = "✓ Votre rendez-vous IZOX est confirmé";
        html = buildRdvConfirmeeHtml(rdv as Record<string, unknown>);
        break;
      }

      case "intervention_close": {
        const { data: inter, error } = await admin
          .from("interventions")
          .select("*, vehicules(immatriculation, marque, modele), entreprises(nom, email_contact)")
          .eq("id", target_id)
          .single();
        if (error || !inter) throw new Error("Intervention introuvable");
        const email = (inter.entreprises as Record<string, string> | null)?.email_contact;
        emailTo = email ? [email] : [];
        subject = "✓ Votre prestation IZOX est terminée";
        html = buildInterventionCloseHtml(inter as Record<string, unknown>);
        break;
      }

      case "staff_notification": {
        const { data: demande, error } = await admin
          .from("demandes_gel")
          .select("*, entreprises(nom)")
          .eq("id", target_id)
          .single();
        if (error || !demande) throw new Error("Demande gel introuvable");

        const { data: staffProfiles } = await admin
          .from("profiles")
          .select("id")
          .in("role", ["admin", "staff", "commercial"]);

        const staffIds = (staffProfiles ?? []).map((p: Record<string, string>) => p.id);
        const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
        emailTo = users
          .filter((u: Record<string, unknown>) => staffIds.includes(u.id as string) && u.email)
          .map((u: Record<string, unknown>) => u.email as string);

        subject = `⚡ Nouvelle demande de gel — ${(demande.entreprises as Record<string, string> | null)?.nom ?? "Client"}`;
        html = buildStaffNotificationHtml(demande as Record<string, unknown>);
        break;
      }

      default:
        throw new Error(`Type email inconnu: ${type}`);
    }

    const validEmails = emailTo.filter((e) => e && e.includes("@"));

    if (validEmails.length === 0) {
      await admin.from("email_logs").insert({
        type,
        target_id,
        email_to: null,
        status: "skipped",
        error_message: "Aucun email destinataire valide",
      });
      return new Response(JSON.stringify({ ok: false, reason: "no_recipient" }), { headers: jsonHeaders });
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "IZOX <noreply@izox.fr>",
        to: validEmails,
        subject,
        html,
      }),
    });

    const resendBody = await resendRes.json().catch(() => ({}));
    const success = resendRes.ok;

    await admin.from("email_logs").insert({
      type,
      target_id,
      email_to: validEmails.join(", "),
      status: success ? "sent" : "failed",
      error_message: success ? null : JSON.stringify(resendBody),
    });

    // Update email tracking on source table
    if (success) {
      const now = new Date().toISOString();
      if (type === "gel_validee" || type === "rappel_24h" || type === "staff_notification") {
        await admin.from("demandes_gel").update({ email_sent_at: now, email_status: type }).eq("id", target_id);
      } else if (type === "rdv_confirmee") {
        await admin.from("demandes_rdv").update({ email_sent_at: now, email_status: "rdv_confirmee" }).eq("id", target_id);
      } else if (type === "intervention_close") {
        await admin.from("interventions").update({ email_sent_at: now, email_status: "intervention_close" }).eq("id", target_id);
      }
    }

    return new Response(JSON.stringify({ ok: success }), { headers: jsonHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders });
  }
});
