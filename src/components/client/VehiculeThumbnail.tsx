import { useEffect, useState } from "react";
import { Car } from "lucide-react";
import { cn } from "@/lib/utils";
import { getVehiculePhotoUrl } from "@/lib/vehicule-photo";

interface VehiculeThumbnailProps {
  photoPath: string | null | undefined;
  alt?: string;
  className?: string;
}

/**
 * Vignette photo véhicule responsive.
 * - Mobile (< md) : 64x64
 * - Desktop (>= md) : 48x48
 * - Coins arrondis, object-cover, fallback icône Car sur fond IZOX clair.
 */
export function VehiculeThumbnail({ photoPath, alt, className }: VehiculeThumbnailProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    getVehiculePhotoUrl(photoPath).then((u) => {
      if (active) {
        setUrl(u);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, [photoPath]);

  const sizeClasses = "h-16 w-16 md:h-12 md:w-12";

  if (loaded && url) {
    return (
      <div
        className={cn(
          sizeClasses,
          "rounded-lg overflow-hidden border border-border/40 bg-muted shrink-0",
          className
        )}
      >
        <img
          src={url}
          alt={alt ?? "Photo véhicule"}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        sizeClasses,
        "rounded-lg border border-border/40 bg-primary/10 text-primary flex items-center justify-center shrink-0",
        className
      )}
      aria-hidden={!alt}
    >
      <Car className="h-6 w-6 md:h-5 md:w-5" />
    </div>
  );
}
