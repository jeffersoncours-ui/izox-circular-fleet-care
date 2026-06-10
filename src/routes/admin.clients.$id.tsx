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
import { Car, Loader2, Plus, Pencil, Trash2, FileText, Info, Archive, Snowflake, Clock, Printer, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FactureDocument } from "@/components/factures/FactureDocument";
import {
  type Facture,
  type FactureLigne,
  FACTURE_SELECT,
  STATUT_FACTURE,
  formatEuro,
  formatPeriode,
  formatDateFr,
} from "@/lib/factures";
import { PageHeader } from "@/components/ui/page-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { AddVehiculeDialog } from "@/components/client/AddVehiculeDialog";
import { VehiculeThumbnail } from "@/components/client/VehiculeThumbnail";
import { EditEntrepriseDialog } from "@/components/admin/EditEntrepriseDialog";
import { ArchiverEntrepriseDialog } from "@/components/admin/ArchiverEntrepriseDialog";
import { calculerFactureFlotte, getPackLabel } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { supprimerVehicule } from "@/lib/supprimer-vehicule";
import {
  FacturationPrealableDialog,
  type FacturationPrealableState,
} from "@/components/admin/FacturationPrealableDialog";
import { ReassignCommercialDialog } from "@/components/admin/ReassignCommercialDialog";

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
  type_pack_souhaite: string | null;
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
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [nbContratsActifs, setNbContratsActifs] = useState(0);
  const [billingState, setBillingState] = useState<FacturationPrealableState | null>(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [commercialNom, setCommercialNom] = useState<string | null>(null);

  const loadVehicules = useCallback(async () => {
    setLoadingVehicules(true);
    const { data, error } = await supabase
      .from("vehicules")
      .select("id, immatriculation, marque, modele, type_vehicule, annee, couleur, kilometrage, notes, photo_path, statut, type_pack_souhaite")
      .eq("entreprise_id", id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Impossible de charger les véhicules : " + error.message);
    setVehicules((data as Vehicule[]) ?? []);
    setLoadingVehicules(false);
  }, [id]);

  const loadEntreprise = useCallback(async () => {
    setLoadingEntreprise(true);
    const { data, error } = await supabase
      .from("entreprises")
      .select("id, nom, siret, adresse, ville, code_postal, email_contact, telephone, type_client, palier_remise, commercial_id, compte_active")
      .eq("id", id)
      .maybeSingle();
    if (error) toast.error("Impossible de charger l'entreprise : " + error.message);
    setEntreprise((data as Entreprise) ?? null);
    setLoadingEntreprise(false);
  }, [id]);

  useEffect(() => {
    loadEntreprise();
    loadVehicules();
    (async () => {
      const { count } = await supabase
        .from("contrats")
        .select("id", { count: "exact", head: true })
        .eq("entreprise_id", id)
        .in("statut", ["actif", "en_attente_validation"]);
      setNbContratsActifs(count ?? 0);
    })();
  }, [loadEntreprise, loadVehicules, id]);

  useEffect(() => {
    if (!entreprise?.commercial_id) {
      setCommercialNom(null);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("prenom, nom")
        .eq("id", entreprise.commercial_id!)
        .maybeSingle();
      if (error) toast.error("Impossible de charger le commercial : " + error.message);
      setCommercialNom(
        data ? `${data.prenom ?? ""} ${data.nom ?? ""}`.trim() || null : null
      );
    })();
  }, [entreprise?.commercial_id]);

  const handleEdit = (v: Vehicule) => {
    setEditVehicule(v);
    setEditOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const target = deleteTarget;
    const res = await supprimerVehicule(target.id);
    setDeleting(false);
    if (res.needsBilling) {
      setDeleteTarget(null);
      setBillingState(res.needsBilling);
      return;
    }
    if (res.done) {
      setDeleteTarget(null);
      loadVehicules();
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
          <Link to="/admin/clients">Retour à la liste</Link>
        </Button>
        <p className="text-muted-foreground">Client introuvable.</p>
      </div>
    );
  }

  const TYPE_LABEL: Record<string, string> = { vtc: "VTC", location: "Location", pme: "PME" };

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        crumbs={["Clients", entreprise.nom]}
        title={entreprise.nom}
        sub={`${TYPE_LABEL[entreprise.type_client] ?? entreprise.type_client}${entreprise.email_contact ? ` · ${entreprise.email_contact}` : ""}${!entreprise.compte_active ? " · Désactivé" : ""}`}
      />

      <div className="p-6 lg:p-8 max-w-5xl w-full mx-auto flex flex-col gap-4">

      {/* Actions — mêmes bords que les cartes ci-dessous */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[1.6fr_1fr] gap-2 sm:flex sm:justify-end">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Ajouter un véhicule
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditEntrepriseOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setArchiveOpen(true)}
          disabled={nbContratsActifs > 0}
          title={nbContratsActifs > 0 ? "Résilier le contrat avant d'archiver" : "Masquer le client tout en conservant ses données"}
          className="w-full sm:w-auto sm:self-end text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5 disabled:opacity-40"
        >
          <Archive className="h-3.5 w-3.5" /> Archiver
          {nbContratsActifs > 0 && (
            <span className="ml-1 text-[10px] font-normal opacity-70">— contrat actif</span>
          )}
        </Button>
      </div>

      <Card className="p-5 shadow-card border-border/60">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Row label="Email" value={entreprise.email_contact} />
          <Row label="Ville" value={entreprise.ville} />
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Commercial responsable
            </dt>
            <dd className="text-foreground mt-0.5 flex items-center gap-2 flex-wrap">
              <span>
                {commercialNom ?? (
                  <span className="italic text-muted-foreground">Aucun commercial dédié</span>
                )}
              </span>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setReassignOpen(true)}>
                Réassigner
              </Button>
            </dd>
          </div>
        </dl>
      </Card>

      {!loadingVehicules && vehicules.length === 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Comment fonctionne la création de contrat&nbsp;?
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Le contrat de ce client se créera automatiquement dès l'ajout du
                premier véhicule. Vous pourrez ensuite enrichir la flotte au fur
                et à mesure&nbsp;: chaque nouveau véhicule ajustera automatiquement
                le contrat et le palier de remise.
              </p>
            </div>
          </div>
        </Card>
      )}

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
              <VehiculesGroupes
                vehicules={vehicules}
                onEdit={handleEdit}
                onDelete={(v) => setDeleteTarget(v)}
              />
            )}
          </Card>
        </TabsContent>


        <TabsContent value="contrats" className="mt-6">
          <ContratsTab entrepriseId={id} onAddVehicule={() => setAddOpen(true)} />
        </TabsContent>
        <TabsContent value="factures" className="mt-6">
          <FacturesTab entrepriseId={id} />
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

      <ArchiverEntrepriseDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        entrepriseId={entreprise.id}
        entrepriseNom={entreprise.nom}
        hasActiveContrats={nbContratsActifs > 0}
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

      <FacturationPrealableDialog
        state={billingState}
        onClose={() => setBillingState(null)}
        onResolved={() => loadVehicules()}
      />

      <ReassignCommercialDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        entrepriseId={entreprise.id}
        currentCommercialId={entreprise.commercial_id}
        onReassigned={loadEntreprise}
      />
      </div>
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

