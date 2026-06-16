// Plaque "formule" gravée — image unique (cadre chromé + fond accent + les
// 2 gravures), fournie par l'utilisateur. Chaque moitié affiche un crop de
// cette même image via background-position (pas de détourage transparent
// nécessaire, l'image est pleine, opaque, bords nets). La moitié active
// "ressort" (ombre + luminosité), l'inactive paraît enfoncée dans la plaque.

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
      <label htmlFor="formule-interieur" className="b2c-formule-plaque__half b2c-formule-plaque__half--left">
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
      <label htmlFor="formule-interieur_exterieur" className="b2c-formule-plaque__half b2c-formule-plaque__half--right">
        <span className="sr-only">Intérieur + Extérieur</span>
      </label>
    </div>
  );
}
