// Gravure R5 E-Tech au trait (hero) — design-brief-v2.md §Hero.
// Lance haute pression (4 jets animés), carrosserie hatchback au trait avec
// hachures NOCTRA, ruissellement + gouttes, berme de récupération + retour
// local, étiquettes. Micro-animations CSS autonomes (jets/brume/gouttes).
// prefers-reduced-motion neutralise les animations via le bloc global du CSS.

export function HeroCar({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="56 36 404 276"
      className={className}
      fill="none"
      role="img"
      aria-label="Illustration : nettoyage d'une Renault 5 E-Tech à l'eau recyclée avec récupération en berme"
    >
      <defs>
        {/* Hachures NOCTRA — remplissage diagonal très discret de la carrosserie */}
        <pattern id="noctra" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="#3FD8FF" strokeWidth="0.5" opacity="0.18" />
        </pattern>
        <radialGradient id="heroGlow" cx="62%" cy="34%" r="60%">
          <stop offset="0%" stopColor="#3FD8FF" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#3FD8FF" stopOpacity="0" />
        </radialGradient>
        <clipPath id="bodyClip">
          <path d="M82 248 L78 214 Q74 200 84 190 L110 176 Q120 160 140 152 L150 150 L260 150 Q272 150 280 160 L320 180 L350 190 Q396 196 396 212 L392 248 Z" />
        </clipPath>
      </defs>

      {/* Halo */}
      <rect x="0" y="0" width="460" height="320" fill="url(#heroGlow)" />

      {/* Ombre portée douce */}
      <ellipse cx="236" cy="258" rx="170" ry="12" fill="#3FD8FF" opacity="0.05" />

      {/* Berme de récupération (tray sous le véhicule) */}
      <path className="gv-stroke gv-dim" d="M96 262 L376 262 L360 286 L112 286 Z" />
      <path className="gv-stroke gv-dim" d="M120 274 L352 274" opacity="0.4" />
      {/* Retour local — tuyau de pompage + flèche */}
      <path className="gv-stroke gv-dim" d="M376 274 Q418 274 418 230 L418 188" />
      <path className="gv-stroke" d="M412 198 L418 186 L424 198" opacity="0.8" />

      {/* Carrosserie — coque (data-car-body : reçoit la teinte en mode « teintée ») */}
      <path
        className="gv-stroke"
        data-car-body
        d="M82 248 L78 214 Q74 200 84 190 L110 176 Q120 160 140 152 L150 150 L260 150 Q272 150 280 160 L320 180 L350 190 Q396 196 396 212 L392 248 Z"
      />
      {/* Hachures NOCTRA dans la coque */}
      <rect x="70" y="148" width="332" height="104" fill="url(#noctra)" clipPath="url(#bodyClip)" />

      {/* Bas de caisse + passages de roue */}
      <path
        className="gv-stroke"
        d="M392 248 L360 248 A30 30 0 0 0 300 248 L170 248 A30 30 0 0 0 110 248 L82 248"
      />

      {/* Vitrage (greenhouse) */}
      <path className="gv-stroke gv-dim" d="M150 160 L160 184 L262 184 L278 162 Q272 158 262 158 L156 158 Q151 158 150 160 Z" />
      <line className="gv-stroke gv-dim" x1="206" y1="158" x2="206" y2="184" opacity="0.4" />

      {/* Ligne de ceinture + poignée + ligne de porte */}
      <line className="gv-stroke gv-dim" x1="92" y1="200" x2="384" y2="200" opacity="0.45" />
      <line className="gv-stroke gv-dim" x1="206" y1="190" x2="206" y2="248" opacity="0.35" />
      <path className="gv-stroke gv-dim" d="M236 196 L256 196" opacity="0.7" />

      {/* Roues */}
      {[140, 330].map((cx) => (
        <g key={cx}>
          <circle className="gv-stroke" cx={cx} cy="248" r="30" />
          <circle className="gv-stroke gv-dim" cx={cx} cy="248" r="13" />
          {[0, 60, 120, 180, 240, 300].map((a) => {
            const rad = (a * Math.PI) / 180;
            return (
              <line
                key={a}
                className="gv-stroke gv-faint"
                x1={cx + 13 * Math.cos(rad)}
                y1={248 + 13 * Math.sin(rad)}
                x2={cx + 28 * Math.cos(rad)}
                y2={248 + 28 * Math.sin(rad)}
              />
            );
          })}
        </g>
      ))}

      {/* Lance haute pression + éventail de 4 jets */}
      <g>
        <path className="gv-stroke" d="M442 96 L420 112 L410 120" />
        <rect className="gv-stroke" x="436" y="86" width="18" height="10" rx="2" transform="rotate(-32 445 91)" />
        {/* 4 jets convergents vers la carrosserie */}
        <line className="gv-jet" x1="410" y1="120" x2="300" y2="168" />
        <line className="gv-jet gv-jet--2" x1="410" y1="120" x2="320" y2="184" />
        <line className="gv-jet gv-jet--3" x1="410" y1="120" x2="276" y2="160" />
        <line className="gv-jet gv-jet--4" x1="410" y1="120" x2="252" y2="178" />
        {/* Brume aux impacts */}
        <circle className="gv-mist" cx="294" cy="170" r="7" />
        <circle className="gv-mist" cx="262" cy="172" r="5" style={{ animationDelay: "0.9s" }} />
      </g>

      {/* Ruissellement — nappes le long du flanc */}
      <path className="gv-stroke gv-dim" d="M250 196 Q248 220 252 244" opacity="0.5" />
      <path className="gv-stroke gv-dim" d="M290 198 Q288 222 292 244" opacity="0.5" />
      {/* Gouttes qui chutent */}
      <circle className="gv-drip" cx="250" cy="246" r="2.2" />
      <circle className="gv-drip gv-drip--2" cx="290" cy="246" r="2.2" />
      <circle className="gv-drip gv-drip--3" cx="200" cy="246" r="2" />
      <circle className="gv-drip gv-drip--4" cx="330" cy="250" r="2" />

      {/* Étiquettes + lignes de rappel */}
      <g className="gv-pulse">
        <line className="gv-stroke gv-faint" x1="408" y1="78" x2="430" y2="64" />
        <text className="gv-label" x="332" y="60">jet haute pression</text>
      </g>
      <line className="gv-stroke gv-faint" x1="270" y1="210" x2="270" y2="120" opacity="0.3" />
      <text className="gv-label" x="214" y="116">eau ~50 L en moyenne</text>
      <text className="gv-label" x="120" y="302">berme de récupération</text>
      <text className="gv-label" x="392" y="172" textAnchor="end" style={{ fill: "var(--b2c-accent)" }}>
        retour local
      </text>
    </svg>
  );
}
