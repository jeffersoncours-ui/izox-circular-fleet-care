// Plaque "formule" gravée — 2 gravures (intérieur/extérieur) appliquées en
// masque CSS (mask-mode: luminance) : le trait clair du dessin est teinté à la
// volée (accent vif si actif, argent terne sinon), les zones sombres de la
// gravure restent transparentes et laissent voir le fond de la plaque.
// "Int. + Ext." allume les DEUX moitiés (la formule inclut l'intérieur),
// "Intérieur" n'allume que la gauche.

import { Droplet } from "lucide-react";
import type { FormuleB2C } from "@/lib/pricing-b2c";

interface FormuleToggleProps {
  value: FormuleB2C;
  onChange: (formule: FormuleB2C) => void;
}

export function FormuleToggle({ value, onChange }: FormuleToggleProps) {
  const extActive = value === "interieur_exterieur";

  return (
    <div className="b2c-formule-plaque" role="group" aria-label="Choix de la formule">
      <button
        type="button"
        onClick={() => onChange("interieur")}
        className="b2c-formule-plaque__half b2c-formule-plaque__half--int is-active"
        aria-pressed={!extActive}
      >
        <span className="b2c-formule-plaque__gravure" />
        <span className="b2c-formule-plaque__label">Intérieur</span>
      </button>

      <div className="b2c-formule-plaque__divider" aria-hidden="true" />

      <button
        type="button"
        onClick={() => onChange("interieur_exterieur")}
        className={`b2c-formule-plaque__half b2c-formule-plaque__half--ext ${extActive ? "is-active" : ""}`}
        aria-pressed={extActive}
      >
        <span className="b2c-formule-plaque__gravure" />
        <Droplet className="b2c-formule-plaque__badge" size={13} aria-hidden="true" />
        <span className="b2c-formule-plaque__label">Int. + Ext.</span>
      </button>
    </div>
  );
}
