import React, { useEffect, useRef, useState } from "react";

// HeroCar — vidéo R5 E-Tech (1024×560, tracé vert fluo sur fond noir).
// Chroma-key Canvas : chaque frame de la vidéo est dessinée sur un canvas où les
// pixels noirs deviennent RÉELLEMENT transparents (alpha piloté par la luminance).
// Le filigrane de la page passe derrière — aucun rectangle noir, sur tous les navigateurs.
//
// Double source webm/mp4 : le H.264 (mp4) n'est PAS décodé par Firefox sur Linux sans codec
// système → WebM VP9 en 1ère source (Chrome/Firefox/Edge), mp4 en fallback (Safari/iOS).
//
// requestVideoFrameCallback (rVFC) : sur Firefox, drawImage(video) ne retourne des pixels
// valides QUE dans un callback rVFC — c'est le seul moment où Firefox garantit que le frame
// est dans le buffer GPU accessible à canvas. Avec rAF seul, Firefox a les données
// (readyState≥2) mais drawImage retourne des pixels vides. Fallback rAF pour vieux navigateurs.

// Résolution de traitement (sous-échantillonnée pour la perf mobile).
const PROC_W = 480;
const PROC_H = 270;
// Seuils de keying : luminance <=LO transparent, >=HI opaque, dégradé entre.
const LO = 18;
const HI = 64;

export function HeroCar({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // iOS : si l'autoplay est bloqué, le premier toucher/click déverrouille la lecture.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || reduced) return;
    const unlock = () => {
      const video = videoRef.current;
      if (video) {
        video.muted = true;
        video.play().catch(() => {});
      }
      setUnlocked((u) => !u);
    };
    container.addEventListener("click", unlock, { once: true });
    container.addEventListener("touchstart", unlock, { once: true, passive: true });
    return () => {
      container.removeEventListener("click", unlock);
      container.removeEventListener("touchstart", unlock);
    };
  }, [reduced]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Forcer muted/playsInline en impératif (React ne reflète pas toujours `muted`).
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

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
        const mx =
          d[i] > d[i + 1]
            ? d[i] > d[i + 2]
              ? d[i]
              : d[i + 2]
            : d[i + 1] > d[i + 2]
              ? d[i + 1]
              : d[i + 2];
        d[i + 3] = mx <= LO ? 0 : mx >= HI ? 255 : ((mx - LO) * 255) / (HI - LO);
      }
      ctx.putImageData(img, 0, 0);
    };

    // rVFC (requestVideoFrameCallback) : Firefox garantit que le frame est dans le
    // buffer GPU au moment du callback → drawImage fonctionne. Fallback rAF pour
    // les navigateurs sans rVFC.
    // Les deux chemins appellent drawFrame() dans la même boucle.
    const loop = () => {
      if (stopped) return;
      drawFrame();
      if (vid.requestVideoFrameCallback) {
        vfcId = vid.requestVideoFrameCallback(loop);
      } else {
        rafId = requestAnimationFrame(loop);
      }
    };

    if (reduced) {
      // Une seule frame figée (~1 s, voiture bien visible).
      const drawOnce = () => drawFrame();
      video.pause();
      video.addEventListener("seeked", drawOnce, { once: true });
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
      // Filet : dessine immédiatement si les données sont déjà disponibles.
      video.addEventListener("loadeddata", drawFrame, { once: true });
      video.play().catch(() => {});
      loop();
    }

    return () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (vfcId && vid.cancelVideoFrameCallback) vid.cancelVideoFrameCallback(vfcId);
    };
  }, [reduced, unlocked]);

  const label =
    "Renault 5 E-Tech sur berme de récupération — nettoyage circulaire à eau recyclée";

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ aspectRatio: "1024 / 560", position: "relative" }}
      role="img"
      aria-label={label}
    >
      {/* Canvas visible — affiche les frames chroma-keyées, au-dessus de la vidéo. */}
      <canvas
        ref={canvasRef}
        width={PROC_W}
        height={PROC_H}
        style={{ display: "block", width: "100%", height: "100%", position: "relative", zIndex: 1 }}
      />
      {/* Vidéo pleine taille, invisible (opacity:0).
          WebM d'abord (Firefox/Chrome), mp4 en fallback (Safari/iOS).
          Taille 100%×100% : Firefox décode les frames à résolution utile pour drawImage. */}
      <video
        ref={videoRef}
        muted
        loop={!reduced}
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <source src="/hero-car-r5.webm" type="video/webm" />
        <source src="/hero-car-r5.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
