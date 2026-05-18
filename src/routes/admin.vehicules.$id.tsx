import { createFileRoute, Link, useNavigate, useParams, useRouter } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getVehiculePhotoUrl } from "@/lib/vehicule-photo";
import { getPackLabel } from "@/lib/pricing";
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
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Trash2,
  Gauge,
  BookOpen,
  Droplets,
  Building2,
} from "lucide-react";

import { AddVehiculeDialog } from "@/components/client/AddVehiculeDialog";
import { getVehiculeIcon, getVehiculeLabel } from "@/components/client/VehiculeIcons";
import { supprimerVehicule } from "@/lib/supprimer-vehicule";
import {
  FacturationPrealableDialog,
  type FacturationPrealableState,
} from "@/components/admin/FacturationPrealableDialog";

export const Route = createFileRoute("/admin/vehicules/$id")({
  component: AdminVehiculeDetail,
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
  type_pack_souhaite: string | null;
  contrat_id: string | null;
  entreprise_id: string;
  entreprises: { id: string; nom: string } | null;
}

const STATUT_LABELS: Record<string, string> = {
  actif: "Actif",
  en_attente_validation: "En attente de validation",
  remplace: "Remplacé",
};

function AdminVehiculeDetail() {
  const { id } = useParams({ from: "/admin/vehicules/$id" });
  const navigate = useNavigate();
  const router = useRouter();
  const [vehicule, setVehicule] = useState<Vehicule | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [billingState, setBillingState] = useState<FacturationPrealableState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vehicules")
      .select(
        "id, immatriculation, marque, modele, type_vehicule, annee, couleur, kilometrage, notes, statut, photo_path, type_pack_souhaite, contrat_id, entreprise_id, entreprises ( id, nom )"
      )
      .eq("id", id)
      .maybeSingle();
    setVehicule((data as unknown as Vehicule) ?? null);
    setPhotoUrl(await getVehiculePhotoUrl(data?.photo_path));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    setDeleting(true);
    const res = await supprimerVehicule(id);
    setDeleting(false);
    if (res.needsBilling) {
      setConfirmOpen(false);
      setBillingState(res.needsBilling);
      return;
    }
    if (res.done) {
      navigate({ to: "/admin/vehicules" });
    } else {
      setConfirmOpen(false);
    }
  };

  const goBack = () => {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      navigate({ to: "/admin/vehicules" });
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
      <div className="p-6 lg:p-10 max-w-3xl mx-auto">
        <Button variant="outline" size="sm" className="mb-6" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
        <p className="text-muted-foreground">Véhicule introuvable.</p>
      </div>
    );
  }

  const Icon = getVehiculeIcon(vehicule.type_vehicule);
  const typeLabel = getVehiculeLabel(vehicule.type_vehicule);
  const title =
    vehicule.marque || vehicule.modele
      ? `${vehicule.marque ?? ""} ${vehicule.modele ?? ""}`.trim()
      : "Véhicule";

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <Button variant="outline" size="sm" className="mb-6" onClick={goBack}>
        <ArrowLeft className="h-4 w-4" /> Retour
      </Button>

      <Card className="overflow-hidden shadow-card border-border/60 mb-5">
        <div className="aspect-[16/10] bg-muted flex items-center justify-center text-muted-foreground/60 relative overflow-hidden">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={vehicule.immatriculation}
              className="w-full h-full object-cover"
            />
          ) : (
            <Icon className="w-40 h-auto opacity-60" />
          )}
        </div>
        <div className="p-5">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="font-mono text-base text-primary mt-1">{vehicule.immatriculation}</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge variant="secondary">{typeLabel}</Badge>
            <Badge
              variant={vehicule.statut === "actif" ? "outline" : "secondary"}
              className="capitalize"
            >
              {STATUT_LABELS[vehicule.statut] ?? vehicule.statut.replace("_", " ")}
            </Badge>
            {vehicule.type_pack_souhaite && (
              <Badge variant="outline">
                {getPackLabel(vehicule.type_pack_souhaite)}
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {vehicule.entreprises && (
        <Card className="p-5 shadow-card border-border/60 mb-5">
          <h2 className="font-semibold text-foreground mb-3">Entreprise</h2>
          <Link
            to="/admin/clients/$id"
            params={{ id: vehicule.entreprises.id }}
            className="flex items-center gap-3 text-primary hover:underline"
          >
            <Building2 className="h-5 w-5" />
            <span className="font-medium">{vehicule.entreprises.nom}</span>
          </Link>
        </Card>
      )}

      <Card className="p-5 shadow-card border-border/60 mb-5">
        <h2 className="font-semibold text-foreground mb-4">Informations</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Row label="Marque" value={vehicule.marque} />
          <Row label="Modèle" value={vehicule.modele} />
          <Row label="Immatriculation" value={vehicule.immatriculation} />
          <Row label="Type" value={typeLabel} />
          <Row label="Année" value={vehicule.annee != null ? String(vehicule.annee) : null} />
          <Row label="Couleur" value={vehicule.couleur} />
          <Row
            label="Kilométrage"
            value={
              vehicule.kilometrage != null
                ? `${vehicule.kilometrage.toLocaleString("fr-FR")} km`
                : null
            }
          />
        </dl>
        {vehicule.notes && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">
              Notes
            </p>
            <p className="text-sm whitespace-pre-wrap">{vehicule.notes}</p>
          </div>
        )}
      </Card>

      {vehicule.type_pack_souhaite && (
        <Card className="p-5 shadow-card border-border/60 mb-5">
          <h2 className="font-semibold text-foreground mb-3">Bonus inclus</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <Gauge className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-foreground">Vérification pneus</span>
            </li>
            <li className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-foreground">Carnet entretien numérique</p>
                <p className="text-xs text-muted-foreground mt-0.5">Bientôt disponible</p>
              </div>
            </li>
            {vehicule.type_pack_souhaite === "pack_vtc" && (
              <li className="flex items-start gap-3">
                <Droplets className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-foreground">Lave-glace gratuit</span>
              </li>
            )}
          </ul>
        </Card>
      )}

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
        entrepriseId={vehicule.entreprise_id}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce véhicule ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le véhicule {vehicule.immatriculation} sera
              définitivement supprimé.
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

      <FacturationPrealableDialog
        state={billingState}
        onClose={() => setBillingState(null)}
        onResolved={() => navigate({ to: "/admin/vehicules" })}
      />
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
