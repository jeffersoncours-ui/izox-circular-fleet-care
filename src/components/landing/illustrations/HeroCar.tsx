import React from "react";

// HeroCar — masque de luminance R5 E-Tech (1100×588).
// Technique : mask-image + mask-mode:luminance sur un div background:var(--b2c-accent).
// La couleur suit le TweakPanel en temps réel (--b2c-accent). Zéro animation.

export function HeroCar({ className = "" }: { className?: string }) {
  return (
    <div
      className={className}
      role="img"
      aria-label="Renault 5 E-Tech sur berme de récupération — nettoyage circulaire à eau recyclée"
      style={{
        aspectRatio: "1100 / 576",
        background: "var(--b2c-accent)",
        WebkitMaskImage: "url(/hero-car-r5.png)",
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center bottom",
        maskImage: "url(/hero-car-r5.png)",
        maskMode: "luminance",
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center bottom",
      } as React.CSSProperties}
    />
  );
}
