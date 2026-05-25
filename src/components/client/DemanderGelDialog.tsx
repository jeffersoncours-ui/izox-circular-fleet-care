import { useEffect, useMemo, useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, Snowflake } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
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
import { QuotaGelDecompose } from "@/components/client/QuotaGelDecompose";

interface Vehicule {
  id: string;
  immatriculation: string;
  type_pack_souhaite: string | null;
}

interface DemanderGelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contratId: string;
  entrepriseId: string;
  onSubmitted?: () => void;
  defaultVehiculeId?: string;
}

const SUGGESTIONS = [
  "Absence prolongée du chauffeur",
  "Véhicule en réparation",
  "Difficultés financières temporaires",
];

export function DemanderGelDialog({
  open,
  onOpenChange,
  contratId,
  entrepriseId,
  onSubmitted,
  defaultVehiculeId,
}: DemanderGelDialogProps) {
  const [type, setType] = useState<"contrat" | "vehicules">(
    defaultVehiculeId ? "vehicules" : "contrat",
  );
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    defaultVehiculeId ? [defaultVehiculeId] : [],
  );
  const [dateDebut, setDateDebut] = useState<Date | undefined>();
  const [dateFin, setDateFin] = useState<Date | undefined>();
  const [debutOpen, setDebutOpen] = useState(false);
  const [finOpen, setFinOpen] = useState(false);
  const [motif, setMotif] = useState("");
  const [quota, setQuota] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: vehData }, { data: q }] = await Promise.all([
        supabase
          .from("vehicules")
          .select("id, immatriculation, type_pack_souhaite")
          .eq("contrat_id", contratId)
          .eq("statut", "actif")
          .order("immatriculation"),
        supabase.rpc("calculer_quota_gel_consomme", {
          p_entreprise_id: entrepriseId,
        }),
      ]);
      setVehicules((vehData ?? []) as Vehicule[]);
      setQuota(typeof q === "number" ? q : 0);
    })();
  }, [open, contratId, entrepriseId]);

  const reset = () => {
    setType(defaultVehiculeId ? "vehicules" : "contrat");
    setSelectedIds(defaultVehiculeId ? [defaultVehiculeId] : []);
    setDateDebut(undefined);
    setDateFin(undefined);
    setMotif("");
  };

  const duree = useMemo(() => {
    if (!dateDebut || !dateFin) return 0;
    return differenceInCalendarDays(dateFin, dateDebut) + 1;
  }, [dateDebut, dateFin]);

  const quotaApresValidation = quota + duree;
  const dureeInvalide = duree > 0 && (duree < 14 || duree > 90);
  const quotaDepasse = quotaApresValidation > 90;
  const motifValide = motif.trim().length >= 10;
  const vehiculesValide = type === "contrat" || selectedIds.length > 0;
  const datesValides =
    !!dateDebut && !!dateFin && dateFin > dateDebut && duree >= 14 && duree <= 90;

  const canSubmit =
    datesValides && motifValide && vehiculesValide && !quotaDepasse && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("demander_gel", {
        p_contrat_id: contratId,
        p_type_demande: type,
        p_vehicule_ids: type === "vehicules" ? selectedIds : [],
        p_date_debut: format(dateDebut!, "yyyy-MM-dd"),
        p_date_fin: format(dateFin!, "yyyy-MM-dd"),
        p_motif: motif.trim(),
      });
      if (error) throw error;
      toast.success("Demande envoyée — Notification adressée à votre équipe IZOX");
      reset();
      onOpenChange(false);
      onSubmitted?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de l'envoi de la demande");
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
          <DialogTitle className="flex items-center gap-2">
            <Snowflake className="h-5 w-5 text-blue-600" /> Demander un gel
          </DialogTitle>
          <DialogDescription>
            Votre demande sera examinée par votre équipe IZOX. Durée 14 à 90
            jours, plafond annuel 90 jours glissants.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type */}
          <div className="space-y-2">
            <Label>Type de gel</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as "contrat" | "vehicules")}
              className="grid gap-2"
            >
              <label className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent/40">
                <RadioGroupItem value="contrat" />
                <span className="text-sm">Tout le contrat (suspension complète)</span>
              </label>
              <label className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent/40">
                <RadioGroupItem value="vehicules" />
                <span className="text-sm">Véhicules spécifiques</span>
              </label>
            </RadioGroup>
          </div>

          {/* Vehicules */}
          {type === "vehicules" && (
            <div className="space-y-2">
              <Label>Véhicules à geler</Label>
              <ScrollArea className="h-48 rounded-md border p-2">
                {vehicules.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    Aucun véhicule actif disponible.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {vehicules.map((v) => {
                      const checked = selectedIds.includes(v.id);
                      return (
                        <li key={v.id}>
                          <label className="flex items-center gap-2 p-2 rounded hover:bg-accent/40 cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(c) => {
                                setSelectedIds((prev) =>
                                  c
                                    ? [...prev, v.id]
                                    : prev.filter((i) => i !== v.id),
                                );
                              }}
                            />
                            <span className="text-sm">
                              {v.immatriculation}
                              {v.type_pack_souhaite && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  · Pack{" "}
                                  <span className="capitalize">
                                    {v.type_pack_souhaite}
                                  </span>
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
          )}

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Popover open={debutOpen} onOpenChange={setDebutOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateDebut && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateDebut
                      ? format(dateDebut, "dd/MM/yyyy", { locale: fr })
                      : "Choisir"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateDebut}
                    onSelect={(d) => {
                      setDateDebut(d);
                      setDebutOpen(false);
                    }}
                    disabled={(d) => d < new Date(new Date().toDateString())}
                    initialFocus
                    locale={fr}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Popover open={finOpen} onOpenChange={setFinOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFin && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFin
                      ? format(dateFin, "dd/MM/yyyy", { locale: fr })
                      : "Choisir"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFin}
                    onSelect={(d) => {
                      setDateFin(d);
                      setFinOpen(false);
                    }}
                    disabled={(d) => (dateDebut ? d <= dateDebut : false)}
                    initialFocus
                    locale={fr}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Indicateur durée + quota */}
          {duree > 0 && (
            <Alert variant={quotaDepasse || dureeInvalide ? "destructive" : "default"}>
              <AlertDescription className="space-y-1 text-xs">
                <div>
                  Durée demandée :{" "}
                  <strong>
                    {duree} jour{duree > 1 ? "s" : ""}
                  </strong>{" "}
                  · Quota consommé sur 365j :{" "}
                  <strong>{quota}/90</strong>
                </div>
                {dureeInvalide && (
                  <div>
                    ⚠{" "}
                    {duree < 14
                      ? "Durée minimale 14 jours"
                      : "Durée maximale 90 jours"}
                  </div>
                )}
                {quotaDepasse && !dureeInvalide && (
                  <div>
                    ⚠ Dépassement quota annuel ({quotaApresValidation}/90 après
                    validation)
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Motif */}
          <div className="space-y-2">
            <Label htmlFor="gel-motif">Motif (min. 10 caractères)</Label>
            <Textarea
              id="gel-motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={3}
              placeholder="Précisez le contexte de votre demande…"
            />
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setMotif(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
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
