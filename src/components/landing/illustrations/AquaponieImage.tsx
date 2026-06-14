export function AquaponieImage({ className = "" }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        maskImage:
          "radial-gradient(ellipse 80% 80% at 50% 50%, black 55%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 80% 80% at 50% 50%, black 55%, transparent 100%)",
      }}
    >
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
