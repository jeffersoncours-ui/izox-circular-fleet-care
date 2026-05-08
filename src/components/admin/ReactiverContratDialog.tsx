import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

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

export interface ReactiverContratInput {
  id: string;
  numero_contrat: string | null;
  raison_sociale_client: string;
  gel_date_debut: string | null;
  gel_date_fin: string | null;
  gel_commentaire: string | null;
}

interface ReactiverContratDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrat: ReactiverContratInput | null;
  onReactivated?: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "dd/MM/yyyy", { locale: fr });
  } catch {
    return iso;
  }
}

export function ReactiverContratDialog({
  open,
  onOpenChange,
  contrat,
  onReactivated,
}: ReactiverContratDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!contrat) return;
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from("contrats")
        .update({
          gel_actif: false,
          statut: "actif",
          gel_type: null,
          gel_date_debut: null,
          gel_date_fin: null,
          gel_commentaire: null,
          gel_notifier_client: true,
        })
        .eq("id", contrat.id);

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from("admin_actions_log")
        .insert({
          action: "reactivation_contrat",
          details: {
            contrat_id: contrat.id,
            numero_contrat: contrat.numero_contrat,
            gel_date_debut_origine: contrat.gel_date_debut,
            gel_date_fin_origine: contrat.gel_date_fin,
            gel_commentaire_origine: contrat.gel_commentaire,
            date_reactivation: new Date().toISOString(),
          },
          nb_entites_impactees: 1,
        });

      if (logError) {
        console.error("Erreur log mais réactivation appliquée :", logError);
      }

      toast.success(
        `Contrat ${contrat.numero_contrat ?? ""} réactivé avec succès`
      );

      onReactivated?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erreur réactivation :", error);
      toast.error(
        `Erreur lors de la réactivation : ${error?.message ?? "inconnue"}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => !submitting && onOpenChange(o)}
    >
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            Réactiver le contrat
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Le contrat{" "}
                <span className="font-semibold text-foreground">
                  {contrat?.numero_contrat}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-foreground">
                  {contrat?.raison_sociale_client}
                </span>{" "}
                sera replacé en statut « Actif ». Les passages facturés
                pourront à nouveau être programmés dès aujourd'hui.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <p>
              <span className="font-medium text-foreground">Période de gel : </span>
              du {formatDate(contrat?.gel_date_debut ?? null)} au{" "}
              {contrat?.gel_date_fin
                ? formatDate(contrat.gel_date_fin)
                : "durée indéterminée"}
            </p>
            <p>
              <span className="font-medium text-foreground">Motif : </span>
              {contrat?.gel_commentaire?.trim() || "Non renseigné"}
            </p>
          </div>
          <p className="text-xs italic text-muted-foreground">
            L'historique de la mise en veille reste consultable dans la
            timeline du contrat.
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Confirmer la réactivation"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
