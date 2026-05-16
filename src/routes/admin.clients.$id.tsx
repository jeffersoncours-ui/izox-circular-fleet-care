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
import { ArrowLeft, Car, Loader2, Plus, Pencil, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { AddVehiculeDialog } from "@/components/client/AddVehiculeDialog";
import { VehiculeThumbnail } from "@/components/client/VehiculeThumbnail";
import { EditEntrepriseDialog } from "@/components/admin/EditEntrepriseDialog";
import { calculerFactureFlotte, getPackLabel } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/clients/$id")({
  component: ClientDetailPage,
});

interface Entreprise {
  id: string;
  nom: string;
  siret: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  email_contact: string | null;
  telephone: string | null;
  type_client: string;
  palier_remise: string;
  commercial_id: string | null;
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
  const [editEntrepriseOpen, setEditEntrepriseOpen] = useState(false);

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

  const loadEntreprise = useCallback(async () => {
    setLoadingEntreprise(true);
    const { data } = await supabase
      .from("entreprises")
      .select("id, nom, siret, adresse, ville, code_postal, email_contact, telephone, type_client, palier_remise, commercial_id, compte_active")
      .eq("id", id)
      .maybeSingle();
    setEntreprise((data as Entreprise) ?? null);
    setLoadingEntreprise(false);
  }, [id]);

  useEffect(() => {
    loadEntreprise();
    loadVehicules();
  }, [loadEntreprise, loadVehicules]);

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
          <Button variant="outline" size="sm" onClick={() => setEditEntrepriseOpen(true)}>
            <Pencil className="h-4 w-4" /> Modifier
          </Button>
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
                  <Link
                    key={v.id}
                    to="/admin/vehicules/$id"
                    params={{ id: v.id }}
                    className="flex items-center gap-3 p-3 bg-muted rounded-md transition-colors hover:bg-muted/70"
                  >
                    <VehiculeThumbnail
                      photoPath={v.photo_path}
                      alt={[v.marque, v.modele].filter(Boolean).join(" ") || v.immatriculation}
                    />
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
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEdit(v);
                        }}
                        aria-label="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteTarget(v);
                        }}
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="contrats" className="mt-6">
          <ContratsTab entrepriseId={id} />
        </TabsContent>
        <TabsContent value="factures" className="mt-6">
          <ComingSoon />
        </TabsContent>
        <TabsContent value="interventions" className="mt-6">
          <ComingSoon />
        </TabsContent>
      </Tabs>

      <EditEntrepriseDialog
        open={editEntrepriseOpen}
        onOpenChange={setEditEntrepriseOpen}
        entreprise={entreprise}
        onUpdated={loadEntreprise}
      />

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


const PALIER_LABEL: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
  premium: "Premium",
};

const PALIER_BADGE: Record<string, string> = {
  starter: "bg-muted text-muted-foreground",
  pro: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  business: "bg-primary/15 text-primary",
  premium: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
};

const STATUT_LABEL: Record<string, string> = {
  actif: "Actif",
  en_cours_gel: "Gelé",
  resilie: "Résilié",
};

const STATUT_BADGE: Record<string, string> = {
  actif: "bg-primary/15 text-primary",
  en_cours_gel: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  resilie: "bg-destructive/15 text-destructive",
};

interface ContratItem {
  id: string;
  numero_contrat: string | null;
  statut: string;
  date_debut: string | null;
  date_anniversaire: string | null;
  engagement_annuel: boolean;
  lignes: Array<{ type_pack: string; nb_vehicules: number }>;
  mensualiteNetteHt: number;
  palier: string;
}

function ContratsTab({ entrepriseId }: { entrepriseId: string }) {
  const [contrats, setContrats] = useState<ContratItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("contrats")
        .select(
          `id, numero_contrat, statut, date_debut, date_anniversaire, engagement_annuel,
           lignes:contrat_lignes ( type_pack, nb_vehicules )`
        )
        .eq("entreprise_id", entrepriseId)
        .order("date_debut", { ascending: false });
      if (error) {
        toast.error("Erreur de chargement des contrats");
        setLoading(false);
        return;
      }
      const computed: ContratItem[] = (data ?? []).map((c: any) => {
        const lignes = (c.lignes ?? []) as Array<{ type_pack: string; nb_vehicules: number }>;
        const facture =
          lignes.length > 0
            ? calculerFactureFlotte({
                lignes: lignes.map((l) => ({ typePack: l.type_pack, nbVehicules: l.nb_vehicules })),
                engagementAnnuel: c.engagement_annuel,
              })
            : null;
        return {
          id: c.id,
          numero_contrat: c.numero_contrat,
          statut: c.statut,
          date_debut: c.date_debut,
          date_anniversaire: c.date_anniversaire,
          engagement_annuel: c.engagement_annuel,
          lignes,
          mensualiteNetteHt: facture?.totalAbonnementHt ?? 0,
          palier: facture?.palier ?? "starter",
        };
      });
      setContrats(computed);
      setLoading(false);
    })();
  }, [entrepriseId]);

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("fr-FR");
    } catch {
      return d;
    }
  };

  if (loading) {
    return (
      <Card className="p-6 shadow-card border-border/60">
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  if (contrats.length === 0) {
    return (
      <Card className="p-12 text-center shadow-card border-border/60">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          Aucun contrat actif pour ce client. Créez-en un depuis{" "}
          <Link to="/admin/contrats" className="text-primary underline">
            /admin/contrats
          </Link>
          .
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {contrats.map((c) => (
        <Card key={c.id} className="p-5 shadow-card border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">
                  {c.numero_contrat ?? "Sans numéro"}
                </h3>
                <Badge className={cn(STATUT_BADGE[c.statut] ?? "")}>
                  {STATUT_LABEL[c.statut] ?? c.statut}
                </Badge>
                <Badge className={cn(PALIER_BADGE[c.palier])}>{PALIER_LABEL[c.palier]}</Badge>
                {c.engagement_annuel && (
                  <Badge variant="outline" className="text-[10px]">
                    Engagement annuel
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Début : {formatDate(c.date_debut)} · Anniversaire :{" "}
                {formatDate(c.date_anniversaire)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Mensualité nette HT</p>
              <p className="text-2xl font-bold text-primary tabular-nums">
                {c.mensualiteNetteHt.toFixed(2)} €
              </p>
            </div>
          </div>

          <div className="border-t pt-3 mb-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">
              Packs
            </p>
            <ul className="space-y-1 text-sm">
              {c.lignes.length === 0 ? (
                <li className="text-muted-foreground">—</li>
              ) : (
                c.lignes.map((l, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span>{getPackLabel(l.type_pack)}</span>
                    <span className="font-medium tabular-nums">×{l.nb_vehicules} véh.</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Détail contrat — bientôt disponible.")}
            >
              <FileText className="h-4 w-4" /> Voir le détail
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

