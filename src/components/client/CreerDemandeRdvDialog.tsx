import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, Calendar as CalendarIcon, Info, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  CRENEAUX_HORAIRES,
  type CreneauId,
  type CreneauPrefere,
  formatCreneauxPourRPC,
  getMaxDateSelectable,
  getMinDateSelectable,
  isDateSelectable,
} from "@/lib/calendrier-contraintes";

interface CreerDemandeRdvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
  defaultVehiculeId?: string;
}

interface VehiculeOption {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
}

interface CreneauForm {
  date: Date | undefined;
  creneau: CreneauId;
}

export function CreerDemandeRdvDialog({
  open,
  onOpenChange,
  onSubmitted,
  defaultVehiculeId,
}: CreerDemandeRdvDialogProps) {
  const { profile } = useAuth();
  const [vehicules, setVehicules] = useState<VehiculeOption[]>([]);
  const [selectedVehiculeIds, setSelectedVehiculeIds] = useState<string[]>(
    defaultVehiculeId ? [defaultVehiculeId] : [],
  );
  const [maxVehicules, setMaxVehicules] = useState<number>(2);
  const [creneaux, setCreneaux] = useState<CreneauForm[]>([
    { date: undefined, creneau: "matin" },
  ]);
  const [commentaires, setCommentaires] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [openPicker, setOpenPicker] = useState<number | null>(null);

  // Load vehicules + max
  useEffect(() => {
    const entrepriseId = profile?.entreprise_id;
    if (!open || !entrepriseId) return;
    (async () => {
      const [{ data: vehData }, { data: maxData }] = await Promise.all([
        supabase
          .from("vehicules")
          .select("id, immatriculation, marque, modele")
          .eq("entreprise_id", entrepriseId)
          .eq("statut", "actif")
          .order("immatriculation"),
        supabase.rpc("get_max_vehicules_par_demande"),
      ]);
      setVehicules((vehData ?? []) as VehiculeOption[]);
      if (typeof maxData === "number" && maxData > 0) setMaxVehicules(maxData);
    })();
  }, [open, profile?.entreprise_id]);

  // Reset selection on open with default
  useEffect(() => {
    if (open) {
      setSelectedVehiculeIds(defaultVehiculeId ? [defaultVehiculeId] : []);
    }
  }, [open, defaultVehiculeId]);

  const reset = () => {
    setSelectedVehiculeIds(defaultVehiculeId ? [defaultVehiculeId] : []);
    setCreneaux([{ date: undefined, creneau: "matin" }]);
    setCommentaires("");
  };

  const toggleVehicule = (id: string, checked: boolean) => {
    setSelectedVehiculeIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        if (prev.length >= maxVehicules) {
          toast.warning(
            `Maximum ${maxVehicules} véhicule${maxVehicules > 1 ? "s" : ""} par demande`,
          );
          return prev;
        }
        return [...prev, id];
      }
      return prev.filter((v) => v !== id);
    });
  };

  const updateCreneau = (i: number, patch: Partial<CreneauForm>) => {
    setCreneaux((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    );
  };
  const addCreneau = () => {
    if (creneaux.length >= 3) return;
    setCreneaux((prev) => [...prev, { date: undefined, creneau: "matin" }]);
  };
  const removeCreneau = (i: number) => {
    setCreneaux((prev) => prev.filter((_, idx) => idx !== i));
  };

  const minDate = useMemo(() => getMinDateSelectable(), [open]);
  const maxDate = useMemo(() => getMaxDateSelectable(), [open]);

  const creneauxRemplis = creneaux.filter((c) => c.date);
  const canSubmit =
    selectedVehiculeIds.length >= 1 &&
    selectedVehiculeIds.length <= maxVehicules &&
    creneauxRemplis.length >= 1 &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload: CreneauPrefere[] = creneauxRemplis.map((c) => ({
        date: format(c.date!, "yyyy-MM-dd"),
        creneau: c.creneau,
      }));
      const { error } = await supabase.rpc("creer_demande_rdv", {
        p_vehicule_ids: selectedVehiculeIds,
        p_creneaux_preferes: formatCreneauxPourRPC(payload) as any,
        p_commentaires: commentaires.trim(),
      });
      if (error) throw error;
      toast.success("Demande de rendez-vous envoyée");
      reset();
      onOpenChange(false);
      onSubmitted?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!submitting) onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Demander un rendez-vous</DialogTitle>
          <DialogDescription>
            Sélectionnez jusqu'à {maxVehicules} véhicule{maxVehicules > 1 ? "s" : ""}{" "}
            et proposez jusqu'à 3 créneaux préférés.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vehicules */}
          <div className="space-y-2">
            <Label>
              Véhicules concernés ({selectedVehiculeIds.length}/{maxVehicules})
            </Label>
            <ScrollArea className="h-40 rounded-md border p-2">
              {vehicules.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  Aucun véhicule actif disponible.
                </p>
              ) : (
                <ul className="space-y-1">
                  {vehicules.map((v) => {
                    const checked = selectedVehiculeIds.includes(v.id);
                    const disabled =
                      !checked && selectedVehiculeIds.length >= maxVehicules;
                    return (
                      <li key={v.id}>
                        <label
                          className={cn(
                            "flex items-center gap-2 p-2 rounded hover:bg-accent/40 cursor-pointer",
                            disabled && "opacity-50 cursor-not-allowed",
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            disabled={disabled}
                            onCheckedChange={(c) => toggleVehicule(v.id, !!c)}
                          />
                          <span className="text-sm">
                            <span className="font-medium">{v.immatriculation}</span>
                            {(v.marque || v.modele) && (
                              <span className="text-muted-foreground">
                                {" "}
                                · {[v.marque, v.modele].filter(Boolean).join(" ")}
                              </span>
                            )}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>

          {/* Créneaux */}
          <div className="space-y-2">
            <Label>Créneaux préférés *</Label>
            {creneaux.map((c, i) => (
              <div key={i} className="space-y-2 rounded-md border p-2">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Popover
                    open={openPicker === i}
                    onOpenChange={(o) => setOpenPicker(o ? i : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !c.date && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {c.date
                          ? format(c.date, "EEEE d MMMM yyyy", { locale: fr })
                          : `Choisir une date${i === 0 ? " *" : ""}`}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={c.date}
                        onSelect={(d) => {
                          updateCreneau(i, { date: d });
                          setOpenPicker(null);
                        }}
                        disabled={(d) => !isDateSelectable(d)}
                        fromDate={minDate}
                        toDate={maxDate}
                        initialFocus
                        locale={fr}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  {i > 0 ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCreneau(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="w-9" />
                  )}
                </div>
                <RadioGroup
                  value={c.creneau}
                  onValueChange={(v) =>
                    updateCreneau(i, { creneau: v as CreneauId })
                  }
                  className="grid grid-cols-2 gap-2"
                >
                  {CRENEAUX_HORAIRES.map((h) => (
                    <label
                      key={h.id}
                      className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent/40 text-xs"
                    >
                      <RadioGroupItem value={h.id} />
                      {h.label}
                    </label>
                  ))}
                </RadioGroup>
              </div>
            ))}
            {creneaux.length < 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCreneau}
                className="w-full"
              >
                <Plus className="h-4 w-4" /> Ajouter un autre créneau
              </Button>
            )}
            <Alert>
              <AlertDescription className="text-xs">
                Sélection possible du{" "}
                <strong>{format(minDate, "d MMM yyyy", { locale: fr })}</strong>{" "}
                au <strong>{format(maxDate, "d MMM yyyy", { locale: fr })}</strong>.
                Hors weekends et jours fériés.
              </AlertDescription>
            </Alert>
          </div>

          {/* Commentaires */}
          <div className="space-y-2">
            <Label htmlFor="rdv-comm">
              Commentaires (optionnel — {commentaires.length}/500)
            </Label>
            <Textarea
              id="rdv-comm"
              value={commentaires}
              onChange={(e) => setCommentaires(e.target.value.slice(0, 500))}
              rows={3}
              maxLength={500}
              placeholder="Précisions sur le lieu, contact, etc."
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Envoyer la demande"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
