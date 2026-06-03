"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, Navigation2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Fix default Leaflet marker icons (bundler issue)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

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
  vehicule?: { immatriculation: string } | null;
}

interface OperatorRoute {
  operator: Operator;
  interventions: Intervention[];
  totalKm: number;
}

// Numbered circle icon for markers
function createNumberedIcon(n: number, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="13" fill="${color}" stroke="white" stroke-width="2"/>
    <text x="14" y="19" text-anchor="middle" fill="white" font-size="12" font-family="Arial" font-weight="bold">${n}</text>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

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

// Paris / Île-de-France as static fallback
const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

export function RouteMap() {
  const [routes, setRoutes] = useState<OperatorRoute[]>([]);
  const [loading, setLoading] = useState(true);
  // Adaptive center: last known GPS point → Paris fallback
  const [mapCenter, setMapCenter] = useState<[number, number]>(PARIS_CENTER);
  const today = format(new Date(), "yyyy-MM-dd");

  const loadData = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [opsRes, intsRes] = await Promise.all([
      (supabase.from as any)("operators").select("*"),
      supabase
        .from("interventions")
        .select("id, operator_id, time_slot, date_intervention, latitude, longitude, vehicules(immatriculation)")
        .not("operator_id", "is", null)
        .eq("date_intervention", today)
        .not("latitude", "is", null)
        .not("longitude", "is", null),
    ]);

    const operators: Operator[] = ((opsRes as { data: unknown }).data ?? []) as Operator[];
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

    // Adaptive center: if no GPS routes today, use last known GPS point in DB
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
      // else keeps PARIS_CENTER fallback
    }
    // When routes exist, AutoFitBounds overrides the center via fitBounds

    setRoutes(computed);
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

  return (
    <div className="space-y-4">
      {routes.length === 0 ? (
        <Card className="p-12 text-center border-border/60">
          <Navigation2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            Aucune route calculable aujourd'hui.
            <br />
            <span className="text-xs">
              Les interventions ont besoin de coordonnées GPS et d'au moins 2 points par opérateur.
            </span>
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Map */}
          <div className="lg:col-span-3 rounded-lg overflow-hidden border border-border">
            <MapContainer
              center={mapCenter}
              zoom={10}
              style={{ height: "500px", width: "100%" }}
            >
              <TileLayer
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <AutoFitBounds routes={routes} />
              {routes.map((r) => {
                const pts: [number, number][] = r.interventions
                  .filter((i) => i.latitude != null && i.longitude != null)
                  .map((i) => [i.latitude!, i.longitude!] as [number, number]);

                return (
                  <div key={r.operator.id}>
                    <Polyline
                      positions={pts}
                      pathOptions={{ color: r.operator.color_hex, weight: 3, opacity: 0.8 }}
                    />
                    {r.interventions.map((int, idx) =>
                      int.latitude && int.longitude ? (
                        <Marker
                          key={int.id}
                          position={[int.latitude, int.longitude]}
                          icon={createNumberedIcon(idx + 1, r.operator.color_hex)}
                        >
                          <Popup>
                            <strong>{r.operator.name}</strong>
                            <br />
                            {int.vehicule?.immatriculation ?? "—"}
                            <br />
                            <span className="text-xs text-gray-500">
                              {int.time_slot === "morning" ? "Matin" : "Après-midi"}
                            </span>
                          </Popup>
                        </Marker>
                      ) : null
                    )}
                  </div>
                );
              })}
            </MapContainer>
          </div>

          {/* Legend */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Légende des routes</p>
            {routes.map((r) => (
              <Card key={r.operator.id} className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: r.operator.color_hex }}
                  />
                  <span className="text-sm font-semibold">{r.operator.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.interventions.length} arrêts · ~{r.totalKm.toFixed(1)} km
                </p>
                <ol className="text-xs space-y-0.5 text-muted-foreground">
                  {r.interventions.map((i, idx) => (
                    <li key={i.id}>
                      <span className="font-mono">{idx + 1}.</span>{" "}
                      {i.vehicule?.immatriculation ?? "—"}{" "}
                      <span className="text-[10px]">
                        ({i.time_slot === "morning" ? "matin" : "AM"})
                      </span>
                    </li>
                  ))}
                </ol>
              </Card>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-right">
        Carte du {format(new Date(), "d MMMM yyyy", { locale: fr })} · données actualisées au chargement
      </p>
    </div>
  );
}
