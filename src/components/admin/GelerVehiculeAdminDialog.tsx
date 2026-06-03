import { useState } from "react";
import { format, isToday, isBefore, startOfToday } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, Snowflake } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

interface GelerVehiculeAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehiculeId: string;
  immatriculation: string;
  onDone?: () => void;
}

export function GelerVehiculeAdminDialog({
  open,
  onOpenChange,
  vehiculeId,
  immatriculation,
  onDone,
}: GelerVehiculeAdminDialogProps) {
  const [dateDebut, setDateDebut] = useState<Date | undefined>(new Date());
  const [dateFin, setDateFin] = useState<Date | undefined>(undefined);
  const [motif, setMotif] = useState("");
  const [debutOpen, setDebutOpen] = useState(false);
  const [finOpen, setFinOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetState = () => {
    setDateDebut(new Date());
    setDateFin(undefined);
    setMotif("");
  };

  const isImmediat = dateDebut ? isToday(dateDebut) || isBefore(dateDebut, startOfToday()) : true;

  const canSubmit =
    !!dateDebut &&
    !!dateFin &&
    dateFin > dateDebut &&
    motif.trim().length >= 10 &&
    !submitting;

  const handleConfirm = async () => {
    if (!canSubmit || !dateDebut || !dateFin) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("geler_vehicule_admin", {
        p_vehicule_id: vehiculeId,
        p_date_debut: format(dateDebut, "yyyy-MM-dd"),
        p_date_fin: format(dateFin, "yyyy-MM-dd"),
        p_motif: motif.trim(),
      });

      if (error) throw error;

      toast.success(
        isImmediat
          ? `Véhicule ${immatriculation} gelé`
          : `Gel programmé pour le ${format(dateDebut, "dd/MM/yyyy", { locale: fr })}`,
      );

      onDone?.();
      onOpenChange(false);
      resetState();
    } catch (err: any) {
      toast.error(`Erreur : ${err?.message ?? "inconnue"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Snowflake className="h-5 w-5 text-sky-500" />
            Geler le véhicule
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Le véhicule{" "}
                <span className="font-semibold text-foreground font-mono">
                  {immatriculation}
                </span>{" "}
                sera exclu de la facturation pendant la période de gel.
              </p>
              {dateDebut && (
                <Badge
                  variant="secondary"
                  className={cn(
                    isImmediat
                      ? "bg-sky-100 text-sky-700"
                      : "bg-amber-100 text-amber-700",
                  )}
                >
                  {isImmediat ? "Gel immédiat" : "Gel programmé"}
                </Badge>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
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
                      if (dateFin && d && dateFin <= d) setDateFin(undefined);
                      setDebutOpen(false);
                    }}
                    disabled={(date) => isBefore(date, startOfToday())}
                    initialFocus
                    locale={fr}
                    className="p-3 pointer-events-auto"
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
                    disabled={(date) => (dateDebut ? date <= dateDebut : false)}
                    initialFocus
                    locale={fr}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gel-motif">Motif (min. 10 caractères)</Label>
            <Textarea
              id="gel-motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex : sinistre, réparation longue durée, demande client…"
              rows={3}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={!canSubmit}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isImmediat ? (
              "Geler maintenant"
            ) : (
              "Programmer le gel"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
