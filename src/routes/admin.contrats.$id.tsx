import { createFileRoute, Link, useNavigate, useParams, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { calculerFactureFlotte, getPalier, getPackLabel } from "@/lib/pricing";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Calendar as CalendarIcon,
  CreditCard,
  Edit,
  FileText,
  Loader2,
  Pause,
  Plus,
  Check,
  X,
  History,
  AlertTriangle,
  Repeat,
  Snowflake,
  RotateCcw,
  FileSignature,
  Sun,
  Archive,
  Wrench,
  CalendarClock,
  Receipt,
  Activity,
} from "lucide-react";

import { CreateContratDialog } from "@/components/admin/CreateContratDialog";
import { ResiliationContratDialog } from "@/components/admin/ResiliationContratDialog";
import { GelContratDialog } from "@/components/admin/GelContratDialog";
import { ReactiverContratDialog } from "@/components/admin/ReactiverContratDialog";
import { GelInfoBanner } from "@/components/admin/GelInfoBanner";
import { VehiculeThumbnail } from "@/components/client/VehiculeThumbnail";

export const Route = createFileRoute("/admin/contrats/$id")({
  component: ContratDetailPage,
});


const PALIER_BADGE: Record<string, string> = {
  starter: "bg-muted text-muted-foreground",
  pro: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  business: "bg-primary/15 text-primary",
  premium: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
};

const PALIER_LABEL: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
  premium: "Premium",
};

const STATUT_LABEL: Record<string, string> = {
  actif: "Actif",
  en_cours_gel: "Gelé",
  resilie: "Résilié",
};

const MODE_PAIEMENT_LABEL: Record<string, string> = {
  sepa: "Prélèvement SEPA",
  virement: "Virement",
  stripe: "Carte bancaire (Stripe)",
};

interface Contrat {
  id: string;
  numero_contrat: string | null;
  statut: string;
  date_debut: string;
  date_fin: string | null;
  date_anniversaire: string | null;
  mode_paiement: "sepa" | "virement" | "stripe";
  engagement_annuel: boolean;
  passages_mois: number;
  passages_restants_mois: number;
  passages_reportes: number;
  entreprise_id: string;
  gel_actif: boolean;
  gel_type: "programme" | "sinistre" | null;
  gel_date_debut: string | null;
  gel_date_fin: string | null;
  gel_commentaire: string | null;
  gel_notifier_client: boolean;
  entreprise: { id: string; nom: string } | null;
  lignes: Array<{ type_pack: string; nb_vehicules: number }>;
}

interface Vehicule {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  photo_path: string | null;
  statut: string;
  type_pack_souhaite: string | null;
  contrat_id: string | null;
}

interface LogEntry {
  id: string;
  action: string;
  created_at: string;
  user_id: string | null;
  details: any;
  user_label?: string;
  author_kind?: "interne" | "client" | "systeme";
  author_role?: string | null;
}

const SYSTEM_ACTIONS = new Set([
  "cloture_mensuelle",
  "bascule_automatique_remplacement",
]);

const ROLE_LABEL: Record<string, string> = {
  admin: "admin",
  staff: "staff",
  commercial: "commercial",
  operateur: "opérateur",
  client: "client",
};

