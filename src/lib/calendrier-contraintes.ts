/**
 * Contraintes calendrier pour les demandes RDV client IZOX Pro.
 *
 * Règles métier :
 * - Date minimale : J+1 (jamais le jour même)
 * - Date maximale : J+60 jours
 * - Pas de weekends (samedi, dimanche)
 * - Pas de jours fériés français
 * - Créneaux : matin (8h-12h) ou après-midi (14h-18h)
 */

import { addDays, isBefore, isSameDay, isWeekend, startOfDay } from "date-fns";

export function getJoursFeriesFr(year: number): Date[] {
  const fixes = [
    new Date(year, 0, 1), // Jour de l'An
    new Date(year, 4, 1), // Fête du Travail
    new Date(year, 4, 8), // Victoire 1945
    new Date(year, 6, 14), // Fête Nationale
    new Date(year, 7, 15), // Assomption
    new Date(year, 10, 1), // Toussaint
    new Date(year, 10, 11), // Armistice 1918
    new Date(year, 11, 25), // Noël
  ];

  // Algorithme de Gauss pour Pâques.
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monthPaques = Math.floor((h + l - 7 * m + 114) / 31);
  const dayPaques = ((h + l - 7 * m + 114) % 31) + 1;

  const paques = new Date(year, monthPaques - 1, dayPaques);
  const lundiPaques = addDays(paques, 1);
  const ascension = addDays(paques, 39);
  const lundiPentecote = addDays(paques, 50);

  return [...fixes, lundiPaques, ascension, lundiPentecote];
}

export function isJourFerie(date: Date): boolean {
  const year = date.getFullYear();
  const feries = [...getJoursFeriesFr(year), ...getJoursFeriesFr(year + 1)];
  return feries.some((ferie) => isSameDay(ferie, date));
}

export function isDateSelectable(date: Date): boolean {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const minDate = addDays(today, 1);

  if (isBefore(target, minDate)) return false;
  if (isWeekend(target)) return false;
  if (isJourFerie(target)) return false;
  return true;
}

export function getMinDateSelectable(): Date {
  let candidate = addDays(startOfDay(new Date()), 1);
  while (!isDateSelectable(candidate)) {
    candidate = addDays(candidate, 1);
  }
  return candidate;
}

export function getMaxDateSelectable(): Date {
  return addDays(startOfDay(new Date()), 60);
}

export const CRENEAUX_HORAIRES = [
  { id: "matin", label: "Matin (8h - 12h)", debut: "08:00", fin: "12:00" },
  { id: "apres_midi", label: "Après-midi (14h - 18h)", debut: "14:00", fin: "18:00" },
] as const;

export type CreneauId = (typeof CRENEAUX_HORAIRES)[number]["id"];

export interface CreneauPrefere {
  date: string; // ISO YYYY-MM-DD
  creneau: CreneauId;
}

/**
 * Formate les créneaux pour le payload JSONB de la RPC creer_demande_rdv.
 * Conserve la clé legacy `plage` (matin / apres-midi) pour la compatibilité
 * d'affichage avec LigneDemandeRdv.
 */
export function formatCreneauxPourRPC(creneaux: CreneauPrefere[]): unknown {
  return creneaux.map((c) => {
    const horaire = CRENEAUX_HORAIRES.find((h) => h.id === c.creneau);
    const plageLegacy = c.creneau === "apres_midi" ? "apres-midi" : "matin";
    return {
      date: c.date,
      creneau: c.creneau,
      plage: plageLegacy,
      debut: horaire?.debut,
      fin: horaire?.fin,
    };
  });
}
