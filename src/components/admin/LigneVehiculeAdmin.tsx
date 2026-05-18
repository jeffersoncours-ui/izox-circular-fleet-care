import { useState } from "react";
import { Link } from "@tanstack/react-router";
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
import { Trash2, Loader2, Eye } from "lucide-react";
import { VehiculeThumbnail } from "@/components/client/VehiculeThumbnail";
import { getVehiculeLabel } from "@/components/client/VehiculeIcons";
import { ValidationVehiculeBadge } from "@/components/admin/ValidationVehiculeBadge";
import { supprimerVehicule } from "@/lib/supprimer-vehicule";
import {
  FacturationPrealableDialog,
  type FacturationPrealableState,
} from "@/components/admin/FacturationPrealableDialog";

export interface VehiculeAdminRow {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  type_vehicule: string | null;
  type_pack_souhaite: string | null;
  statut: string;
  photo_path: string | null;
  created_by: string | null;
}

interface Props {
  vehicule: VehiculeAdminRow;
  commercialSignataireId: string | null;
  onChanged: () => void;
}

export function LigneVehiculeAdmin({ vehicule, commercialSignataireId, onChanged }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [billingState, setBillingState] = useState<FacturationPrealableState | null>(null);

  const title =
    vehicule.marque || vehicule.modele
      ? `${vehicule.marque ?? ""} ${vehicule.modele ?? ""}`.trim()
      : "Véhicule";

  const onDelete = async () => {
    setDeleting(true);
    const res = await supprimerVehicule(vehicule.id);
    setDeleting(false);
    if (res.needsBilling) {
      setConfirmOpen(false);
      setBillingState(res.needsBilling);
      return;
    }
    if (res.done) {
      setConfirmOpen(false);
      onChanged();
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-md bg-card border border-border/60">
      <VehiculeThumbnail photoPath={vehicule.photo_path} alt={title} />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm text-foreground truncate">{title}</p>
        <p className="font-mono text-xs text-primary">{vehicule.immatriculation}</p>
      </div>
      <div className="hidden sm:flex flex-col items-end gap-1">
        <Badge variant="secondary" className="text-xs">
          {getVehiculeLabel(vehicule.type_vehicule)}
        </Badge>
        {vehicule.type_pack_souhaite && (
          <Badge variant="outline" className="text-xs">
            {vehicule.type_pack_souhaite}
          </Badge>
        )}
      </div>
      <ValidationVehiculeBadge
        vehiculeId={vehicule.id}
        statut={vehicule.statut}
        createdBy={vehicule.created_by}
        commercialSignataireId={commercialSignataireId}
        onChanged={onChanged}
      />
      <div className="flex items-center gap-1">
        <Button asChild size="icon" variant="ghost" title="Voir le véhicule">
          <Link to="/admin/vehicules/$id" params={{ id: vehicule.id }}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => setConfirmOpen(true)}
          title="Supprimer"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

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
                onDelete();
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
        onResolved={() => {
          setBillingState(null);
          onChanged();
        }}
      />
    </div>
  );
}
