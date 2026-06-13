// HeroCar — photo blueprint R5 E-Tech (1406×752) + overlay SVG animé.
// La photo est déjà traitée (teinte verte blueprint). Le SVG y superpose :
// masque plaque, jets haute pression, gouttes, label berme, callout 50 L,
// ligne de cote, scan line. Animations : gv-jet/drip/mist/pulse + bp-scan.

export function HeroCar({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1406 752"
      className={className}
      fill="none"
      role="img"
      aria-label="Renault 5 E-Tech — nettoyage circulaire à eau recyclée en circuit fermé"
    >
      <defs>
        {/* Gradient balayage vertical (scan line) */}
        <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3FD8FF" stopOpacity="0" />
          <stop offset="40%"  stopColor="#3FD8FF" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#3FD8FF" stopOpacity="0" />
        </linearGradient>
        {/* Glow léger pour les callouts */}
        <filter id="hcGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Photo blueprint R5 E-Tech ── */}
      <image
        href="/hero-car-r5.png"
        x="0" y="0"
        width="1406" height="752"
        preserveAspectRatio="xMidYMid slice"
      />

      {/* ── Masque plaque d'immatriculation (avant, centre bas) ──
           Coordonnées approximatives à ajuster si nécessaire. */}
      <rect x="560" y="548" width="210" height="52" rx="4"
            fill="#051009" opacity="0.94" />
      <rect x="563" y="551" width="204" height="46" rx="3"
            fill="none" stroke="#3FD8FF" strokeWidth="1" opacity="0.35" />
      <text
        x="665" y="581"
        fill="#3FD8FF" fontSize="22" textAnchor="middle"
        fontFamily="monospace" letterSpacing="5" opacity="0.65"
      >
        IZOX
      </text>

      {/* ── Jets haute pression depuis la buse (haut droite) ── */}
      <line className="gv-jet"        x1="1240" y1="120" x2="850"  y2="350" />
      <line className="gv-jet gv-jet--2" x1="1240" y1="120" x2="820"  y2="390" />
      <line className="gv-jet gv-jet--3" x1="1240" y1="120" x2="870"  y2="320" />
      <line className="gv-jet gv-jet--4" x1="1240" y1="120" x2="795"  y2="368" />
      {/* Brume à l'impact */}
      <circle className="gv-mist" cx="845" cy="352" r="24" fill="#3FD8FF" />
      <circle className="gv-mist" cx="822" cy="388" r="18" fill="#3FD8FF"
              style={{ animationDelay: "0.9s" }} />

      {/* ── Ruissellement + gouttes vers la berme ── */}
      <circle className="gv-drip"           cx="650" cy="590" r="6"   fill="#3FD8FF" />
      <circle className="gv-drip gv-drip--2" cx="700" cy="595" r="5.5" fill="#3FD8FF" />
      <circle className="gv-drip gv-drip--3" cx="600" cy="585" r="6"   fill="#3FD8FF" />
      <circle className="gv-drip gv-drip--4" cx="750" cy="592" r="5"   fill="#3FD8FF" />

      {/* ── Label BERNE DE RÉCUPÉRATION ── */}
      <g className="gv-pulse">
        <line x1="60"  y1="700" x2="920" y2="700"
              stroke="#3FD8FF" strokeWidth="1.5" strokeDasharray="8 5" opacity="0.55" />
        <polygon points="60,700 76,693 76,707" fill="#3FD8FF" opacity="0.7" />
        <text
          x="490" y="732"
          fill="#3FD8FF" fontSize="24" textAnchor="middle"
          fontFamily="monospace" letterSpacing="5" opacity="0.9"
        >
          BERNE DE RÉCUPÉRATION
        </text>
      </g>

      {/* ── Callout "~50 L recyclés par lavage" (haut gauche) ── */}
      <g className="gv-pulse" style={{ animationDelay: "1.2s" }} filter="url(#hcGlow)">
        <rect x="28" y="195" width="228" height="90" rx="6"
              fill="#051009" opacity="0.82"
              stroke="#3FD8FF" strokeWidth="1.2" />
        <text x="142" y="238" fill="#3FD8FF" fontSize="22" textAnchor="middle"
              fontFamily="monospace" letterSpacing="1">
          ~50 L recyclés
        </text>
        <text x="142" y="264" fill="#3FD8FF" fontSize="17" textAnchor="middle"
              fontFamily="monospace" opacity="0.7">
          par lavage
        </text>
        {/* Flèche vers la voiture */}
        <line x1="256" y1="240" x2="340" y2="280"
              stroke="#3FD8FF" strokeWidth="1" opacity="0.6" />
      </g>

      {/* ── Ligne de cote verticale gauche ── */}
      <line x1="30" y1="148" x2="30" y2="648"
            stroke="#3FD8FF" strokeWidth="1.2" opacity="0.35" />
      <line x1="20" y1="148" x2="40" y2="148"
            stroke="#3FD8FF" strokeWidth="1.2" opacity="0.35" />
      <line x1="20" y1="648" x2="40" y2="648"
            stroke="#3FD8FF" strokeWidth="1.2" opacity="0.35" />

      {/* ── Scan line (balayage analyse) ── */}
      <rect className="bp-scan" x="0" y="0" width="1406" height="80"
            fill="url(#scanGrad)" />
    </svg>
  );
}
