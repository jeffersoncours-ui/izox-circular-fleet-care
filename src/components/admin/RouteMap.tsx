"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, Navigation2, Check, MapPin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { statutLabel } from "@/lib/interventions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Fix default Leaflet marker icons (bundler issue)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// ─── Calculs (business logic — ne pas modifier) ────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Operator {
  id: string;
  name: string;
  initials: string;
  color_hex: string;
}

interface Intervention {
  id: string;
  operator_id: string | null;
  time_slot: string | null;
  date_intervention: string | null;
  latitude: number | null;
  longitude: number | null;
  statut: string | null;
  adresse_intervention: string | null;
  heure_intervention: string | null;
  vehicule?: { immatriculation: string } | null;
}

interface OperatorRoute {
  operator: Operator;
  interventions: Intervention[];
  totalKm: number;
}

// ─── Icône pin en goutte (handoff v2) ─────────────────────────────────────────

function createPinIcon(n: number, color: string) {
  const size = 32;
  const html = `
    <div style="
      position:relative;
      width:${size}px; height:${size}px;
      display:flex; align-items:center; justify-content:center;
    ">
      <div style="
        position:absolute; inset:0;
        background:${color};
        border:2.5px solid rgba(255,255,255,0.9);
        border-radius: 50% 50% 50% 4px;
        transform: rotate(-45deg);
        box-shadow: 0 3px 10px ${color}55;
      "></div>
      <span style="
        position:relative; z-index:1;
        color:#fff; font-family:Arial,sans-serif;
        font-size:12px; font-weight:700;
        transform:none;
      ">${n}</span>
    </div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

// ─── AutoFitBounds (business logic — ne pas modifier) ──────────────────────────

function AutoFitBounds({ routes }: { routes: OperatorRoute[] }) {
  const map = useMap();
  useEffect(() => {
    const pts: [number, number][] = routes.flatMap((r) =>
      r.interventions
        .filter((i) => i.latitude != null && i.longitude != null)
        .map((i) => [i.latitude!, i.longitude!] as [number, number])
    );
    if (pts.length > 0) {
      map.fitBounds(pts, { padding: [40, 40] });
    }
  }, [map, routes]);
  return null;
}

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

// ─── Statuts pins (légende) ────────────────────────────────────────────────────

const PIN_STATUTS = [
  { statut: "validee",   color: "#1F8A5B" },
  { statut: "en_cours",  color: "#C7811E" },
  { statut: "planifiee", color: "#2A6FDB" },
] as const;

// ─── Composant principal ────────────────────────────────────────────────────────

export function RouteMap() {
  const [routes, setRoutes] = useState<OperatorRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>(PARIS_CENTER);
  const [selectedOp, setSelectedOp] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [opsRes, intsRes] = await Promise.all([
      supabase.from("operators").select("*"),
      supabase
        .from("interventions")
        .select(
          "id, operator_id, time_slot, date_intervention, latitude, longitude, statut, adresse_intervention, heure_intervention, vehicules(immatriculation)"
        )
        .not("operator_id", "is", null)
        .eq("date_intervention", today)
        .not("latitude", "is", null)
        .not("longitude", "is", null),
    ]);

    const operators: Operator[] = (opsRes.data ?? []) as Operator[];
    const allInts: Intervention[] = ((intsRes as { data: unknown }).data ?? []) as unknown as Intervention[];

    const computed: OperatorRoute[] = operators
      .map((op) => {
        const ints = allInts
          .filter((i) => i.operator_id === op.id)
          .sort((a, b) => {
            const slotOrder = { morning: 0, afternoon: 1 };
            const aSlot = slotOrder[a.time_slot as keyof typeof slotOrder] ?? 2;
            const bSlot = slotOrder[b.time_slot as keyof typeof slotOrder] ?? 2;
            return aSlot - bSlot;
          });

        let totalKm = 0;
        for (let j = 0; j < ints.length - 1; j++) {
          const a = ints[j];
          const b = ints[j + 1];
          if (a.latitude && a.longitude && b.latitude && b.longitude) {
            totalKm += haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
          }
        }

        return { operator: op, interventions: ints, totalKm };
      })
      .filter((r) => r.interventions.length >= 2);

    if (computed.length === 0) {
      const { data: lastPt } = await supabase
        .from("interventions")
        .select("latitude, longitude")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastPt?.latitude && lastPt?.longitude) {
        setMapCenter([lastPt.latitude as number, lastPt.longitude as number]);
      }
    }

    setRoutes(computed);
    if (computed.length > 0) setSelectedOp(computed[0].operator.id);
    setLoading(false);
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeRoute = routes.find((r) => r.operator.id === selectedOp) ?? routes[0] ?? null;
  const totalKmAll = routes.reduce((acc, r) => acc + r.totalKm, 0);

  return (
    <div className="flex overflow-hidden rounded-lg border border-border bg-card shadow-card" style={{ height: 560 }}>

      {/* ─── Légende gauche (220px) ─── */}
      <div className="w-[220px] shrink-0 overflow-y-auto border-r border-border bg-background p-3 space-y-5">
        {/* Date */}
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">
            Carte du
          </p>
          <p className="font-display text-[13px] font-bold text-foreground capitalize">
            {format(new Date(), "EEEE d MMMM", { locale: fr })}
          </p>
        </div>

        {/* Opérateurs */}
        {routes.length > 0 && (
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-2">
              Opérateurs
            </p>
            <div className="space-y-1.5">
              {routes.map((r) => {
                const done = r.interventions.filter(
                  (i) => i.statut === "validee"
                ).length;
                return (
                  <button
                    key={r.operator.id}
                    type="button"
                    onClick={() => setSelectedOp(r.operator.id)}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                      selectedOp === r.operator.id
                        ? "bg-card border border-border shadow-elegant"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: r.operator.color_hex }}
                    >
                      {r.operator.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-foreground truncate">
                        {r.operator.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {done}/{r.interventions.length} · ~{r.totalKm.toFixed(1)} km
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Statuts pins */}
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-2">
            Statuts des pins
          </p>
          <div className="space-y-1.5">
            {PIN_STATUTS.map((s) => (
              <div key={s.statut} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-[11px] text-muted-foreground">
                  {statutLabel(s.statut as "validee" | "en_cours" | "planifiee")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Itinéraires (polylines) */}
        {routes.length > 0 && (
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-2">
              Itinéraires
            </p>
            <div className="space-y-1.5">
              {routes.map((r) => (
                <div key={r.operator.id} className="flex items-center gap-2">
                  <svg width="24" height="8" viewBox="0 0 24 8">
                    <line
                      x1="0" y1="4" x2="24" y2="4"
                      stroke={r.operator.color_hex}
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                  </svg>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {r.operator.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Carte centrale ─── */}
      <div className="flex-1 relative">
        {routes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft/20">
              <Navigation2 className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50">
              Aucune donnée
            </p>
            <p className="font-display text-lg font-bold text-foreground">
              Aucune intervention aujourd'hui
            </p>
            <p className="text-sm text-muted-foreground">
              Les interventions avec coordonnées GPS apparaîtront ici.
            </p>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={10}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <AutoFitBounds routes={routes} />
            {routes.map((r) => {
              const isActive = selectedOp === null || r.operator.id === selectedOp;
              const pts: [number, number][] = r.interventions
                .filter((i) => i.latitude != null && i.longitude != null)
                .map((i) => [i.latitude!, i.longitude!] as [number, number]);

              return (
                <div key={r.operator.id}>
                  <Polyline
                    positions={pts}
                    pathOptions={{
                      color: r.operator.color_hex,
                      weight: 3,
                      opacity: isActive ? 0.85 : 0.2,
                      dashArray: "6, 10",
                    }}
                  />
                  {r.interventions.map((int, idx) =>
                    int.latitude && int.longitude ? (
                      <Marker
                        key={int.id}
                        position={[int.latitude, int.longitude]}
                        icon={createPinIcon(idx + 1, r.operator.color_hex)}
                        opacity={isActive ? 1 : 0.25}
                      >
                        <Popup>
                          <div className="min-w-[140px] font-sans">
                            <p className="font-bold text-[12px] font-mono">
                              {int.vehicule?.immatriculation ?? "—"}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">{r.operator.name}</p>
                            <p className="text-[11px] text-gray-500">
                              {int.time_slot === "morning" ? "Matin" : "Après-midi"}
                              {int.heure_intervention && ` · ${int.heure_intervention.slice(0, 5)}`}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    ) : null
                  )}
                </div>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* ─── Panel droit (280px) ─── */}
      {routes.length > 0 && (
        <div className="w-[280px] shrink-0 border-l border-border bg-background flex flex-col">
          {/* Header panel */}
          <div className="border-b border-border px-3.5 py-3">
            <p className="font-display text-[15px] font-bold text-foreground mb-2">
              Interventions du jour
            </p>
            {/* Mini sélecteur opérateur */}
            <div className="flex gap-1.5 flex-wrap">
              {routes.map((r) => (
                <button
                  key={r.operator.id}
                  type="button"
                  onClick={() => setSelectedOp(r.operator.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors border",
                    selectedOp === r.operator.id
                      ? "text-white border-transparent"
                      : "bg-transparent text-muted-foreground border-border hover:bg-muted/50"
                  )}
                  style={selectedOp === r.operator.id ? { backgroundColor: r.operator.color_hex, borderColor: r.operator.color_hex } : {}}
                >
                  <span
                    className="h-4 w-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white shrink-0"
                    style={{ backgroundColor: selectedOp === r.operator.id ? "rgba(255,255,255,0.3)" : r.operator.color_hex }}
                  >
                    {r.operator.initials}
                  </span>
                  {r.operator.name}
                </button>
              ))}
            </div>
          </div>

          {/* Liste interventions (ordonnée, scroll) */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {activeRoute ? (
              activeRoute.interventions.map((int, idx) => (
                <div
                  key={int.id}
                  className="flex items-start gap-2.5 rounded-md border border-border bg-card p-2.5"
                >
                  {/* Numéro d'ordre */}
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ backgroundColor: activeRoute.operator.color_hex }}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="font-mono text-[12px] font-bold text-foreground">
                      {int.vehicule?.immatriculation ?? "—"}
                    </p>
                    {int.heure_intervention && (
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {int.heure_intervention.slice(0, 5)}
                        {" · "}
                        {int.time_slot === "morning" ? "Matin" : "Après-midi"}
                      </p>
                    )}
                    {int.adresse_intervention && (
                      <p className="flex items-start gap-1 text-[10px] text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5 mt-px shrink-0" />
                        <span className="truncate">{int.adresse_intervention}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-[12px] text-muted-foreground py-4">
                Aucune intervention
              </p>
            )}
          </div>

          {/* Footer : KM + bouton Valider */}
          <div className="border-t border-border p-3 space-y-2.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">Distance estimée</span>
              <span className="font-mono font-bold text-primary">
                ~{totalKmAll.toFixed(1)} km
              </span>
            </div>
            {validated ? (
              <div className="flex items-center justify-center gap-2 rounded-md border border-success/30 bg-success-soft px-3 py-2.5">
                <Check className="h-4 w-4 text-success" />
                <span className="text-[13px] font-semibold text-success">
                  Tournée validée ✓
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setValidated(true)}
                className="w-full rounded-md bg-primary px-3 py-2.5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Valider la tournée
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
