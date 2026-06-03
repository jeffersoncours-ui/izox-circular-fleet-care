// Module 3 — Interventions: shared constants & types

export type TypePrestation = "exterieur" | "interieur" | "complet";
export type Statut = "planifiee" | "en_cours" | "en_revision" | "validee" | "refusee" | "annulee";
export type Moment = "avant" | "apres";

export interface ZoneDef {
  key: string;
  label: string;
  scope: "exterieur" | "interieur";
}

export const ZONES_EXTERIEUR: ZoneDef[] = [
  { key: "pare_chocs_av",  label: "Pare-chocs avant",    scope: "exterieur" },
  { key: "capot",          label: "Capot",                scope: "exterieur" },
  { key: "cote_gauche",    label: "Côté gauche",          scope: "exterieur" },
  { key: "cote_droit",     label: "Côté droit",           scope: "exterieur" },
  { key: "toit",           label: "Toit",                 scope: "exterieur" },
  { key: "coffre",         label: "Coffre",               scope: "exterieur" },
];

export const ZONES_INTERIEUR: ZoneDef[] = [
  { key: "int_habitacle_av", label: "Habitacle avant",   scope: "interieur" },
  { key: "int_habitacle_ar", label: "Habitacle arrière", scope: "interieur" },
];

export function zonesFor(type: TypePrestation): ZoneDef[] {
  if (type === "exterieur") return ZONES_EXTERIEUR;
  if (type === "interieur") return ZONES_INTERIEUR;
  return [...ZONES_EXTERIEUR, ...ZONES_INTERIEUR];
}

// Convertit un type de prestation (pack commercial ou scope direct) en scope interne
export function typeScope(t: string): TypePrestation {
  if (t === "interieur" || t === "pack_interieur") return "interieur";
  if (t === "exterieur") return "exterieur";
  return "complet"; // pack_standard, pack_vtc, complet
}

export const CHECKLIST_INTERIEUR: { key: string; label: string }[] = [
  { key: "aspiration",    label: "Aspiration tapis & sièges" },
  { key: "tableau_bord",  label: "Tableau de bord" },
  { key: "plastiques",    label: "Plastiques nettoyés" },
  { key: "vitres_int",    label: "Vitres intérieures" },
  { key: "desodorisation",label: "Désodorisation" },
];

export const CHECKLIST_EXTERIEUR: { key: string; label: string }[] = [
  { key: "pre_rincage",   label: "Pré-rinçage" },
  { key: "lavage_hp",     label: "Lavage haute pression" },
  { key: "jantes",        label: "Jantes nettoyées" },
  { key: "vitres_ext",    label: "Vitres extérieures" },
  { key: "sechage",       label: "Séchage" },
  { key: "eau_recuperee", label: "Eau récupérée (berme)" },
];

export function statutLabel(s: Statut): string {
  switch (s) {
    case "planifiee":   return "Planifiée";
    case "en_cours":    return "En cours";
    case "en_revision": return "À valider";
    case "validee":     return "Validée";
    case "refusee":     return "Refusée";
    case "annulee":     return "Annulée";
  }
}

export function statutColor(s: Statut): string {
  switch (s) {
    case "planifiee":   return "bg-blue-100 text-blue-900 border border-blue-300";
    case "en_cours":    return "bg-muted text-muted-foreground";
    case "en_revision": return "bg-amber-100 text-amber-900 border border-amber-300";
    case "validee":     return "bg-primary-soft text-primary border border-primary/30";
    case "refusee":     return "bg-red-100 text-red-900 border border-red-300";
    case "annulee":     return "bg-gray-100 text-gray-600 border border-gray-300";
  }
}
