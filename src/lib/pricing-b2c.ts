// Catalogue tarifaire B2C — prix TTC (particuliers).
// ⚠️ Ne JAMAIS mélanger avec src/lib/pricing.ts (B2B, HT, franchise TVA).
// Source : tasks/brief-landing-b2c.md §5.

export type VehiculeB2C = "citadine" | "berline" | "suv" | "utilitaire";
export type FormuleB2C = "interieur" | "interieur_exterieur";
export type OptionB2C = "puzzi" | "ozone";

export const VEHICULES_B2C: { id: VehiculeB2C; label: string; exemple: string }[] = [
  { id: "citadine", label: "Citadine", exemple: "Clio, 208, Polo…" },
  { id: "berline", label: "Berline", exemple: "Mégane, 308, Classe C…" },
  { id: "suv", label: "SUV", exemple: "3008, Tiguan, Captur…" },
  { id: "utilitaire", label: "Utilitaire", exemple: "Kangoo, Trafic, Master…" },
];

export const FORMULES_B2C: { id: FormuleB2C; label: string; description: string }[] = [
  {
    id: "interieur",
    label: "Intérieur",
    description: "Aspiration complète, plastiques, vitres intérieures, finitions",
  },
  {
    id: "interieur_exterieur",
    label: "Intérieur + Extérieur",
    description: "Formule intérieur + carrosserie, jantes et vitres extérieures à l'eau recyclée",
  },
];

// Prix TTC par véhicule et formule (€).
export const PRIX_B2C: Record<FormuleB2C, Record<VehiculeB2C, number>> = {
  interieur: { citadine: 80, berline: 110, suv: 140, utilitaire: 170 },
  interieur_exterieur: { citadine: 110, berline: 140, suv: 170, utilitaire: 200 },
};

export const OPTIONS_B2C: {
  id: OptionB2C;
  label: string;
  description: string;
  prix: Record<VehiculeB2C, number>;
}[] = [
  {
    id: "puzzi",
    label: "Puzzi — injection-extraction",
    description: "Nettoyage en profondeur des sièges et moquettes (taches, auréoles)",
    prix: { citadine: 40, berline: 47, suv: 53, utilitaire: 60 },
  },
  {
    id: "ozone",
    label: "Traitement ozone",
    description: "Désodorisation et assainissement de l'habitacle (tabac, animaux)",
    prix: { citadine: 40, berline: 40, suv: 40, utilitaire: 40 },
  },
];

export function prixTotalB2C(
  vehicule: VehiculeB2C,
  formule: FormuleB2C,
  options: OptionB2C[],
): number {
  const base = PRIX_B2C[formule][vehicule];
  const opts = options.reduce((sum, o) => {
    const opt = OPTIONS_B2C.find((x) => x.id === o);
    return sum + (opt ? opt.prix[vehicule] : 0);
  }, 0);
  return base + opts;
}

export function formatPrixTTC(v: number): string {
  return `${v.toLocaleString("fr-FR")} € TTC`;
}

// Zone d'intervention au lancement.
export const ZONE_INTERVENTION = {
  ville: "Évry-Courcouronnes",
  rayonKm: 25,
  latitude: 48.6238,
  longitude: 2.4296,
};

// Chiffres RSE réels — mesurés sur nos interventions (brief §8).
// ⚠️ Conformité DGCCRF : ne jamais modifier sans nouvelle mesure étayable.
// Toujours formuler "en moyenne, sur nos interventions" et nommer la base
// de comparaison ("vs un lavage au jet à domicile").
export const CHIFFRES_EAU = {
  litresUtilises: 50, // ~50 L / véhicule
  litresRecuperes: 40, // → 80 % récupérés
  litresReinjectes: 25, // → 50 % réinjectés dans la boucle
  pctRecupere: 80,
  pctReinjecte: 50,
  comparaisonJetMin: 150, // lavage au jet à domicile : 150–300 L
  comparaisonJetMax: 300,
} as const;
