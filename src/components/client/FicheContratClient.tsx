import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ArrowLeft, Trash2, Snowflake, Loader2, AlertTriangle } from "lucide-react";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { formatCurrency } from "@/lib/format";
import { supprimerVehicule } from "@/lib/supprimer-vehicule";
import {
  FacturationPrealableDialog,
  type FacturationPrealableState,
} from "@/components/admin/FacturationPrealableDialog";
import { DemanderGelDialog } from "@/components/client/DemanderGelDialog";

interface ContratLigne {
  id: string;
  type_pack: string;
  nb_vehicules: number;
  prix_unitaire_ht: number;
}

interface Contrat {
  id: string;
  numero_contrat: string | null;
  statut: string;
  date_debut: string;
  date_anniversaire: string | null;
  palier: string | null;
  mode_paiement: string;
  engagement_annuel: boolean;
  montant_brut_mensuel: number | null;
  montant_net_mensuel: number | null;
  remise_pct: number | null;
  remise_commerciale_pct: number;
  contrat_lignes: ContratLigne[];
}

interface VehiculeLite {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  statut: string;
}

interface PassageInfo {
  contrat_ligne_id: string;
  type_pack: string;
  passages_mois_pack: number;
  passages_restants_mois: number;
}

const PALIER_LABEL: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
  premium: "Premium",
};

