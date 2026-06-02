import { supabase } from "@/integrations/supabase/client";

export type EmailType =
  | "gel_validee"
  | "rdv_confirmee"
  | "rdv_modifie"
  | "intervention_close"
  | "rappel_24h"
  | "staff_notification"
  | "rdv_annule_client"
  | "rdv_annule_admin";

/** Fire-and-forget : ne bloque pas le flux principal en cas d'échec. */
export async function sendEmail(type: EmailType, targetId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("send-email", {
    body: { type, target_id: targetId },
  });
  if (error) {
    console.warn("[email] échec envoi", type, targetId, error);
  }
}
