import { AlphaVideo } from "./AlphaVideo";

// HeroCar — vidéo R5 E-Tech sur berme de récupération, détourée en alpha réel
// (voir AlphaVideo pour le détail technique du détourage VP9 alpha).

export function HeroCar({ className = "" }: { className?: string }) {
  return (
    <AlphaVideo
      className={className}
      webmSrc="/hero-car-r5.webm"
      mp4Src="/hero-car-r5.mp4"
      aspectRatio="1024 / 560"
      label="Renault 5 E-Tech sur berme de récupération — nettoyage circulaire à eau recyclée"
    />
  );
}
