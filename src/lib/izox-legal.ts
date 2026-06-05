// Informations légales de l'émetteur IZOX affichées sur les factures.
//
// ⚠️ TODO — À REMPLACER PAR LES VRAIES VALEURS LÉGALES IZOX avant toute
// émission de facture à un vrai client. Les valeurs ci-dessous sont des
// PLACEHOLDERS issus du mockup de design (invoice.jsx), elles ne sont PAS
// les identifiants réels de la société.
//
// Le régime de TVA réel est la franchise de base (art. 293 B du CGI) :
// TVA non applicable, montant HT = montant TTC. Voir snapshot_izox.mention_tva.

export const IZOX_LEGAL = {
  raisonSociale: "IZOX SAS", // TODO: forme juridique + dénomination exactes
  adresse: "14 rue de l'Industrie", // TODO: adresse réelle du siège
  codePostal: "75011", // TODO
  ville: "Paris", // TODO
  siret: "902 451 783 00024", // TODO: SIRET réel (mention obligatoire facture)
  tvaIntracom: "FR62 902451783", // TODO: n° TVA intracom réel (ou retirer si franchise)
  email: "contact@izox.fr",
  telephone: "+33 1 84 88 12 04", // TODO
  iban: "FR76 3000 4008 2800 0123 4567 891", // TODO: IBAN réel
  bic: "BNPAFRPP", // TODO
  banque: "BNP Paribas", // TODO
} as const;
