import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, CheckCircle2, XCircle } from "lucide-react";
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

export interface AdminDemandeRdv {
  id: string;
  entreprise_id: string;
  entreprise_nom?: string | null;
  statut: string;
  creneaux_preferes: any;
  commentaires: string | null;
  nb_vehicules_rdv: number;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demande: AdminDemandeRdv | null;
  onProcessed?: () => void;
}

interface VehiculeOpt {
  id: string;
  immatriculation: string;
}
interface PackOpt {
  code: string;
  nom: string;
}

export function GererDemandeRdvDialog({
  open,
  onOpenChange,
  demande,
  onProcessed,
}: Props) {
  const [vehicules, setVehicules] = useState<VehiculeOpt[]>([]);
  const [packs, setPacks] = useState<PackOpt[]>([]);
  const [date, setDate] = useState<Date | undefined>();
  const [heure, setHeure] = useState("09:00");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [vehiculeId, setVehiculeId] = useState("");
  const [typePack, setTypePack] = useState("");
  const [refusOpen, setRefusOpen] = useState(false);
  const [motif, setMotif] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!demande || !open) return;
    setDate(undefined);
    setHeure("09:00");
    setVehiculeId("");
    setTypePack("");
    setRefusOpen(false);
    setMotif("");
    (async () => {
      const [vRes, pRes] = await Promise.all([
        supabase
          .from("vehicules")
          .select("id, immatriculation")
          .eq("entreprise_id", demande.entreprise_id)
          .eq("statut", "actif")
          .order("immatriculation"),
        supabase
          .from("prestations_catalogue")
          .select("code, nom")
          .order("nom"),
      ]);
      setVehicules((vRes.data ?? []) as VehiculeOpt[]);
      setPacks((pRes.data ?? []) as PackOpt[]);
    })();
  }, [demande, open]);

  if (!demande) return null;

  const creneaux: Array<{ date: string; plage: string }> = Array.isArray(
    demande.creneaux_preferes,
  )
    ? demande.creneaux_preferes
    : [];

  const canConfirm = !!date && !!vehiculeId && !!typePack && !submitting;

  const handleConfirmer = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      const iso = `${format(date!, "yyyy-MM-dd")}T${heure}:00`;
      const { error } = await supabase.rpc("confirmer_demande_rdv", {
        p_demande_id: demande.id,
        p_date_intervention: iso,
        p_vehicule_id: vehiculeId,
        p_type_pack: typePack,
      });
      if (error) throw error;
      toast.success("RDV confirmé. Intervention créée et notifiée au client.");
      onOpenChange(false);
      onProcessed?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de la confirmation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefuser = async () => {
    if (motif.trim().length < 5) {
      toast.error("Motif min. 5 caractères");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("refuser_demande_rdv", {
        p_demande_id: demande.id,
        p_motif: motif.trim(),
      });
      if (error) throw error;
      toast.success("Demande refusée.");
      setRefusOpen(false);
      onOpenChange(false);
      onProcessed?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors du refus");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        open={open && !refusOpen}
        onOpenChange={(o) => !submitting && onOpenChange(o)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Demande de rendez-vous</DialogTitle>
            <DialogDescription>
              {demande.entreprise_nom ?? "—"} ·{" "}
              {demande.nb_vehicules_rdv} véhicule
              {demande.nb_vehicules_rdv > 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Créneaux préférés du client</p>
              <ul className="bg-muted/40 rounded p-2 text-xs space-y-0.5">
                {creneaux.length === 0 ? (
                  <li className="italic text-muted-foreground">Aucun</li>
                ) : (
                  creneaux.map((c, i) => (
                    <li key={i}>
                      · {format(parseISO(c.date), "EEEE d MMM yyyy", { locale: fr })} —{" "}
                      {c.plage}
                    </li>
                  ))
                )}
              </ul>
            </div>
            {demande.commentaires && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">Commentaires</p>
                <p className="italic bg-muted/40 rounded p-2 text-xs">
                  {demande.commentaires}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3 border-t pt-3">
            <p className="text-sm font-semibold">Confirmer le RDV</p>
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd/MM/yyyy", { locale: fr }) : "Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      setDate(d);
                      setPickerOpen(false);
                    }}
                    initialFocus
                    locale={fr}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={heure}
                onChange={(e) => setHeure(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Véhicule</Label>
              <Select value={vehiculeId} onValueChange={setVehiculeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un véhicule" />
                </SelectTrigger>
                <SelectContent>
                  {vehicules.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.immatriculation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type de pack</Label>
              <Select value={typePack} onValueChange={setTypePack}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un pack" />
                </SelectTrigger>
                <SelectContent>
                  {packs.map((p) => (
                    <SelectItem key={p.code} value={p.code}>
                      {p.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="destructive"
              onClick={() => setRefusOpen(true)}
              disabled={submitting}
            >
              <XCircle className="h-4 w-4" /> Refuser
            </Button>
            <Button onClick={handleConfirmer} disabled={!canConfirm}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Confirmer le RDV
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button variant="outline" onClick={() => setRefusOpen(false)}>
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
