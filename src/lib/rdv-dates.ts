// RDV duration & slot helpers for IZOX scheduling

const DUREES_PRESTATIONS: Record<string, number> = {
  pack_interieur: 90,
  pack_standard: 120,
  pack_vtc: 90,
  concession_one_shot: 60,
  fin_de_bail_one_shot: 180,
};

const DUREES_SUPPLEMENTS: Record<string, number> = {
  supplement_poils: 30,
  supplement_coffre: 45,
  supplement_ozone: 30,
  supplement_puzzi: 45,
};

const SEUIL_PLAGE_4H = 120;

export const MIN_VEHICULES_FLOTTE = 5;
export const MIN_VEHICULES_PAR_RDV = 2;

export function getDureeTotale(typePrestation: string, supplements: string[]): number {
  const base = DUREES_PRESTATIONS[typePrestation] ?? 0;
  const extras = supplements.reduce((sum, s) => sum + (DUREES_SUPPLEMENTS[s] ?? 0), 0);
  return base + extras;
}

export function getPlageRequise(dureeMinutes: number): '2h' | '4h' {
  return dureeMinutes >= SEUIL_PLAGE_4H ? '4h' : '2h';
}

export function needsMinVehicules(nbVehiculesFlotte: number): boolean {
  return nbVehiculesFlotte >= MIN_VEHICULES_FLOTTE;
}
