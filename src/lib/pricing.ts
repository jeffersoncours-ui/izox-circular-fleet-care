// Pricing utilities for IZOX fleet billing
// Tier discounts based on total active vehicles per company.

export type Palier = 'starter' | 'pro' | 'business' | 'premium';

export type PackType = 'pack_interieur' | 'pack_standard' | 'pack_vtc';

export interface PackInfo {
  type: PackType;
  label: string;
  prix_ht: number;
  description: string;
  bonus: string;
  nbPassages: number;
  dureeAffichee: string;
}

// SOURCE UNIQUE DE VÉRITÉ pour les packs (prix V2 mai 2026).
export const PACKS_CATALOG: Record<PackType, PackInfo> = {
  pack_interieur: {
    type: 'pack_interieur',
    label: 'Pack Intérieur',
    prix_ht: 130,
    description: '2x intérieur 6 étapes (45 min)',
    bonus: 'Vérification pneus + Carnet entretien numérique',
    nbPassages: 2,
    dureeAffichee: '1h30',
  },
  pack_standard: {
    type: 'pack_standard',
    label: 'Pack Standard',
    prix_ht: 170,
    description: '2x intérieur + extérieur Karcher (1h15)',
    bonus: 'Vérification pneus + Carnet entretien numérique',
    nbPassages: 2,
    dureeAffichee: '2h',
  },
  pack_vtc: {
    type: 'pack_vtc',
    label: 'Pack VTC',
    prix_ht: 240,
    description: '2x intérieur + 2x intérieur+extérieur (4 passages)',
    bonus: 'Vérification pneus + Carnet entretien + Lave-glace gratuit',
    nbPassages: 4,
    dureeAffichee: '2h',
  },
};

export function getPackInfo(type: PackType): PackInfo {
  return PACKS_CATALOG[type];
}

export function getPackPrix(type: PackType): number {
  return PACKS_CATALOG[type].prix_ht;
}

export function getPackLabel(type: PackType | string): string {
  return PACKS_CATALOG[type as PackType]?.label ?? String(type);
}

export function getAllPacks(): PackInfo[] {
  return Object.values(PACKS_CATALOG);
}

const PRIX_CATALOGUE: Record<string, number> = {
  pack_interieur: PACKS_CATALOG.pack_interieur.prix_ht,
  pack_standard: PACKS_CATALOG.pack_standard.prix_ht,
  pack_vtc: PACKS_CATALOG.pack_vtc.prix_ht,
};

const PRIX_CATALOGUE_MOYEN = 130;

const PALIER_TAUX: Record<Palier, number> = {
  starter: 0,
  pro: 0.05,
  business: 0.12,
  premium: 0.20,
};

const PALIER_SEUILS: Array<{ palier: Palier; min: number; max: number | null }> = [
  { palier: 'starter', min: 1, max: 4 },
  { palier: 'pro', min: 5, max: 9 },
  { palier: 'business', min: 10, max: 19 },
  { palier: 'premium', min: 20, max: null },
];

export function getPalier(nbVehicules: number): Palier {
  if (nbVehicules >= 20) return 'premium';
  if (nbVehicules >= 10) return 'business';
  if (nbVehicules >= 5) return 'pro';
  return 'starter';
}

export function getTauxPalier(palier: string): number {
  return PALIER_TAUX[palier as Palier] ?? 0;
}

export function getProchainPalier(nbVehicules: number): {
  palierActuel: string;
  prochainPalier: string;
  vehiculesManquants: number;
  gainMensuelEstime: number;
} | null {
  const palierActuel = getPalier(nbVehicules);
  if (palierActuel === 'premium') return null;

  const idx = PALIER_SEUILS.findIndex((p) => p.palier === palierActuel);
  const next = PALIER_SEUILS[idx + 1];
  if (!next) return null;

  const vehiculesManquants = next.min - nbVehicules;
  const tauxActuel = getTauxPalier(palierActuel);
  const tauxProchain = getTauxPalier(next.palier);
  const gainMensuelEstime =
    PRIX_CATALOGUE_MOYEN * (nbVehicules + vehiculesManquants) * (tauxProchain - tauxActuel);

  return {
    palierActuel,
    prochainPalier: next.palier,
    vehiculesManquants,
    gainMensuelEstime: Math.round(gainMensuelEstime * 100) / 100,
  };
}

