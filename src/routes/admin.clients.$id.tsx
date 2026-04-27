import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ArrowLeft, Car, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AddVehiculeDialog } from "@/components/client/AddVehiculeDialog";

export const Route = createFileRoute("/admin/clients/$id")({
  component: ClientDetailPage,
});

interface Entreprise {
  id: string;
  nom: string;
  ville: string | null;
  email_contact: string | null;
  type_client: string;
  palier_remise: string;
  compte_active: boolean;
}

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
  photo_path: string | null;
  statut: string;
}

function ClientDetailPage() {
  const { id } = useParams({ from: "/admin/clients/$id" });
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [loadingEntreprise, setLoadingEntreprise] = useState(true);
  const [loadingVehicules, setLoadingVehicules] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editVehicule, setEditVehicule] = useState<Vehicule | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vehicule | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadVehicules = useCallback(async () => {
    setLoadingVehicules(true);
    const { data } = await supabase
      .from("vehicules")
      .select("id, immatriculation, marque, modele, type_vehicule, annee, couleur, kilometrage, notes, photo_path, statut")
      .eq("entreprise_id", id)
      .order("created_at", { ascending: false });
    setVehicules((data as Vehicule[]) ?? []);
    setLoadingVehicules(false);
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoadingEntreprise(true);
      const { data } = await supabase
        .from("entreprises")
        .select("id, nom, ville, email_contact, type_client, palier_remise, compte_active")
        .eq("id", id)
        .maybeSingle();
      setEntreprise((data as Entreprise) ?? null);
      setLoadingEntreprise(false);
    })();
    loadVehicules();
  }, [id, loadVehicules]);

  const handleEdit = (v: Vehicule) => {
    setEditVehicule(v);
    setEditOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("vehicules").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Véhicule supprimé");
      setDeleteTarget(null);
      loadVehicules();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setDeleting(false);
    }
  };

  if (loadingEntreprise) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!entreprise) {
    return (
      <div className="p-6 lg:p-10 max-w-5xl mx-auto">
        <Button asChild variant="outline" size="sm" className="mb-6">
          <Link to="/admin/clients">
            <ArrowLeft className="h-4 w-4" /> Retour à la liste
          </Link>
        </Button>
        <p className="text-muted-foreground">Client introuvable.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <Button asChild variant="outline" size="sm" className="mb-6">
        <Link to="/admin/clients">
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </Link>
      </Button>

      <Card className="p-6 shadow-card border-border/60 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{entreprise.nom}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="capitalize">{entreprise.type_client}</Badge>
              {!entreprise.compte_active && <Badge variant="destructive">Désactivé</Badge>}
            </div>
            <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Row label="Email" value={entreprise.email_contact} />
              <Row label="Ville" value={entreprise.ville} />
            </dl>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="vehicules" className="w-full">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="vehicules">Véhicules</TabsTrigger>
          <TabsTrigger value="contrats">Contrats</TabsTrigger>
          <TabsTrigger value="factures">Factures</TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicules" className="mt-6">
          <Card className="p-6 shadow-card border-border/60">
            <div className="flex items-center justify-between mb-4 gap-2">
              <h2 className="font-semibold text-foreground">
                Flotte {!loadingVehicules && `(${vehicules.length})`}
              </h2>
              <Button variant="izox" size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Ajouter un véhicule
              </Button>
            </div>

            {loadingVehicules ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : vehicules.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun véhicule enregistré.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {vehicules.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 p-3 bg-muted rounded-md">
                    <div className="h-10 w-10 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
                      <Car className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {[v.marque, v.modele].filter(Boolean).join(" ") || "Véhicule"}
                      </p>
                      <p className="font-mono text-xs text-primary">{v.immatriculation}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleEdit(v)}
                        aria-label="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(v)}
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="contrats" className="mt-6">
          <ComingSoon />
        </TabsContent>
        <TabsContent value="factures" className="mt-6">
          <ComingSoon />
        </TabsContent>
        <TabsContent value="interventions" className="mt-6">
          <ComingSoon />
        </TabsContent>
      </Tabs>

      <AddVehiculeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={loadVehicules}
        entrepriseId={id}
      />

      <AddVehiculeDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditVehicule(null);
        }}
        onCreated={loadVehicules}
        entrepriseId={id}
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

function ComingSoon() {
  return (
    <Card className="p-12 text-center shadow-card border-border/60">
      <p className="text-muted-foreground">Bientôt disponible</p>
    </Card>
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
