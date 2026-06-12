// Informations légales de l'émetteur IZOX affichées sur les factures.
//
// ⚠️  TODO_LEGAL — Ces valeurs sont des PLACEHOLDERS à remplacer par les vraies
// informations de la société AVANT toute émission de facture réelle.
// À mettre à jour une fois la société immatriculée.
//
// Régime TVA : franchise de base (art. 293 B du CGI) → TVA non applicable,
// HT = TTC. Pas de numéro TVA intracommunautaire à mentionner sur les factures.
//
// Mentions obligatoires sur facture B2B française (art. L441-3 C.com.) :
//   raisonSociale, adresse complète, siret, conditions de paiement,
//   mention "TVA non applicable, art. 293 B du CGI".

export const IZOX_LEGAL = {
  raisonSociale: "IZOX SAS",          // TODO_LEGAL: forme juridique + dénomination exactes
  adresse: "14 rue de l'Industrie",   // TODO_LEGAL: adresse réelle du siège social
  codePostal: "75011",                // TODO_LEGAL
  ville: "Paris",                     // TODO_LEGAL
  siret: "902 451 783 00024",         // TODO_LEGAL: SIRET réel (14 chiffres, obtenu à l'immatriculation)
  email: "contact@izox.fr",
  telephone: "+33 1 84 88 12 04",     // TODO_LEGAL: téléphone réel
  iban: "FR76 3000 4008 2800 0123 4567 891", // TODO_LEGAL: IBAN compte professionnel réel
  bic: "BNPAFRPP",                    // TODO_LEGAL: BIC de votre banque
  banque: "BNP Paribas",              // TODO_LEGAL: nom de votre banque
} as const;
