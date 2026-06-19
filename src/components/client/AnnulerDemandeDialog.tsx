import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "@/lib/email";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [motif, setMotif] = useState("");

  const isRdv = demandeType === "rdv";
  const motifValide = motif.trim().length >= 5;

  const handleAnnuler = async () => {
    if (!demandeId) return;
    if (isRdv && !motifValide) {
      toast.error("Le motif est obligatoire (5 caractères minimum)");
      return;
    }
    setLoading(true);
    try {
      if (isRdv) {
        const { error } = await supabase.rpc("annuler_rdv_client", {
          p_demande_id: demandeId,
          p_motif: motif.trim(),
        });
        if (error) throw error;
        // Prévient l'équipe IZOX (fire-and-forget)
        void sendEmail("rdv_annule_client", demandeId);
        toast.success("Votre rendez-vous a été annulé");
      } else {
        const { error } = await supabase.rpc("annuler_demande_gel", {
          p_demande_id: demandeId,
        });
        if (error) throw error;
        toast.success("Votre demande de gel a été annulée");
      }

      setMotif("");
      onSuccess?.();
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Impossible d'annuler la demande");
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
            Annuler {isRdv ? "ce rendez-vous" : "votre demande de gel"} ?
          </DialogTitle>
          <DialogDescription>
            Cette action est irréversible. L'équipe IZOX sera notifiée
            {isRdv ? " et le créneau sera libéré." : "."}
          </DialogDescription>
        </DialogHeader>

        {isRdv && (
          <div className="space-y-2">
            <Label htmlFor="annul-motif">Motif de l'annulation (obligatoire)</Label>
            <Textarea
              id="annul-motif"
              rows={3}
              placeholder="Indiquez la raison de l'annulation (5 caractères minimum)…"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Conserver
          </Button>
          <Button
            variant="destructive"
            onClick={handleAnnuler}
            disabled={loading || (isRdv && !motifValide)}
          >
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
