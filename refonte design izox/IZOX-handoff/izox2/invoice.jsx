// /client/factures/$id — Invoice detail (French norms).

const InvLine = ({ desc, detail, qty, pu, tva, ht }) => (
  <tr style={{ borderTop: `1px solid ${TOK.line}` }}>
    <td style={{ padding: "13px 14px", verticalAlign:"top" }}>
      <div style={{ fontFamily: TOK.body, fontWeight: 600, fontSize: 13, color: TOK.ink }}>{desc}</div>
      {detail && <div style={{ fontFamily: TOK.body, fontSize: 11.5, color: TOK.ink50, marginTop: 3, lineHeight: 1.5 }}>{detail}</div>}
    </td>
    <td style={{ padding: "13px 14px", textAlign:"center", verticalAlign:"top" }}><Data size={12}>{qty}</Data></td>
    <td style={{ padding: "13px 14px", textAlign:"right", verticalAlign:"top" }}><Data size={12}>{pu}</Data></td>
    <td style={{ padding: "13px 14px", textAlign:"right", verticalAlign:"top" }}><Data size={12} color={TOK.ink50}>{tva}</Data></td>
    <td style={{ padding: "13px 14px", textAlign:"right", verticalAlign:"top" }}><Data size={12} weight={600}>{ht}</Data></td>
  </tr>
);

