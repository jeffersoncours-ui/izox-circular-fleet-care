import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface CreerDemandeRdvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

type Plage = "matin" | "apres-midi" | "soir";
interface Creneau {
  date: Date | undefined;
  plage: Plage;
}

const PLAGE_LABEL: Record<Plage, string> = {
  matin: "Matin",
  "apres-midi": "Après-midi",
  soir: "Soir",
};

export function CreerDemandeRdvDialog({
  open,
  onOpenChange,
  onSubmitted,
}: CreerDemandeRdvDialogProps) {
  const [creneaux, setCreneaux] = useState<Creneau[]>([
    { date: undefined, plage: "matin" },
  ]);
  const [nbVehicules, setNbVehicules] = useState(1);
  const [commentaires, setCommentaires] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [openPicker, setOpenPicker] = useState<number | null>(null);

  const reset = () => {
    setCreneaux([{ date: undefined, plage: "matin" }]);
    setNbVehicules(1);
    setCommentaires("");
  };

  const updateCreneau = (i: number, patch: Partial<Creneau>) => {
    setCreneaux((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    );
  };

  const addCreneau = () => {
    if (creneaux.length >= 3) return;
    setCreneaux((prev) => [...prev, { date: undefined, plage: "matin" }]);
  };

  const removeCreneau = (i: number) => {
    setCreneaux((prev) => prev.filter((_, idx) => idx !== i));
  };

  const canSubmit =
    !!creneaux[0]?.date && nbVehicules >= 1 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload = creneaux
        .filter((c) => c.date)
        .map((c) => ({
          date: format(c.date!, "yyyy-MM-dd"),
          plage: c.plage,
        }));
      // NOTE c.11.2.1 partie 1/2 : signature RPC refactorée (p_vehicule_ids requis).
      // Le composant sera réécrit en PARTIE 2/2 pour collecter les véhicules.
      const { error } = await supabase.rpc("creer_demande_rdv", {
        p_vehicule_ids: [] as string[],
        p_creneaux_preferes: payload as any,
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
            Proposez jusqu'à 3 créneaux préférés. Notre équipe confirmera la
            disponibilité.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Créneaux préférés</Label>
            {creneaux.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_140px_auto] gap-2">
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
                        ? format(c.date, "dd/MM/yyyy", { locale: fr })
                        : `Date ${i + 1}${i === 0 ? " *" : ""}`}
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
                      disabled={(d) => d < new Date(new Date().toDateString())}
                      initialFocus
                      locale={fr}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <Select
                  value={c.plage}
                  onValueChange={(v) => updateCreneau(i, { plage: v as Plage })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PLAGE_LABEL) as Plage[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {PLAGE_LABEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            ))}
            {creneaux.length < 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCreneau}
                className="w-full"
              >
                <Plus className="h-4 w-4" /> Ajouter un créneau
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rdv-nb">Nombre de véhicules concernés</Label>
            <Input
              id="rdv-nb"
              type="number"
              min={1}
              value={nbVehicules}
              onChange={(e) => setNbVehicules(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rdv-comm">Commentaires (optionnel)</Label>
            <Textarea
              id="rdv-comm"
              value={commentaires}
              onChange={(e) => setCommentaires(e.target.value)}
              rows={3}
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
