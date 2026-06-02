import { useState, useEffect, useCallback } from "react";
import {
  startOfISOWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  endOfISOWeek,
  format,
  addDays,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  MapPin,
} from "lucide-react";
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

interface OccupancyRow {
  intervention_date: string;
  time_slot: string;
  count: number;
}

const MAX_PER_SLOT = 3;

const TIME_SLOTS = [
  { key: "morning", label: "Matin", sublabel: "08h – 12h" },
  { key: "afternoon", label: "Après-midi", sublabel: "14h – 18h" },
] as const;

function isMatin(plage: string): boolean {
  const p = (plage || "").toLowerCase();
  return p.includes("matin") || p === "am" || p.startsWith("mat");
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
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfISOWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [occupancy, setOccupancy] = useState<OccupancyRow[]>([]);
  const [loadingOccupancy, setLoadingOccupancy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refusOpen, setRefusOpen] = useState(false);
  const [motif, setMotif] = useState("");

  const weekEnd = addDays(currentWeekStart, 4);
  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfISOWeek(currentWeekStart),
  }).slice(0, 5);

  const weekStartStr = format(currentWeekStart, "yyyy-MM-dd");

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any)("operators").select("*").order("name").then(({ data }: { data: unknown }) => {
      setOperators((data ?? []) as Operator[]);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setSelectedOperator("");
    setSelectedDate("");
    setSelectedSlot("");
    setRefusOpen(false);
    setMotif("");
    setCurrentWeekStart(startOfISOWeek(new Date()));
  }, [open, demande]);

  const loadOccupancy = useCallback(async () => {
    if (!selectedOperator) return;
    setLoadingOccupancy(true);
    const weekEndStr = format(addDays(new Date(weekStartStr), 4), "yyyy-MM-dd");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.rpc as any)("get_slot_occupancy", {
      p_operator_id: selectedOperator,
      p_date_debut: weekStartStr,
      p_date_fin: weekEndStr,
    });
    setOccupancy((data ?? []) as OccupancyRow[]);
    setLoadingOccupancy(false);
  }, [selectedOperator, weekStartStr]);

  useEffect(() => {
    loadOccupancy();
  }, [loadOccupancy]);

  const getCount = (date: string, slot: string): number => {
    const row = occupancy.find(
      (o) => o.intervention_date === date && o.time_slot === slot
    );
    return row ? Number(row.count) : 0;
  };

  const isFull = (date: string, slot: string) => getCount(date, slot) >= MAX_PER_SLOT;

  const nbVehicules = demande?.vehicule_ids?.length ?? 0;
  const hasVehicules = nbVehicules > 0;

  const canConfirm =
    !!selectedOperator &&
    !!selectedDate &&
    !!selectedSlot &&
    hasVehicules &&
    !submitting;

  const handleConfirm = async () => {
    if (!canConfirm || !demande) return;
    setSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("assigner_rdv", {
        p_demande_id: demande.id,
        p_operator_id: selectedOperator,
        p_date: selectedDate,
        p_time_slot: selectedSlot,
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

  if (!demande) return null;

  const op = operators.find((o) => o.id === selectedOperator);
  const creneaux: Array<{ date: string; plage: string }> = Array.isArray(demande.creneaux_preferes)
    ? demande.creneaux_preferes
    : [];

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
                  <p className="text-xs text-muted-foreground mb-1">Créneaux préférés du client</p>
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
                </div>
              )}

              {demande.commentaires && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Commentaires</p>
                  <p className="text-xs italic">{demande.commentaires}</p>
                </div>
              )}
            </div>

            {!hasVehicules && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                Aucun véhicule n'est associé à cette demande. Impossible de planifier
                une intervention.
              </div>
            )}

            {/* Operator selection */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">1. Sélectionner un opérateur</p>
              <div className="grid grid-cols-3 gap-2">
                {operators.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => {
                      setSelectedOperator(op.id);
                      setSelectedDate("");
                      setSelectedSlot("");
                    }}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-colors text-center ${
                      selectedOperator === op.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: op.color_hex }}
                    >
                      {op.initials}
                    </div>
                    <span className="text-xs font-medium leading-tight">{op.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mini weekly calendar */}
            {selectedOperator && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">2. Sélectionner un créneau</p>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentWeekStart((w) => subWeeks(w, 1))}
                    className="p-1 rounded hover:bg-muted/50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {format(currentWeekStart, "d MMM", { locale: fr })} –{" "}
                    {format(weekEnd, "d MMM yyyy", { locale: fr })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentWeekStart((w) => addWeeks(w, 1))}
                    className="p-1 rounded hover:bg-muted/50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {loadingOccupancy ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          <th className="p-1 text-left text-muted-foreground w-20" />
                          {weekDays.map((day) => (
                            <th key={day.toISOString()} className="p-1 text-center">
                              <div className="font-semibold capitalize">
                                {format(day, "EEE", { locale: fr })}
                              </div>
                              <div className="text-muted-foreground">
                                {format(day, "d/MM")}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {TIME_SLOTS.map((slot) => (
                          <tr key={slot.key}>
                            <td className="p-1 border-t border-border">
                              <div className="font-medium">{slot.label}</div>
                              <div className="text-muted-foreground text-[10px]">
                                {slot.sublabel}
                              </div>
                            </td>
                            {weekDays.map((day) => {
                              const dateStr = format(day, "yyyy-MM-dd");
                              const full = isFull(dateStr, slot.key);
                              const count = getCount(dateStr, slot.key);
                              const isSelected =
                                selectedDate === dateStr && selectedSlot === slot.key;

                              return (
                                <td key={day.toISOString()} className="p-1 border-t border-border">
                                  <button
                                    type="button"
                                    disabled={full}
                                    onClick={() => {
                                      setSelectedDate(dateStr);
                                      setSelectedSlot(slot.key);
                                    }}
                                    className={`w-full h-10 rounded-md border-2 flex flex-col items-center justify-center transition-colors ${
                                      isSelected
                                        ? "border-primary bg-primary/10"
                                        : full
                                        ? "border-border bg-muted/30 cursor-not-allowed opacity-50"
                                        : "border-green-500/50 bg-green-50 hover:bg-green-100 cursor-pointer"
                                    }`}
                                  >
                                    <span className="text-[10px] font-semibold">
                                      {count}/{MAX_PER_SLOT}
                                    </span>
                                    {isSelected && (
                                      <CheckCircle2 className="h-3 w-3 text-primary" />
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Recap */}
            {canConfirm && op && (
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
                  <span className="font-medium">
                    {format(new Date(selectedDate), "EEEE d MMMM yyyy", { locale: fr })}
                  </span>
                </p>
                <p>
                  Créneau :{" "}
                  <span className="font-medium">
                    {TIME_SLOTS.find((s) => s.key === selectedSlot)?.label} (
                    {TIME_SLOTS.find((s) => s.key === selectedSlot)?.sublabel})
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

      {/* Refusal sub-dialog */}
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
