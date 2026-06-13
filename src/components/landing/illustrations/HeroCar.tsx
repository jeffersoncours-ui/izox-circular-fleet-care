import React, { useEffect, useRef, useState } from "react";

// HeroCar — vidéo R5 E-Tech (1024×560, tracé vert fluo sur fond noir, watermarks
// PixVerse retirés en postprod). mix-blend-mode:screen → le fond noir devient
// transparent, seul le tracé vert s'affiche et se fond sur le fond sombre de la page.
// Autoplay en boucle muet (fiable mobile, iOS inclus via playsInline).
// prefers-reduced-motion → image poster figée (aucune animation).

export function HeroCar({ className = "" }: { className?: string }) {
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
    const v = videoRef.current;
    if (!v) return;
    if (reduced) v.pause();
    else v.play().catch(() => {}); // certains navigateurs exigent play() post-hydratation
  }, [reduced]);

  const sharedStyle: React.CSSProperties = {
    aspectRatio: "1024 / 560",
    mixBlendMode: "screen",
  };

  const label =
    "Renault 5 E-Tech sur berme de récupération — nettoyage circulaire à eau recyclée";

  if (reduced) {
    return (
      <img src="/hero-car-r5-poster.jpg" className={className} style={sharedStyle} alt={label} />
    );
  }

  return (
    <video
      ref={videoRef}
      className={className}
      style={sharedStyle}
      src="/hero-car-r5.mp4"
      poster="/hero-car-r5-poster.jpg"
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      aria-label={label}
    />
  );
}
