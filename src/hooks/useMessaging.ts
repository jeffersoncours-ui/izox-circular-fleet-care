import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  type LocalMessage,
  type MessageStatus,
  type OperateurMessage,
  fetchConversation,
  loadPendingMessages,
  markReadAdmin,
  markReadOperator,
  savePendingMessages,
  sendMessage,
  subscribeToConversation,
} from "@/lib/messaging";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatEntry =
  | { kind: "db"; msg: OperateurMessage }
  | { kind: "local"; msg: LocalMessage };

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMessaging(operatorId: string, role: "admin" | "operator") {
  const { user } = useAuth();
  const [dbMessages, setDbMessages] = useState<OperateurMessage[]>([]);
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Tracks localIds actively in-flight (prevents double-send on StrictMode re-run)
  const inFlightIds = useRef<Set<string>>(new Set());
  // Tracks localIds we sent (for Realtime deduplication — swap local→DB on confirm)
  const sentLocalIds = useRef<Set<string>>(new Set());

  // ── Initial load: DB history + localStorage pending/failed ──────────────────
  useEffect(() => {
    if (!operatorId) return;
    let alive = true;
    (async () => {
      try {
        const history = await fetchConversation(operatorId);
        if (!alive) return;
        setDbMessages(history);
        const pending = loadPendingMessages(operatorId);
        if (!alive) return;
        setLocalMessages(pending);
      } catch {
        // ignore
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [operatorId]);

  // ── Persist pending/failed messages to localStorage ─────────────────────────
  useEffect(() => {
    if (!operatorId || loading) return;
    savePendingMessages(operatorId, localMessages);
  }, [operatorId, localMessages, loading]);

  // ── Realtime subscription (INSERT only — anti-boucle sur UPDATE read_at) ────
  useEffect(() => {
    if (!operatorId) return;
    const channel = subscribeToConversation(operatorId, (newMsg) => {
      if (
        newMsg.client_local_id &&
        sentLocalIds.current.has(newMsg.client_local_id)
      ) {
        // Notre propre message confirmé par la DB → swap local → DB
        setDbMessages((prev) => [...prev, newMsg]);
        setLocalMessages((prev) =>
          prev.filter((m) => m.localId !== newMsg.client_local_id)
        );
        sentLocalIds.current.delete(newMsg.client_local_id);
        return;
      }
      // Message de l'autre partie
      setDbMessages((prev) => [...prev, newMsg]);
    });
    return () => {
      channel.unsubscribe();
    };
  }, [operatorId]);

  // ── Mark as read quand la fenêtre de chat est ouverte ───────────────────────
  useEffect(() => {
    if (!operatorId || !user || loading) return;
    if (role === "admin") {
      markReadAdmin(operatorId, user.id).catch(() => {});
    } else {
      markReadOperator(operatorId).catch(() => {});
    }
  }, [operatorId, user, role, loading]);

  // ── Envoi des messages 'pending' ─────────────────────────────────────────────
  useEffect(() => {
    if (!user || !operatorId || loading) return;
    const pending = localMessages.filter(
      (m) => m.status === "pending" && !inFlightIds.current.has(m.localId)
    );
    if (pending.length === 0) return;

    for (const msg of pending) {
      inFlightIds.current.add(msg.localId);
      sentLocalIds.current.add(msg.localId);

      sendMessage(operatorId, user.id, msg.content, msg.localId)
        .then((dbId) => {
          setLocalMessages((prev) =>
            prev.map((m) =>
              m.localId === msg.localId
                ? { ...m, status: "sent" as MessageStatus, dbId }
                : m
            )
          );
        })
        .catch(() => {
          sentLocalIds.current.delete(msg.localId);
          inFlightIds.current.delete(msg.localId);
          setLocalMessages((prev) =>
            prev.map((m) =>
              m.localId === msg.localId
                ? {
                    ...m,
                    status: "failed" as MessageStatus,
                    retryCount: m.retryCount + 1,
                  }
                : m
            )
          );
        });
    }
  }, [localMessages, operatorId, user, loading]);

  // ── Retry automatique quand la connexion revient ─────────────────────────────
  const retryAll = useCallback(() => {
    setLocalMessages((prev) =>
      prev.map((m) =>
        m.status === "failed" ? { ...m, status: "pending" as MessageStatus } : m
      )
    );
  }, []);

  useEffect(() => {
    window.addEventListener("online", retryAll);
    return () => window.removeEventListener("online", retryAll);
  }, [retryAll]);

  // ── Envoyer un nouveau message ───────────────────────────────────────────────
  const send = useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || !user) return;
      const localId = crypto.randomUUID();
      const newMsg: LocalMessage = {
        localId,
        conversationOperatorId: operatorId,
        senderId: user.id,
        content: trimmed,
        createdAt: new Date().toISOString(),
        status: "pending",
        retryCount: 0,
      };
      setLocalMessages((prev) => [...prev, newMsg]);
    },
    [operatorId, user]
  );

  // ── Retry manuel d'un message échoué ────────────────────────────────────────
  const retry = useCallback((localId: string) => {
    setLocalMessages((prev) =>
      prev.map((m) =>
        m.localId === localId ? { ...m, status: "pending" as MessageStatus } : m
      )
    );
  }, []);

  // ── Merge DB + local pour l'affichage ───────────────────────────────────────
  // Les messages 'sent' avec dbId sont supprimés par le Realtime (swap local→DB).
  // On affiche uniquement les 'pending' et 'failed' depuis localMessages.
  const displayMessages: ChatEntry[] = [
    ...dbMessages.map((m) => ({ kind: "db" as const, msg: m })),
    ...localMessages
      .filter((m) => m.status !== "sent")
      .map((m) => ({ kind: "local" as const, msg: m })),
  ].sort((a, b) => {
    const ta = a.kind === "db" ? a.msg.created_at : a.msg.createdAt;
    const tb = b.kind === "db" ? b.msg.created_at : b.msg.createdAt;
    return ta.localeCompare(tb);
  });

  return { messages: displayMessages, send, retry, loading };
}
