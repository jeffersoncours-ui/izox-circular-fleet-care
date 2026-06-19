import { useState } from "react";
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
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface FacturationPrealableState {
  interventions_count: number;
  contrat_id: string;
  vehicule_id: string;
}

interface Props {
  state: FacturationPrealableState | null;
  onClose: () => void;
  /** Appelée après suppression effective (facture générée + véhicule supprimé). */
  onResolved?: (resolution: {
    vehicule_id: string;
    contrat_resilie_auto?: boolean;
  }) => void;
}

export function FacturationPrealableDialog({ state, onClose, onResolved }: Props) {
  const [busy, setBusy] = useState(false);

  const handleGenerate = async () => {
    if (!state) return;
    setBusy(true);
    try {
      const now = new Date();
      // 1. Générer la facture pour le mois en cours
      const { error: factErr } = await supabase.rpc("generer_facture", {
        p_contrat_id: state.contrat_id,
        p_mois: now.getMonth() + 1,
        p_annee: now.getFullYear(),
      });
      if (factErr) throw factErr;

      // 2. Relancer la suppression avec force_facturation
      const { data, error } = await supabase.rpc("supprimer_vehicule", {
        p_vehicule_id: state.vehicule_id,
        p_force_facturation: true,
      });
      if (error) throw error;

      const result = data as { contrat_resilie_auto?: boolean } | null;
      if (result?.contrat_resilie_auto) {
        toast.success("Facture générée + véhicule supprimé. Contrat résilié automatiquement (dernier véhicule).");
      } else {
        toast.success("Facture générée et véhicule supprimé.");
      }
      onResolved?.({ vehicule_id: state.vehicule_id, contrat_resilie_auto: result?.contrat_resilie_auto });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la facturation préalable");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={!!state} onOpenChange={(o) => !o && !busy && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Facturation préalable requise
          </AlertDialogTitle>
          <AlertDialogDescription>
            {state?.interventions_count} prestation{(state?.interventions_count ?? 0) > 1 ? "s" : ""}{" "}
            validée{(state?.interventions_count ?? 0) > 1 ? "s" : ""} ce mois n'
            {(state?.interventions_count ?? 0) > 1 ? "ont" : "a"} pas encore été facturée
            {(state?.interventions_count ?? 0) > 1 ? "s" : ""}. La suppression du véhicule est bloquée
            tant que ces prestations ne sont pas figées dans une facture émise.
            <br />
            <br />
            Souhaitez-vous générer la facture maintenant ? Elle sera créée en brouillon, puis le
            véhicule sera supprimé.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleGenerate();
            }}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Générer la facture & supprimer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