const PALIER_LABELS: Record<Palier, string> = {
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
  premium: 'Premium',
};

const PACK_LABELS: Record<string, string> = {
  pack_interieur: 'Pack Intérieur',
  pack_standard: 'Pack Standard',
  pack_vtc: 'Pack VTC',
};

export interface LigneFacture {
  label: string;
  montant: number;
  type: 'base' | 'remise' | 'supplement' | 'total';
}

export interface FactureFlotte {
  totalBrutHt: number;
  palier: string;
  tauxPalier: number;
  remisePalier: number;
  sousTotal: number;
  remiseAnnuelle: number;
  totalAbonnementHt: number;
  totalSupplements: number;
  totalFacture: number;
  lignesDetail: LigneFacture[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculerFactureFlotte(params: {
  lignes: Array<{ typePack: string; nbVehicules: number }>;
  engagementAnnuel: boolean;
  supplements?: Array<{ code: string; prixHt: number; quantite?: number }>;
}): FactureFlotte {
  const { lignes, engagementAnnuel, supplements = [] } = params;

  const lignesDetail: LigneFacture[] = [];

  let totalBrutHt = 0;
  let totalVehicules = 0;
  for (const l of lignes) {
    const prix = PRIX_CATALOGUE[l.typePack] ?? 0;
    const montant = prix * l.nbVehicules;
    totalBrutHt += montant;
    totalVehicules += l.nbVehicules;
    lignesDetail.push({
      label: `${PACK_LABELS[l.typePack] ?? l.typePack} x ${l.nbVehicules} véhicules`,
      montant: round2(montant),
      type: 'base',
    });
  }

  const palier = getPalier(totalVehicules);
  const tauxPalier = getTauxPalier(palier);
  const remisePalier = totalBrutHt * tauxPalier;
  const sousTotal = totalBrutHt - remisePalier;

  if (tauxPalier > 0) {
    lignesDetail.push({
      label: `Remise ${PALIER_LABELS[palier]} -${Math.round(tauxPalier * 100)}%`,
      montant: -round2(remisePalier),
      type: 'remise',
    });
  }

  const remiseAnnuelle = engagementAnnuel ? sousTotal * 0.05 : 0;
  if (engagementAnnuel) {
    lignesDetail.push({
      label: 'Engagement annuel -5%',
      montant: -round2(remiseAnnuelle),
      type: 'remise',
    });
  }

  const totalAbonnementHt = sousTotal - remiseAnnuelle;

  let totalSupplements = 0;
  for (const s of supplements) {
    const qte = s.quantite ?? 1;
    const montant = s.prixHt * qte;
    totalSupplements += montant;
    lignesDetail.push({
      label: `${s.code}${qte > 1 ? ` x ${qte}` : ''}`,
      montant: round2(montant),
      type: 'supplement',
    });
  }

  const totalFacture = totalAbonnementHt + totalSupplements;

  lignesDetail.push({
    label: 'Total HT',
    montant: round2(totalFacture),
    type: 'total',
  });

  return {
    totalBrutHt: round2(totalBrutHt),
    palier,
    tauxPalier,
    remisePalier: round2(remisePalier),
    sousTotal: round2(sousTotal),
    remiseAnnuelle: round2(remiseAnnuelle),
    totalAbonnementHt: round2(totalAbonnementHt),
    totalSupplements: round2(totalSupplements),
    totalFacture: round2(totalFacture),
    lignesDetail,
  };
}

export function shouldShowPrice(typePrestation: string, clientHasContratActif: boolean): boolean {
  if (!clientHasContratActif) return true;
  const isPack =
    typePrestation === 'pack_interieur' ||
    typePrestation === 'pack_standard' ||
    typePrestation === 'pack_vtc';
  if (isPack) return false;
  return true;
}
