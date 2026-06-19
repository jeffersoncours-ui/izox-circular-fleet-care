// Facture imprimable (normes FR). Composant présentationnel partagé entre
// le portail client (/client/factures/$id) et l'admin (fiche client → Factures).
// Rendu depuis les snapshots immuables de la facture, jamais les tables live.
//
// Régime réel IZOX : franchise de base (art. 293 B du CGI) → TVA non applicable,
// HT = TTC. Le bloc TVA s'adapte si un jour le régime passe en réel_normal.

import {
  type Facture,
  type FactureLigne,
  STATUT_FACTURE,
  formatEuro,
  formatPeriode,
  formatDateFr,
  palierLabel,
} from "@/lib/factures";
import { IZOX_LEGAL } from "@/lib/izox-legal";

interface Props {
  facture: Facture;
  lignes: FactureLigne[];
}

export function FactureDocument({ facture, lignes }: Props) {
  const statut = STATUT_FACTURE[facture.statut];
  const client = facture.snapshot_client ?? {};
  const izox = facture.snapshot_izox ?? {};
  const contrat = facture.snapshot_contrat ?? {};
  const prestations = facture.snapshot_prestations ?? [];

  const franchise = facture.regime_tva === "franchise_base";
  const mentionTva =
    izox.mention_tva ??
    facture.mention_tva_speciale ??
    "TVA non applicable, art. 293 B du CGI";

  // Le tableau n'affiche pas la ligne de récap "total" (rendue dans l'encart totaux).
  const lignesAffichees = [...lignes]
    .filter((l) => l.type_ligne !== "total")
    .sort((a, b) => a.ordre_affichage - b.ordre_affichage);

  const nbActifs = contrat.nb_vehicules_total_entreprise ?? prestations.length;

  return (
    <div className="facture-print-root w-full max-w-[760px] mx-auto bg-card border border-border rounded-lg shadow-card overflow-hidden">
      {/* Bandeau statut */}
      <div className="h-1" style={{ background: statut.ribbon }} />

      <div className="px-8 py-7 sm:px-9">
        {/* En-tête émetteur / titre */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-5">
          <div>
            <img src="/logo-izox.png" alt="IZOX" className="h-7 w-auto object-contain" />
            <div className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
              {IZOX_LEGAL.raisonSociale} · {IZOX_LEGAL.adresse}, {IZOX_LEGAL.codePostal}{" "}
              {IZOX_LEGAL.ville}
              <br />
              SIRET {IZOX_LEGAL.siret}
              <br />
              {IZOX_LEGAL.email} · {IZOX_LEGAL.telephone}
            </div>
          </div>
          <div className="sm:text-right">
            <div className="font-display text-2xl font-bold tracking-tight text-foreground">
              FACTURE
            </div>
            <dl className="mt-3 flex flex-col gap-1.5 text-xs">
              <Row k="N° facture" v={facture.numero_facture ?? "— (brouillon)"} mono />
              <Row k="Date d'émission" v={formatDateFr(facture.date_emission)} mono />
              <Row k="Date d'échéance" v={formatDateFr(facture.date_echeance)} mono />
              {contrat.numero_contrat && (
                <Row k="Référence contrat" v={contrat.numero_contrat} mono />
              )}
            </dl>
          </div>
        </div>

        {/* Facturé à / Prestation */}
        <div className="grid sm:grid-cols-2 gap-4 mt-7">
          <div className="bg-muted/40 rounded-md p-4">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-2">
              Facturé à
            </p>
            <p className="font-display text-[15px] font-bold tracking-tight text-foreground">
              {client.raison_sociale ?? "—"}
            </p>
            <p className="text-[11.5px] leading-relaxed text-muted-foreground mt-1.5">
              {client.adresse && (
                <>
                  {client.adresse}, {client.code_postal} {client.ville}
                  <br />
                </>
              )}
              {client.siret && <>SIRET {client.siret}</>}
            </p>
          </div>
          <div className="bg-muted/40 rounded-md p-4">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-2">
              Prestation
            </p>
            <div className="text-xs leading-relaxed text-muted-foreground space-y-0.5">
              <p>
                Période ·{" "}
                <span className="font-semibold text-foreground">
                  {formatPeriode(facture.periode_debut, facture.periode_fin)}
                </span>
              </p>
              <p>
                Palier ·{" "}
                <span className="font-semibold text-foreground">
                  {palierLabel(contrat.palier_applique)}
                </span>
              </p>
              <p>
                Véhicules facturés ·{" "}
                <span className="font-semibold text-foreground">
                  {nbActifs} actif{nbActifs > 1 ? "s" : ""}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Lignes */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-foreground">
                <Th align="left">Description</Th>
                <Th align="center">Qté</Th>
                <Th align="right">P.U. HT</Th>
                <Th align="right">TVA</Th>
                <Th align="right">Total HT</Th>
              </tr>
            </thead>
            <tbody>
              {lignesAffichees.map((l) => (
                <tr key={l.id} className="border-t border-border align-top">
                  <td className="px-3.5 py-3">
                    <div className="text-[13px] font-semibold text-foreground">
                      {l.libelle}
                    </div>
                  </td>
                  <td className="px-3.5 py-3 text-center font-mono text-xs text-foreground">
                    {l.quantite ?? "—"}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-xs text-foreground">
                    {l.prix_unitaire_ht != null ? formatEuro(l.prix_unitaire_ht) : "—"}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-xs text-muted-foreground">
                    {franchise ? "—" : `${l.tva_taux ?? 0}%`}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-xs font-semibold text-foreground">
                    {formatEuro(l.montant_ht)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="flex justify-end mt-5">
          <div className="w-full sm:w-[300px] flex flex-col gap-2">
            <div className="flex justify-between text-[13px]">
              <span className="text-muted-foreground">Sous-total HT</span>
              <span className="font-mono font-semibold text-foreground">
                {formatEuro(facture.montant_ht)}
              </span>
            </div>
            {franchise ? (
              <p className="text-[11px] text-muted-foreground">{mentionTva}</p>
            ) : (
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">TVA {facture.tva_taux}%</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatEuro(facture.tva_montant)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center px-3.5 py-3 bg-primary-soft rounded-md mt-1">
              <span className="font-display font-bold text-sm text-primary tracking-tight">
                Total TTC
              </span>
              <span className="font-display font-bold text-[22px] text-primary tracking-tight">
                {formatEuro(facture.montant_ttc)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pied de page */}
      <div className="border-t border-border bg-muted/40 px-8 py-5 sm:px-9 grid sm:grid-cols-2 gap-5">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-2">
            Conditions de règlement
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Paiement à 30 jours par virement. Pénalités de retard : 3× le taux d'intérêt
            légal. Indemnité forfaitaire pour frais de recouvrement : 40 €. Pas d'escompte
            pour paiement anticipé.
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-2">
            Coordonnées bancaires
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            IBAN · <span className="font-mono text-foreground">{IZOX_LEGAL.iban}</span>
            <br />
            BIC · <span className="font-mono text-foreground">{IZOX_LEGAL.bic}</span> ·{" "}
            {IZOX_LEGAL.banque}
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between sm:justify-end gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd
        className={`font-semibold text-foreground sm:min-w-[110px] sm:text-right ${
          mono ? "font-mono" : ""
        }`}
      >
        {v}
      </dd>
    </div>
  );
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align: "left" | "center" | "right";
}) {
  return (
    <th
      className="px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white"
      style={{ textAlign: align }}
    >
      {children}
    </th>
  );
}
