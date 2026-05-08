import { useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { calculerFactureFlotte } from "@/lib/pricing";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface ResiliationContratInput {
  id: string;
  numero_contrat: string | null;
  entreprise_id: string;
  entreprise_nom: string | null;
  engagement_annuel: boolean;
  lignes: Array<{ type_pack: string; nb_vehicules: number }>;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contrat: ResiliationContratInput | null;
  onResiliated?: () => void;
}

export function ResiliationContratDialog({
  open,
  onOpenChange,
  contrat,
  onResiliated,
}: Props) {
  const [motif, setMotif] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const facture =
    contrat && contrat.lignes.length > 0
      ? calculerFactureFlotte({
          lignes: contrat.lignes.map((l) => ({
            typePack: l.type_pack,
            nbVehicules: l.nb_vehicules,
          })),
          engagementAnnuel: contrat.engagement_annuel,
        })
      : null;

  const mensualite = facture?.totalAbonnementHt ?? 0;

  const handleConfirm = async () => {
    if (!contrat) return;
    setSubmitting(true);
    try {
      const { error: e1 } = await supabase
        .from("contrats")
        .update({
          statut: "resilie",
          date_fin: format(new Date(), "yyyy-MM-dd"),
        })
        .eq("id", contrat.id);
      if (e1) throw e1;

      // Détacher les véhicules liés
      const { data: vehs } = await supabase
        .from("vehicules")
        .select("id")
        .eq("contrat_id", contrat.id);
      const vehIds = (vehs ?? []).map((v: any) => v.id);
      if (vehIds.length > 0) {
        const { error: e2 } = await supabase
          .from("vehicules")
          .update({ contrat_id: null })
          .eq("contrat_id", contrat.id);
        if (e2) throw e2;
      }

      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("admin_actions_log").insert({
        action: "resiliation_contrat",
        user_id: userData.user?.id ?? null,
        details: {
          contrat_id: contrat.id,
          entreprise_id: contrat.entreprise_id,
          mensualite_perdue: mensualite,
          motif: motif || null,
          vehicules_concernes_count: vehIds.length,
        },
      });

      toast.success(
        `Contrat ${contrat.numero_contrat ?? ""} résilié. Manque à gagner mensuel : ${mensualite.toFixed(2)} € HT.`
      );
      setMotif("");
      onOpenChange(false);
      onResiliated?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de la résiliation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Résilier le contrat {contrat?.numero_contrat ?? ""} ?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Vous êtes sur le point de résilier le contrat{" "}
                <span className="font-semibold text-foreground">
                  {contrat?.numero_contrat}
                </span>
                {contrat?.entreprise_nom ? (
                  <>
                    {" "}de{" "}
                    <span className="font-semibold text-foreground">
                      {contrat.entreprise_nom}
                    </span>
                  </>
                ) : null}
                .
              </p>
              <p>
                Cela représente une perte de{" "}
                <span className="font-bold text-destructive text-base">
                  {mensualite.toFixed(2)} € HT/mois
                </span>{" "}
                pour IZOX.
              </p>
              <div className="bg-muted/40 rounded-md p-3 text-xs space-y-1">
                <p>Après résiliation :</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Les véhicules liés verront leur contrat détaché</li>
                  <li>Le contrat passera en statut « résilié »</li>
                  <li>Les passages restants du mois seront perdus</li>
                  <li>Cette action est définitive</li>
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="resil-motif">Motif de résiliation (optionnel)</Label>
          <Textarea
            id="resil-motif"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Pour audit interne et statistiques de churn..."
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
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Confirmer la résiliation"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
