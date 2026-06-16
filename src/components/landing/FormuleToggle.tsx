// Plaque "formule" — image fournie par l'utilisateur (cadre chromé + fond
// accent + 2 gravures), affichée intégralement, jamais recadrée ni recolorée.
// L'effet "enfoncé / surélevé" est porté par 2 calques de surbrillance
// positionnés par-dessus chaque gravure (pas de découpe de l'image elle-même
// → aucun risque de désalignement). Sélection via 2 radios cachés + sélecteur
// CSS ~ (zéro JS), comme le reste des toggles de la landing.

import type { FormuleB2C } from "@/lib/pricing-b2c";

interface FormuleToggleProps {
  value: FormuleB2C;
  onChange: (formule: FormuleB2C) => void;
}

export function FormuleToggle({ value, onChange }: FormuleToggleProps) {
  return (
    <div className="b2c-formule-plaque" role="group" aria-label="Choix de la formule">
      <input
        type="radio"
        name="formule"
        id="formule-interieur"
        className="b2c-formule-plaque__input"
        checked={value === "interieur"}
        onChange={() => onChange("interieur")}
      />
      <label htmlFor="formule-interieur" className="b2c-formule-plaque__hit b2c-formule-plaque__hit--left">
        <span className="sr-only">Intérieur</span>
      </label>

      <input
        type="radio"
        name="formule"
        id="formule-interieur_exterieur"
        className="b2c-formule-plaque__input"
        checked={value === "interieur_exterieur"}
        onChange={() => onChange("interieur_exterieur")}
      />
      <label htmlFor="formule-interieur_exterieur" className="b2c-formule-plaque__hit b2c-formule-plaque__hit--right">
        <span className="sr-only">Intérieur + Extérieur</span>
      </label>

      <div className="b2c-formule-plaque__well b2c-formule-plaque__well--left" aria-hidden="true" />
      <div className="b2c-formule-plaque__well b2c-formule-plaque__well--right" aria-hidden="true" />
    </div>
  );
}
