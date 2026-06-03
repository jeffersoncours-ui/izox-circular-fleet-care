import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, X, Loader2, CheckCircle2 } from "lucide-react";

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
  /** Appelé après une replanification OU une annulation réussie. */
  onUpdated: () => void;
}

// Mêmes plages que AssignerRdvDialog : le créneau reste verrouillé, seule
// l'heure de début change à l'intérieur de la demi-journée choisie.
const HEURE_OPTIONS: Record<"morning" | "afternoon", string[]> = {
  morning: ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00"],
  afternoon: ["14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"],
};

const SLOT_LABEL: Record<string, string> = {
  morning: "Matin (08h – 12h)",
  afternoon: "Après-midi (14h – 18h)",
};

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

export function GererRdvConfirmeDialog({ open, onOpenChange, demande, onUpdated }: Props) {
  const [heure, setHeure] = useState("");
  const [motif, setMotif] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const slotKey: "morning" | "afternoon" | null =
    demande?.assigned_time_slot === "morning"
      ? "morning"
      : demande?.assigned_time_slot === "afternoon"
        ? "afternoon"
        : null;

  useEffect(() => {
    if (open) {
      // Pré-remplit avec l'heure actuelle si elle est dans la liste, sinon vide.
      const current = demande?.assigned_heure?.slice(0, 5) ?? "";
      const options = slotKey ? HEURE_OPTIONS[slotKey] : [];
      setHeure(options.includes(current) ? current : "");
      setMotif("");
      setShowCancel(false);
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, demande]);

  if (!demande) return null;

  const dateStr = demande.assigned_date ?? demande.date_confirmee?.slice(0, 10) ?? null;
  const heureActuelle = demande.assigned_heure
    ? demande.assigned_heure.slice(0, 5).replace(":", "h")
    : null;
  const lieu = [
    demande.adresse_intervention,
    demande.code_postal_intervention,
    demande.ville_intervention,
  ]
    .filter(Boolean)
    .join(", ");

  const heureChanged = !!heure && heure !== (demande.assigned_heure?.slice(0, 5) ?? "");
  const motifValide = motif.trim().length >= 5;

  const handleReschedule = async () => {
    if (!heureChanged) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("modifier_heure_rdv", {
        p_demande_id: demande.id,
        p_heure: heure,
      });
      if (error) throw error;
      // Prévient le client (fire-and-forget)
      void sendEmail("rdv_modifie", demande.id);
      toast.success("Heure modifiée — le client a été notifié");
      onOpenChange(false);
      onUpdated();
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Erreur lors de la modification");
    } finally {
      setSubmitting(false);
    }
  };

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
      void sendEmail("rdv_annule_admin", demande.id);
      toast.success("Rendez-vous annulé — le client a été notifié");
      onOpenChange(false);
      onUpdated();
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
          <DialogTitle>Gérer le rendez-vous</DialogTitle>
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
                {slotKey && (
                  <span className="text-xs text-muted-foreground ml-1">
                    · {slotKey === "morning" ? "Matin" : "Après-midi"}
                  </span>
                )}
                {heureActuelle && (
                  <>
                    <Clock className="h-3.5 w-3.5 text-muted-foreground ml-2" />
                    <span>{heureActuelle}</span>
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

          {!showCancel ? (
            <>
              {/* Replanification de l'heure (créneau verrouillé) */}
              <div className="space-y-2">
                <Label htmlFor="reschedule-heure" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Modifier l'heure d'arrivée
                </Label>
                {slotKey ? (
                  <>
                    <select
                      id="reschedule-heure"
                      value={heure}
                      onChange={(e) => setHeure(e.target.value)}
                      disabled={submitting}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">— Choisir une heure —</option>
                      {HEURE_OPTIONS[slotKey].map((h) => (
                        <option key={h} value={h}>
                          {h.replace(":", "h")}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Le créneau {SLOT_LABEL[slotKey].toLowerCase()} reste inchangé. Le client sera
                      notifié par email du nouvel horaire.
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Créneau indéterminé — impossible de replanifier l'heure.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowCancel(true)}
                disabled={submitting}
                className="text-xs text-red-600 hover:underline"
              >
                Annuler le rendez-vous à la place…
              </button>
            </>
          ) : (
            <>
              {/* Annulation */}
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                L'annulation marque les interventions liées comme annulées et notifie le client par
                email.
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
              <button
                type="button"
                onClick={() => setShowCancel(false)}
                disabled={submitting}
                className="text-xs text-muted-foreground hover:underline"
              >
                ← Revenir à la modification d'heure
              </button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Fermer
          </Button>
          {!showCancel ? (
            <Button onClick={handleReschedule} disabled={submitting || !heureChanged}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Mettre à jour l'heure
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={submitting || !motifValide}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <X className="h-4 w-4 mr-1" /> Annuler le RDV
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
