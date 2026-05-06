import { describe, it, expect } from 'vitest';
import { calculerFactureFlotte, getProchainPalier, getPalier } from './pricing';

describe('pricing - calculerFactureFlotte', () => {
  it('Test A - Starter 3 véhicules Pack Intérieur', () => {
    const f = calculerFactureFlotte({
      lignes: [{ typePack: 'pack_interieur', nbVehicules: 3 }],
      engagementAnnuel: false,
    });
    expect(f.totalBrutHt).toBe(390);
    expect(f.remisePalier).toBe(0);
    expect(f.totalFacture).toBe(390);
    expect(f.palier).toBe('starter');
  });

  it('Test B - Business 10 véhicules Pack Standard + engagement annuel', () => {
    const f = calculerFactureFlotte({
      lignes: [{ typePack: 'pack_standard', nbVehicules: 10 }],
      engagementAnnuel: true,
    });
    expect(f.totalBrutHt).toBe(1700);
    expect(f.remisePalier).toBe(204);
    expect(f.sousTotal).toBe(1496);
    expect(f.remiseAnnuelle).toBe(74.8);
    expect(f.totalAbonnementHt).toBe(1421.2);
    expect(f.palier).toBe('business');
  });

  it('Test C - Mix 5 Pack Intérieur + 5 Pack Standard sans engagement', () => {
    const f = calculerFactureFlotte({
      lignes: [
        { typePack: 'pack_interieur', nbVehicules: 5 },
        { typePack: 'pack_standard', nbVehicules: 5 },
      ],
      engagementAnnuel: false,
    });
    expect(f.totalBrutHt).toBe(1500);
    expect(f.palier).toBe('business');
    expect(f.remisePalier).toBe(180);
    expect(f.totalAbonnementHt).toBe(1320);
  });

  it('Test D - Upsell : 4 véhicules -> getProchainPalier', () => {
    const next = getProchainPalier(4);
    expect(next).not.toBeNull();
    expect(next!.prochainPalier).toBe('pro');
    expect(next!.vehiculesManquants).toBe(1);
    expect(getPalier(4)).toBe('starter');
  });
});
