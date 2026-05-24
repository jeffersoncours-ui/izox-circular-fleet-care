import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface AnnulerDemandeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandeType: "gel" | "rdv";
  demandeId: string;
  onSuccess?: () => void;
}

export function AnnulerDemandeDialog({
  open,
  onOpenChange,
  demandeType,
  demandeId,
  onSuccess,
}: AnnulerDemandeDialogProps) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleAnnuler = async () => {
    if (!demandeId) return;
    setLoading(true);
    try {
      const rpcName =
        demandeType === "gel" ? "annuler_demande_gel" : "annuler_demande_rdv";
      const { error } = await supabase.rpc(rpcName, { p_demande_id: demandeId });
      if (error) throw error;

      toast.success(
        `Votre demande de ${demandeType === "gel" ? "gel" : "RDV"} a été annulée`,
      );
      queryClient.invalidateQueries({ queryKey: ["demandes-gel"] });
      queryClient.invalidateQueries({ queryKey: ["demandes-rdv"] });

      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Impossible d'annuler la demande");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!loading) onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Annuler votre demande de {demandeType === "gel" ? "gel" : "RDV"} ?
          </DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Vous pourrez soumettre une nouvelle
            demande après annulation. L'équipe IZOX sera notifiée.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Conserver ma demande
          </Button>
          <Button variant="destructive" onClick={handleAnnuler} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Confirmer l'annulation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
