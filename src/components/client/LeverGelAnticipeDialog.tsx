import { useState } from "react";
import { Snowflake, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandeId: string;
  onSuccess?: () => void;
}

export function LeverGelAnticipeDialog({ open, onOpenChange, demandeId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!demandeId) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc("lever_gel_anticipe", {
        p_demande_id: demandeId,
      });
      if (error) throw error;
      toast.success("Gel levé. Votre véhicule est de nouveau actif.");
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Impossible de lever le gel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Snowflake className="h-5 w-5 text-blue-600" /> Mettre fin au gel anticipativement
          </DialogTitle>
          <DialogDescription>
            Le gel sera immédiatement levé. Le véhicule redeviendra actif dès aujourd'hui.
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-orange-50 border-orange-200 text-orange-900">
          <AlertDescription>
            <ul className="list-disc pl-4 space-y-1 text-sm">
              <li>Le véhicule redevient facturable dès aujourd'hui</li>
              <li>Vous pourrez à nouveau prendre un RDV de nettoyage</li>
              <li>Les jours non utilisés ne seront <strong>PAS</strong> recrédités au quota</li>
            </ul>
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer la levée"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