const InvoiceDetail = () => (
  <Page>
    <Sidebar items={NAV_CLIENT} active="Factures" role="Client"/>
    <main style={{ flex: 1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Topbar crumbs={["Client","Factures","FAC-2026-0118"]} title="Facture FAC-2026-0118"
        sub="Émise le 01 juin 2026 · échéance 30 juin 2026"
        right={<>
          <Tag tone="warn" dot>émise · à régler</Tag>
          <Btn kind="ghost" size="sm" icon={<I.print s={12}/>}>Imprimer</Btn>
          <Btn kind="primary" size="sm" icon={<I.download s={12}/>}>Télécharger PDF</Btn>
        </>}/>

      <div style={{ flex: 1, overflowY:"auto", background: TOK.panel, padding: "28px 28px 40px", display:"flex", justifyContent:"center" }}>
        {/* Paper */}
        <div style={{
          width: 760, background: TOK.surface, border: `1px solid ${TOK.line}`,
          borderRadius: TOK.r6, boxShadow: TOK.shadowMd, overflow:"hidden",
        }}>
          {/* Status ribbon */}
          <div style={{ height: 4, background: TOK.warn }}/>

          <div style={{ padding: "32px 36px 28px" }}>
            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: 28 }}>
              <div>
                <BrandBar size={16}/>
                <div style={{ marginTop: 14, fontFamily: TOK.body, fontSize: 11.5, color: TOK.ink50, lineHeight: 1.7 }}>
                  IZOX SAS · 14 rue de la Industrie, 75011 Paris<br/>
                  SIRET 902 451 783 00024 · TVA FR62 902451783<br/>
                  contact@izox.fr · +33 1 84 88 12 04
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 26, letterSpacing:"-0.5px", color: TOK.ink }}>FACTURE</div>
                <div style={{ marginTop: 10, display:"flex", flexDirection:"column", gap: 5 }}>
                  {[["N° facture","FAC-2026-0118"],["Date d’émission","01/06/2026"],["Date d’échéance","30/06/2026"],["Référence contrat","IZ-2026-0148"]].map(([k,v])=>(
                    <div key={k} style={{ display:"flex", justifyContent:"flex-end", gap: 12, fontSize: 12 }}>
                      <span style={{ fontFamily: TOK.body, color: TOK.ink50 }}>{k}</span>
                      <Data size={12} weight={600} style={{ minWidth: 110, textAlign:"right" }}>{v}</Data>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bill to */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 16, marginBottom: 26 }}>
              <div style={{ background: TOK.panel, borderRadius: TOK.r4, padding: 16 }}>
                <Mono size={9} style={{ marginBottom: 8, display:"block" }}>Facturé à</Mono>
                <div style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 15, letterSpacing:"-0.3px" }}>Cabify Paris SAS</div>
                <div style={{ fontFamily: TOK.body, fontSize: 11.5, color: TOK.ink70, lineHeight: 1.7, marginTop: 6 }}>
                  22 avenue des Champs, 75008 Paris<br/>
                  SIRET 814 220 449 00017<br/>
                  fleet@cabify.fr
                </div>
              </div>
              <div style={{ background: TOK.panel, borderRadius: TOK.r4, padding: 16 }}>
                <Mono size={9} style={{ marginBottom: 8, display:"block" }}>Prestation</Mono>
                <div style={{ fontFamily: TOK.body, fontSize: 12, color: TOK.ink70, lineHeight: 1.8 }}>
                  Période · <strong style={{ color: TOK.ink }}>Mai 2026</strong><br/>
                  Palier · <strong style={{ color: TOK.ink }}>11–20 véhicules</strong><br/>
                  Véhicules facturés · <strong style={{ color: TOK.ink }}>12 actifs · 1 gelé</strong>
                </div>
              </div>
            </div>

            {/* Lines */}
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background: TOK.ink }}>
                  {[["Description","left"],["Qté","center"],["P.U. HT","right"],["TVA","right"],["Total HT","right"]].map(([h,a])=>(
                    <th key={h} style={{ textAlign:a, padding:"10px 14px", fontFamily: TOK.body, fontSize: 10, fontWeight: 600, letterSpacing:".06em", textTransform:"uppercase", color:"#fff" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <InvLine desc="Abonnement flotte — Pack Standard" detail="Palier 11–20 véhicules · forfait mensuel" qty="1" pu="340,00 €" tva="20%" ht="340,00 €"/>
                <InvLine desc="Supplément Pack VTC" detail="3 véhicules · services premium (cuir, ozone)" qty="3" pu="18,00 €" tva="20%" ht="54,00 €"/>
                <InvLine desc="Interventions hors forfait" detail="2 lavages express · mai 2026" qty="2" pu="7,50 €" tva="20%" ht="15,00 €"/>
                <InvLine desc="Avoir gel véhicule XY-789-ZA" detail="Immobilisation 22 j · remise prorata" qty="1" pu="–10,00 €" tva="20%" ht="–10,00 €"/>
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display:"flex", justifyContent:"flex-end", marginTop: 20 }}>
              <div style={{ width: 300, display:"flex", flexDirection:"column", gap: 8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize: 13 }}>
                  <span style={{ fontFamily: TOK.body, color: TOK.ink50 }}>Sous-total HT</span>
                  <Data size={13} weight={600}>399,00 €</Data>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize: 13 }}>
                  <span style={{ fontFamily: TOK.body, color: TOK.ink50 }}>TVA 20%</span>
                  <Data size={13} weight={600}>79,80 €</Data>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding: "12px 14px", background: TOK.brandL, borderRadius: TOK.r4, marginTop: 4 }}>
                  <span style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 14, color: TOK.brand, letterSpacing:"-0.3px" }}>Total TTC</span>
                  <span style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 22, color: TOK.brand, letterSpacing:"-0.5px" }}>478,80 €</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: `1px solid ${TOK.line}`, background: TOK.panel, padding: "20px 36px", display:"grid", gridTemplateColumns:"1fr 1fr", gap: 20 }}>
            <div>
              <Mono size={9} style={{ marginBottom: 8, display:"block" }}>Conditions de règlement</Mono>
              <div style={{ fontFamily: TOK.body, fontSize: 11, color: TOK.ink50, lineHeight: 1.7 }}>
                Paiement à 30 jours par virement. Pénalités de retard : 3× le taux d’intérêt légal.
                Indemnité forfaitaire pour frais de recouvrement : 40 €. Pas d’escompte pour paiement anticipé.
              </div>
            </div>
            <div>
              <Mono size={9} style={{ marginBottom: 8, display:"block" }}>Coordonnées bancaires</Mono>
              <div style={{ fontFamily: TOK.body, fontSize: 11, color: TOK.ink50, lineHeight: 1.7 }}>
                IBAN · <Data size={11} color={TOK.ink70}>FR76 3000 4008 2800 0123 4567 891</Data><br/>
                BIC · <Data size={11} color={TOK.ink70}>BNPAFRPP</Data> · Banque BNP Paribas
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </Page>
);

Object.assign(window, { InvoiceDetail });
