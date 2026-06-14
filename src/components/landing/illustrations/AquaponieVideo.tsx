import { AlphaVideo } from "./AlphaVideo";

// AquaponieVideo — scène aquaponie (bassin à poissons + cultures hors-sol),
// vidéo gravure détourée en alpha réel (voir AlphaVideo). Remplace l'ancienne
// illustration SVG AquaponieScene + l'animation scroll installAquaponie.

export function AquaponieVideo({ className = "" }: { className?: string }) {
  return (
    <AlphaVideo
      className={className}
      webmSrc="/aquaponie.webm"
      mp4Src="/aquaponie.mp4"
      aspectRatio="1 / 1"
      label="Scène aquaponie — bassin à poissons alimentant des cultures hors-sol, nettoyage circulaire"
    />
  );
}
