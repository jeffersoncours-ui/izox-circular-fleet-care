
// Admin · Carte géographique — optimisation des tournées
// Leaflet + OpenStreetMap tiles neutres, pins colorés par opérateur, polylines, drag-drop panel

// Interventions du jour avec coordonnées Paris réalistes
const TODAY_INTERVENTIONS = {
  "Karim B.": [
    { id:1, order:1, time:"08:00", immat:"AB-123-CD", client:"Cabify Paris",   pack:"Standard", s:"terminée",  t:"ok",      lat:48.8738, lng:2.3015, adresse:"8 Av. des Champs-Élysées, 75008" },
    { id:2, order:2, time:"10:00", immat:"DE-234-FG", client:"LeasePlan FR",   pack:"VTC",      s:"en_cours",  t:"warn",    lat:48.8932, lng:2.2368, adresse:"15 Espl. de la Défense, 92800" },
    { id:3, order:3, time:"14:00", immat:"HI-345-JK", client:"Heetch Ops",     pack:"Standard", s:"planifiée", t:"neutral", lat:48.8245, lng:2.3587, adresse:"24 Bd de Port-Royal, 75013" },
    { id:4, order:4, time:"15:30", immat:"FR-987-XK", client:"Bolt France",    pack:"VTC",      s:"planifiée", t:"neutral", lat:48.8576, lng:2.3736, adresse:"3 Pl. de la République, 75011" },
  ],
  "Sofia T.": [
    { id:5, order:1, time:"08:00", immat:"HI-345-JK", client:"Cabify Paris",   pack:"Standard", s:"terminée",  t:"ok",      lat:48.8718, lng:2.3315, adresse:"5 Pl. de l'Opéra, 75009" },
    { id:6, order:2, time:"10:00", immat:"AA-111-BB", client:"Hertz CDG",      pack:"VTC",      s:"terminée",  t:"ok",      lat:48.8484, lng:2.4397, adresse:"12 Av. du Trône, 75012" },
    { id:7, order:3, time:"14:00", immat:"OP-111-QR", client:"LeasePlan FR",   pack:"Standard", s:"planifiée", t:"neutral", lat:48.8540, lng:2.3200, adresse:"7 Bd Saint-Michel, 75005" },
    { id:8, order:4, time:"15:30", immat:"WX-333-YZ", client:"LeasePlan FR",   pack:"Standard", s:"planifiée", t:"neutral", lat:48.8404, lng:2.3215, adresse:"22 Bd Montparnasse, 75014" },
  ],
  "Yann L.": [
    { id:9,  order:1, time:"09:30", immat:"BC-890-DE", client:"Heetch Ops",    pack:"VTC",      s:"terminée",  t:"ok",      lat:48.8676, lng:2.3636, adresse:"17 Bd Richard-Lenoir, 75011" },
    { id:10, order:2, time:"14:30", immat:"PQ-567-RS", client:"LeasePlan FR",  pack:"Standard", s:"planifiée", t:"neutral", lat:48.8532, lng:2.3692, adresse:"1 Pl. de la Bastille, 75012" },
  ],
};

const KM_ESTIMATES = { "Karim B.": 28.4, "Sofia T.": 19.7, "Yann L.": 8.2 };