function ContratDetailPage() {
  const { id } = useParams({ from: "/admin/contrats/$id" });
  const navigate = useNavigate();
  const router = useRouter();

  const [contrat, setContrat] = useState<Contrat | null>(null);
  const [vehiculesActifs, setVehiculesActifs] = useState<Vehicule[]>([]);
  const [vehiculesEnAttente, setVehiculesEnAttente] = useState<Vehicule[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [resilOpen, setResilOpen] = useState(false);
  const [gelDialogOpen, setGelDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);

  const [validateVeh, setValidateVeh] = useState<Vehicule | null>(null);
  const [refuseVeh, setRefuseVeh] = useState<Vehicule | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const { data: c, error } = await supabase
      .from("contrats")
      .select(
        `id, numero_contrat, statut, date_debut, date_fin, date_anniversaire,
         mode_paiement, engagement_annuel, passages_mois, passages_restants_mois,
         passages_reportes, entreprise_id,
         gel_actif, gel_type, gel_date_debut, gel_date_fin, gel_commentaire, gel_notifier_client,
         entreprise:entreprises ( id, nom ),
         lignes:contrat_lignes ( type_pack, nb_vehicules )`
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !c) {
      toast.error("Contrat introuvable");
      setLoading(false);
      return;
    }

    setContrat(c as unknown as Contrat);

    // Vehicules liés au contrat (actifs)
    const { data: vehAct } = await supabase
      .from("vehicules")
      .select("id, immatriculation, marque, modele, photo_path, statut, type_pack_souhaite, contrat_id")
      .eq("contrat_id", id)
      .eq("statut", "actif");

    setVehiculesActifs((vehAct as Vehicule[]) ?? []);

    // Vehicules en attente de la même entreprise
    const { data: vehAtt } = await supabase
      .from("vehicules")
      .select("id, immatriculation, marque, modele, photo_path, statut, type_pack_souhaite, contrat_id")
      .eq("entreprise_id", (c as any).entreprise_id)
      .eq("statut", "en_attente_validation");

    setVehiculesEnAttente((vehAtt as Vehicule[]) ?? []);

    // Historique
    const { data: logsData } = await supabase
      .from("admin_actions_log")
      .select("id, action, created_at, user_id, details")
      .filter("details->>contrat_id", "eq", id)
      .order("created_at", { ascending: false });

    const baseLogs = (logsData as LogEntry[]) ?? [];
    const userIds = Array.from(
      new Set(baseLogs.map((l) => l.user_id).filter((x): x is string => !!x))
    );
    const profilesMap: Record<
      string,
      { name: string; entreprise_id: string | null }
    > = {};
    const rolesMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const [{ data: profs }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, prenom, nom, entreprise_id")
          .in("id", userIds),
        supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
      ]);
      for (const p of (profs as any[]) ?? []) {
        profilesMap[p.id] = {
          name: `${p.prenom ?? ""} ${p.nom ?? ""}`.trim() || "Utilisateur",
          entreprise_id: p.entreprise_id ?? null,
        };
      }
      for (const r of (roles as any[]) ?? []) {
        rolesMap[r.user_id] = r.role;
      }
    }
    const contratEntrepriseId = (c as any).entreprise_id as string;
    setLogs(
      baseLogs.map((l) => {
        if (SYSTEM_ACTIONS.has(l.action) && !l.user_id) {
          return {
            ...l,
            author_kind: "systeme",
            user_label: "automatique (système)",
          };
        }
        if (!l.user_id) {
          return {
            ...l,
            author_kind: "systeme",
            user_label: "automatique (système)",
          };
        }
        const prof = profilesMap[l.user_id];
        const role = rolesMap[l.user_id];
        const name = prof?.name ?? "Utilisateur";
        if (role && role !== "client") {
          return {
            ...l,
            author_kind: "interne",
            author_role: role,
            user_label: `par ${name} (${ROLE_LABEL[role] ?? role})`,
          };
        }
        // client of this entreprise
        if (prof?.entreprise_id && prof.entreprise_id === contratEntrepriseId) {
          return {
            ...l,
            author_kind: "client",
            author_role: "client",
            user_label: `par le client ${name}`,
          };
        }
        return {
          ...l,
          author_kind: "interne",
          author_role: role ?? null,
          user_label: `par ${name}${role ? ` (${ROLE_LABEL[role] ?? role})` : ""}`,
        };
      })
    );

    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const facture = useMemo(() => {
    if (!contrat || contrat.lignes.length === 0) return null;
    return calculerFactureFlotte({
      lignes: contrat.lignes.map((l) => ({
        typePack: l.type_pack,
        nbVehicules: l.nb_vehicules,
      })),
      engagementAnnuel: contrat.engagement_annuel,
    });
  }, [contrat]);

  const palier = facture?.palier ?? "starter";
  const totalVehLignes = contrat?.lignes.reduce((s, l) => s + l.nb_vehicules, 0) ?? 0;

  const goBack = () => {
    if (window.history.length > 1) router.history.back();
    else navigate({ to: "/admin/contrats" });
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!contrat) {
    return (
      <div className="p-6 lg:p-10 max-w-3xl mx-auto">
        <Button variant="outline" size="sm" className="mb-6" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
        <p className="text-muted-foreground">Contrat introuvable.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto">
      <Button variant="outline" size="sm" className="mb-6" onClick={goBack}>
        <ArrowLeft className="h-4 w-4" /> Retour
      </Button>

      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {contrat.numero_contrat ?? "Contrat sans numéro"}
          </h1>
          {contrat.entreprise && (
            <Link
              to="/admin/clients/$id"
              params={{ id: contrat.entreprise.id }}
              className="text-primary hover:underline text-sm inline-flex items-center gap-1.5 mt-1"
            >
              <Building2 className="h-4 w-4" />
              {contrat.entreprise.nom}
            </Link>
          )}
        </div>
        <Badge
          variant={contrat.statut === "actif" ? "default" : "secondary"}
          className="self-start sm:self-auto"
        >
          {STATUT_LABEL[contrat.statut] ?? contrat.statut}
        </Badge>
      </header>

      {contrat.gel_actif && (
        <GelInfoBanner
          gelType={contrat.gel_type}
          gelDateDebut={contrat.gel_date_debut}
          gelDateFin={contrat.gel_date_fin}
          gelCommentaire={contrat.gel_commentaire}
          gelNotifierClient={contrat.gel_notifier_client}
          onReactivateClick={() => setReactivateDialogOpen(true)}
        />
      )}

      <Tabs defaultValue="infos" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="infos">Infos générales</TabsTrigger>
          <TabsTrigger value="vehicules">
            Véhicules
            {vehiculesEnAttente.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 text-[10px]">
                {vehiculesEnAttente.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
          <TabsTrigger value="factures">Factures</TabsTrigger>
        </TabsList>

        {/* INFOS */}
        <TabsContent value="infos" className="mt-6 space-y-5">
          <Card className="p-5 shadow-card border-border/60">
            <h2 className="font-semibold text-foreground mb-4">Détails du contrat</h2>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <Field
                icon={<FileText className="h-4 w-4" />}
                label="Numéro contrat"
                value={contrat.numero_contrat ?? "—"}
              />
              <Field
                icon={<CalendarIcon className="h-4 w-4" />}
                label="Date de début"
                value={format(new Date(contrat.date_debut), "d MMMM yyyy", { locale: fr })}
              />
              <Field
                icon={<CalendarIcon className="h-4 w-4" />}
                label="Date d'anniversaire"
                value={
                  contrat.date_anniversaire
                    ? format(new Date(contrat.date_anniversaire), "d MMMM yyyy", { locale: fr })
                    : "—"
                }
              />
              <Field
                icon={<CreditCard className="h-4 w-4" />}
                label="Mode de paiement"
                value={MODE_PAIEMENT_LABEL[contrat.mode_paiement] ?? contrat.mode_paiement}
              />
              <Field
                icon={<Check className="h-4 w-4" />}
                label="Engagement annuel"
                value={contrat.engagement_annuel ? "Oui (-5%)" : "Non"}
              />
              <Field
                icon={<Repeat className="h-4 w-4" />}
                label="Passages restants ce mois"
                value={`${contrat.passages_restants_mois} / ${contrat.passages_mois}`}
              />
            </dl>
          </Card>

          <Card className="p-5 shadow-card border-border/60 bg-primary/5 border-primary/30">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Mensualité nette HT
                </p>
                <p className="text-3xl font-bold text-primary tabular-nums mt-1">
                  {(facture?.totalAbonnementHt ?? 0).toFixed(2)} €
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalVehLignes} véhicule{totalVehLignes > 1 ? "s" : ""} contractualisé
                  {totalVehLignes > 1 ? "s" : ""}
                </p>
              </div>
              <Badge className={cn("text-sm py-1 px-3", PALIER_BADGE[palier])}>
                Palier : {PALIER_LABEL[palier]}
              </Badge>
            </div>
            {facture && (
              <div className="mt-4 pt-4 border-t border-primary/20 space-y-1.5 text-sm">
                {facture.lignesDetail
                  .filter((l) => l.type !== "total")
                  .map((l, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex justify-between gap-2",
                        l.type === "remise" && "text-primary"
                      )}
                    >
                      <span className="truncate">{l.label}</span>
                      <span className="tabular-nums shrink-0">{l.montant.toFixed(2)} €</span>
                    </div>
                  ))}
              </div>
            )}
          </Card>

          {(contrat.statut === "actif" || contrat.statut === "en_cours_gel") && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="izox" className="flex-1" onClick={() => setEditOpen(true)}>
                <Edit className="h-4 w-4" /> Modifier le contrat
              </Button>
              {contrat.statut === "actif" && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setGelDialogOpen(true)}
                >
                  <Snowflake className="h-4 w-4" /> Mettre en veille
                </Button>
              )}
              {contrat.statut === "en_cours_gel" && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setReactivateDialogOpen(true)}
                >
                  <RotateCcw className="h-4 w-4" /> Réactiver le contrat
                </Button>
              )}
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => setResilOpen(true)}
              >
                <X className="h-4 w-4" /> Résilier ce contrat
              </Button>
            </div>
          )}
        </TabsContent>

        {/* VEHICULES */}
        <TabsContent value="vehicules" className="mt-6 space-y-6">
          <section>
            <h2 className="font-semibold text-foreground mb-3">
              Véhicules couverts ({vehiculesActifs.length})
            </h2>
            {vehiculesActifs.length === 0 ? (
              <Card className="p-6 text-center shadow-card border-border/60">
                <p className="text-sm text-muted-foreground">
                  Aucun véhicule actif rattaché à ce contrat.
                </p>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {vehiculesActifs.map((v) => (
                  <Link
                    key={v.id}
                    to="/admin/vehicules/$id"
                    params={{ id: v.id }}
                    className="block"
                  >
                    <Card className="p-3 shadow-card border-border/60 hover:border-primary/60 hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        <VehiculeThumbnail photoPath={v.photo_path} alt={v.immatriculation} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {v.marque} {v.modele}
                          </p>
                          <p className="font-mono text-xs text-primary">{v.immatriculation}</p>
                          {v.type_pack_souhaite && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {getPackLabel(v.type_pack_souhaite)}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              Demandes en attente
              {vehiculesEnAttente.length > 0 && (
                <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  {vehiculesEnAttente.length}
                </Badge>
              )}
            </h2>
            {vehiculesEnAttente.length === 0 ? (
              <Card className="p-6 text-center shadow-card border-border/60">
                <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {vehiculesEnAttente.map((v) => (
                  <Card
                    key={v.id}
                    className="p-4 shadow-card border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20"
                  >
                    <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                      <VehiculeThumbnail photoPath={v.photo_path} alt={v.immatriculation} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {v.marque} {v.modele}
                        </p>
                        <p className="font-mono text-xs text-primary">{v.immatriculation}</p>
                        <Badge className="mt-1.5 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 text-[10px]">
                          En attente de validation
                        </Badge>
                        {v.type_pack_souhaite && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Pack souhaité : {getPackLabel(v.type_pack_souhaite)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          variant="izox"
                          size="sm"
                          className="flex-1 sm:flex-none"
                          onClick={() => setValidateVeh(v)}
                        >
                          <Check className="h-4 w-4" /> Valider
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1 sm:flex-none"
                          onClick={() => setRefuseVeh(v)}
                        >
                          <X className="h-4 w-4" /> Refuser
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        {/* HISTORIQUE */}
        <TabsContent value="historique" className="mt-6">
          <Card className="p-5 shadow-card border-border/60">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <History className="h-5 w-5" /> Timeline des modifications
            </h2>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucune modification enregistrée.
              </p>
            ) : (
              <ol className="relative border-l-2 border-border/60 ml-3 space-y-5">
                {logs.map((l) => (
                  <TimelineItem
                    key={l.id}
                    log={l}
                    currentVehiculeCount={totalVehLignes}
                    hasModifications={logs.some(
                      (x) => x.action === "modification_contrat"
                    )}
                  />
                ))}
              </ol>
            )}
          </Card>
        </TabsContent>

        {/* FACTURES */}
        <TabsContent value="factures" className="mt-6">
          <Card className="p-12 text-center shadow-card border-border/60">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Bientôt disponible</p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <CreateContratDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onCreated={load}
        contrat={
          contrat
            ? {
                id: contrat.id,
                numero_contrat: contrat.numero_contrat,
                entreprise_id: contrat.entreprise_id,
                entreprise_nom: contrat.entreprise?.nom ?? null,
                date_debut: contrat.date_debut,
                date_anniversaire: contrat.date_anniversaire,
                engagement_annuel: contrat.engagement_annuel,
                mode_paiement: contrat.mode_paiement,
                lignes: contrat.lignes.map((l) => ({
                  type_pack: l.type_pack as "pack_interieur" | "pack_standard" | "pack_vtc",
                  nb_vehicules: l.nb_vehicules,
                })),
              }
            : null
        }
      />

      {/* Resiliation dialog (shared) */}
      <ResiliationContratDialog
        open={resilOpen}
        onOpenChange={setResilOpen}
        contrat={
          contrat
            ? {
                id: contrat.id,
                numero_contrat: contrat.numero_contrat,
                entreprise_id: contrat.entreprise_id,
                entreprise_nom: contrat.entreprise?.nom ?? null,
                engagement_annuel: contrat.engagement_annuel,
                lignes: contrat.lignes,
              }
            : null
        }
        onResiliated={() => {
          load();
          navigate({ to: "/admin/contrats" });
        }}
      />

      {/* Gel (mise en veille) dialog */}
      <GelContratDialog
        open={gelDialogOpen}
        onOpenChange={setGelDialogOpen}
        contrat={
          contrat
            ? {
                id: contrat.id,
                numero_contrat: contrat.numero_contrat,
                raison_sociale_client: contrat.entreprise?.nom ?? "Client inconnu",
              }
            : null
        }
        onGeled={() => {
          load();
        }}
      />

      {/* Réactivation dialog */}
      <ReactiverContratDialog
        open={reactivateDialogOpen}
        onOpenChange={setReactivateDialogOpen}
        contrat={
          contrat
            ? {
                id: contrat.id,
                numero_contrat: contrat.numero_contrat,
                raison_sociale_client: contrat.entreprise?.nom ?? "Client inconnu",
                gel_date_debut: contrat.gel_date_debut ?? null,
                gel_date_fin: contrat.gel_date_fin ?? null,
                gel_commentaire: contrat.gel_commentaire ?? null,
              }
            : null
        }
        onReactivated={() => {
          load();
        }}
      />

      {/* Validation dialog */}
      {validateVeh && (
        <ValidateVehiculeDialog
          vehicule={validateVeh}
          contrat={contrat}
          totalActifs={vehiculesActifs.length}
          onClose={() => setValidateVeh(null)}
          onDone={load}
        />
      )}

      {/* Refusal dialog */}
      {refuseVeh && (
        <RefuseVehiculeDialog
          vehicule={refuseVeh}
          contrat={contrat}
          onClose={() => setRefuseVeh(null)}
          onDone={load}
        />
      )}
    </div>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="text-primary mt-0.5">{icon}</div>
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
          {label}
        </dt>
        <dd className="text-foreground mt-0.5 font-medium">{value}</dd>
      </div>
    </div>
  );
}

function TimelineItem({
  log,
  currentVehiculeCount,
  hasModifications,
}: {
  log: LogEntry;
  currentVehiculeCount: number;
  hasModifications: boolean;
}) {
  const meta = getActionMeta(log, currentVehiculeCount, hasModifications);
  const Icon = meta.icon;
  return (
    <li className="ml-6">
      <span
        className={cn(
          "absolute -left-[13px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background",
          meta.colorClass
        )}
      >
        <Icon className="h-3 w-3" />
      </span>
      <div className="flex flex-wrap items-baseline gap-2">
        <p className="font-medium text-sm text-foreground">{meta.title}</p>
        <time className="text-xs text-muted-foreground">
          {format(new Date(log.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
        </time>
      </div>
      {meta.subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5">{meta.subtitle}</p>
      )}
      {meta.note && (
        <p className="text-[11px] text-muted-foreground/80 italic mt-0.5">
          {meta.note}
        </p>
      )}
      <p className="text-[11px] text-muted-foreground mt-0.5">{log.user_label}</p>
    </li>
  );
}

function getActionMeta(
  log: LogEntry,
  currentVehiculeCount: number,
  hasModifications: boolean
): {
  icon: typeof Plus;
  title: string;
  subtitle?: string;
  note?: string;
  colorClass: string;
} {
  const d = log.details ?? {};

  const safeFormat = (iso: unknown, fmt: string): string | null => {
    if (typeof iso !== "string" || !iso) return null;
    try {
      return format(parseISO(iso), fmt, { locale: fr });
    } catch {
      return null;
    }
  };

  switch (log.action) {
    case "creation_contrat": {
      const palierLabel = d.palier ? PALIER_LABEL[d.palier] ?? d.palier : "Starter";
      const nb = d.nb_vehicules_initial ?? d.nb_vehicules;
      const subtitle =
        nb != null
          ? `${nb} véhicule(s) — Palier ${palierLabel}`
          : !hasModifications && currentVehiculeCount > 0
          ? `${currentVehiculeCount} véhicule(s)¹ — Palier ${palierLabel}`
          : "Création initiale";
      const note =
        typeof d.total_ht === "number"
          ? `Mensualité de référence : ${d.total_ht.toFixed(2)} € HT`
          : nb == null && !hasModifications && currentVehiculeCount > 0
          ? "¹ Reconstitué depuis l'état actuel (aucune modification depuis la création)"
          : undefined;
      return {
        icon: FileSignature,
        title: "Initialisation du contrat",
        subtitle,
        note,
        colorClass: "bg-primary/10 text-primary border border-primary/20",
      };
    }
    case "modification_contrat":
      return {
        icon: Edit,
        title: "Ajustement de flotte",
        subtitle: summarizeChanges(d),
        colorClass: "bg-muted text-foreground border border-border",
      };
    case "remplacement_vehicule":
      return {
        icon: Repeat,
        title: "Remplacement véhicule",
        subtitle: d.ancien_immat
          ? `${d.ancien_immat} → ${d.nouveau_immat ?? "—"}`
          : undefined,
        colorClass: "bg-muted text-foreground border border-border",
      };
    case "validation_vehicule_attente": {
      const ap = d.palier_apres;
      const av = d.palier_avant;
      const palierInfo =
        av && ap && av !== ap
          ? ` · Palier ${PALIER_LABEL[ap] ?? ap} (était ${PALIER_LABEL[av] ?? av})`
          : "";
      return {
        icon: Check,
        title: "Validation véhicule",
        subtitle: d.vehicule_immat
          ? `${d.vehicule_immat} accepté dans la flotte${palierInfo}`
          : "Véhicule validé",
        colorClass: "bg-primary/10 text-primary border border-primary/20",
      };
    }
    case "bascule_automatique_remplacement":
      return {
        icon: Repeat,
        title: "Bascule automatique",
        subtitle:
          d.ancien_immat && d.nouveau_immat
            ? `${d.ancien_immat} → ${d.nouveau_immat}`
            : d.ancien_immat
            ? `${d.ancien_immat} archivé`
            : undefined,
        colorClass: "bg-muted text-muted-foreground border border-border",
      };
    case "refus_vehicule_attente":
      return {
        icon: X,
        title: "Refus véhicule",
        subtitle: d.vehicule_immat
          ? `${d.vehicule_immat} non validé`
          : "Véhicule non validé",
        note: d.motif ? `Motif : ${d.motif}` : undefined,
        colorClass: "bg-muted text-muted-foreground border border-border",
      };
    case "gel_contrat": {
      const gelType = d.gel_type ?? "programme";
      const dateDebut = safeFormat(d.gel_date_debut, "d MMMM yyyy");
      const dateFin = safeFormat(d.gel_date_fin, "d MMMM yyyy");
      const dureeIndeterminee = d.duree_indeterminee ?? false;
      const commentaire = d.commentaire;
      const periode =
        dateDebut && dateFin
          ? `Du ${dateDebut} au ${dateFin}`
          : dateDebut && dureeIndeterminee
          ? `À partir du ${dateDebut} (durée indéterminée)`
          : dateDebut
          ? `À partir du ${dateDebut}`
          : "Période non précisée";
      return {
        icon: gelType === "sinistre" ? Wrench : Snowflake,
        title:
          gelType === "sinistre"
            ? "Mise en veille — Sinistre"
            : "Mise en veille temporaire",
        subtitle: periode,
        note: commentaire ? `« ${commentaire} »` : undefined,
        colorClass:
          gelType === "sinistre"
            ? "bg-muted text-foreground border border-border"
            : "bg-primary/10 text-primary border border-primary/20",
      };
    }
    case "reactivation_contrat": {
      const debut = safeFormat(d.gel_date_debut_origine, "d MMM");
      const fin = safeFormat(d.gel_date_fin_origine, "d MMM yyyy");
      const dureeGel = debut && fin ? `Période de veille : ${debut} → ${fin}` : undefined;
      return {
        icon: Sun,
        title: "Reprise du contrat",
        subtitle: "Sortie de mise en veille",
        note: dureeGel,
        colorClass: "bg-primary/10 text-primary border border-primary/20",
      };
    }
    case "resiliation_contrat": {
      const dateRes = safeFormat(d.date_resiliation, "d MMMM yyyy");
      return {
        icon: Archive,
        title: "Clôture du contrat",
        subtitle: dateRes ? `Effective le ${dateRes}` : "Contrat clôturé",
        note: d.motif ? `Motif : ${d.motif}` : undefined,
        colorClass: "bg-muted text-muted-foreground border border-border",
      };
    }
    case "cloture_mensuelle":
      return {
        icon: Receipt,
        title: "Clôture mensuelle",
        subtitle:
          d.passages_reportes != null
            ? `${d.passages_reportes} passage(s) reporté(s)`
            : undefined,
        colorClass: "bg-primary/10 text-primary border border-primary/20",
      };
    case "cron_maintenance_quotidienne": {
      const nbDormants = d.nb_dormants_detectes ?? 0;
      const nbActives = d.nb_onboarding_basculees_actif ?? 0;
      const nbPreavis = d.nb_preavis_echus ?? 0;
      const total = nbDormants + nbActives + nbPreavis;
      const recap =
        total === 0
          ? "Aucun événement à signaler"
          : [
              nbDormants > 0 ? `${nbDormants} dormant(s)` : null,
              nbActives > 0 ? `${nbActives} activation(s)` : null,
              nbPreavis > 0 ? `${nbPreavis} préavis` : null,
            ]
              .filter(Boolean)
              .join(" · ");
      return {
        icon: Activity,
        title: "Maintenance quotidienne",
        subtitle: recap,
        colorClass: "bg-muted text-muted-foreground border border-border",
      };
    }
    default:
      return {
        icon: History,
        title: log.action.replace(/_/g, " "),
        colorClass: "bg-muted text-muted-foreground border border-border",
      };
  }
}

function summarizeChanges(d: any): string | undefined {
  // Nouveau format : snapshots fiables lignes_avant / lignes_apres
  const hasSnapshot = Array.isArray(d?.lignes_avant) && Array.isArray(d?.lignes_apres);
  if (!hasSnapshot) {
    // Modifications legacy : pas de snapshot fiable -> on n'affiche pas de diff (faux)
    return undefined;
  }


  const aL: Array<{ type_pack: string; nb_vehicules: number }> = d.lignes_avant;
  const nL: Array<{ type_pack: string; nb_vehicules: number }> = d.lignes_apres;
  const aMap = new Map<string, number>();
  for (const l of aL) aMap.set(l.type_pack, (aMap.get(l.type_pack) ?? 0) + l.nb_vehicules);
  const nMap = new Map<string, number>();
  for (const l of nL) nMap.set(l.type_pack, (nMap.get(l.type_pack) ?? 0) + l.nb_vehicules);

  const parts: string[] = [];
  const allKeys = new Set([...aMap.keys(), ...nMap.keys()]);
  for (const k of allKeys) {
    const av = aMap.get(k) ?? 0;
    const nv = nMap.get(k) ?? 0;
    if (av === nv) continue;
    const label = PACK[k] ?? k;
    if (av === 0 && nv > 0) {
      parts.push(`+ ligne ${label} × ${nv} véhicule(s)`);
    } else if (nv === 0 && av > 0) {
      parts.push(`− ligne ${label} × ${av} véhicule(s)`);
    } else {
      const diff = nv - av;
      const sign = diff > 0 ? "+" : "−";
      parts.push(`${sign}${Math.abs(diff)} véhicule(s) ${label}`);
    }
  }

  if (d.engagement_avant !== undefined && d.engagement_avant !== d.engagement_apres) {
    parts.push(
      `engagement annuel : ${d.engagement_avant ? "oui" : "non"} → ${d.engagement_apres ? "oui" : "non"}`
    );
  }
  if (d.mode_paiement_avant && d.mode_paiement_avant !== d.mode_paiement_apres) {
    parts.push(`paiement : ${d.mode_paiement_avant} → ${d.mode_paiement_apres}`);
  }

  const av = typeof d.mensualite_avant === "number" ? d.mensualite_avant : null;
  const ap = typeof d.mensualite_apres === "number" ? d.mensualite_apres : null;
  if (av !== null && ap !== null && Math.abs(av - ap) > 0.005) {
    parts.push(`Mensualité : ${av.toFixed(2)} € → ${ap.toFixed(2)} €`);
  }

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

// ===== Validation Dialog =====
function ValidateVehiculeDialog({
  vehicule,
  contrat,
  totalActifs,
  onClose,
  onDone,
}: {
  vehicule: Vehicule;
  contrat: Contrat;
  totalActifs: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [bascule, setBascule] = useState<{
    ancien_vehicule_id: string;
    ancien_label: string;
    ancien_immat: string;
  } | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Detect replacement intent in logs + fetch photo
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: logs } = await supabase
        .from("admin_actions_log")
        .select("details")
        .eq("action", "remplacement_vehicule")
        .filter("details->>nouveau_vehicule_id", "eq", vehicule.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!active) return;

      const log = logs?.[0] as any;
      if (log?.details?.ancien_vehicule_id) {
        const { data: anc } = await supabase
          .from("vehicules")
          .select("id, marque, modele, immatriculation")
          .eq("id", log.details.ancien_vehicule_id)
          .maybeSingle();
        if (anc && active) {
          setBascule({
            ancien_vehicule_id: anc.id,
            ancien_label: `${anc.marque ?? ""} ${anc.modele ?? ""}`.trim() || "Véhicule",
            ancien_immat: anc.immatriculation,
          });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [vehicule.id]);

  const newTotal = totalActifs + 1;
  const palierApres = getPalier(newTotal);
  const palierAvant = getPalier(totalActifs);

  // Recompute future facture: contrat.lignes is contractual, but display projected new mensualité
  // by including this new vehicle in the pack if known
  const factureApres = useMemo(() => {
    const lignes = contrat.lignes.map((l) => ({
      typePack: l.type_pack,
      nbVehicules: l.nb_vehicules,
    }));
    return calculerFactureFlotte({ lignes, engagementAnnuel: contrat.engagement_annuel });
  }, [contrat]);

  const tauxApres = palierApres === "starter" ? 0
    : palierApres === "pro" ? 5
    : palierApres === "business" ? 12 : 20;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      // Validate vehicle
      const { error: e1 } = await supabase
        .from("vehicules")
        .update({ statut: "actif", contrat_id: contrat.id })
        .eq("id", vehicule.id);
      if (e1) throw e1;

      // If replacement: archive old
      if (bascule) {
        const { error: e2 } = await supabase
          .from("vehicules")
          .update({ statut: "remplace", contrat_id: null })
          .eq("id", bascule.ancien_vehicule_id);
        if (e2) throw e2;

        await supabase.from("admin_actions_log").insert({
          action: "bascule_automatique_remplacement",
          user_id: userData.user?.id ?? null,
          details: {
            contrat_id: contrat.id,
            ancien_vehicule_id: bascule.ancien_vehicule_id,
            ancien_immat: bascule.ancien_immat,
            nouveau_vehicule_id: vehicule.id,
            nouveau_immat: vehicule.immatriculation,
          },
        });
      }

      await supabase.from("admin_actions_log").insert({
        action: "validation_vehicule_attente",
        user_id: userData.user?.id ?? null,
        details: {
          contrat_id: contrat.id,
          vehicule_id: vehicule.id,
          vehicule_immat: vehicule.immatriculation,
          palier_avant: palierAvant,
          palier_apres: palierApres,
        },
      });

      const newLabel =
        `${vehicule.marque ?? ""} ${vehicule.modele ?? ""}`.trim() || "Véhicule";

      if (bascule) {
        toast.success(
          `${newLabel} (${vehicule.immatriculation}) validé. ${bascule.ancien_label} (${bascule.ancien_immat}) a été automatiquement archivé comme remplacé. Le contrat ${contrat.numero_contrat ?? ""} reste actif.`
        );
      } else {
        toast.success(
          `${newLabel} (${vehicule.immatriculation}) validé et ajouté au contrat ${contrat.numero_contrat ?? ""}.`
        );
      }

      onDone();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de la validation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Valider ce véhicule ?</DialogTitle>
          <DialogDescription>
            Vérifiez les informations avant d'ajouter ce véhicule au contrat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60">
            <VehiculeThumbnail photoPath={vehicule.photo_path} alt={vehicule.immatriculation} />
            <div>
              <p className="font-medium">
                {vehicule.marque} {vehicule.modele}
              </p>
              <p className="font-mono text-xs text-primary">{vehicule.immatriculation}</p>
              {vehicule.type_pack_souhaite && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pack : {getPackLabel(vehicule.type_pack_souhaite)}
                </p>
              )}
            </div>
          </div>

          {bascule && (
            <div className="rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-950/30 p-3 flex gap-2 text-sm">
              <Repeat className="h-4 w-4 text-blue-700 dark:text-blue-300 shrink-0 mt-0.5" />
              <p className="text-blue-900 dark:text-blue-100">
                Ce véhicule remplace{" "}
                <span className="font-semibold">
                  {bascule.ancien_label} ({bascule.ancien_immat})
                </span>
                . La validation entraînera l'archivage automatique de l'ancien véhicule.
              </p>
            </div>
          )}

          <div className="rounded-lg bg-primary/5 border border-primary/30 p-3 space-y-1.5 text-sm">
            <p>
              Ce véhicule sera ajouté au contrat{" "}
              <span className="font-semibold">{contrat.numero_contrat}</span>.
            </p>
            <p>
              Nouveau total flotte :{" "}
              <span className="font-semibold tabular-nums">{newTotal} véhicules</span>
            </p>
            <p>
              Nouveau palier :{" "}
              <Badge className={cn("ml-1", PALIER_BADGE[palierApres])}>
                {PALIER_LABEL[palierApres]} ({tauxApres}% de remise)
              </Badge>
            </p>
            <p>
              Mensualité contractuelle nette HT :{" "}
              <span className="font-semibold tabular-nums">
                {factureApres.totalAbonnementHt.toFixed(2)} €
              </span>
            </p>
          </div>

          <p className="text-xs text-muted-foreground italic">
            Le véhicule sera ajouté à la facturation dès ce mois-ci (pas de prorata).
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="izox" onClick={handleConfirm} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer la validation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Refusal Dialog =====
function RefuseVehiculeDialog({
  vehicule,
  contrat,
  onClose,
  onDone,
}: {
  vehicule: Vehicule;
  contrat: Contrat;
  onClose: () => void;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [motif, setMotif] = useState("");

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("vehicules")
        .update({ statut: "refuse" })
        .eq("id", vehicule.id);
      if (error) throw error;

      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("admin_actions_log").insert({
        action: "refus_vehicule_attente",
        user_id: userData.user?.id ?? null,
        details: {
          contrat_id: contrat.id,
          vehicule_id: vehicule.id,
          vehicule_immat: vehicule.immatriculation,
          motif: motif || null,
        },
      });

      toast.success(`Véhicule ${vehicule.immatriculation} refusé.`);
      onDone();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors du refus");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Refuser ce véhicule ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Le véhicule{" "}
            <span className="font-semibold text-foreground">
              {vehicule.marque} {vehicule.modele} ({vehicule.immatriculation})
            </span>{" "}
            passera en statut « refusé » et ne sera pas ajouté au contrat.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="refus-motif">Motif du refus (optionnel)</Label>
          <Textarea
            id="refus-motif"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={submitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer le refus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
