// Print-mode app — render each screen on its own page, native size, with a small cover label.

const PAGES = [
  { id: "logo", w: 520, h: 420, section: "01 · Marque", title: "Logo · wordmark", el: <BrandBoard/> },
  { id: "palette", w: 520, h: 620, section: "01 · Marque", title: "Palette · Forest & Paper", el: <PaletteBoard/> },

  { id: "type", w: 1280, h: 520, section: "02 · Système", title: "Typographie · Outfit / Inter / Mono", el: <TypeBoard/> },
  { id: "buttons", w: 1280, h: 520, section: "02 · Système", title: "Boutons · états × kinds × tailles", el: <ButtonsBoard/> },
  { id: "badges", w: 1280, h: 520, section: "02 · Système", title: "Badges & Tags", el: <BadgesBoard/> },
  { id: "beforeafter", w: 1280, h: 560, section: "02 · Système", title: "Avant → Après", el: <BeforeAfterBoard/> },
  { id: "tailwind", w: 760, h: 700, section: "02 · Système", title: "tailwind.config.js", el: <TailwindBoard/> },

  { id: "m-login",       w: 390, h: 780, section: "03 · Client mobile", title: "01 · Login",          el: <M_Login/> },
  { id: "m-dashboard",   w: 390, h: 780, section: "03 · Client mobile", title: "02 · Dashboard",      el: <M_Dashboard/> },
  { id: "m-flotte",      w: 390, h: 780, section: "03 · Client mobile", title: "03 · Ma flotte",      el: <M_Flotte/> },
  { id: "m-vehicule",    w: 390, h: 780, section: "03 · Client mobile", title: "04 · Fiche véhicule", el: <M_Vehicule/> },
  { id: "m-prestations", w: 390, h: 780, section: "03 · Client mobile", title: "05 · Prestations",    el: <M_Prestations/> },
  { id: "m-factures",    w: 390, h: 780, section: "03 · Client mobile", title: "06 · Factures",       el: <M_Factures/> },

  { id: "d-c-dash",    w: 1280, h: 820, section: "04 · Client desktop", title: "Dashboard",      el: <D_Client_Dashboard/> },
  { id: "d-c-flotte",  w: 1280, h: 900, section: "04 · Client desktop", title: "Ma flotte",      el: <D_Client_Flotte/> },
  { id: "d-c-vehicle", w: 1280, h: 920, section: "04 · Client desktop", title: "Fiche véhicule", el: <D_Client_Vehicule/> },

  { id: "a-dash",      w: 1280, h: 840, section: "05 · Admin", title: "Dashboard",                el: <A_Dashboard/> },
  { id: "a-clients",   w: 1280, h: 820, section: "05 · Admin", title: "Clients · liste",          el: <A_Clients/> },
  { id: "a-client",    w: 1280, h: 840, section: "05 · Admin", title: "Fiche client · 4 onglets", el: <A_Client_Fiche/> },
  { id: "a-contrats",  w: 1280, h: 820, section: "05 · Admin", title: "Contrats",                 el: <A_Contrats/> },
  { id: "a-vehicules", w: 1280, h: 900, section: "05 · Admin", title: "Véhicules · groupés",      el: <A_Vehicules/> },
  { id: "a-gel",       w: 1280, h: 900, section: "05 · Admin", title: "Demandes de gel",          el: <A_Gel/> },
  { id: "a-rdv",       w: 1280, h: 820, section: "05 · Admin", title: "Demandes de RDV",          el: <A_RDV/> },
  { id: "a-int",       w: 1280, h: 820, section: "05 · Admin", title: "Interventions · liste",    el: <A_Interventions/> },
  { id: "a-int-fiche", w: 1280, h: 900, section: "05 · Admin", title: "Fiche intervention · stepper", el: <A_Intervention_Fiche/> },

  { id: "t-dash", w: 390, h: 780, section: "06 · Terrain", title: "Dashboard terrain",  el: <T_Dashboard/> },
  { id: "t-int",  w: 390, h: 780, section: "06 · Terrain", title: "Intervention · stepper", el: <T_Intervention/> },
];

// Each printed page is A4-landscape with a tight margin. We scale the artboard
// down to fit the page width, preserving aspect.
const PAGE_W = 1450;  // inner CSS px for the printable area at A4 landscape
const PAGE_H = 980;