// Panel latéral — liste ordonnée drag & drop
const MapPanel = ({ opInterventions, selectedOp, setSelectedOp, toggle, setToggle, onValidate }) => {
  const [orders, setOrders] = React.useState(
    Object.fromEntries(Object.entries(opInterventions).map(([k,v]) => [k, v.map((x,i)=>i)]))
  );
  const [dragging, setDragging] = React.useState(null);

  const handleDragStart = (op, idx) => setDragging({ op, idx });
  const handleDrop = (op, targetIdx) => {
    if (!dragging || dragging.op !== op) return;
    const arr = [...orders[op]];
    const [moved] = arr.splice(dragging.idx, 1);
    arr.splice(targetIdx, 0, moved);
    setOrders(prev => ({ ...prev, [op]: arr }));
    setDragging(null);
  };

  return (
    <div style={{
      width: 300, flexShrink: 0,
      background: TOK.surface,
      borderLeft: `1px solid ${TOK.line}`,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header panel */}
      <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${TOK.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 15, color: TOK.ink }}>Tournées</span>
          {/* Toggle aujourd'hui / semaine */}
          <div style={{
            display: "flex", background: TOK.panel,
            border: `1px solid ${TOK.line}`, borderRadius: TOK.r2, overflow: "hidden",
          }}>
            {["Aujourd'hui", "Semaine"].map(t => (
              <button key={t} onClick={() => setToggle(t)} style={{
                background: toggle === t ? TOK.surface : "transparent",
                border: "none", padding: "5px 10px", cursor: "pointer",
                fontFamily: TOK.body, fontSize: 11, fontWeight: toggle === t ? 600 : 400,
                color: toggle === t ? TOK.ink : TOK.ink50,
              }}>{t}</button>
            ))}
          </div>
        </div>
        {/* Sélecteur opérateur */}
        <div style={{ display: "flex", gap: 5 }}>
          {Object.entries(OPERATORS).map(([name, op]) => (
            <button key={name} onClick={() => setSelectedOp(name)} style={{
              flex: 1, padding: "6px 4px", borderRadius: TOK.r2, cursor: "pointer",
              border: `1.5px solid ${selectedOp === name ? op.color : TOK.line}`,
              background: selectedOp === name ? op.bg : "transparent",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 999,
                background: op.color, color: "#fff",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700, fontFamily: TOK.body,
              }}>{op.initials}</div>
              <Mono size={8} color={selectedOp === name ? op.color : TOK.ink50}>{name.split(" ")[0]}</Mono>
            </button>
          ))}
        </div>
      </div>

      {/* Liste ordonnée drag-drop */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
        {opInterventions[selectedOp].map((item, rawIdx) => {
          const idx = (orders[selectedOp] || []).indexOf(rawIdx);
          const displayItem = opInterventions[selectedOp][rawIdx];
          const op = OPERATORS[selectedOp];
          return (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(selectedOp, rawIdx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(selectedOp, rawIdx)}
              style={{
                display: "flex", gap: 8, alignItems: "center",
                padding: "8px 8px", marginBottom: 5,
                background: TOK.paper, border: `1px solid ${TOK.line}`,
                borderLeft: `3px solid ${op.color}`,
                borderRadius: TOK.r4, cursor: "grab",
                transition: "all .15s",
              }}
            >
              {/* Numéro d'ordre */}
              <div style={{
                width: 22, height: 22, borderRadius: 999,
                background: op.color, color: "#fff",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontFamily: TOK.mono, fontSize: 10, fontWeight: 700,
                flex: "0 0 22px",
              }}>{rawIdx + 1}</div>
              {/* Contenu */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Data size={11} weight={700}>{displayItem.immat}</Data>
                  <Mono size={9} color={TOK.ink30}>{displayItem.time}</Mono>
                </div>
                <div style={{ fontFamily: TOK.body, fontSize: 11, color: TOK.ink50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {displayItem.client}
                </div>
                <div style={{ fontSize: 10, color: TOK.ink30, fontFamily: TOK.body, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {displayItem.adresse}
                </div>
              </div>
              {/* Handle drag */}
              <div style={{ color: TOK.ink30, cursor: "grab", flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <circle cx="9" cy="6" r="1.5" fill="currentColor"/>
                  <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="9" cy="18" r="1.5" fill="currentColor"/>
                  <circle cx="15" cy="6" r="1.5" fill="currentColor"/>
                  <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer avec km et bouton valider */}
      <div style={{ padding: "12px 14px", borderTop: `1px solid ${TOK.line}` }}>
        {Object.entries(OPERATORS).map(([name, op]) => (
          <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 999, background: op.color }} />
              <Mono size={9} color={TOK.ink50}>{name}</Mono>
            </div>
            <div style={{ fontFamily: TOK.mono, fontSize: 11, fontWeight: 600, color: TOK.ink }}>
              ~{KM_ESTIMATES[name]} km
            </div>
          </div>
        ))}
        <div style={{ height: 1, background: TOK.line, margin: "8px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Mono size={9} color={TOK.ink50}>Total estimé</Mono>
          <span style={{ fontFamily: TOK.mono, fontSize: 13, fontWeight: 700, color: TOK.brand }}>
            ~{Object.values(KM_ESTIMATES).reduce((a,b)=>a+b,0).toFixed(1)} km
          </span>
        </div>
        <Btn kind="primary" full icon={<I.check s={11} />} onClick={onValidate}>Valider la tournée</Btn>
      </div>
    </div>
  );
};

// Composant carte Leaflet
const LeafletMap = ({ selectedOp, interventions }) => {
  const containerRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const layersRef = React.useRef([]);

  const createIcon = (op, num, done) => {
    const c = done ? "#6B7280" : op.color;
    return window.L && window.L.divIcon({
      className: "",
      html: `<div style="position:relative;width:32px;height:32px">
        <div style="width:32px;height:32px;background:${c};border:2.5px solid #fff;border-radius:50% 50% 50% 2px;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center">
          <span style="transform:rotate(45deg);color:#fff;font-size:11px;font-weight:700;font-family:system-ui">${num}</span>
        </div>
      </div>`,
      iconSize: [32,42], iconAnchor: [16,42], popupAnchor: [0,-44],
    });
  };

  React.useEffect(() => {
    if (!containerRef.current || !window.L) return;

    if (!mapRef.current) {
      mapRef.current = window.L.map(containerRef.current, {
        zoomControl: true, attributionControl: false,
      }).setView([48.862, 2.33], 12);

      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
      }).addTo(mapRef.current);
    }

    // Nettoyer les anciens layers
    layersRef.current.forEach(l => { try { mapRef.current.removeLayer(l); } catch(e){} });
    layersRef.current = [];

    // Ajouter tous les opérateurs
    Object.entries(interventions).forEach(([opName, items]) => {
      const op = OPERATORS[opName];
      const coords = items.map(i => [i.lat, i.lng]);
      const isActive = opName === selectedOp;
      const opacity = isActive ? 1 : 0.35;

      // Polyline
      const pl = window.L.polyline(coords, {
        color: op.color, weight: isActive ? 3 : 2,
        opacity, dashArray: "6, 10",
      }).addTo(mapRef.current);
      layersRef.current.push(pl);

      // Markers
      items.forEach((item, idx) => {
        const icon = createIcon(op, idx + 1, item.t === "ok");
        const mk = window.L.marker([item.lat, item.lng], { icon, opacity })
          .addTo(mapRef.current);
        mk.bindPopup(`
          <div style="font-family:system-ui;min-width:160px;padding:4px 0">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px">${item.immat}</div>
            <div style="font-size:11px;color:#6B7280;margin-bottom:2px">${item.client}</div>
            <div style="font-size:11px;color:#6B7280">${item.time} · ${item.pack}</div>
            <div style="font-size:10px;color:#9CA3AF;margin-top:4px">${item.adresse}</div>
          </div>
        `, { maxWidth: 200 });
        layersRef.current.push(mk);
      });
    });

    // Fit aux bounds de l'op sélectionné
    const selItems = interventions[selectedOp];
    if (selItems && selItems.length > 0) {
      const bounds = window.L.latLngBounds(selItems.map(i => [i.lat, i.lng]));
      mapRef.current.fitBounds(bounds.pad(0.3));
    }

    return () => {};
  }, [selectedOp]);

  React.useEffect(() => {
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  return (
    <div ref={containerRef} style={{ flex: 1, height: "100%", position: "relative" }}>
      {!window.L && (
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background: TOK.panel, flexDirection:"column", gap:8 }}>
          <I.loc s={24} c={TOK.ink30}/>
          <Mono size={11} color={TOK.ink30}>Chargement de la carte…</Mono>
        </div>
      )}
    </div>
  );
};

// ─── PAGE PRINCIPALE CARTE ───────────────────────────────────────────────────
const A_PlanningMap = () => {
  const [selectedOp, setSelectedOp] = React.useState("Karim B.");
  const [toggle, setToggle] = React.useState("Aujourd'hui");
  const [validated, setValidated] = React.useState(false);
  const navItems = [...NAV_ADMIN, { label: "Planning", icon: <I.cal s={15}/> }];

  return (
    <Page>
      <Sidebar items={navItems} active="Planning" role="Admin" user={{ name: "Admin Ops", org: "IZOX · Paris" }} />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px", borderBottom: `1px solid ${TOK.line}`,
          background: TOK.surface, flexShrink: 0, gap: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Btn kind="ghost" size="sm" icon={<I.chevL s={12}/>} style={{ padding: "6px 10px" }}>Planning</Btn>
            <div style={{ width: 1, height: 18, background: TOK.line }} />
            <I.loc s={14} c={TOK.brand}/>
            <span style={{ fontFamily: TOK.head, fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px" }}>
              Carte · Optimisation tournées
            </span>
            <Tag tone="warn" dot>Lundi 9 Juin 2026</Tag>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            {validated && <Tag tone="ok" dot>Tournée validée ✓</Tag>}
            <Btn kind="ghost" size="sm" icon={<I.download s={12}/>}>Exporter</Btn>
          </div>
        </div>

        {/* Corps : carte + panel */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Carte */}
          <LeafletMap selectedOp={selectedOp} interventions={TODAY_INTERVENTIONS} />

          {/* Panel droit */}
          <MapPanel
            opInterventions={TODAY_INTERVENTIONS}
            selectedOp={selectedOp}
            setSelectedOp={setSelectedOp}
            toggle={toggle}
            setToggle={setToggle}
            onValidate={() => setValidated(true)}
          />
        </div>
      </main>
    </Page>
  );
};

Object.assign(window, { A_PlanningMap, TODAY_INTERVENTIONS });
