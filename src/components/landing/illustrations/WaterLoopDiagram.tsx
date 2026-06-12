// Boucle d'eau — tuyau « stadium » qui se remplit au scroll (section signature).
// Structure : pipe-outer (paroi) / pipe-inner (creux) / loop-draw (eau, dasharray
// piloté en Phase 2c) / loop-sheen (reflet). 4 stations + goutte pilote.
// Le remplissage, l'allumage des stations et la goutte sont branchés au scroll
// dans WaterLoop (Phase 2c) via les data-attributes ci-dessous.

import { CHIFFRES_EAU } from "@/lib/pricing-b2c";

// Tracé partagé (stadium horizontal). Sens horaire depuis le haut-gauche.
export const LOOP_PATH =
  "M 220 60 L 500 60 A 120 120 0 0 1 500 300 L 220 300 A 120 120 0 0 1 220 60 Z";

// Stations positionnées SUR le tracé, avec la fraction de longueur (t ∈ 0..1)
// à laquelle elles s'allument — utilisée par le contrôleur scroll de Phase 2c.
const STATIONS = [
  { x: 300, y: 60, t: 0.08, title: "Lavage à domicile", value: `~${CHIFFRES_EAU.litresUtilises} L`, anchor: "middle", dy: -16 },
  { x: 620, y: 180, t: 0.33, title: "Berme + pompage", value: `${CHIFFRES_EAU.pctRecupere} %`, anchor: "start", dy: 4, dx: 14 },
  { x: 420, y: 300, t: 0.58, title: "Recyclage au local", value: `${CHIFFRES_EAU.pctReinjecte} %`, anchor: "middle", dy: 26 },
  { x: 100, y: 180, t: 0.83, title: "Réutilisation", value: "↺", anchor: "end", dy: 4, dx: -14 },
] as const;

export function WaterLoopDiagram({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 720 360"
      className={className}
      fill="none"
      role="img"
      aria-label="Schéma de la boucle d'eau : lavage, récupération en berme, recyclage au local, réutilisation"
      data-loop-svg
    >
      <defs>
        <radialGradient id="loopGlow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#3FE08F" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#3FE08F" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="60" y="20" width="600" height="320" fill="url(#loopGlow)" />

      {/* Paroi + creux du tuyau */}
      <path className="pipe-outer" d={LOOP_PATH} />
      <path className="pipe-inner" d={LOOP_PATH} />
      {/* Eau qui remplit (dasharray posé en JS) + reflet */}
      <path className="loop-draw" d={LOOP_PATH} data-loop-draw />
      <path className="loop-sheen" d={LOOP_PATH} data-loop-sheen />

      {/* Stations */}
      {STATIONS.map((s, i) => (
        <g key={i} className="station" data-station data-station-t={s.t}>
          <circle className="station__dot" cx={s.x} cy={s.y} r="9" />
          <text
            className="gv-label"
            x={s.x + ("dx" in s ? (s.dx as number) : 0)}
            y={s.y + s.dy}
            textAnchor={s.anchor}
            style={{ fill: "var(--b2c-tx)" }}
          >
            {s.title}
          </text>
          <text
            className="gv-label"
            x={s.x + ("dx" in s ? (s.dx as number) : 0)}
            y={s.y + s.dy + 13}
            textAnchor={s.anchor}
            style={{ fill: "var(--b2c-accent)", fontWeight: 700 }}
          >
            {s.value}
          </text>
        </g>
      ))}

      {/* Goutte pilote (position posée en JS au scroll) */}
      <circle className="loop-drop" data-loop-drop cx="220" cy="60" r="6" />
    </svg>
  );
}
