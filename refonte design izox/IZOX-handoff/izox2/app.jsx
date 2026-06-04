// Main canvas — wires every board into the DesignCanvas.

const { DesignCanvas, DCSection, DCArtboard } = window;

function App() {
  return (
    <DesignCanvas>
      <DCSection id="brand" title="01 — Marque" subtitle="Logo IZOX et système de couleurs (vert forêt + accent vert moyen).">
        <DCArtboard id="logo" label="Logo · wordmark" width={520} height={420}>
          <BrandBoard/>
        </DCArtboard>
        <DCArtboard id="palette" label="Palette · Forest & Paper" width={520} height={620}>
          <PaletteBoard/>
        </DCArtboard>
      </DCSection>

      <DCSection id="system" title="02 — Système" subtitle="Typographie premium (Outfit / Inter / JetBrains), boutons (5 états × 4 kinds), badges.">
        <DCArtboard id="type" label="Typographie · Outfit / Inter / Mono" width={1280} height={520}>
          <TypeBoard/>
        </DCArtboard>
        <DCArtboard id="buttons" label="Boutons · états × kinds × tailles" width={1280} height={520}>
          <ButtonsBoard/>
        </DCArtboard>
        <DCArtboard id="badges" label="Badges & Tags" width={1280} height={520}>
          <BadgesBoard/>
        </DCArtboard>
        <DCArtboard id="beforeafter" label="Avant → Après" width={1280} height={560}>
          <BeforeAfterBoard/>
        </DCArtboard>
        <DCArtboard id="tailwind" label="tailwind.config.js" width={760} height={700}>
          <TailwindBoard/>
        </DCArtboard>
      </DCSection>

      <DCSection id="client-mobile" title="03 — Client · Mobile app" subtitle="App grand public, mobile-first. 6 écrans clés.">
        <DCArtboard id="m-login"       label="01 · Login"            width={390} height={780}><M_Login/></DCArtboard>
        <DCArtboard id="m-dashboard"   label="02 · Dashboard"        width={390} height={780}><M_Dashboard/></DCArtboard>
        <DCArtboard id="m-flotte"      label="03 · Ma flotte"        width={390} height={780}><M_Flotte/></DCArtboard>
        <DCArtboard id="m-vehicule"    label="04 · Fiche véhicule"   width={390} height={780}><M_Vehicule/></DCArtboard>
        <DCArtboard id="m-prestations" label="05 · Prestations"      width={390} height={780}><M_Prestations/></DCArtboard>
        <DCArtboard id="m-factures"    label="06 · Factures"         width={390} height={780}><M_Factures/></DCArtboard>
      </DCSection>

      <DCSection id="client-desktop" title="04 — Client · Desktop" subtitle="Tableau de bord en grand format, flotte avec accordéons, fiche véhicule.">
        <DCArtboard id="d-c-dash"    label="Dashboard"       width={1280} height={820}><D_Client_Dashboard/></DCArtboard>
        <DCArtboard id="d-c-flotte"  label="Ma flotte"       width={1280} height={900}><D_Client_Flotte/></DCArtboard>
        <DCArtboard id="d-c-vehicle" label="Fiche véhicule"  width={1280} height={920}><D_Client_Vehicule/></DCArtboard>
      </DCSection>

      <DCSection id="admin" title="05 — Admin / Staff" subtitle="Workspace dense · clients, contrats, véhicules, demandes, interventions.">
        <DCArtboard id="a-dash"        label="Dashboard"            width={1280} height={840}><A_Dashboard/></DCArtboard>
        <DCArtboard id="a-clients"     label="Clients · liste"      width={1280} height={820}><A_Clients/></DCArtboard>
        <DCArtboard id="a-client"      label="Fiche client · 4 onglets" width={1280} height={840}><A_Client_Fiche/></DCArtboard>
        <DCArtboard id="a-contrats"    label="Contrats"             width={1280} height={820}><A_Contrats/></DCArtboard>
        <DCArtboard id="a-vehicules"   label="Véhicules · grouped"  width={1280} height={900}><A_Vehicules/></DCArtboard>
        <DCArtboard id="a-gel"         label="Demandes de gel"      width={1280} height={900}><A_Gel/></DCArtboard>
        <DCArtboard id="a-rdv"         label="Demandes de RDV"      width={1280} height={820}><A_RDV/></DCArtboard>
        <DCArtboard id="a-int"         label="Interventions · liste" width={1280} height={820}><A_Interventions/></DCArtboard>
        <DCArtboard id="a-int-fiche"   label="Fiche intervention · stepper" width={1280} height={900}><A_Intervention_Fiche/></DCArtboard>
      </DCSection>

      <DCSection id="terrain" title="06 — Terrain · Opérateur (mobile)" subtitle="App utilisée sur le terrain pendant les interventions.">
        <DCArtboard id="t-dash"  label="Dashboard terrain" width={390} height={780}><T_Dashboard/></DCArtboard>
        <DCArtboard id="t-int"   label="Intervention · stepper" width={390} height={780}><T_Intervention/></DCArtboard>
      </DCSection>

      <DCSection id="impact" title="07 — Impact RSE" subtitle="Pages éco-responsables : suivi client (hero, courbe, équivalences) et back-office admin (barème + file de validation).">
        <DCArtboard id="c-impact"        label="Client · Impact RSE"            width={1280} height={860}><C_Impact/></DCArtboard>
        <DCArtboard id="c-impact-empty"  label="Client · Impact — aucune donnée"  width={1280} height={760}><C_Impact_NoData/></DCArtboard>
        <DCArtboard id="c-impact-filter" label="Client · Impact — filtre vide"     width={1280} height={620}><C_Impact_FilterEmpty/></DCArtboard>
        <DCArtboard id="a-impact"        label="Admin · Impact RSE"               width={1280} height={780}><A_Impact/></DCArtboard>
        <DCArtboard id="a-impact-empty"  label="Admin · Impact — stats vides"      width={1280} height={680}><A_Impact_NoData/></DCArtboard>
        <DCArtboard id="a-impact-queue"  label="Admin · Impact — file vide"        width={1280} height={680}><A_Impact_QueueEmpty/></DCArtboard>
      </DCSection>

      <DCSection id="billing-rdv" title="08 — Facturation & Rendez-vous" subtitle="Détail de facture aux normes françaises et prise de RDV au calendrier (desktop + mobile).">
        <DCArtboard id="invoice"     label="Client · Détail facture"      width={1280} height={900}><InvoiceDetail/></DCArtboard>
        <DCArtboard id="d-booking"   label="Client · Prise de RDV"         width={1280} height={760}><D_Booking/></DCArtboard>
        <DCArtboard id="m-booking"   label="Client · RDV (mobile)"         width={390} height={780}><M_Booking/></DCArtboard>
      </DCSection>

      <DCSection id="empty" title="09 — Empty states" subtitle="États vides des 6 pages clés : message explicite, CTA, fond panel, charte respectée.">
        <DCArtboard id="e-a-clients" label="Admin · Clients vide"         width={1280} height={640}><E_AdminClients/></DCArtboard>
        <DCArtboard id="e-a-veh"     label="Admin · Véhicules vide"       width={1280} height={640}><E_AdminVehicules/></DCArtboard>
        <DCArtboard id="e-a-int"     label="Admin · Interventions vide"   width={1280} height={640}><E_AdminInterventions/></DCArtboard>
        <DCArtboard id="e-c-dash"    label="Client · Pas de contrat"      width={1280} height={640}><E_ClientDashboard/></DCArtboard>
        <DCArtboard id="e-c-flotte"  label="Client · Flotte vide"         width={1280} height={640}><E_ClientFlotte/></DCArtboard>
        <DCArtboard id="e-a-gel"     label="Admin · Demandes gel vide"    width={1280} height={640}><E_AdminGel/></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
