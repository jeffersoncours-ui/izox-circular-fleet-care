"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";
import { type AdminDemandeRdv } from "@/components/admin/demande-rdv-types";

// Fix bundler icon issue (same as RouteMap)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const PIN_COLOR: Record<string, string> = {
  en_attente: "#D97706",
  confirmee: "#1B4332",
  refusee: "#DC2626",
  annulee_client: "#9CA3AF",
  annulee_admin: "#9CA3AF",
};

function buildIcon(row: AdminDemandeRdv, active: boolean): L.DivIcon {
  const c = PIN_COLOR[row.statut] ?? "#6B7280";
  const sz = active ? 38 : 28;
  const inner = row.statut === "en_attente" ? "!" : row.statut === "confirmee" ? "✓" : "×";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${sz}px;height:${sz}px;
      background:${c};
      border:2.5px solid #fff;
      border-radius:50%;
      box-shadow:0 2px ${active ? 12 : 5}px ${c}55;
      display:flex;align-items:center;justify-content:center;
      transition:all .2s;
      font-family:system-ui;
      color:#fff;
      font-size:${active ? 13 : 10}px;
      font-weight:700;
    ">${inner}</div>`,
    iconSize: [sz, sz],
    iconAnchor: [sz / 2, sz / 2],
    popupAnchor: [0, -(sz / 2 + 4)],
  });
}

// ─── Imperative marker layer ───────────────────────────────────────────────────

interface MarkerLayerProps {
  rows: AdminDemandeRdv[];
  hoveredId: string | null;
}

function MarkerLayer({ rows, hoveredId }: MarkerLayerProps) {
  const map = useMap();
  const markersRef = useRef<Record<string, L.Marker>>({});
  const rowsWithGps = rows.filter((r) => r.latitude != null && r.longitude != null);

  // Full rebuild when rows change
  useEffect(() => {
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    rowsWithGps.forEach((row) => {
      const active = row.id === hoveredId;
      const nomEntreprise = row.entreprise_nom ?? "—";
      const lieu =
        [row.code_postal_intervention, row.ville_intervention].filter(Boolean).join(" ") ||
        row.adresse_intervention ||
        "—";
      const marker = L.marker([row.latitude!, row.longitude!], { icon: buildIcon(row, active) })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:system-ui;min-width:140px;line-height:1.5">
            <div style="font-size:11px;font-weight:700;margin-bottom:2px">${nomEntreprise}</div>
            <div style="font-size:10px;color:#6B7280">${lieu}</div>
            <div style="font-size:10px;color:#6B7280;margin-top:2px">${row.nb_vehicules_rdv} véh. · ${row.statut}</div>
          </div>`,
          { maxWidth: 200 },
        );
      if (active) marker.openPopup();
      markersRef.current[row.id] = marker;
    });

    // Auto-fit bounds when rows change
    if (rowsWithGps.length > 0) {
      const bounds = L.latLngBounds(
        rowsWithGps.map((r) => [r.latitude!, r.longitude!] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update icons + pan when hoveredId changes (no full rebuild)
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const row = rows.find((r) => r.id === id);
      if (!row) return;
      marker.setIcon(buildIcon(row, id === hoveredId));
    });
    if (hoveredId) {
      const row = rows.find((r) => r.id === hoveredId);
      if (row?.latitude != null && row?.longitude != null) {
        map.setView([row.latitude, row.longitude], Math.max(map.getZoom(), 13), {
          animate: true,
        });
        markersRef.current[hoveredId]?.openPopup();
      }
    }
  }, [hoveredId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(markersRef.current).forEach((m) => m.remove());
    };
  }, []);

  return null;
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div
      className="absolute top-3 left-3 z-[500] bg-white/95 border border-border rounded-lg px-3 py-2 shadow-md"
      style={{ pointerEvents: "none" }}
    >
      <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
        Légende
      </p>
      {[
        { color: "#1B4332", label: "Confirmée" },
        { color: "#D97706", label: "En attente" },
        { color: "#DC2626", label: "Refusée" },
        { color: "#9CA3AF", label: "Annulée" },
      ].map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5 mb-1">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="text-[10px] text-foreground/70 font-mono">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export interface DemandesRdvMapProps {
  rows: AdminDemandeRdv[];
  hoveredId: string | null;
}

export function DemandesRdvMap({ rows, hoveredId }: DemandesRdvMapProps) {
  const hasGps = rows.some((r) => r.latitude != null && r.longitude != null);

  if (!hasGps) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted/20 gap-3">
        <MapPin className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Aucune coordonnée GPS disponible pour les demandes affichées.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[48.8566, 2.3522]}
        zoom={11}
        style={{ width: "100%", height: "100%" }}
        zoomControl
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
        />
        <MarkerLayer rows={rows} hoveredId={hoveredId} />
      </MapContainer>
      <Legend />
    </div>
  );
}
