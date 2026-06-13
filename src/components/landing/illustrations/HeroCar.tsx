// HeroCar — photo blueprint R5 E-Tech détourée (fond transparent) sur le
// filigrane de la page. Pas de jets : uniquement des gouttes qui tombent du
// véhicule. Aucun texte/callout pour l'instant (à définir avec l'utilisateur).
// Animation gv-drip neutralisée par prefers-reduced-motion (bloc CSS global).

export function HeroCar({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1100 615"
      className={className}
      fill="none"
      role="img"
      aria-label="Renault 5 E-Tech — nettoyage circulaire à eau recyclée en circuit fermé"
    >
      {/* ── Photo blueprint R5 détourée (fond transparent → laisse voir le filigrane) ── */}
      <image
        href="/hero-car-r5.png"
        x="0" y="0"
        width="1100" height="615"
        preserveAspectRatio="xMidYMid meet"
      />

      {/* ── Gouttes qui tombent du véhicule (sous les bas de caisse) ── */}
      <circle className="gv-drip"            cx="300" cy="470" r="5"   fill="#3FD8FF" />
      <circle className="gv-drip gv-drip--2" cx="430" cy="480" r="4.5" fill="#3FD8FF" />
      <circle className="gv-drip gv-drip--3" cx="560" cy="475" r="5"   fill="#3FD8FF" />
      <circle className="gv-drip gv-drip--4" cx="690" cy="482" r="4.5" fill="#3FD8FF" />
      <circle className="gv-drip"            cx="220" cy="478" r="4"
              fill="#3FD8FF" style={{ animationDelay: "1.1s" }} />
      <circle className="gv-drip gv-drip--2" cx="490" cy="470" r="4"
              fill="#3FD8FF" style={{ animationDelay: "1.6s" }} />
    </svg>
  );
}
