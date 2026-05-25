// Compute decomposed gel quota over a rolling 12-month window.
// Rules:
//  - joursActifs  = duration of all gels that have already started or are running/closed
//                   (statuts: 'active', 'close', plus 'validee'/'en_attente' whose date_debut <= today)
//  - joursProgrammes = duration of future gels (statuts: 'validee'/'en_attente' whose date_debut > today)
//  - total = joursActifs + joursProgrammes

export interface DemandeGelRow {
  statut: string;
  date_debut: string | null;
  date_fin_prevue: string | null;
  date_fin_effective?: string | null;
}

export interface QuotaGelDecompose {
  joursActifs: number;
  joursProgrammes: number;
  total: number;
}

function diffJours(start: string, end: string): number {
  const a = new Date(start + "T00:00:00").getTime();
  const b = new Date(end + "T00:00:00").getTime();
  return Math.max(0, Math.round((b - a) / 86400000) + 1);
}

export function computeQuotaGelDecompose(rows: DemandeGelRow[]): QuotaGelDecompose {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let joursActifs = 0;
  let joursProgrammes = 0;

  for (const r of rows) {
    if (!r.date_debut || !r.date_fin_prevue) continue;
    const debut = new Date(r.date_debut + "T00:00:00");
    const isFutur = debut > today;
    const fin = r.date_fin_effective ?? r.date_fin_prevue;
    const duree = diffJours(r.date_debut, fin);

    if (r.statut === "active" || r.statut === "close") {
      joursActifs += duree;
    } else if (r.statut === "validee" || r.statut === "en_attente") {
      if (isFutur) joursProgrammes += duree;
      else joursActifs += duree;
    }
  }

  return { joursActifs, joursProgrammes, total: joursActifs + joursProgrammes };
}
