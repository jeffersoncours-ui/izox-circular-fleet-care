import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrepriseId: string;
  entrepriseNom: string;
  hasActiveContrats: boolean;
}

export function ArchiverEntrepriseDialog({
  open,
  onOpenChange,
  entrepriseId,
  entrepriseNom,
  hasActiveContrats,
}: Props) {
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("La raison d'archivage est obligatoire");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("archiver_entreprise" as never, {
        p_entreprise_id: entrepriseId,
        p_reason: reason.trim(),
      } as never);
      if (error) throw error;
      toast.success(`Client "${entrepriseNom}" archivé`);
      onOpenChange(false);
      navigate({ to: "/admin/clients" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'archivage");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-destructive" />
              Archiver le client
            </DialogTitle>
            <DialogDescription className="pt-2">
              Le client <strong>{entrepriseNom}</strong> sera masqué des listes et
              tableaux de bord, mais ses données seront conservées pour les
              obligations comptables (10 ans). Action réversible par un admin.
            </DialogDescription>
          </DialogHeader>

          {hasActiveContrats ? (
            <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              Impossible d'archiver : ce client a au moins un contrat actif.
              Résilier d'abord les contrats avant d'archiver.
            </div>
          ) : (
            <div className="mt-6 space-y-2">
              <Label htmlFor="reason">
                Raison de l'archivage <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex : résiliation à la demande du client, fin de relation commerciale, doublon..."
                rows={4}
                required
              />
            </div>
          )}

          <div className="mt-6 flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={submitting || hasActiveContrats || !reason.trim()}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Archiver"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
