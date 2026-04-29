import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Car, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
  annee: number | null;
  couleur: string | null;
  kilometrage: number | null;
  notes: string | null;
  statut: string;
  photo_path: string | null;
}

function MaFlotte() {
  const { profile } = useAuth();
  const [list, setList] = useState<Vehicule[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editVehicule, setEditVehicule] = useState<Vehicule | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vehicule | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    if (!profile?.entreprise_id) return;
    setLoading(true);
    const { data } = await supabase
      .from("vehicules")
      .select("id, immatriculation, marque, modele, type_vehicule, annee, couleur, kilometrage, notes, statut, photo_path")
      .eq("entreprise_id", profile.entreprise_id)
      .order("created_at", { ascending: false });
    const items = (data as Vehicule[]) ?? [];
    setList(items);

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

  const handleEdit = (e: React.MouseEvent, v: Vehicule) => {
    e.preventDefault();
    e.stopPropagation();
    setEditVehicule(v);
    setEditOpen(true);
  };

  const handleAskDelete = (e: React.MouseEvent, v: Vehicule) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget(v);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("vehicules").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Véhicule supprimé");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setDeleting(false);
    }
  };

  const vehiculesActifs = list.filter((v) => v.statut !== "en_attente_validation");
  const vehiculesEnAttente = list.filter((v) => v.statut === "en_attente_validation");

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ma flotte</h1>
          <p className="text-sm text-muted-foreground">
            {vehiculesActifs.length} véhicule{vehiculesActifs.length > 1 ? "s" : ""} actif{vehiculesActifs.length > 1 ? "s" : ""}
          </p>
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
              <Link
                key={v.id}
                to="/client/flotte/$id"
                params={{ id: v.id }}
                className="block"
              >
                <Card className="overflow-hidden shadow-card border-border/60 group cursor-pointer transition-all duration-150 ease-out hover:shadow-strong hover:border-primary/30 relative">
                  <div className="aspect-[16/10] bg-muted flex items-center justify-center text-muted-foreground/60 relative overflow-hidden">
                    {url ? (
                      <img src={url} alt={v.immatriculation} className="w-full h-full object-cover" />
                    ) : (
                      <Icon className="w-32 h-auto opacity-60" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-foreground truncate">
                          {v.marque || v.modele ? `${v.marque ?? ""} ${v.modele ?? ""}`.trim() : "Véhicule"}
                        </h3>
                        <p className="font-mono text-sm text-primary mt-0.5">{v.immatriculation}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => handleEdit(e, v)}
                          aria-label="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => handleAskDelete(e, v)}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{label}</Badge>
                      {v.statut !== "actif" && (
                        <Badge variant="outline" className="text-xs capitalize">{v.statut.replace("_", " ")}</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <AddVehiculeDialog open={open} onOpenChange={setOpen} onCreated={load} />

      <AddVehiculeDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditVehicule(null);
        }}
        onCreated={load}
        vehicule={editVehicule}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce véhicule ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le véhicule {deleteTarget?.immatriculation} sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
