import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Car } from "lucide-react";
import { AddVehiculeDialog } from "@/components/client/AddVehiculeDialog";
import { getVehiculeIcon, getVehiculeLabel } from "@/components/client/VehiculeIcons";

export const Route = createFileRoute("/client/flotte")({
  component: MaFlotte,
});

interface Vehicule {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  type_vehicule: string | null;
  statut: string;
  photo_path: string | null;
}

function MaFlotte() {
  const { profile } = useAuth();
  const [list, setList] = useState<Vehicule[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!profile?.entreprise_id) return;
    setLoading(true);
    const { data } = await supabase
      .from("vehicules")
      .select("id, immatriculation, marque, modele, type_vehicule, statut, photo_path")
      .eq("entreprise_id", profile.entreprise_id)
      .order("created_at", { ascending: false });
    const items = (data as Vehicule[]) ?? [];
    setList(items);

    // Resolve signed URLs for photos
    const urls: Record<string, string> = {};
    await Promise.all(
      items
        .filter((v) => v.photo_path)
        .map(async (v) => {
          const { data: signed } = await supabase.storage
            .from("vehicules")
            .createSignedUrl(v.photo_path!, 3600);
          if (signed?.signedUrl) urls[v.id] = signed.signedUrl;
        })
    );
    setPhotoUrls(urls);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [profile]);

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ma flotte</h1>
          <p className="text-sm text-muted-foreground">{list.length} véhicule{list.length > 1 ? "s" : ""}</p>
        </div>
        <Button variant="izox" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : list.length === 0 ? (
        <Card className="p-10 text-center shadow-card border-border/60">
          <Car className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">Aucun véhicule pour le moment.</p>
          <Button variant="izox" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Ajouter mon premier véhicule
          </Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {list.map((v) => {
            const Icon = getVehiculeIcon(v.type_vehicule);
            const label = getVehiculeLabel(v.type_vehicule);
            const url = photoUrls[v.id];
            return (
              <Card key={v.id} className="overflow-hidden shadow-card border-border/60 group">
                <div className="aspect-[16/10] bg-muted flex items-center justify-center text-muted-foreground/60 relative overflow-hidden">
                  {url ? (
                    <img src={url} alt={v.immatriculation} className="w-full h-full object-cover" />
                  ) : (
                    <Icon className="w-32 h-auto opacity-60" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-foreground truncate">
                    {v.marque || v.modele ? `${v.marque ?? ""} ${v.modele ?? ""}`.trim() : "Véhicule"}
                  </h3>
                  <p className="font-mono text-sm text-primary mt-0.5">{v.immatriculation}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{label}</Badge>
                    {v.statut !== "actif" && (
                      <Badge variant="outline" className="text-xs capitalize">{v.statut.replace("_", " ")}</Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AddVehiculeDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </div>
  );
}
