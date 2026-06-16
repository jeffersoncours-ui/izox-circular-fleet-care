// Plaque "formule" gravée — façon plaque chromée/médaille (réf. utilisateur).
// Mécanique reprise de glass-radio-group (21st.dev) mais en CSS vanilla scopé
// .izox-b2c : radios cachés + glider unique qui glisse derrière la moitié active.
// Sélection exclusive. Les 2 gravures (détourées, fond transparent) sont posées
// en <img> directement sur le fond bleu nuit de la plaque.

import { Droplet } from "lucide-react";
import type { FormuleB2C } from "@/lib/pricing-b2c";

interface FormuleToggleProps {
  value: FormuleB2C;
  onChange: (formule: FormuleB2C) => void;
}

export function FormuleToggle({ value, onChange }: FormuleToggleProps) {
  return (
    <div className="b2c-formule-plaque" role="group" aria-label="Choix de la formule">
      <div className="b2c-formule-plaque__frame">
        <input
          type="radio"
          name="formule"
          id="formule-interieur"
          className="b2c-formule-plaque__input"
          checked={value === "interieur"}
          onChange={() => onChange("interieur")}
        />
        <label htmlFor="formule-interieur" className="b2c-formule-plaque__half">
          <img src="/gravure-interieur.png" alt="" className="b2c-formule-plaque__gravure" />
          <span className="b2c-formule-plaque__label">Intérieur</span>
        </label>

        <input
          type="radio"
          name="formule"
          id="formule-interieur_exterieur"
          className="b2c-formule-plaque__input"
          checked={value === "interieur_exterieur"}
          onChange={() => onChange("interieur_exterieur")}
        />
        <label htmlFor="formule-interieur_exterieur" className="b2c-formule-plaque__half">
          <img src="/gravure-exterieur.png" alt="" className="b2c-formule-plaque__gravure" />
          <Droplet className="b2c-formule-plaque__badge" size={13} aria-hidden="true" />
          <span className="b2c-formule-plaque__label">Int. + Ext.</span>
        </label>

        <div className="b2c-formule-plaque__divider" aria-hidden="true" />
        <div className="b2c-formule-plaque__glider" aria-hidden="true" />
      </div>
    </div>
  );
}