export function FicheContratClient() {
  const { id } = useParams({ from: "/client/contrats/$id" });
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [contrat, setContrat] = useState<Contrat | null>(null);
  const [vehicules, setVehicules] = useState<VehiculeLite[]>([]);
  const [passages, setPassages] = useState<PassageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [retraitOpen, setRetraitOpen] = useState(false);
  const [gelOpen, setGelOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VehiculeLite | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [billingState, setBillingState] = useState<FacturationPrealableState | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: contratData } = await supabase
      .from("contrats")
      .select(
        `id, numero_contrat, statut, date_debut, date_anniversaire, palier,
         mode_paiement, engagement_annuel, montant_brut_mensuel, montant_net_mensuel,
         remise_pct, remise_commerciale_pct,
         contrat_lignes (id, type_pack, nb_vehicules, prix_unitaire_ht)`,
      )
      .eq("id", id)
      .maybeSingle();

    setContrat(contratData as unknown as Contrat | null);

    const { data: vehData } = await supabase
      .from("vehicules")
      .select("id, immatriculation, marque, modele, statut")
      .eq("contrat_id", id)
      .in("statut", ["actif", "en_attente_validation", "gele"])
      .order("created_at", { ascending: true });
    setVehicules((vehData ?? []) as VehiculeLite[]);

    const { data: passData } = await supabase
      .from("v_contrats_passages_restants")
      .select("contrat_ligne_id, type_pack, passages_mois_pack, passages_restants_mois")
      .eq("contrat_id", id);
    setPassages((passData ?? []) as PassageInfo[]);

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await supprimerVehicule(deleteTarget.id);
    setDeleting(false);
    if (res.needsBilling) {
      setDeleteTarget(null);
      setBillingState(res.needsBilling);
      return;
    }
    if (res.done) {
      setDeleteTarget(null);
      if (res.contratResilieAuto) {
        setRetraitOpen(false);
      }
      load();
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!contrat) {
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <p className="text-sm text-muted-foreground">Contrat introuvable.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate({ to: "/client" })}>
          Retour
        </Button>
      </div>
    );
  }

  const vehiculesActifs = vehicules.filter((v) => v.statut === "actif");
  const vehiculesEnAttente = vehicules.filter((v) => v.statut === "en_attente_validation");
  const vehiculesGeles = vehicules.filter((v) => v.statut === "gele");
  const isDernierVehicule = vehiculesActifs.length <= 1;

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-2 mb-5">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/client">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mon contrat</h1>
          {contrat.numero_contrat && (
            <p className="text-sm text-muted-foreground">{contrat.numero_contrat}</p>
          )}
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Informations générales</CardTitle>
            <StatutBadge type="contrat" statut={contrat.statut} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Info label="Date de début" value={formatDate(contrat.date_debut)} />
          {contrat.date_anniversaire && (
            <Info label="Date d'anniversaire" value={formatDate(contrat.date_anniversaire)} />
          )}
          {contrat.palier && (
            <Info label="Palier B2B" value={PALIER_LABEL[contrat.palier] ?? contrat.palier} />
          )}
          <Info label="Mode de paiement" value={contrat.mode_paiement.toUpperCase()} />
          <Info label="Engagement annuel" value={contrat.engagement_annuel ? "Oui" : "Non"} />
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Composition de la flotte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {contrat.contrat_lignes.length === 0 ? (
            <p className="text-muted-foreground">Aucune ligne</p>
          ) : (
            contrat.contrat_lignes.map((l) => (
              <div key={l.id} className="flex justify-between">
                <span>
                  Pack <span className="font-medium capitalize">{l.type_pack}</span> ×{" "}
                  {l.nb_vehicules}
                </span>
                <span className="font-medium">
                  {formatCurrency(l.prix_unitaire_ht * l.nb_vehicules)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mensualité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <Info
            label="Montant brut"
            value={formatCurrency(contrat.montant_brut_mensuel ?? 0)}
          />
          {(contrat.remise_pct ?? 0) > 0 && (
            <Info label="Remise palier" value={`-${contrat.remise_pct}%`} />
          )}
          {contrat.remise_commerciale_pct > 0 && (
            <Info
              label="Remise commerciale"
              value={`-${contrat.remise_commerciale_pct}%`}
            />
          )}
          <div className="flex justify-between pt-2 border-t mt-2">
            <span className="font-semibold">Net mensuel HT</span>
            <span className="font-bold text-primary">
              {formatCurrency(contrat.montant_net_mensuel ?? 0)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Passages mensuels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {passages.length === 0 ? (
            <p className="text-muted-foreground">Aucun pack actif</p>
          ) : (
            passages.map((p) => (
              <div key={p.contrat_ligne_id} className="flex justify-between">
                <span className="capitalize">Pack {p.type_pack}</span>
                <span className="font-medium">
                  {p.passages_restants_mois} / {p.passages_mois_pack} restants
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => setRetraitOpen(true)}
          disabled={contrat.statut === "resilie" || vehicules.length === 0}
        >
          <Trash2 className="h-4 w-4" /> Retirer un véhicule
        </Button>
        <Button variant="outline" onClick={() => setGelOpen(true)}>
          <Snowflake className="h-4 w-4" /> Demander un gel
        </Button>
      </div>

      {/* Dialog liste véhicules pour retrait */}
      <Dialog open={retraitOpen} onOpenChange={setRetraitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Retirer un véhicule</DialogTitle>
            <DialogDescription>
              Sélectionnez le véhicule à retirer de votre contrat.
            </DialogDescription>
          </DialogHeader>

          {isDernierVehicule && vehiculesActifs.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                La suppression de ce véhicule entraînera la <strong>résiliation
                automatique</strong> de votre contrat (dernier véhicule actif).
              </p>
            </div>
          )}

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {vehicules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun véhicule.
              </p>
            ) : (
              vehicules.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{v.immatriculation}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[v.marque, v.modele].filter(Boolean).join(" ") || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatutBadge type="vehicule" statut={v.statut} size="sm" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(v)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRetraitOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment retirer le véhicule{" "}
              <strong>{deleteTarget?.immatriculation}</strong> de votre contrat ?
              {isDernierVehicule && (
                <span className="block mt-2 text-amber-700">
                  ⚠ Ce retrait entraînera la résiliation automatique du contrat.
                </span>
              )}
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
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Retirer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FacturationPrealableDialog
        state={billingState}
        onClose={() => setBillingState(null)}
        onResolved={() => {
          setRetraitOpen(false);
          load();
        }}
      />

      {profile?.entreprise_id && (
        <DemanderGelDialog
          open={gelOpen}
          onOpenChange={setGelOpen}
          contratId={contrat.id}
          entrepriseId={profile.entreprise_id}
          onSubmitted={load}
        />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
}
