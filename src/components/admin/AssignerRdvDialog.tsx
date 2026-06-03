import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, Loader2, CheckCircle2, XCircle, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";
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

interface Operator {
  id: string;
  name: string;
  initials: string;
  color_hex: string;
}

const TIME_SLOTS = {
  morning:   { label: "Matin",       sublabel: "08h – 11h30" },
  afternoon: { label: "Après-midi",  sublabel: "14h – 17h30" },
} as const;

const HEURE_OPTIONS: Record<"morning" | "afternoon", string[]> = {
  morning:   ["08:00","08:30","09:00","09:30","10:00","10:30","11:00"],
  afternoon: ["14:00","14:30","15:00","15:30","16:00","16:30","17:00"],
};

function isMatin(plage: string): boolean {
  const p = (plage || "").toLowerCase();
  return p.includes("matin") || p === "am" || p.startsWith("mat");
}

function toTimeSlotKey(plage: string): "morning" | "afternoon" {
  return isMatin(plage) ? "morning" : "afternoon";
}

function formatDateFR(iso: string): string {
  try {
    return format(parseISO(iso), "EEEE d MMMM yyyy", { locale: fr });
  } catch {
    return iso;
  }
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  demande: AdminDemandeRdv | null;
  onAssigned: () => void;
}

export function AssignerRdvDialog({ open, onOpenChange, demande, onAssigned }: Props) {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<"morning" | "afternoon" | "">("");
  const [selectedHeure, setSelectedHeure] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [refusOpen, setRefusOpen] = useState(false);
  const [motif, setMotif] = useState("");

  const creneaux: Array<{ date: string; plage: string }> = Array.isArray(demande?.creneaux_preferes)
    ? demande!.creneaux_preferes
    : [];

  // Reset on open/demande change
  useEffect(() => {
    if (!open) return;
    setSelectedOperator("");
    setSelectedDate("");
    setSelectedSlot("");
    setSelectedHeure("");
    setRefusOpen(false);
    setMotif("");
  }, [open, demande]);

  // Load operators
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any)("operators").select("*").order("name").then(({ data }: { data: unknown }) => {
      setOperators((data ?? []) as Operator[]);
    });
  }, [open]);

  const heureValid = (): boolean => {
    if (!selectedSlot || !selectedHeure) return false;
    return HEURE_OPTIONS[selectedSlot].includes(selectedHeure);
  };

  const nbVehicules = demande?.vehicule_ids?.length ?? 0;
  const canConfirm =
    !!selectedOperator &&
    !!selectedDate &&
    !!selectedSlot &&
    heureValid() &&
    nbVehicules > 0 &&
    !submitting;

  const handleConfirm = async () => {
    if (!canConfirm || !demande) return;
    setSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("assigner_rdv", {
        p_demande_id:  demande.id,
        p_operator_id: selectedOperator,
        p_date:        selectedDate,
        p_time_slot:   selectedSlot,
        p_heure:       selectedHeure || null,
      });
      if (error) throw error;
      sendEmail("rdv_confirmee", demande.id);
      const result = data as { success: boolean; nb_interventions: number } | null;
      toast.success(
        result?.nb_interventions === 1
          ? "RDV assigné — 1 intervention créée"
          : `RDV assigné — ${result?.nb_interventions ?? ""} interventions créées`
      );
      onOpenChange(false);
      onAssigned();
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Erreur lors de l'assignation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefuser = async () => {
    if (!demande || motif.trim().length < 5) {
      toast.error("Motif min. 5 caractères");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("refuser_demande_rdv", {
        p_demande_id: demande.id,
        p_motif: motif.trim(),
      } as any);
      if (error) throw error;
      toast.success("Demande refusée.");
      setRefusOpen(false);
      onOpenChange(false);
      onAssigned();
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Erreur lors du refus");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGeocode = async () => {
    if (!demande) return;
    setGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke("geocode-address", {
        body: {
          adresse: demande.adresse_intervention,
          ville: demande.ville_intervention,
          code_postal: demande.code_postal_intervention,
        },
      });
      if (error) throw error;
      if (!data?.latitude || !data?.longitude) {
        toast.error("Adresse introuvable — vérifiez les champs.");
        return;
      }
      await supabase
        .from("demandes_rdv")
        .update({ latitude: data.latitude, longitude: data.longitude })
        .eq("id", demande.id);
      // Update local demande reference for immediate UI feedback
      demande.latitude = data.latitude;
      demande.longitude = data.longitude;
      toast.success("Adresse géocodée avec succès.");
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Erreur lors du géocodage");
    } finally {
      setGeocoding(false);
    }
  };

  if (!demande) return null;

  const op = operators.find((o) => o.id === selectedOperator);
  const slotDef = selectedSlot ? TIME_SLOTS[selectedSlot] : null;
  const heureLabel = selectedHeure ? selectedHeure.replace(":", "h") : "";

  return (
    <>
      <Dialog open={open && !refusOpen} onOpenChange={(o) => !submitting && onOpenChange(o)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assigner & Planifier</DialogTitle>
            <DialogDescription>
              {demande.entreprise_nom ?? "—"} ·{" "}
              {demande.nb_vehicules_rdv} véhicule{demande.nb_vehicules_rdv > 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Détails de la demande */}
            <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-sm">
              {creneaux.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Créneaux demandés par le client</p>
                  <ul className="text-xs space-y-0.5">
                    {creneaux.map((c, i) => (
                      <li key={i}>
                        · {formatDateFR(c.date)} — {isMatin(c.plage) ? "matin" : "après-midi"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(demande.adresse_intervention || demande.ville_intervention) && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Lieu d'intervention
                  </p>
                  <p className="text-xs font-medium">
                    {[
                      demande.adresse_intervention,
                      demande.code_postal_intervention,
                      demande.ville_intervention,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {!demande.latitude && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        Adresse non géocodée
                      </span>
                      <button
                        type="button"
                        onClick={handleGeocode}
                        disabled={geocoding}
                        className="text-xs underline text-primary hover:opacity-70 disabled:opacity-50"
                      >
                        {geocoding ? "Géocodage…" : "Géocoder"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {demande.commentaires && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Commentaires</p>
                  <p className="text-xs italic">{demande.commentaires}</p>
                </div>
              )}
            </div>

            {nbVehicules === 0 && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                Aucun véhicule n'est associé à cette demande. Impossible de planifier une intervention.
              </div>
            )}

            {/* Sélection opérateur */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">1. Sélectionner un opérateur</p>
              <div className="grid grid-cols-3 gap-2">
                {operators.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setSelectedOperator(o.id);
                      setSelectedDate("");
                      setSelectedSlot("");
                      setSelectedHeure("");
                    }}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-colors text-center ${
                      selectedOperator === o.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: o.color_hex }}
                    >
                      {o.initials}
                    </div>
                    <span className="text-xs font-medium leading-tight">{o.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sélection créneau (verrouillé aux demandes client) */}
            {selectedOperator && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">2. Choisir le créneau</p>
                {creneaux.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucun créneau proposé par le client.</p>
                ) : (
                  <div className="space-y-2">
                    {creneaux.map((c, i) => {
                      const slot = toTimeSlotKey(c.plage);
                      const slotInfo = TIME_SLOTS[slot];
                      const isSelected = selectedDate === c.date && selectedSlot === slot;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setSelectedDate(c.date);
                            setSelectedSlot(slot);
                            setSelectedHeure("");
                          }}
                          className={`w-full flex items-center justify-between rounded-lg border-2 px-4 py-3 text-sm transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-green-500/50 bg-green-50 hover:bg-green-100 cursor-pointer"
                          }`}
                        >
                          <div className="text-left">
                            <p className="font-medium">{formatDateFR(c.date)}</p>
                            <p className="text-xs text-muted-foreground">
                              {slotInfo.label} · {slotInfo.sublabel}
                            </p>
                          </div>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Sélection heure de début */}
            {selectedSlot && slotDef && (
              <div className="space-y-1.5">
                <Label htmlFor="heure-rdv" className="text-sm font-semibold flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> 3. Heure d'arrivée
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    ({slotDef.sublabel})
                  </span>
                </Label>
                <select
                  id="heure-rdv"
                  value={selectedHeure}
                  onChange={(e) => setSelectedHeure(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">— Choisir une heure —</option>
                  {HEURE_OPTIONS[selectedSlot].map((h) => (
                    <option key={h} value={h}>
                      {h.replace(":", "h")}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Récapitulatif */}
            {canConfirm && op && slotDef && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                <p className="font-semibold">Récapitulatif</p>
                <p>
                  Opérateur :{" "}
                  <span className="font-medium" style={{ color: op.color_hex }}>
                    {op.name}
                  </span>
                </p>
                <p>
                  Date :{" "}
                  <span className="font-medium">{formatDateFR(selectedDate)}</span>
                </p>
                <p>
                  Créneau :{" "}
                  <span className="font-medium">
                    {slotDef.label} à {heureLabel}
                  </span>
                </p>
              </div>
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
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button onClick={handleConfirm} disabled={!canConfirm}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmer l'assignation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sous-dialog refus */}
      <Dialog open={refusOpen} onOpenChange={(o) => !submitting && setRefusOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la demande</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rdv-motif">Motif (min. 5 caractères)</Label>
            <Textarea
              id="rdv-motif"
              rows={3}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefusOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefuser}
              disabled={submitting || motif.trim().length < 5}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refuser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