interface ContratVehicule {
  id: string;
  immatriculation: string;
  statut: string;
  type_pack_souhaite: string | null;
}

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
  vehiculesActifs: ContratVehicule[];
  vehiculesGeles: ContratVehicule[];
  vehiculesEnAttente: ContratVehicule[];
}

function ContratsTab({ entrepriseId, onAddVehicule }: { entrepriseId: string; onAddVehicule: () => void }) {
  const [contrats, setContrats] = useState<ContratItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState<Record<string, boolean>>({});

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
      const baseList = (data ?? []) as any[];
      const vehiculesParContrat = await Promise.all(
        baseList.map((c) =>
          supabase
            .from("vehicules")
            .select("id, immatriculation, statut, type_pack_souhaite")
            .eq("contrat_id", c.id)
        )
      );
      const computed: ContratItem[] = baseList.map((c, idx) => {
        const lignes = (c.lignes ?? []) as Array<{ type_pack: string; nb_vehicules: number }>;
        const facture =
          lignes.length > 0
            ? calculerFactureFlotte({
                lignes: lignes.map((l) => ({ typePack: l.type_pack, nbVehicules: l.nb_vehicules })),
                engagementAnnuel: c.engagement_annuel,
              })
            : null;
        const allV = (vehiculesParContrat[idx].data as ContratVehicule[]) ?? [];
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
          vehiculesActifs: allV.filter((v) => v.statut === "actif"),
          vehiculesGeles: allV.filter((v) => v.statut === "gele"),
          vehiculesEnAttente: allV.filter((v) => v.statut === "en_attente_validation"),
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

  const packLabel = (p: string | null) => (p ? getPackLabel(p) : "Pack non défini");

  if (loading) {
    return (
      <Card className="p-6 shadow-card border-border/60">
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  if (contrats.length === 0) {
    return (
      <Card className="p-8 text-center shadow-card border-border/60">
        <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
        <h3 className="font-semibold text-foreground mb-2">Aucun contrat actif</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          Le contrat de ce client se créera automatiquement dès l'ajout du
          premier véhicule.
        </p>
        <Button variant="izox" onClick={onAddVehicule}>
          <Plus className="h-4 w-4" />
          Ajouter un véhicule
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {contrats.map((c) => {
        const isOpen = !!showDetail[c.id];
        return (
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
                Véhicules
              </p>
              <div className="flex items-center gap-4 flex-wrap text-sm">
                <span>
                  {c.vehiculesActifs.length} véhicule{c.vehiculesActifs.length > 1 ? "s" : ""} actif
                  {c.vehiculesActifs.length > 1 ? "s" : ""}
                </span>
                {c.vehiculesGeles.length > 0 && (
                  <span className="flex items-center gap-1 text-blue-700">
                    <Snowflake className="h-3.5 w-3.5" />
                    {c.vehiculesGeles.length} gelé{c.vehiculesGeles.length > 1 ? "s" : ""}
                  </span>
                )}
                {c.vehiculesEnAttente.length > 0 && (
                  <span className="flex items-center gap-1 text-orange-700">
                    <Clock className="h-3.5 w-3.5" />
                    {c.vehiculesEnAttente.length} en attente
                  </span>
                )}
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
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() =>
                  setShowDetail((prev) => ({ ...prev, [c.id]: !prev[c.id] }))
                }
              >
                {isOpen ? "Masquer le détail" : "Voir le détail"}
              </Button>
            </div>

            {isOpen && (
              <div className="mt-3 pl-3 border-l-2 border-muted text-xs space-y-1">
                {c.vehiculesActifs.length === 0 &&
                  c.vehiculesGeles.length === 0 &&
                  c.vehiculesEnAttente.length === 0 && (
                    <p className="text-muted-foreground">Aucun véhicule rattaché.</p>
                  )}
                {c.vehiculesActifs.map((v) => (
                  <p key={v.id}>
                    ✓ <span className="font-mono">{v.immatriculation}</span> ·{" "}
                    {packLabel(v.type_pack_souhaite)}
                  </p>
                ))}
                {c.vehiculesGeles.map((v) => (
                  <p key={v.id} className="text-blue-700">
                    ❄ <span className="font-mono">{v.immatriculation}</span> ·{" "}
                    {packLabel(v.type_pack_souhaite)} (gelé)
                  </p>
                ))}
                {c.vehiculesEnAttente.map((v) => (
                  <p key={v.id} className="text-orange-700">
                    ⏳ <span className="font-mono">{v.immatriculation}</span> ·{" "}
                    {packLabel(v.type_pack_souhaite)} (en attente)
                  </p>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}


function VehiculesGroupes({
  vehicules,
  onEdit,
  onDelete,
}: {
  vehicules: Vehicule[];
  onEdit: (v: Vehicule) => void;
  onDelete: (v: Vehicule) => void;
}) {
  const actifs = vehicules.filter((v) => v.statut === "actif");
  const geles = vehicules.filter((v) => v.statut === "gele");
  const enAttente = vehicules.filter((v) => v.statut === "en_attente_validation");
  const useAccordion = vehicules.length > 5;

  const renderGrid = (items: Vehicule[]) => (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map((v) => (
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
            {v.type_pack_souhaite && (
              <p className="text-xs text-muted-foreground">
                {getPackLabel(v.type_pack_souhaite)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit(v);
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
                onDelete(v);
              }}
              aria-label="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Link>
      ))}
    </div>
  );

  if (useAccordion) {
    return (
      <Accordion type="multiple" defaultValue={["actifs"]}>
        {actifs.length > 0 && (
          <AccordionItem value="actifs">
            <AccordionTrigger>
              Véhicules actifs ({actifs.length})
            </AccordionTrigger>
            <AccordionContent>{renderGrid(actifs)}</AccordionContent>
          </AccordionItem>
        )}
        {enAttente.length > 0 && (
          <AccordionItem value="en_attente">
            <AccordionTrigger className="text-orange-700">
              En attente de validation ({enAttente.length})
            </AccordionTrigger>
            <AccordionContent>{renderGrid(enAttente)}</AccordionContent>
          </AccordionItem>
        )}
        {geles.length > 0 && (
          <AccordionItem value="geles">
            <AccordionTrigger className="text-blue-700">
              <span className="flex items-center gap-2">
                <Snowflake className="h-4 w-4" />
                Véhicules gelés ({geles.length})
              </span>
            </AccordionTrigger>
            <AccordionContent className="opacity-60">
              {renderGrid(geles)}
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    );
  }

  return (
    <div className="space-y-5">
      {actifs.length > 0 && (
        <section>
          <h3 className="text-sm font-medium mb-2">
            Véhicules actifs ({actifs.length})
          </h3>
          {renderGrid(actifs)}
        </section>
      )}
      {enAttente.length > 0 && (
        <section>
          <h3 className="text-sm font-medium mb-2 text-orange-700">
            En attente de validation ({enAttente.length})
          </h3>
          {renderGrid(enAttente)}
        </section>
      )}
      {geles.length > 0 && (
        <section>
          <h3 className="text-sm font-medium mb-2 text-blue-700 flex items-center gap-2">
            <Snowflake className="h-4 w-4" />
            Véhicules gelés ({geles.length})
          </h3>
          <div className="opacity-60">{renderGrid(geles)}</div>
        </section>
      )}
    </div>
  );
}

// Liste des factures de l'entreprise (vue admin : tous statuts, brouillons inclus).
// Le clic ouvre le détail imprimable dans un Dialog (même composant que le client).
type FactureListItem = Pick<
  Facture,
  | "id"
  | "numero_facture"
  | "statut"
  | "periode_debut"
  | "periode_fin"
  | "date_emission"
  | "montant_ttc"
>;

function FacturesTab({ entrepriseId }: { entrepriseId: string }) {
  const [factures, setFactures] = useState<FactureListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Facture | null>(null);
  const [selectedLignes, setSelectedLignes] = useState<FactureLigne[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("factures")
      .select("id, numero_facture, statut, periode_debut, periode_fin, date_emission, montant_ttc")
      .eq("entreprise_id", entrepriseId)
      .order("date_emission", { ascending: false, nullsFirst: false })
      .order("periode_debut", { ascending: false });
    if (error) toast.error("Impossible de charger les factures : " + error.message);
    setFactures((data as FactureListItem[]) ?? []);
    setLoading(false);
  }, [entrepriseId]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id: string) => {
    setLoadingDetail(true);
    setSelected(null);
    const { data: f } = await supabase
      .from("factures")
      .select(FACTURE_SELECT)
      .eq("id", id)
      .maybeSingle();
    const { data: l } = await supabase
      .from("factures_lignes")
      .select("id, ordre_affichage, type_ligne, libelle, quantite, prix_unitaire_ht, montant_ht, tva_taux")
      .eq("facture_id", id)
      .order("ordre_affichage", { ascending: true });
    setSelected((f as unknown as Facture) ?? null);
    setSelectedLignes((l as FactureLigne[]) ?? []);
    setLoadingDetail(false);
  };

  return (
    <Card className="p-6 shadow-card border-border/60">
      <h2 className="font-semibold text-foreground mb-4">
        Factures {!loading && `(${factures.length})`}
      </h2>

      {loading ? (
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : factures.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune facture générée pour ce client.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {factures.map((f) => {
            const statut = STATUT_FACTURE[f.statut];
            return (
              <li key={f.id}>
                <button
                  onClick={() => openDetail(f.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {f.numero_facture ?? "Brouillon"}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0 ${statut.badge}`}
                      >
                        {statut.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {formatPeriode(f.periode_debut, f.periode_fin)}
                      {f.date_emission && <> · émise le {formatDateFr(f.date_emission)}</>}
                    </p>
                  </div>
                  <p className="font-mono font-semibold text-sm text-foreground tabular-nums shrink-0">
                    {formatEuro(f.montant_ttc)}
                  </p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={loadingDetail || !!selected}
        onOpenChange={(o) => {
          if (!o) {
            setSelected(null);
            setSelectedLignes([]);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="no-print">
            <DialogTitle className="flex items-center justify-between gap-3 pr-6">
              <span>{selected?.numero_facture ?? "Facture"}</span>
              {selected && (
                <Button variant="izox" size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                  Imprimer / PDF
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {loadingDetail || !selected ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <FactureDocument facture={selected} lignes={selectedLignes} />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

