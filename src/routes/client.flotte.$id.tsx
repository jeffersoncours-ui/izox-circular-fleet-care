import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getVehiculePhotoUrl } from "@/lib/vehicule-photo";
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
import { ArrowLeft, Loader2, Pencil, Trash2, Gauge, BookOpen, Droplets, CalendarPlus, Snowflake, Clock } from "lucide-react";

import { AddVehiculeDialog } from "@/components/client/AddVehiculeDialog";
import { getVehiculeIcon, getVehiculeLabel } from "@/components/client/VehiculeIcons";
import { supprimerVehicule } from "@/lib/supprimer-vehicule";
import {
  FacturationPrealableDialog,
  type FacturationPrealableState,
} from "@/components/admin/FacturationPrealableDialog";
import { CreerDemandeRdvDialog } from "@/components/client/CreerDemandeRdvDialog";
import { DemanderGelDialog } from "@/components/client/DemanderGelDialog";
import { useAuth } from "@/lib/auth-context";

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
  type_pack_souhaite: string | null;
  contrat_id: string | null;
}

function VehiculeDetail() {
  const { id } = useParams({ from: "/client/flotte/$id" });
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [vehicule, setVehicule] = useState<Vehicule | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [billingState, setBillingState] = useState<FacturationPrealableState | null>(null);
  const [rdvOpen, setRdvOpen] = useState(false);
  const [gelOpen, setGelOpen] = useState(false);
  const [demandeGelEnAttente, setDemandeGelEnAttente] = useState(false);
  const [rdvLiesCount, setRdvLiesCount] = useState({ futur: 0, passe: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vehicules")
      .select("id, immatriculation, marque, modele, type_vehicule, annee, couleur, kilometrage, notes, statut, photo_path, type_pack_souhaite, contrat_id")
      .eq("id", id)
      .maybeSingle();
    const v = (data as Vehicule) ?? null;
    setVehicule(v);
    setPhotoUrl(await getVehiculePhotoUrl(data?.photo_path));

    if (v) {
      const today = new Date().toISOString().split("T")[0];
      const [{ count: countFutur }, { count: countPasse }] = await Promise.all([
        supabase
          .from("demandes_rdv")
          .select("id", { count: "exact", head: true })
          .eq("statut", "confirmee")
          .gte("date_confirmee", today)
          .contains("vehicule_ids", [v.id]),
        supabase
          .from("interventions")
          .select("id", { count: "exact", head: true })
          .eq("vehicule_id", v.id)
          .in("statut", ["validee", "en_revision"]),
      ]);
      setRdvLiesCount({ futur: countFutur ?? 0, passe: countPasse ?? 0 });
    } else {
      setRdvLiesCount({ futur: 0, passe: 0 });
    }

    // Détecte une demande de gel en attente (par véhicule ou par contrat)
    if (v && profile?.entreprise_id) {
      const orFilter = v.contrat_id
        ? `vehicule_id.eq.${v.id},and(type_demande.eq.contrat,contrat_id.eq.${v.contrat_id})`
        : `vehicule_id.eq.${v.id}`;
      const { data: gel } = await supabase
        .from("demandes_gel")
        .select("id")
        .eq("entreprise_id", profile.entreprise_id)
        .eq("statut", "en_attente")
        .or(orFilter)
        .limit(1)
        .maybeSingle();
      setDemandeGelEnAttente(!!gel);
    } else {
      setDemandeGelEnAttente(false);
    }
    setLoading(false);
  }, [id, profile?.entreprise_id]);

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
      navigate({ to: "/client/flotte" });
    } else {
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

      {(vehicule.type_pack_souhaite || vehicule.contrat_id) && (
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

      <Card className="p-5 shadow-card border-border/60 mb-5">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Rendez-vous liés
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-primary">
              {rdvLiesCount.futur}
            </span>
            <span className="text-xs text-muted-foreground">À venir</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-muted-foreground">
              {rdvLiesCount.passe}
            </span>
            <span className="text-xs text-muted-foreground">Réalisés</span>
          </div>
        </div>
        {(rdvLiesCount.futur > 0 || rdvLiesCount.passe > 0) && (
          <Button
            variant="link"
            size="sm"
            className="mt-2 p-0 h-auto"
            onClick={() => navigate({ to: "/client/prestations" })}
          >
            Voir tous les rendez-vous →
          </Button>
        )}
      </Card>


      {vehicule.contrat_id && vehicule.statut === "actif" && demandeGelEnAttente && (
        <Badge
          variant="outline"
          className="bg-orange-50 text-orange-700 border-orange-200 mb-3"
        >
          <Clock className="h-3 w-3 mr-1" /> Demande de gel en cours
        </Badge>
      )}

      {vehicule.contrat_id && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {vehicule.statut === "actif" ? (
            <>
              <Button variant="default" onClick={() => setRdvOpen(true)}>
                <CalendarPlus className="h-4 w-4" /> Demander un RDV
              </Button>
              <Button
                variant="outline"
                onClick={() => setGelOpen(true)}
                disabled={demandeGelEnAttente}
              >
                <Snowflake className="h-4 w-4" />{" "}
                {demandeGelEnAttente ? "Gel en cours de validation" : "Demander un gel"}
              </Button>
            </>
          ) : vehicule.statut === "gele" ? (
            <>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 justify-center py-2">
                <Snowflake className="h-3.5 w-3.5 mr-1" /> En gel
              </Badge>
              <Button variant="outline" disabled>
                RDV indisponible
              </Button>
            </>
          ) : null}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="izox" className="flex-1" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" /> Modifier
        </Button>
        <Button variant="destructive" className="flex-1" onClick={() => setConfirmOpen(true)}>
          <Trash2 className="h-4 w-4" /> Supprimer
        </Button>
      </div>

      <CreerDemandeRdvDialog
        open={rdvOpen}
        onOpenChange={setRdvOpen}
        defaultVehiculeId={vehicule.id}
        onSubmitted={load}
      />

      {vehicule.contrat_id && profile?.entreprise_id && (
        <DemanderGelDialog
          open={gelOpen}
          onOpenChange={setGelOpen}
          contratId={vehicule.contrat_id}
          entrepriseId={profile.entreprise_id}
          defaultVehiculeId={vehicule.id}
          onSubmitted={load}
        />
      )}

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

      <FacturationPrealableDialog
        state={billingState}
        onClose={() => setBillingState(null)}
        onResolved={() => navigate({ to: "/client/flotte" })}
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
