import React, { useEffect, useRef, useState } from "react";

// HeroCar — vidéo R5 E-Tech (1024×560, tracé vert fluo sur fond noir).
// Chroma-key Canvas : chaque frame de la vidéo est dessinée sur un canvas où les
// pixels noirs deviennent RÉELLEMENT transparents (alpha piloté par la luminance).
// Le filigrane de la page passe derrière — aucun rectangle noir, sur tous les navigateurs.
//
// Double source webm/mp4 : le H.264 (mp4) n'est PAS décodé par Firefox sans codec
// système → WebM VP9 en 1ère source (Chrome/Firefox/Edge), mp4 en fallback (Safari/iOS).
// iOS Safari bloque l'autoplay des vidéos cachées → déverrouillage au premier toucher.

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
      setUnlocked((u) => !u); // re-déclenche la boucle de rendu
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

    // rAF pur (pas de requestVideoFrameCallback) : dessine la frame COURANTE en
    // continu, que la vidéo joue ou soit en pause. Garantit que la voiture est
    // TOUJOURS visible — animée si l'autoplay marche, figée sur la 1ʳᵉ frame
    // sinon. rVFC ne se déclenche pas si la vidéo est en pause/cachée → canvas
    // vide, exactement le bug rencontré. rAF est supporté partout.
    const loop = () => {
      if (stopped) return;
      drawFrame();
      rafId = requestAnimationFrame(loop);
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
      // Filets : loadeddata = données disponibles, canplay = frame décodée dans le buffer GPU.
      // Les deux couvrent Firefox (readyState 2 ne garantit pas le buffer GPU sur FF).
      video.addEventListener("loadeddata", drawFrame, { once: true });
      video.addEventListener("canplay", drawFrame, { once: true });
      video.play().catch(() => {});
      loop();
    }

    return () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
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
      {/* Canvas visible — affiche les frames chroma-keyées, posé au-dessus de la vidéo. */}
      <canvas
        ref={canvasRef}
        width={PROC_W}
        height={PROC_H}
        style={{ display: "block", width: "100%", height: "100%", position: "relative", zIndex: 1 }}
      />
      {/* Vidéo pleine taille mais invisible (opacity: 0).
          IMPORTANT : taille 100×100 (pas 1×1px) — Firefox n'avance pas readyState
          au-delà de 1 pour les éléments vidéo de taille nulle ou quasi-nulle, ce qui
          empêche drawImage de lire les frames. Pleine taille = pipeline de décodage normal.
          WebM d'abord (Firefox/Chrome), mp4 en fallback (Safari/iOS). */}
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
