import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, Calendar as CalendarIcon, Info, Loader2, MapPin, Phone, Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
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

interface OccupancyRow {
  slot_date: string;
  time_slot: string;
  nb_interventions: number;
  capacite_totale: number;
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
    { date: undefined, creneau: "matin" },
  ]);
  const [occupancy, setOccupancy] = useState<OccupancyRow[]>([]);
  const [adresseIntervention, setAdresseIntervention] = useState("");
  const [villeIntervention, setVilleIntervention] = useState("");
  const [codePostalIntervention, setCodePostalIntervention] = useState("");
  const [telephoneIntervention, setTelephoneIntervention] = useState("");
  const [commentaires, setCommentaires] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [openPicker, setOpenPicker] = useState<number | null>(null);

  const minDate = useMemo(() => getMinDateSelectable(), [open]);
  const maxDate = useMemo(() => getMaxDateSelectable(), [open]);

  // Load vehicules + max + entreprise address + occupancy
  useEffect(() => {
    const entrepriseId = profile?.entreprise_id;
    if (!open || !entrepriseId) return;
    (async () => {
      const [{ data: vehData }, { data: maxData }, { data: entData }, { data: occData }] =
        await Promise.all([
          supabase
            .from("vehicules")
            .select("id, immatriculation, marque, modele")
            .eq("entreprise_id", entrepriseId)
            .eq("statut", "actif")
            .order("immatriculation"),
          supabase.rpc("get_max_vehicules_par_demande"),
          supabase
            .from("entreprises")
            .select("adresse, ville, code_postal, telephone")
            .eq("id", entrepriseId)
            .maybeSingle(),
          supabase.rpc("get_creneaux_disponibles", {
            p_date_debut: format(minDate, "yyyy-MM-dd"),
            p_date_fin: format(maxDate, "yyyy-MM-dd"),
          } as any),
        ]);
      setVehicules((vehData ?? []) as VehiculeOption[]);
      if (typeof maxData === "number" && maxData > 0) setMaxVehicules(maxData);
      if (entData) {
        setAdresseIntervention((entData as any).adresse ?? "");
        setVilleIntervention((entData as any).ville ?? "");
        setCodePostalIntervention((entData as any).code_postal ?? "");
        setTelephoneIntervention((entData as any).telephone ?? "");
      }
      setOccupancy((occData ?? []) as OccupancyRow[]);
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
    setCreneaux([
      { date: undefined, creneau: "matin" },
      { date: undefined, creneau: "matin" },
    ]);
    setOccupancy([]);
    setAdresseIntervention("");
    setVilleIntervention("");
    setCodePostalIntervention("");
    setTelephoneIntervention("");
    setCommentaires("");
  };

  // Occupancy helpers — mapping DB slots (morning/afternoon) ↔ form (matin/apres_midi)
  const isSlotSature = (dateStr: string, creneauId: CreneauId): boolean => {
    const slot = creneauId === "matin" ? "morning" : "afternoon";
    const found = occupancy.find((o) => o.slot_date === dateStr && o.time_slot === slot);
    return (found?.nb_interventions ?? 0) >= (found?.capacite_totale ?? 2);
  };

  const isDateFullySature = (date: Date): boolean => {
    const d = format(date, "yyyy-MM-dd");
    return isSlotSature(d, "matin") && isSlotSature(d, "apres_midi");
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
    if (creneaux.length <= 2) return;
    setCreneaux((prev) => prev.filter((_, idx) => idx !== i));
  };

  const creneauxRemplis = creneaux.filter((c) => c.date);
  const hasCreneauxIncomplets = creneaux.some((c) => !c.date);
  // Same-day check: two créneaux on the same date are forbidden (regardless of half-day)
  const hasSameDayCreneaux = (() => {
    const dates = creneauxRemplis.map((c) => format(c.date!, "yyyy-MM-dd"));
    return new Set(dates).size !== dates.length;
  })();

  const canSubmit =
    selectedVehiculeIds.length >= 1 &&
    selectedVehiculeIds.length <= maxVehicules &&
    creneauxRemplis.length >= 2 &&
    !hasSameDayCreneaux &&
    !hasCreneauxIncomplets &&
    adresseIntervention.trim().length > 0 &&
    villeIntervention.trim().length > 0 &&
    codePostalIntervention.trim().length > 0 &&
    telephoneIntervention.trim().length > 0 &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // Geocoding fire-and-forget — does not block the demande if Nominatim is unavailable
      let lat: number | null = null;
      let lon: number | null = null;
      try {
        const { data: geoData } = await supabase.functions.invoke("geocode-address", {
          body: {
            adresse: adresseIntervention.trim(),
            ville: villeIntervention.trim(),
            code_postal: codePostalIntervention.trim(),
          },
        });
        lat = geoData?.latitude ?? null;
        lon = geoData?.longitude ?? null;
      } catch {
        // Géocodage optionnel — la demande est créée même sans coords
      }

      const payload: CreneauPrefere[] = creneauxRemplis.map((c) => ({
        date: format(c.date!, "yyyy-MM-dd"),
        creneau: c.creneau,
      }));
      const { error } = await supabase.rpc("creer_demande_rdv", {
        p_vehicule_ids: selectedVehiculeIds,
        p_creneaux_preferes: formatCreneauxPourRPC(payload) as any,
        p_commentaires: commentaires.trim(),
        p_adresse_intervention: adresseIntervention.trim(),
        p_ville_intervention: villeIntervention.trim(),
        p_code_postal_intervention: codePostalIntervention.trim(),
        p_latitude: lat,
        p_longitude: lon,
        p_telephone: telephoneIntervention.trim(),
      } as any);
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
            et proposez au moins 2 créneaux sur des <strong>jours différents</strong> (jusqu'à 3 maximum).
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
            {selectedVehiculeIds.length === 2 && (
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  Les <strong>2 véhicules</strong> seront traités{" "}
                  <strong>lors du même passage</strong>. L'équipe interviendra à
                  l'heure exacte communiquée par l'admin après validation, et
                  enchaînera les véhicules sur place.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Lieu de l'intervention */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              Lieu de l'intervention *
            </Label>
            <p className="text-xs text-muted-foreground">
              Pré-rempli avec l'adresse de votre entreprise — modifiable si la flotte est ailleurs.
            </p>
            <Input
              placeholder="Adresse *"
              value={adresseIntervention}
              onChange={(e) => setAdresseIntervention(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Code postal *"
                value={codePostalIntervention}
                onChange={(e) => setCodePostalIntervention(e.target.value)}
              />
              <Input
                placeholder="Ville *"
                value={villeIntervention}
                onChange={(e) => setVilleIntervention(e.target.value)}
              />
            </div>
            <Label className="flex items-center gap-1 pt-1">
              <Phone className="h-3.5 w-3.5" />
              Téléphone de contact *
            </Label>
            <p className="text-xs text-muted-foreground -mt-1">
              Pré-rempli depuis votre profil — modifiable si besoin.
            </p>
            <Input
              type="tel"
              placeholder="Téléphone *"
              value={telephoneIntervention}
              onChange={(e) => setTelephoneIntervention(e.target.value)}
            />
          </div>

          {/* Créneaux */}
          <div className="space-y-2">
            <Label>Créneaux préférés *</Label>
            {creneaux.map((c, i) => {
              const dateStr = c.date ? format(c.date, "yyyy-MM-dd") : null;
              return (
                <div
                  key={i}
                  className={cn(
                    "space-y-2 rounded-md border p-2",
                    !c.date && "border-orange-300 bg-orange-50",
                  )}
                >
                  {!c.date && (
                    <p className="text-xs text-orange-700 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Veuillez sélectionner une date pour ce créneau
                    </p>
                  )}
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
                            : `Choisir une date *`}
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
                          disabled={(d) =>
                            !isDateSelectable(d) || d > maxDate || isDateFullySature(d)
                          }
                          fromDate={minDate}
                          toDate={maxDate}
                          fromMonth={minDate}
                          toMonth={maxDate}
                          defaultMonth={minDate}
                          initialFocus
                          locale={fr}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    {creneaux.length > 2 ? (
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
                    {CRENEAUX_HORAIRES.map((h) => {
                      const sature = dateStr ? isSlotSature(dateStr, h.id as CreneauId) : false;
                      return (
                        <label
                          key={h.id}
                          className={cn(
                            "flex items-center gap-2 rounded-md border p-2 text-xs",
                            sature
                              ? "opacity-50 cursor-not-allowed bg-muted"
                              : "cursor-pointer hover:bg-accent/40",
                          )}
                        >
                          <RadioGroupItem value={h.id} disabled={sature} />
                          {h.label}
                          {sature && (
                            <span className="ml-auto text-muted-foreground">(Complet)</span>
                          )}
                        </label>
                      );
                    })}
                  </RadioGroup>
                  {dateStr && isSlotSature(dateStr, c.creneau) && (
                    <p className="text-xs text-amber-700 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Ce créneau est complet. Veuillez choisir une autre demi-journée ou une autre date.
                    </p>
                  )}
                </div>
              );
            })}
            {creneaux.length < 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCreneau}
                className="w-full"
              >
                <Plus className="h-4 w-4" /> Ajouter un troisième créneau
              </Button>
            )}
            {hasSameDayCreneaux && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Deux créneaux sont le même jour. Veuillez choisir des jours différents.
                </AlertDescription>
              </Alert>
            )}
            <Alert>
              <AlertDescription className="text-xs">
                <strong>
                  Sélection possible jusqu'au{" "}
                  {format(maxDate, "d MMMM yyyy", { locale: fr })}
                </strong>{" "}
                (fin du mois en cours, hors weekends et jours fériés).
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
              placeholder="Précisions sur le contexte, contact sur place, etc."
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
