import React, { useEffect, useRef, useState } from "react";

// HeroCar — vidéo R5 E-Tech (tracé vert fluo sur fond noir) affichée DIRECTEMENT,
// sans canvas. Le fond noir est éliminé en pur CSS via `mix-blend-mode: screen` :
// sur la page sombre (abysse #06120C), le noir de la vidéo est neutre pour le blend
// "screen" → il devient transparent, le tracé vert fluo reste éclatant.
//
// Pourquoi pas de canvas chroma-key : Firefox ne décode pas de façon fiable les frames
// d'une vidéo masquée (opacity:0) pour drawImage/getImageData → canvas vide sur Firefox
// alors que Chrome fonctionne. Le blend CSS est composité par le GPU, identique sur tous
// les navigateurs, zéro JS de rendu.
//
// Double source webm/mp4 : H.264 (mp4) pas décodé par Firefox/Linux sans codec système →
// WebM VP9 en 1ère source (Firefox/Chrome/Edge), mp4 en fallback (Safari/iOS).
// iOS Safari peut bloquer l'autoplay → déverrouillage au premier toucher.

export function HeroCar({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Lecture muette en boucle (sauf reduced-motion → frame figée à ~1 s).
  // Forçage impératif de muted/playsInline (React ne reflète pas toujours `muted`).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    if (reduced) {
      const seek = () => {
        try {
          video.pause();
          video.currentTime = 1.0;
        } catch {
          /* noop */
        }
      };
      if (video.readyState >= 1) seek();
      else video.addEventListener("loadedmetadata", seek, { once: true });
      return;
    }

    video.play().catch(() => {});
  }, [reduced]);

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
    };
    container.addEventListener("click", unlock, { once: true });
    container.addEventListener("touchstart", unlock, { once: true, passive: true });
    return () => {
      container.removeEventListener("click", unlock);
      container.removeEventListener("touchstart", unlock);
    };
  }, [reduced]);

  const label =
    "Renault 5 E-Tech sur berme de récupération — nettoyage circulaire à eau recyclée";

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ aspectRatio: "1024 / 560" }}
      role="img"
      aria-label={label}
    >
      {/* Vidéo affichée directement. mix-blend-mode: screen → le fond noir se fond
          dans la page sombre (devient transparent), le tracé vert fluo ressort. */}
      <video
        ref={videoRef}
        muted
        loop={!reduced}
        autoPlay={!reduced}
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          mixBlendMode: "screen",
        }}
      >
        <source src="/hero-car-r5.webm" type="video/webm" />
        <source src="/hero-car-r5.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
