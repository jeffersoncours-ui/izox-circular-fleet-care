import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, X, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "@/lib/email";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type AdminDemandeRdv } from "@/components/admin/demande-rdv-types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  demande: AdminDemandeRdv | null;
  onCancelled: () => void;
}

function formatDateFR(iso: string): string {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function AnnulerRdvAdminDialog({ open, onOpenChange, demande, onCancelled }: Props) {
  const [motif, setMotif] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMotif("");
      setSubmitting(false);
    }
  }, [open, demande]);

  if (!demande) return null;

  const motifValide = motif.trim().length >= 5;
  const dateStr = demande.assigned_date ?? (demande.date_confirmee?.slice(0, 10) ?? null);
  const heure = demande.assigned_heure
    ? demande.assigned_heure.slice(0, 5).replace(":", "h")
    : null;
  const lieu = [
    demande.adresse_intervention,
    demande.code_postal_intervention,
    demande.ville_intervention,
  ]
    .filter(Boolean)
    .join(", ");

  const handleCancel = async () => {
    if (!motifValide) {
      toast.error("Le motif est obligatoire (5 caractères minimum)");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("annuler_rdv_admin", {
        p_demande_id: demande.id,
        p_motif: motif.trim(),
      });
      if (error) throw error;
      // Prévient le client (fire-and-forget)
      void sendEmail("rdv_annule_admin", demande.id);
      toast.success("Rendez-vous annulé — le client a été notifié");
      onOpenChange(false);
      onCancelled();
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Erreur lors de l'annulation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Annuler le rendez-vous</DialogTitle>
          <DialogDescription>
            {demande.entreprise_nom ?? "—"} · {demande.nb_vehicules_rdv} véhicule
            {demande.nb_vehicules_rdv > 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Récap */}
          <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-sm">
            {dateStr && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formatDateFR(dateStr)}</span>
                {heure && (
                  <>
                    <Clock className="h-3.5 w-3.5 text-muted-foreground ml-2" />
                    <span>{heure}</span>
                  </>
                )}
              </div>
            )}
            {lieu && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-xs">{lieu}</span>
              </div>
            )}
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            L'annulation marque les interventions liées comme annulées et notifie le client par email.
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-annul-motif">Motif (obligatoire, communiqué au client)</Label>
            <Textarea
              id="admin-annul-motif"
              rows={3}
              placeholder="Raison de l'annulation (5 caractères minimum)…"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Conserver
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={submitting || !motifValide}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <X className="h-4 w-4 mr-1" /> Annuler le RDV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
