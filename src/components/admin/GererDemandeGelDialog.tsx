import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Snowflake } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import { sendEmail } from "@/lib/email";

interface DemandeGel {
  id: string;
  entreprise_nom: string | null;
  numero_contrat: string | null;
  type_demande: string;
  vehicule_ids: string[] | null;
  date_debut: string;
  date_fin_prevue: string;
  motif: string;
  quota_consomme_actuel: number | null;
  duree_jours_demandee: number | null;
  entreprise_id: string;
}

interface GererDemandeGelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demande: DemandeGel | null;
  onProcessed?: () => void;
}

export function GererDemandeGelDialog({
  open,
  onOpenChange,
  demande,
  onProcessed,
}: GererDemandeGelDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [refusOpen, setRefusOpen] = useState(false);
  const [motifRefus, setMotifRefus] = useState("");
  const [vehiculeImmats, setVehiculeImmats] = useState<string[]>([]);

  useEffect(() => {
    setRefusOpen(false);
    setMotifRefus("");
    if (!demande || demande.type_demande !== "vehicules" || !demande.vehicule_ids?.length) {
      setVehiculeImmats([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("vehicules")
        .select("immatriculation")
        .in("id", demande.vehicule_ids ?? []);
      setVehiculeImmats((data ?? []).map((v: any) => v.immatriculation));
    })();
  }, [demande]);

  if (!demande) return null;

  const duree =
    demande.duree_jours_demandee ??
    differenceInCalendarDays(
      parseISO(demande.date_fin_prevue),
      parseISO(demande.date_debut),
    ) + 1;
  const quota = demande.quota_consomme_actuel ?? 0;
  const quotaApres = quota + duree;

  const handleValider = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("valider_gel", { p_demande_id: demande.id });
      if (error) throw error;
      sendEmail("gel_validee", demande.id);
      const aujourdhui = format(new Date(), "yyyy-MM-dd");
      const msg =
        demande.date_debut <= aujourdhui
          ? "Demande validée. Gel exécuté immédiatement."
          : `Gel programmé pour le ${format(parseISO(demande.date_debut), "dd/MM/yyyy", { locale: fr })}.`;
      toast.success(msg);
      onOpenChange(false);
      onProcessed?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de la validation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefuser = async () => {
    if (motifRefus.trim().length < 5) {
      toast.error("Motif min. 5 caractères");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("refuser_gel", {
        p_demande_id: demande.id,
        p_motif_refus: motifRefus.trim(),
      });
      if (error) throw error;
      toast.success("Demande refusée. Notification adressée au client.");
      setRefusOpen(false);
      onOpenChange(false);
      onProcessed?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors du refus");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        open={open && !refusOpen}
        onOpenChange={(o) => !submitting && onOpenChange(o)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Snowflake className="h-5 w-5 text-blue-600" /> Demande de gel
            </DialogTitle>
            <DialogDescription>
              {demande.entreprise_nom} · Contrat {demande.numero_contrat ?? "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <Info
              label="Type"
              value={
                demande.type_demande === "contrat"
                  ? "Contrat complet"
                  : `Véhicules (${demande.vehicule_ids?.length ?? 0})`
              }
            />
            {demande.type_demande === "vehicules" && vehiculeImmats.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {vehiculeImmats.join(" · ")}
              </div>
            )}
            <Info
              label="Période"
              value={`${format(parseISO(demande.date_debut), "dd/MM/yyyy")} → ${format(parseISO(demande.date_fin_prevue), "dd/MM/yyyy")}`}
            />
            <Info label="Durée" value={`${duree} jours`} />
            <Info
              label="Quota année glissante"
              value={`${quota}/90 → ${quotaApres}/90 après validation`}
            />
            <div>
              <p className="text-muted-foreground text-xs mb-1">Motif client</p>
              <p className="italic bg-muted/40 rounded p-2">{demande.motif}</p>
            </div>
            {quotaApres > 90 && (
              <p className="text-xs text-destructive">
                ⚠ La validation dépasserait le quota annuel.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="destructive"
              onClick={() => setRefusOpen(true)}
              disabled={submitting}
            >
              <XCircle className="h-4 w-4" /> Refuser
            </Button>
            <Button onClick={handleValider} disabled={submitting || quotaApres > 90}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Valider
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refusOpen} onOpenChange={(o) => !submitting && setRefusOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la demande</DialogTitle>
            <DialogDescription>
              Indiquez le motif transmis au client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motif-refus">Motif (min. 5 caractères)</Label>
            <Textarea
              id="motif-refus"
              value={motifRefus}
              onChange={(e) => setMotifRefus(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRefusOpen(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefuser}
              disabled={submitting || motifRefus.trim().length < 5}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Refuser"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
