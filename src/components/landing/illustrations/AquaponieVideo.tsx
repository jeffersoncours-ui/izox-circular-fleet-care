import React, { useEffect, useRef, useState } from "react";

// AquaponieVideo — vidéo bassin aquaponique avec plantes et poissons (1024×768, tracé vert fluo).
// Canvas chroma-key : chaque frame élimine le fond noir (alpha piloté par luminance).
// Le filigrane de la page passe derrière. Bulles animées retirées naturellement par keying.
// prefers-reduced-motion → 1 seule frame figée.

// Résolution de traitement (sous-échantillonnée pour perf mobile).
const PROC_W = 512;
const PROC_H = 384;
// Seuils de keying : luminance <=LO → transparent, >=HI → opaque, dégradé entre.
const LO = 18;
const HI = 64;

export function AquaponieVideo({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let stopped = false;
    let rafId = 0;
    let vfcId = 0;
    const vid = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
      cancelVideoFrameCallback?: (id: number) => void;
    };

    const drawFrame = () => {
      if (stopped || video.readyState < 2) return;
      ctx.drawImage(video, 0, 0, PROC_W, PROC_H);
      const img = ctx.getImageData(0, 0, PROC_W, PROC_H);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const mx = d[i] > d[i + 1] ? (d[i] > d[i + 2] ? d[i] : d[i + 2]) : d[i + 1] > d[i + 2] ? d[i + 1] : d[i + 2];
        d[i + 3] = mx <= LO ? 0 : mx >= HI ? 255 : ((mx - LO) * 255) / (HI - LO);
      }
      ctx.putImageData(img, 0, 0);
    };

    const loop = () => {
      if (stopped) return;
      drawFrame();
      if (vid.requestVideoFrameCallback) vfcId = vid.requestVideoFrameCallback(loop);
      else rafId = requestAnimationFrame(loop);
    };

    if (reduced) {
      const drawOnce = () => {
        drawFrame();
      };
      video.pause();
      const onSeeked = () => drawOnce();
      video.addEventListener("seeked", onSeeked, { once: true });
      const seek = () => {
        try {
          video.currentTime = 1.0;
        } catch {
          drawOnce();
        }
      };
      if (video.readyState >= 1) seek();
      else video.addEventListener("loadedmetadata", seek, { once: true });
    } else {
      video.play().catch(() => {});
      loop();
    }

    return () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (vfcId && vid.cancelVideoFrameCallback) vid.cancelVideoFrameCallback(vfcId);
    };
  }, [reduced]);

  const label = "Bassin aquaponique avec plantes et poissons — circuit fermé d'eau recyclée";

  return (
    <div className={className} style={{ aspectRatio: "1024 / 768" }} role="img" aria-label={label}>
      <canvas
        ref={canvasRef}
        width={PROC_W}
        height={PROC_H}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      <video
        ref={videoRef}
        src="/aquaponie-basin.mp4"
        muted
        loop={!reduced}
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />
    </div>
  );
}
