import { useState } from "react";
import { format } from "date-fns";
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
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

export interface GelContratInput {
  id: string;
  numero_contrat: string | null;
  raison_sociale_client: string;
}

interface GelContratDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrat: GelContratInput | null;
  onGeled?: () => void;
}

export function GelContratDialog({
  open,
  onOpenChange,
  contrat,
  onGeled,
}: GelContratDialogProps) {
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

  const handleConfirm = async () => {
    if (!contrat) return;
    if (!dateDebut || !dateFin) {
      toast.error("Veuillez saisir les dates de début et de fin");
      return;
    }
    if (dateFin <= dateDebut) {
      toast.error("La date de fin doit être postérieure à la date de début");
      return;
    }
    if (motif.trim().length < 10) {
      toast.error("Motif min. 10 caractères");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("geler_contrat", {
        p_contrat_id: contrat.id,
        p_date_debut: format(dateDebut, "yyyy-MM-dd"),
        p_date_fin: format(dateFin, "yyyy-MM-dd"),
        p_motif: motif.trim(),
      });

      if (error) throw error;

      toast.success(
        `Contrat ${contrat.numero_contrat ?? ""} placé en veille temporaire`,
      );

      onGeled?.();
      onOpenChange(false);
      resetState();
    } catch (error: any) {
      console.error("Erreur gel contrat :", error);
      toast.error(`Erreur lors du gel : ${error?.message ?? "inconnue"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => !submitting && onOpenChange(o)}
    >
      <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Snowflake className="h-5 w-5 text-sky-500" />
            Mettre en veille temporaire
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Le contrat{" "}
                <span className="font-semibold text-foreground">
                  {contrat?.numero_contrat}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-foreground">
                  {contrat?.raison_sociale_client}
                </span>{" "}
                sera placé en « En gel ». Les véhicules sont marqués gelés et
                exclus de la facturation jusqu'à la date de fin.
              </p>
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
                      setDebutOpen(false);
                    }}
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
                    disabled={(date) => (dateDebut ? date <= dateDebut : false)}
                    initialFocus
                    locale={fr}
                    className={cn("p-3 pointer-events-auto")}
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
              placeholder="Ex: Vacances du dirigeant, panne véhicule, sinistre…"
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
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Confirmer la mise en veille"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
