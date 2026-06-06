import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OperateurMessage {
  id: string;
  conversation_operator_id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  client_local_id: string | null;
  created_at: string;
  read_at_admin: string | null;
  read_at_operator: string | null;
}

export type MessageStatus = "pending" | "sent" | "failed";

export interface LocalMessage {
  localId: string;
  conversationOperatorId: string;
  senderId: string;
  content: string;
  createdAt: string;
  status: MessageStatus;
  retryCount: number;
  dbId?: string;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

export async function fetchConversation(
  operatorId: string,
  limit = 50
): Promise<OperateurMessage[]> {
  const { data, error } = await (supabase as any)
    .from("operateur_messages")
    .select("*")
    .eq("conversation_operator_id", operatorId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as OperateurMessage[];
}

export async function sendMessage(
  operatorId: string,
  senderId: string,
  content: string,
  localId: string
): Promise<string> {
  const { data, error } = await (supabase as any)
    .from("operateur_messages")
    .insert({
      conversation_operator_id: operatorId,
      sender_id: senderId,
      content,
      client_local_id: localId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function markReadAdmin(
  operatorId: string,
  adminId: string
): Promise<void> {
  await (supabase as any)
    .from("operateur_messages")
    .update({ read_at_admin: new Date().toISOString() })
    .eq("conversation_operator_id", operatorId)
    .is("read_at_admin", null)
    .neq("sender_id", adminId);
}

export async function markReadOperator(operatorId: string): Promise<void> {
  await (supabase as any)
    .from("operateur_messages")
    .update({ read_at_operator: new Date().toISOString() })
    .eq("conversation_operator_id", operatorId)
    .is("read_at_operator", null)
    .neq("sender_id", operatorId);
}

// ─── Realtime — INSERT uniquement (anti-boucle sur UPDATE read_at) ────────────

export function subscribeToConversation(
  operatorId: string,
  onNewMessage: (msg: OperateurMessage) => void
) {
  return supabase
    .channel(`chat-${operatorId}`)
    .on(
      "postgres_changes" as any,
      {
        event: "INSERT",
        schema: "public",
        table: "operateur_messages",
        filter: `conversation_operator_id=eq.${operatorId}`,
      },
      (payload: any) => onNewMessage(payload.new as OperateurMessage)
    )
    .subscribe();
}

// ─── localStorage pending ─────────────────────────────────────────────────────

const pendingKey = (id: string) => `izox_chat_pending_${id}`;

export function loadPendingMessages(operatorId: string): LocalMessage[] {
  try {
    const raw = localStorage.getItem(pendingKey(operatorId));
    if (!raw) return [];
    const msgs = JSON.parse(raw) as LocalMessage[];
    // 'pending' au shutdown → 'failed' (on ne sait pas si le serveur a reçu)
    return msgs.map((m) =>
      m.status === "pending" ? { ...m, status: "failed" as MessageStatus } : m
    );
  } catch {
    return [];
  }
}

export function savePendingMessages(
  operatorId: string,
  messages: LocalMessage[]
): void {
  const toSave = messages.filter((m) => m.status !== "sent");
  if (toSave.length === 0) {
    localStorage.removeItem(pendingKey(operatorId));
  } else {
    localStorage.setItem(pendingKey(operatorId), JSON.stringify(toSave));
  }
}
