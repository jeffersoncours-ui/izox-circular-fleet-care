// Types et helpers partagés pour l'affichage des factures (client + admin).
// Les données affichées proviennent des snapshots JSONB immuables stockés
// au moment de la génération (generer_facture) — pas des tables live.

import type { Database } from "@/integrations/supabase/types";

export type StatutFacture = Database["public"]["Enums"]["statut_facture_enum"];
export type RegimeTva = Database["public"]["Enums"]["regime_tva_enum"];

// Ligne de facture (table factures_lignes).
export interface FactureLigne {
  id: string;
  ordre_affichage: number;
  type_ligne: string; // 'prestation' | 'remise_palier' | 'remise_commerciale' | 'total'
  libelle: string;
  quantite: number | null;
  prix_unitaire_ht: number | null;
  montant_ht: number;
  tva_taux: number | null;
}

// Snapshots JSONB (forme produite par generer_facture).
export interface SnapshotClient {
  entreprise_id?: string;
  raison_sociale?: string;
  siret?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
}

export interface SnapshotIzox {
  raison_sociale?: string;
  mention_tva?: string;
}

export interface SnapshotContrat {
  contrat_id?: string;
  numero_contrat?: string;
  engagement_type?: string;
  multiplicateur_prix?: number;
  palier_applique?: string;
  taux_palier?: number;
  remise_commerciale_pct?: number;
  facteur_commercial_effectif?: number;
  nb_vehicules_total_entreprise?: number;
}

export interface SnapshotPrestation {
  intervention_id?: string;
  date_intervention?: string;
  vehicule_id?: string;
  vehicule_immatriculation?: string;
  vehicule_marque_modele?: string;
  contrat_ligne_id?: string;
}

// Facture (sous-ensemble de la table factures utile à l'affichage).
export interface Facture {
  id: string;
  numero_facture: string | null;
  statut: StatutFacture;
  regime_tva: RegimeTva;
  periode_debut: string;
  periode_fin: string;
  date_emission: string | null;
  date_echeance: string | null;
  date_paiement: string | null;
  montant_ht: number;
  tva_taux: number;
  tva_montant: number;
  montant_ttc: number;
  devise: string;
  mention_tva_speciale: string | null;
  snapshot_client: SnapshotClient | null;
  snapshot_izox: SnapshotIzox | null;
  snapshot_contrat: SnapshotContrat | null;
  snapshot_prestations: SnapshotPrestation[] | null;
}

// Colonnes à sélectionner pour reconstruire une Facture complète.
export const FACTURE_SELECT =
  "id, numero_facture, statut, regime_tva, periode_debut, periode_fin, date_emission, date_echeance, date_paiement, montant_ht, tva_taux, tva_montant, montant_ttc, devise, mention_tva_speciale, snapshot_client, snapshot_izox, snapshot_contrat, snapshot_prestations";

// Configuration visuelle par statut.
export const STATUT_FACTURE: Record<
  StatutFacture,
  { label: string; badge: string; ribbon: string }
> = {
  brouillon: {
    label: "Brouillon",
    badge: "bg-muted text-muted-foreground border-border",
    ribbon: "var(--muted-foreground)",
  },
  emise: {
    label: "Émise · à régler",
    badge: "bg-warning-soft text-warning border-warning/30",
    ribbon: "var(--warning)",
  },
  payee: {
    label: "Payée",
    badge: "bg-success-soft text-success border-success/30",
    ribbon: "var(--success)",
  },
  annulee: {
    label: "Annulée",
    badge: "bg-destructive-soft text-destructive border-destructive/30",
    ribbon: "var(--destructive)",
  },
};

const PALIER_LABELS: Record<string, string> = {
  starter: "Starter (1–4 véhicules)",
  pro: "Pro (5–9 véhicules)",
  business: "Business (10–19 véhicules)",
  premium: "Premium (20+ véhicules)",
};

export function palierLabel(palier?: string | null): string {
  if (!palier) return "—";
  return PALIER_LABELS[palier] ?? palier;
}

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatEuro(n: number | null | undefined): string {
  return EUR.format(Number(n ?? 0));
}

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

// "2026-05-01" → "Mai 2026" (si début et fin sont dans le même mois).
export function formatPeriode(debut: string, fin: string): string {
  const d = new Date(debut + "T00:00:00");
  const f = new Date(fin + "T00:00:00");
  const moisDebut = `${MOIS[d.getMonth()]} ${d.getFullYear()}`;
  if (d.getMonth() === f.getMonth() && d.getFullYear() === f.getFullYear()) {
    return capitalize(moisDebut);
  }
  return `${capitalize(MOIS[d.getMonth()])} ${d.getFullYear()} – ${capitalize(MOIS[f.getMonth()])} ${f.getFullYear()}`;
}

// "2026-06-01" → "01/06/2026"
export function formatDateFr(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d.includes("T") ? d : d + "T00:00:00");
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
