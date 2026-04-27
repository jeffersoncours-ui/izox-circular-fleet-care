import { useRef, useState } from "react";
import { Camera, Loader2, Check, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type UploadState = "idle" | "uploading" | "done" | "error";

interface Props {
  moment: "avant" | "apres";
  state: UploadState;
  url: string | null; // signed URL once uploaded
  localPreview: string | null;
  progress?: number;
  disabled?: boolean;
  onPick: (file: File) => void;
  onRemove?: () => void;
}

export function PhotoSlot({
  moment,
  state,
  url,
  localPreview,
  disabled,
  onPick,
  onRemove,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);

  const display = localPreview || url;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || state === "uploading"}
        onClick={() => ref.current?.click()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={cn(
          "relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-all",
          display
            ? "border-border"
            : "border-dashed border-border hover:border-primary/50 bg-muted/40",
          (disabled || state === "uploading") && "cursor-not-allowed opacity-90",
          state === "error" && "border-red-400"
        )}
      >
        {display ? (
          <img src={display} alt={moment} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground h-full">
            <Camera className="h-7 w-7" />
            <span className="text-xs font-medium">Photo</span>
          </div>
        )}

        {/* Overlay label */}
        <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded">
          {moment}
        </span>

        {/* State indicator */}
        {state === "uploading" && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}
        {state === "done" && (
          <span className="absolute bottom-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-1">
            <Check className="h-3 w-3" />
          </span>
        )}
        {state === "error" && (
          <span className="absolute bottom-1.5 right-1.5 bg-red-500 text-white rounded-full p-1">
            <AlertCircle className="h-3 w-3" />
          </span>
        )}
      </button>

      {display && state !== "uploading" && onRemove && hover && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow z-10"
          aria-label="Retirer"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          if (ref.current) ref.current.value = "";
        }}
      />
    </div>
  );
}
