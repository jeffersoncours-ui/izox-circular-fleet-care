import { AlertTriangle, Clock, RotateCcw } from "lucide-react";
import { type MessageStatus } from "@/lib/messaging";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  content: string | null;
  senderId: string;
  currentUserId: string;
  createdAt: string;
  status?: MessageStatus;
  onRetry?: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({
  content,
  senderId,
  currentUserId,
  createdAt,
  status,
  onRetry,
}: MessageBubbleProps) {
  const isOwn = senderId === currentUserId;

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[75%] space-y-0.5")}>
        {/* Bulle */}
        <div
          className={cn(
            "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm",
            status === "pending" && "opacity-60",
            status === "failed" && "opacity-80"
          )}
        >
          {content}
        </div>

        {/* Timestamp + indicateur statut */}
        <div
          className={cn(
            "flex items-center gap-1 text-[10px] text-muted-foreground",
            isOwn ? "justify-end" : "justify-start"
          )}
        >
          <span>{formatTime(createdAt)}</span>
          {status === "pending" && (
            <Clock className="h-2.5 w-2.5 text-muted-foreground/60" />
          )}
          {status === "failed" && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-0.5 text-destructive hover:text-destructive/80 transition-colors"
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              <span>Échec — réessayer</span>
              <RotateCcw className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
