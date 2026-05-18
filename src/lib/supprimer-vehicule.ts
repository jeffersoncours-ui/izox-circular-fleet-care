import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { FacturationPrealableState } from "@/components/admin/FacturationPrealableDialog";

export interface SupprimerVehiculeResult {
  /** true si la suppression a réussi (ou doit être considérée terminée côté UI). */
  done: boolean;
  /** Bloqué par garde-fou facturation : à passer au dialog FacturationPrealableDialog. */
  needsBilling?: FacturationPrealableState;
  /** Le dernier véhicule du contrat a été supprimé → contrat résilié auto. */
  contratResilieAuto?: boolean;
}

/**
 * Appelle l'RPC `supprimer_vehicule` et gère les 3 issues possibles :
 *  - Succès simple (toast affiché)
 *  - Garde-fou facturation déclenché (retourne needsBilling, sans toast d'erreur)
 *  - Erreur DB (toast.error)
 */
export async function supprimerVehicule(
  vehiculeId: string,
  opts: { force?: boolean; silent?: boolean } = {}
): Promise<SupprimerVehiculeResult> {
  const { data, error } = await supabase.rpc("supprimer_vehicule", {
    p_vehicule_id: vehiculeId,
    p_force_facturation: opts.force ?? false,
  });

  if (error) {
    toast.error(error.message);
    return { done: false };
  }

  const result = (data ?? {}) as {
    success?: boolean;
    error_code?: string;
    interventions_non_facturees?: number;
    contrat_id?: string;
    contrat_resilie_auto?: boolean;
    message?: string;
  };

  if (result.error_code === "INTERVENTIONS_NON_FACTUREES") {
    return {
      done: false,
      needsBilling: {
        interventions_count: result.interventions_non_facturees ?? 0,
        contrat_id: result.contrat_id ?? "",
        vehicule_id: vehiculeId,
      },
    };
  }

  if (!result.success) {
    toast.error(result.message ?? "Suppression impossible");
    return { done: false };
  }

  if (!opts.silent) {
    if (result.contrat_resilie_auto) {
      toast.success("Véhicule supprimé. Dernier véhicule du contrat → contrat résilié automatiquement.");
    } else {
      toast.success("Véhicule supprimé.");
    }
  }

  return { done: true, contratResilieAuto: result.contrat_resilie_auto };
}
