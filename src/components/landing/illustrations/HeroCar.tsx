import React, { useEffect, useRef, useState } from "react";

// HeroCar — vidéo R5 E-Tech affichée DIRECTEMENT, sans canvas ni blend CSS.
// Le fond noir a été détouré et baké en TRANSPARENCE RÉELLE (canal alpha) dans le
// fichier WebM VP9 (pix_fmt yuva420p, tag alpha_mode=1, généré via ffmpeg lumakey).
// → fond transparent natif sur Firefox + Chrome, zéro JS de rendu, zéro flash noir.
//
// Pourquoi ni canvas chroma-key ni mix-blend-mode :
//  - canvas (drawImage/getImageData) : Firefox ne décode pas une vidéo opacity:0 → vide.
//  - mix-blend-mode screen : le reveal (.rv) applique transform/opacity sur le parent →
//    contexte d'empilement isolé → le blend n'a plus le fond de page derrière → noir reste.
//  L'alpha dans le fichier est la seule approche fiable cross-navigateur.
//
// Double source webm/mp4 : WebM VP9 alpha en 1ère source (Firefox/Chrome/Edge → transparent),
// mp4 H.264 en fallback (Safari/iOS — fond noir, pas d'alpha VP9 ; HEVC alpha possible plus tard).
// iOS Safari peut bloquer l'autoplay → déverrouillage au premier toucher.

export function HeroCar({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);
  // `ready` pilote un fondu d'apparition : la vidéo reste transparente tant qu'elle
  // n'a pas de frame décodée → on évite le flash de fond noir au tout début du chargement.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Révèle la vidéo dès qu'une frame est décodable (loadeddata/canplay). Filet de
  // sécurité : si aucun événement ne se déclenche, on révèle quand même après 1,2 s
  // (ne jamais rester invisible).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reveal = () => setReady(true);
    if (video.readyState >= 2) reveal();
    video.addEventListener("loadeddata", reveal, { once: true });
    video.addEventListener("canplay", reveal, { once: true });
    const fallback = window.setTimeout(reveal, 1200);
    return () => {
      video.removeEventListener("loadeddata", reveal);
      video.removeEventListener("canplay", reveal);
      window.clearTimeout(fallback);
    };
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
          opacity: ready ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        <source src="/hero-car-r5.webm" type="video/webm" />
        <source src="/hero-car-r5.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
