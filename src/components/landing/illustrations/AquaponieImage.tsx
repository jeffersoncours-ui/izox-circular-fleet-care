export function AquaponieImage({ className = "" }: { className?: string }) {
  // Le PNG est détouré en alpha réel (fond noir → transparent, bords floutés
  // via ffmpeg lumakey + gblur planes=8) → s'incruste directement dans le
  // filigrane, sans cadre. Pas de mask-image CSS (le PNG porte son alpha).
  return (
    <div className={className}>
      <img
        src="/aquaponie-scene.png"
        alt="Scène aquaponie — bassin à poissons alimentant des cultures hors-sol, nettoyage circulaire"
        loading="lazy"
        decoding="async"
        style={{ display: "block", width: "100%", height: "auto" }}
      />
    </div>
  );
}
