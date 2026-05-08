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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
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
  const [type, setType] = useState<"programme" | "sinistre">("programme");
  const [dateDebut, setDateDebut] = useState<Date | undefined>(new Date());
  const [dateFin, setDateFin] = useState<Date | undefined>(undefined);
  const [dureeIndeterminee, setDureeIndeterminee] = useState(false);
  const [commentaire, setCommentaire] = useState("");
  const [notifierClient, setNotifierClient] = useState(true);
  const [debutOpen, setDebutOpen] = useState(false);
  const [finOpen, setFinOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetState = () => {
    setType("programme");
    setDateDebut(new Date());
    setDateFin(undefined);
    setDureeIndeterminee(false);
    setCommentaire("");
    setNotifierClient(true);
  };

  const handleConfirm = async () => {
    if (!contrat) return;

    if (!dateDebut) {
      toast.error("Veuillez saisir une date de début");
      return;
    }
    if (!dureeIndeterminee && !dateFin) {
      toast.error('Veuillez saisir une date de fin ou cocher "Durée indéterminée"');
      return;
    }
    if (!dureeIndeterminee && dateFin && dateFin <= dateDebut) {
      toast.error("La date de fin doit être postérieure à la date de début");
      return;
    }

    setSubmitting(true);
    try {
      const finIso =
        dureeIndeterminee || !dateFin ? null : format(dateFin, "yyyy-MM-dd");
      const debutIso = format(dateDebut, "yyyy-MM-dd");

      const { error: updateError } = await supabase
        .from("contrats")
        .update({
          gel_actif: true,
          statut: "en_cours_gel",
          gel_type: type,
          gel_date_debut: debutIso,
          gel_date_fin: finIso,
          gel_commentaire: commentaire.trim() || null,
          gel_notifier_client: notifierClient,
        })
        .eq("id", contrat.id);

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from("admin_actions_log")
        .insert({
          action: "gel_contrat",
          details: {
            contrat_id: contrat.id,
            numero_contrat: contrat.numero_contrat,
            gel_type: type,
            gel_date_debut: debutIso,
            gel_date_fin: finIso,
            duree_indeterminee: dureeIndeterminee,
            commentaire: commentaire.trim() || null,
            notifier_client: notifierClient,
          },
          nb_entites_impactees: 1,
        });

      if (logError) {
        console.error("Erreur log mais gel appliqué :", logError);
      }

      toast.success(
        `Contrat ${contrat.numero_contrat} placé en veille temporaire`
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
                sera placé en statut « En veille temporaire ».
              </p>
              <p>
                Les véhicules restent rattachés mais les passages facturés
                cesseront d'être programmés pendant cette période. Vous pouvez
                réactiver le contrat à tout moment.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Type */}
          <div className="space-y-2">
            <Label>Type de mise en veille</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as "programme" | "sinistre")}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            >
              <label
                htmlFor="gel-type-programme"
                className="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent/40"
              >
                <RadioGroupItem value="programme" id="gel-type-programme" className="mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-foreground">Programmée</div>
                  <div className="text-xs text-muted-foreground">
                    Vacances, congés, demande anticipée
                  </div>
                </div>
              </label>
              <label
                htmlFor="gel-type-sinistre"
                className="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent/40"
              >
                <RadioGroupItem value="sinistre" id="gel-type-sinistre" className="mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-foreground">Sinistre</div>
                  <div className="text-xs text-muted-foreground">
                    Panne, accident, force majeure
                  </div>
                </div>
              </label>
            </RadioGroup>
          </div>

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
                      !dateDebut && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateDebut ? format(dateDebut, "dd/MM/yyyy", { locale: fr }) : "Choisir"}
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
              <Label>Date de fin prévue</Label>
              <Popover
                open={finOpen}
                onOpenChange={(o) => !dureeIndeterminee && setFinOpen(o)}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={dureeIndeterminee}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFin && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dureeIndeterminee
                      ? "Durée indéterminée"
                      : dateFin
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

          <div className="flex items-center gap-2">
            <Checkbox
              id="gel-duree-indet"
              checked={dureeIndeterminee}
              onCheckedChange={(c) => {
                const v = c === true;
                setDureeIndeterminee(v);
                if (v) setDateFin(undefined);
              }}
            />
            <Label htmlFor="gel-duree-indet" className="cursor-pointer text-sm font-normal">
              Durée indéterminée
            </Label>
          </div>

          {/* Commentaire */}
          <div className="space-y-2">
            <Label htmlFor="gel-commentaire">Commentaire (optionnel)</Label>
            <Textarea
              id="gel-commentaire"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Ex: Vacances du dirigeant 2-23 août, panne du Renault Master CT-AB-456..."
              rows={3}
            />
          </div>

          {/* Notifier client */}
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="gel-notifier" className="cursor-pointer">
                Notifier le client par email
              </Label>
              <Switch
                id="gel-notifier"
                checked={notifierClient}
                onCheckedChange={setNotifierClient}
              />
            </div>
            {notifierClient ? (
              <p className="text-xs text-muted-foreground">
                Le client sera informé de la mise en veille et des dates.
              </p>
            ) : (
              <p className="text-xs italic text-muted-foreground">
                Gel administratif interne, aucune notification.
              </p>
            )}
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
