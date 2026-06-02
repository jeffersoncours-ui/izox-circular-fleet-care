// Module 3 — Interventions: shared constants & types

export type TypePrestation = "exterieur" | "interieur" | "complet";
export type Statut = "planifiee" | "en_cours" | "en_revision" | "validee" | "refusee";
export type Moment = "avant" | "apres";

export interface ZoneDef {
  key: string;
  label: string;
  scope: "exterieur" | "interieur";
}

export const ZONES_EXTERIEUR: ZoneDef[] = [
  { key: "ext_diag_av_gauche", label: "Diagonale avant gauche", scope: "exterieur" },
  { key: "ext_diag_ar_droit", label: "Diagonale arrière droite", scope: "exterieur" },
];

export const ZONES_INTERIEUR: ZoneDef[] = [
  { key: "int_habitacle_av", label: "Habitacle avant", scope: "interieur" },
  { key: "int_habitacle_ar", label: "Habitacle arrière", scope: "interieur" },
  { key: "int_coffre", label: "Coffre", scope: "interieur" },
];

export function zonesFor(type: TypePrestation): ZoneDef[] {
  if (type === "exterieur") return ZONES_EXTERIEUR;
  if (type === "interieur") return ZONES_INTERIEUR;
  return [...ZONES_EXTERIEUR, ...ZONES_INTERIEUR];
}

export const CHECKLIST_INTERIEUR: { key: string; label: string }[] = [
  { key: "soufflette", label: "Soufflette" },
  { key: "brossage", label: "Brossage" },
  { key: "vapeur", label: "Vapeur" },
  { key: "aspiration", label: "Aspiration" },
  { key: "extraction_puzzi", label: "Extraction Puzzi" },
  { key: "plastiques_bionetal", label: "Plastiques Bionetal" },
  { key: "vitres_int", label: "Vitres intérieures" },
];

export const CHECKLIST_EXTERIEUR: { key: string; label: string }[] = [
  { key: "pre_rincage", label: "Pré-rinçage" },
  { key: "lavage_hp", label: "Lavage HP Kärcher" },
  { key: "jantes", label: "Jantes" },
  { key: "vitres_ext", label: "Vitres extérieures" },
  { key: "sechage", label: "Séchage" },
  { key: "eau_recuperee", label: "Eau récupérée via berme" },
];

export function statutLabel(s: Statut): string {
  switch (s) {
    case "planifiee":
      return "Planifiée";
    case "en_cours":
      return "En cours";
    case "en_revision":
      return "À valider";
    case "validee":
      return "Validée";
    case "refusee":
      return "Refusée";
  }
}

export function statutColor(s: Statut): string {
  switch (s) {
    case "planifiee":
      return "bg-blue-100 text-blue-900 border border-blue-300";
    case "en_cours":
      return "bg-muted text-muted-foreground";
    case "en_revision":
      return "bg-amber-100 text-amber-900 border border-amber-300";
    case "validee":
      return "bg-primary-soft text-primary border border-primary/30";
    case "refusee":
      return "bg-red-100 text-red-900 border border-red-300";
  }
}
