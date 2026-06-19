import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useMessaging } from "@/hooks/useMessaging";
import { MessageBubble } from "./MessageBubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatWindowProps {
  operatorId: string;
  role: "admin" | "operator";
  className?: string;
}

export function ChatWindow({ operatorId, role, className }: ChatWindowProps) {
  const { user } = useAuth();
  const { messages, send, retry, loading } = useMessaging(operatorId, role);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll vers le bas à chaque nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    send(trimmed);
    setDraft("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) return null;

  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      {/* Liste messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Send className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Aucun message</p>
            <p className="text-xs text-muted-foreground mt-1">
              Commencez la conversation ci-dessous.
            </p>
          </div>
        )}

        {messages.map((entry) => {
          if (entry.kind === "db") {
            const m = entry.msg;
            return (
              <MessageBubble
                key={m.id}
                content={m.content}
                senderId={m.sender_id}
                currentUserId={user.id}
                createdAt={m.created_at}
              />
            );
          }
          const m = entry.msg;
          return (
            <MessageBubble
              key={m.localId}
              content={m.content}
              senderId={m.senderId}
              currentUserId={user.id}
              createdAt={m.createdAt}
              status={m.status}
              onRetry={() => retry(m.localId)}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Zone de saisie */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message… (Entrée pour envoyer, Maj+Entrée pour saut de ligne)"
            rows={1}
            className="resize-none min-h-[40px] max-h-[120px] text-sm py-2.5"
          />
          <Button
            type="button"
            variant="izox"
            size="icon"
            className="h-10 w-10 shrink-0"
            disabled={!draft.trim()}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Entrée pour envoyer · Maj+Entrée pour saut de ligne
        </p>
      </div>
    </div>
  );
}
