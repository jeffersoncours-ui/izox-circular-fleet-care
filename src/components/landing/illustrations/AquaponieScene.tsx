// Scène aquaponie « gravure fluo » (section Vision) — rack vertical de
// cultures hors-sol sur 2 étages éclairés par rampes LED, au-dessus d'un
// bassin à poissons (d'après l'image de référence, sans personnage).
// Trait accent + hachures discrètes, dans l'esprit gravure de HeroCar.
// Les poissons ([data-fish]) nagent au rythme du scroll via installAquaponie ;
// bulles et rampes LED = micro-animations CSS autonomes.

// Poisson réutilisable (orienté vers la droite, ~34px). La position initiale
// est portée par le poisson lui-même ; setFish() (scroll) la remplace.
function Fish({ index, x, y }: { index: number; x: number; y: number }) {
  return (
    <g className="fish" data-fish={index} style={{ transform: `translate(${x}px, ${y}px)` }}>
      <path d="M -10 0 Q -2 -7 9 -4 Q 15 -2 17 0 Q 15 2 9 4 Q -2 7 -10 0 Z" />
      <path d="M -10 0 L -19 -6 L -16 0 L -19 6 Z" />
      <circle cx="9" cy="-1" r="1.2" fill="var(--b2c-accent)" stroke="none" />
    </g>
  );
}

// Plant feuillu au trait (tige + 2 paires de feuilles + feuille centrale),
// posé sur une étagère (origine = pied du plant).
function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g className="gv-stroke" transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 L0 -12" />
      <path d="M0 -8 Q -15 -12 -20 -28 Q -6 -26 0 -8 Z" />
      <path d="M0 -8 Q 15 -12 20 -28 Q 6 -26 0 -8 Z" />
      <path d="M0 -11 Q -11 -20 -11 -36 Q -2 -30 0 -11 Z" />
      <path d="M0 -11 Q 11 -20 11 -36 Q 2 -30 0 -11 Z" />
      <path d="M0 -12 Q -3.5 -30 0 -44 Q 3.5 -30 0 -12 Z" />
    </g>
  );
}

const PLANT_XS = [156, 208, 260, 312, 364];

export function AquaponieScene({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="96 0 328 420"
      className={className}
      fill="none"
      role="img"
      aria-label="Illustration : tour aquaponique — cultures hors-sol sur deux étages éclairés par LED, alimentées par un bassin à poissons"
    >
      <defs>
        <radialGradient id="aquaGlow" cx="50%" cy="55%" r="60%">
          <stop offset="0%" stopColor="#3FE08F" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#3FE08F" stopOpacity="0" />
        </radialGradient>
        {/* Hachures gravure dans l'eau du bassin */}
        <pattern
          id="aquaHatch"
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(28)"
        >
          <line x1="0" y1="0" x2="0" y2="7" stroke="#3FE08F" strokeWidth="0.5" opacity="0.16" />
        </pattern>
        <clipPath id="tankClip">
          <path d="M146 310 L146 378 Q146 386 154 386 L386 386 Q394 386 394 378 L394 310 Z" />
        </clipPath>
      </defs>
      <rect x="0" y="0" width="520" height="420" fill="url(#aquaGlow)" />

      {/* Structure du rack — montants, traverse haute, pieds */}
      <line className="gv-stroke gv-dim" x1="120" y1="30" x2="120" y2="400" />
      <line className="gv-stroke gv-dim" x1="400" y1="30" x2="400" y2="400" />
      <line className="gv-stroke gv-dim" x1="120" y1="30" x2="400" y2="30" />
      <line className="gv-stroke gv-dim" x1="106" y1="400" x2="134" y2="400" />
      <line className="gv-stroke gv-dim" x1="386" y1="400" x2="414" y2="400" />
      {/* Connecteurs aux jonctions */}
      {[
        [115, 25],
        [395, 25],
        [115, 145],
        [395, 145],
        [115, 260],
        [395, 260],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} className="gv-stroke gv-faint" x={x} y={y} width="10" height="10" />
      ))}

      {/* Étage 1 — rampe LED + plants + étagère */}
      <line className="gv-stroke gv-faint" x1="180" y1="30" x2="180" y2="52" />
      <line className="gv-stroke gv-faint" x1="340" y1="30" x2="340" y2="52" />
      <line className="gv-led" x1="150" y1="56" x2="370" y2="56" />
      <g>
        {PLANT_XS.map((x, i) => (
          <Plant key={x} x={x} y={150} s={i % 2 === 0 ? 1 : 0.92} />
        ))}
      </g>
      <line className="gv-stroke" x1="120" y1="150" x2="400" y2="150" />
      <line className="gv-stroke gv-dim" x1="120" y1="156" x2="400" y2="156" opacity="0.5" />

      {/* Étage 2 — rampe LED + plants + étagère */}
      <line className="gv-stroke gv-faint" x1="180" y1="156" x2="180" y2="168" />
      <line className="gv-stroke gv-faint" x1="340" y1="156" x2="340" y2="168" />
      <line className="gv-led" x1="150" y1="172" x2="370" y2="172" />
      <g>
        {PLANT_XS.map((x, i) => (
          <Plant key={x} x={x} y={265} s={i % 2 === 0 ? 0.94 : 1} />
        ))}
      </g>
      <line className="gv-stroke" x1="120" y1="265" x2="400" y2="265" />
      <line className="gv-stroke gv-dim" x1="120" y1="271" x2="400" y2="271" opacity="0.5" />

      {/* Bassin — cuve, rebord, eau hachurée, ligne d'eau */}
      <path
        className="gv-stroke"
        d="M140 300 L140 378 Q140 392 154 392 L386 392 Q400 392 400 378 L400 300"
      />
      <line className="gv-stroke" x1="132" y1="300" x2="408" y2="300" />
      <rect x="146" y="312" width="248" height="74" fill="url(#aquaHatch)" clipPath="url(#tankClip)" />
      <path className="gv-stroke" d="M146 312 Q 200 306 260 312 T 394 312" style={{ opacity: 0.9 }} />
      <path className="gv-stroke gv-dim" d="M146 320 Q 210 316 270 320 T 394 320" />

      {/* Panneau de contrôle de la cuve */}
      <rect className="gv-stroke gv-dim" x="332" y="330" width="50" height="44" rx="6" />
      {[340, 348, 356, 364].map((y) => (
        <line key={y} className="gv-stroke gv-faint" x1="340" y1={y} x2="374" y2={y} />
      ))}

      {/* Poissons + bulles (clippés dans la cuve) */}
      <g clipPath="url(#tankClip)">
        <Fish index={0} x={210} y={332} />
        <Fish index={1} x={300} y={350} />
        <Fish index={2} x={240} y={366} />
        <circle className="gv-bubble" cx="200" cy="372" r="2.5" />
        <circle className="gv-bubble gv-bubble--2" cx="282" cy="376" r="2" />
        <circle className="gv-bubble gv-bubble--3" cx="324" cy="370" r="3" />
      </g>

      {/* Étiquettes */}
      <text className="gv-label" x="260" y="18" textAnchor="middle">
        cultures hors-sol
      </text>
      <g className="gv-pulse">
        <text className="gv-label" x="260" y="49" textAnchor="middle">
          rampes led
        </text>
      </g>
      <text
        className="gv-label"
        x="260"
        y="412"
        textAnchor="middle"
        style={{ fill: "var(--b2c-accent)" }}
      >
        bassin aquaponique
      </text>
    </svg>
  );
}
