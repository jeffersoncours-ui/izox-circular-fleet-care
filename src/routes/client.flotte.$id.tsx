import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
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
import { ArrowLeft, Loader2, Pencil, Trash2, Gauge, BookOpen, Droplets } from "lucide-react";
import { toast } from "sonner";
import { AddVehiculeDialog } from "@/components/client/AddVehiculeDialog";
import { getVehiculeIcon, getVehiculeLabel } from "@/components/client/VehiculeIcons";

export const Route = createFileRoute("/client/flotte/$id")({
  component: VehiculeDetail,
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

function VehiculeDetail() {
  const { id } = useParams({ from: "/client/flotte/$id" });
  const navigate = useNavigate();
  const [vehicule, setVehicule] = useState<Vehicule | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vehicules")
      .select("id, immatriculation, marque, modele, type_vehicule, annee, couleur, kilometrage, notes, statut, photo_path")
      .eq("id", id)
      .maybeSingle();
    setVehicule((data as Vehicule) ?? null);
    if (data?.photo_path) {
      const { data: signed } = await supabase.storage
        .from("vehicules")
        .createSignedUrl(data.photo_path, 3600);
      setPhotoUrl(signed?.signedUrl ?? null);
    } else {
      setPhotoUrl(null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("vehicules").delete().eq("id", id);
      if (error) throw error;
      toast.success("Véhicule supprimé");
      navigate({ to: "/client/flotte" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!vehicule) {
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <Button asChild variant="outline" size="sm" className="mb-6">
          <Link to="/client/flotte">
            <ArrowLeft className="h-4 w-4" /> Retour à Ma flotte
          </Link>
        </Button>
        <p className="text-muted-foreground">Véhicule introuvable.</p>
      </div>
    );
  }

  const Icon = getVehiculeIcon(vehicule.type_vehicule);
  const typeLabel = getVehiculeLabel(vehicule.type_vehicule);
  const title = (vehicule.marque || vehicule.modele)
    ? `${vehicule.marque ?? ""} ${vehicule.modele ?? ""}`.trim()
    : "Véhicule";

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <Button asChild variant="outline" size="sm" className="mb-6">
        <Link to="/client/flotte">
          <ArrowLeft className="h-4 w-4" /> Retour à Ma flotte
        </Link>
      </Button>

      <Card className="overflow-hidden shadow-card border-border/60 mb-5">
        <div className="aspect-[16/10] bg-muted flex items-center justify-center text-muted-foreground/60 relative overflow-hidden">
          {photoUrl ? (
            <img src={photoUrl} alt={vehicule.immatriculation} className="w-full h-full object-cover" />
          ) : (
            <Icon className="w-40 h-auto opacity-60" />
          )}
        </div>
        <div className="p-5">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="font-mono text-base text-primary mt-1">{vehicule.immatriculation}</p>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="secondary">{typeLabel}</Badge>
            {vehicule.statut !== "actif" && (
              <Badge variant="outline" className="capitalize">{vehicule.statut.replace("_", " ")}</Badge>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-5 shadow-card border-border/60 mb-5">
        <h2 className="font-semibold text-foreground mb-4">Informations</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Row label="Marque" value={vehicule.marque} />
          <Row label="Modèle" value={vehicule.modele} />
          <Row label="Immatriculation" value={vehicule.immatriculation} />
          <Row label="Type" value={typeLabel} />
          <Row label="Année" value={vehicule.annee != null ? String(vehicule.annee) : null} />
          <Row label="Couleur" value={vehicule.couleur} />
          <Row label="Kilométrage" value={vehicule.kilometrage != null ? `${vehicule.kilometrage.toLocaleString("fr-FR")} km` : null} />
        </dl>
        {vehicule.notes && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{vehicule.notes}</p>
          </div>
        )}
      </Card>

      <div className="flex gap-2">
        <Button variant="izox" className="flex-1" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" /> Modifier
        </Button>
        <Button variant="destructive" className="flex-1" onClick={() => setConfirmOpen(true)}>
          <Trash2 className="h-4 w-4" /> Supprimer
        </Button>
      </div>

      <AddVehiculeDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onCreated={load}
        vehicule={vehicule}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce véhicule ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le véhicule {vehicule.immatriculation} sera définitivement supprimé.
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

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</dt>
      <dd className="text-foreground mt-0.5">{value || "—"}</dd>
    </div>
  );
}
