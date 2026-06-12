// Scène aquaponie au trait (section Vision) — bassin + 3 poissons + cultures.
// Les poissons nagent au rythme du scroll : leur position est pilotée par
// setFish(p) dans Vision (Phase 2c) via les éléments [data-fish].
// Bulles = micro-animation CSS autonome.

// Poisson réutilisable (orienté vers la droite, ~34px). La position initiale
// est portée par le poisson lui-même ; setFish() (Phase 2c) la remplace.
function Fish({ index, x, y }: { index: number; x: number; y: number }) {
  return (
    <g className="fish" data-fish={index} style={{ transform: `translate(${x}px, ${y}px)` }}>
      <path d="M -10 0 Q -2 -7 9 -4 Q 15 -2 17 0 Q 15 2 9 4 Q -2 7 -10 0 Z" />
      <path d="M -10 0 L -19 -6 L -16 0 L -19 6 Z" />
      <circle cx="9" cy="-1" r="1.2" fill="var(--b2c-accent)" stroke="none" />
    </g>
  );
}

export function AquaponieScene({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 300"
      className={className}
      fill="none"
      role="img"
      aria-label="Illustration : bassin aquaponique avec poissons alimentant des cultures en circuit court"
    >
      <defs>
        <radialGradient id="aquaGlow" cx="40%" cy="60%" r="60%">
          <stop offset="0%" stopColor="#3FE08F" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#3FE08F" stopOpacity="0" />
        </radialGradient>
        <clipPath id="basinClip">
          <path d="M64 176 L64 256 Q64 268 76 268 L332 268 Q344 268 344 256 L344 176 Z" />
        </clipPath>
      </defs>
      <rect x="0" y="0" width="520" height="300" fill="url(#aquaGlow)" />

      {/* Bassin */}
      <path
        className="gv-stroke"
        d="M60 168 L60 256 Q60 272 76 272 L332 272 Q348 272 348 256 L348 168"
      />
      {/* Ligne d'eau luminescente */}
      <path className="gv-stroke" d="M60 184 Q120 178 204 184 T348 184" style={{ opacity: 0.9 }} />
      <path className="gv-stroke gv-dim" d="M60 192 Q140 188 220 192 T348 192" />

      {/* Poissons (position par défaut ; pilotée au scroll en Phase 2c) */}
      <g clipPath="url(#basinClip)">
        <Fish index={0} x={150} y={214} />
        <Fish index={1} x={244} y={236} />
        <Fish index={2} x={110} y={248} />
        {/* Bulles */}
        <circle className="gv-bubble" cx="170" cy="250" r="2.5" />
        <circle className="gv-bubble gv-bubble--2" cx="250" cy="252" r="2" />
        <circle className="gv-bubble gv-bubble--3" cx="210" cy="248" r="3" />
      </g>

      {/* Cultures au-dessus du bassin (pousses) */}
      <g>
        {[110, 150, 190, 230, 270, 310].map((x, i) => (
          <g key={x}>
            <line className="gv-stroke" x1={x} y1="168" x2={x} y2={140 - (i % 3) * 6} />
            <path
              className="gv-stroke"
              d={`M${x} ${150 - (i % 3) * 5} q -10 -6 -14 -16`}
            />
            <path
              className="gv-stroke"
              d={`M${x} ${150 - (i % 3) * 5} q 10 -6 14 -16`}
            />
          </g>
        ))}
      </g>

      {/* Circuit court — flèche vers légumes (à droite) */}
      <path className="gv-stroke gv-dim" d="M360 150 Q400 150 400 190 L400 230" />
      <path className="gv-stroke" d="M394 220 L400 232 L406 220" style={{ opacity: 0.8 }} />
      <circle className="gv-stroke" cx="430" cy="150" r="16" />
      <path className="gv-stroke" d="M430 134 q 6 8 0 16 q -6 -8 0 -16 Z" />
      <text className="gv-label" x="430" y="184" textAnchor="middle">
        légumes locaux
      </text>

      {/* Étiquettes */}
      <text className="gv-label" x="204" y="128" textAnchor="middle">
        cultures hors-sol
      </text>
      <text className="gv-label" x="204" y="292" textAnchor="middle" style={{ fill: "var(--b2c-accent)" }}>
        bassin aquaponique
      </text>
    </svg>
  );
}
