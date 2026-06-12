// Boucle d'eau — goutte dont le CONTOUR se dessine au scroll : un point
// lumineux part du sommet et parcourt le bord (descente gauche → fond →
// remontée droite), comme un tuyau qui se remplit. Le remplissage et la
// position du point sont pilotés par installWaterLoop (scrollScenes) via
// les data-attributes [data-loop-draw] / [data-loop-drop] / [data-station].
// Les chiffres (~50 L / 80 % / 50 %) sont rendus en HTML autour du SVG
// (sections.tsx) — ici uniquement la goutte + les points d'étape.

// Tracé de la goutte : sommet (180,26) → flanc gauche → fond circulaire
// (r=120, centre 180,268) → flanc droit → retour au sommet.
export const LOOP_PATH =
  "M 180 26 C 150 96 60 170 60 268 A 120 120 0 0 0 180 388 A 120 120 0 0 0 300 268 C 300 170 210 96 180 26 Z";

// Points d'étape SUR le contour, avec la fraction de longueur (t ∈ 0..1)
// à laquelle ils s'allument au passage du remplissage.
const STATIONS = [
  { cx: 180, cy: 26, t: 0.01 }, // sommet — départ
  { cx: 60, cy: 268, t: 0.3 }, // flanc gauche
  { cx: 180, cy: 388, t: 0.5 }, // fond
  { cx: 300, cy: 268, t: 0.7 }, // flanc droit
] as const;

export function WaterLoopDiagram({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 420"
      className={className}
      fill="none"
      role="img"
      aria-label="Goutte d'eau dont le contour se dessine au fil du défilement : l'eau parcourt la boucle de lavage, récupération et recyclage"
      data-loop-svg
    >
      <defs>
        <radialGradient id="loopGlow" cx="50%" cy="58%" r="55%">
          <stop offset="0%" stopColor="#3FD8FF" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#3FD8FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="20" y="20" width="320" height="390" fill="url(#loopGlow)" />

      {/* Remplissage doux + piste du contour */}
      <path className="drop-fill" d={LOOP_PATH} />
      <path className="drop-track" d={LOOP_PATH} />
      {/* Contour qui se dessine (dasharray posé en JS au scroll) */}
      <path className="loop-draw" d={LOOP_PATH} data-loop-draw />

      {/* Points d'étape sur le contour */}
      {STATIONS.map((s, i) => (
        <g key={i} className="station" data-station data-station-t={s.t}>
          <circle className="station__dot" cx={s.cx} cy={s.cy} r="7" />
        </g>
      ))}

      {/* Point pilote (position posée en JS au scroll) */}
      <circle className="loop-drop" data-loop-drop cx="180" cy="26" r="5" />
    </svg>
  );
}