const PrintPage = ({ p, idx, total }) => {
  // Scale artboard to fit within available area (leave room for header strip)
  const headerH = 56;
  const availW = PAGE_W;
  const availH = PAGE_H - headerH - 24;
  const scale = Math.min(availW / p.w, availH / p.h);
  return (
    <section className="page" style={{
      width: PAGE_W, height: PAGE_H,
      background: "#FAF9F6", color: "#0C0E12",
      display: "flex", flexDirection: "column",
      pageBreakAfter: idx === total - 1 ? "auto" : "always",
      breakAfter: idx === total - 1 ? "auto" : "page",
      breakInside: "avoid",
    }}>
      {/* Header strip */}
      <div style={{
        height: headerH, flex: `0 0 ${headerH}px`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", borderBottom: "1px solid #E7E4DC", background: "#FFFFFF",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <IzoxMark size={26}/>
          <div style={{ display:"flex", flexDirection:"column", gap: 2 }}>
            <span style={{ fontFamily: '"Inter", sans-serif', fontSize: 9, fontWeight: 600, letterSpacing:".08em", textTransform:"uppercase", color: "#6B7280" }}>
              {p.section}
            </span>
            <span style={{ fontFamily: '"Outfit", sans-serif', fontSize: 15, fontWeight: 700, color: "#111827", letterSpacing:"-0.5px" }}>
              {p.title}
            </span>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap: 14 }}>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: "#6A6E78", letterSpacing:".1em" }}>
            {p.w} × {p.h}
          </span>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: "#1F8A5B", fontWeight: 700 }}>
            {String(idx + 1).padStart(2,"0")} / {String(total).padStart(2,"0")}
          </span>
        </div>
      </div>

      {/* Artboard */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        background: "#efece6", padding: 16,
      }}>
        <div style={{
          width: p.w, height: p.h,
          transform: `scale(${scale})`, transformOrigin: "center center",
          flex: "0 0 auto", background: "#FAF9F6",
          boxShadow: "0 1px 0 rgba(12,14,18,.06), 0 14px 40px -20px rgba(12,14,18,.18)",
          border: "1px solid #E7E4DC", overflow: "hidden",
        }}>
          {p.el}
        </div>
      </div>
    </section>
  );
};

const Cover = () => (
  <section className="page cover" style={{
    width: PAGE_W, height: PAGE_H, background: "#0F2F23", color: "#fff",
    display: "flex", flexDirection: "column", justifyContent: "space-between",
    padding: 64, pageBreakAfter: "always", breakAfter: "page",
  }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, letterSpacing:".2em", color: "#7CC9A5" }}>
        IZOX · DESIGN SYSTEM · v2026.5
      </span>
      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing:".18em", color: "rgba(255,255,255,.5)" }}>
        REMIX · PRINT EDITION
      </span>
    </div>

    <div>
      <div style={{
        fontFamily: '"Outfit", sans-serif', fontWeight: 700,
        fontSize: 92, lineHeight: .95, letterSpacing: "-2px", color: "#fff",
      }}>
        Fleet Operating<br/>
        System <span style={{ color: "#7CC9A5" }}>↵</span>
      </div>
      <div style={{
        fontFamily: '"Inter", sans-serif', fontSize: 14,
        color: "rgba(255,255,255,.6)", marginTop: 22, maxWidth: 720, lineHeight: 1.6,
      }}>
        27 écrans · 4 personae · 1 direction visuelle.
        Confident European SaaS · vert forêt · Outfit / Inter / JetBrains.
      </div>
    </div>

    <div style={{
      display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 24,
      paddingTop: 32, borderTop: "1px solid rgba(255,255,255,.15)",
    }}>
      {[
        ["6 écrans", "Client mobile"],
        ["3 écrans", "Client desktop"],
        ["9 écrans", "Admin / Staff"],
        ["2 écrans", "Terrain mobile"],
      ].map(([n, k]) => (
        <div key={k}>
          <div style={{ fontFamily: '"Inter", sans-serif', fontSize: 9, fontWeight: 600, letterSpacing:".12em", color:"rgba(255,255,255,.5)", textTransform:"uppercase" }}>{k}</div>
          <div style={{ fontFamily: '"Outfit", sans-serif', fontSize: 28, marginTop: 8, fontWeight: 700, letterSpacing:"-0.5px" }}>{n}</div>
        </div>
      ))}
    </div>
  </section>
);

function PrintApp() {
  return (
    <>
      <Cover/>
      {PAGES.map((p, i) => <PrintPage key={p.id} p={p} idx={i} total={PAGES.length}/>)}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PrintApp/>);

// Auto-print when fonts and JSX are ready.
(async () => {
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch (e) {}
  // Give React + Babel + image layout an extra moment.
  await new Promise(r => setTimeout(r, 800));
  window.print();
})();
