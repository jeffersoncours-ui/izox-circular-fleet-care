/**
 * GererDemandeRdvDialog
 * ---------------------
 * Principe métier : l'admin VALIDE ou REFUSE une demande client.
 * Pour les demandes multi-véhicules (1 à N véhicules sur le même créneau),
 * TOUS les véhicules sont traités lors d'une même visite terrain — l'équipe
 * enchaîne les véhicules sur site. Aucun choix "véhicule à traiter en premier" :
 * c'est une décision opérationnelle terrain, pas une décision admin.
 *
 * Appel RPC unifié : `confirmer_demande_rdv_multi` (crée 1 à N interventions
 * atomiquement sur un créneau commun, peu importe le nombre de véhicules).
 */
import { useEffect, useMemo, useState } from "react";
import { parseISO } from "date-fns";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, CheckCircle2, XCircle, Lock } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  vehicule_ids?: string[] | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demande: AdminDemandeRdv | null;
  onProcessed?: () => void;
}

interface VehiculeDemande {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  type_pack_souhaite: string | null;
}

interface Creneau {
  date: string;
  plage: string;
}

const HEURES_MATIN = [
  "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30",
];
const HEURES_AM = [
  "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30",
];

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

function formatPlageLabel(plage: string): string {
  return isMatin(plage) ? "Matin (8h00 – 12h00)" : "Après-midi (14h00 – 18h00)";
}

function formatPackLabel(code: string | null | undefined): string {
  switch (code) {
    case "pack_interieur":
      return "Pack Intérieur";
    case "pack_standard":
      return "Pack Standard";
    case "pack_vtc":
      return "Pack VTC/Taxi";
    default:
      return code ?? "—";
  }
}

export function GererDemandeRdvDialog({
  open,
  onOpenChange,
  demande,
  onProcessed,
}: Props) {
  const [vehiculesDemande, setVehiculesDemande] = useState<VehiculeDemande[]>([]);
  const [creneauChoisiIdx, setCreneauChoisiIdx] = useState(0);
  const [heure, setHeure] = useState<string>("");
  const [refusOpen, setRefusOpen] = useState(false);
  const [motif, setMotif] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const creneaux: Creneau[] = useMemo(
    () => (Array.isArray(demande?.creneaux_preferes) ? demande!.creneaux_preferes : []),
    [demande],
  );

  const creneauChoisi = creneaux[creneauChoisiIdx];
  const matin = creneauChoisi ? isMatin(creneauChoisi.plage) : true;
  const heuresOptions = matin ? HEURES_MATIN : HEURES_AM;

  useEffect(() => {
    if (!demande || !open) return;
    setCreneauChoisiIdx(0);
    setRefusOpen(false);
    setMotif("");
  }, [demande, open]);

  useEffect(() => {
    setHeure(matin ? "09:00" : "14:00");
  }, [creneauChoisiIdx, matin]);

  useEffect(() => {
    if (!demande || !open) return;
    const ids = demande.vehicule_ids ?? [];
    if (ids.length === 0) {
      setVehiculesDemande([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("vehicules")
        .select("id, immatriculation, marque, modele, type_pack_souhaite")
        .in("id", ids);
      setVehiculesDemande((data ?? []) as VehiculeDemande[]);
    })();
  }, [demande, open]);

  if (!demande) return null;

  const canConfirm =
    !!creneauChoisi &&
    heure.length > 0 &&
    vehiculesDemande.length > 0 &&
    !submitting;

  const handleConfirmer = async () => {
    if (!canConfirm || !creneauChoisi) return;
    setSubmitting(true);
    try {
      const iso = new Date(`${creneauChoisi.date}T${heure}:00`).toISOString();
      const { error } = await supabase.rpc("confirmer_demande_rdv_multi", {
        p_demande_id: demande.id,
        p_date_intervention: iso,
      });
      if (error) throw error;
      toast.success(
        vehiculesDemande.length === 1
          ? "RDV confirmé"
          : `RDV confirmé — ${vehiculesDemande.length} interventions planifiées`,
      );
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

  const noVehiculeIds = (demande.vehicule_ids ?? []).length === 0;

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
              <p className="text-muted-foreground text-xs mb-1">
                Créneaux préférés du client
              </p>
              <ul className="bg-muted/40 rounded p-2 text-xs space-y-0.5">
                {creneaux.length === 0 ? (
                  <li className="italic text-muted-foreground">Aucun</li>
                ) : (
                  creneaux.map((c, i) => (
                    <li key={i}>
                      · {formatDateFR(c.date)} — {isMatin(c.plage) ? "matin" : "après-midi"}
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

            {creneaux.length > 1 && (
              <div className="space-y-2">
                <Label className="text-xs">Créneau client à confirmer</Label>
                <RadioGroup
                  value={String(creneauChoisiIdx)}
                  onValueChange={(v) => setCreneauChoisiIdx(Number(v))}
                  className="gap-2"
                >
                  {creneaux.map((c, i) => (
                    <label
                      key={i}
                      htmlFor={`creneau-${i}`}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/40"
                    >
                      <RadioGroupItem id={`creneau-${i}`} value={String(i)} />
                      <span className="text-sm">
                        Créneau {i + 1} — {formatDateFR(c.date)} ·{" "}
                        {isMatin(c.plage) ? "matin" : "après-midi"}
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {creneauChoisi && (
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <span className="text-xs text-muted-foreground">Date confirmée</span>
                <div className="font-semibold capitalize">
                  {formatDateFR(creneauChoisi.date)}
                </div>
                <span className="text-xs text-muted-foreground mt-0.5 block">
                  {formatPlageLabel(creneauChoisi.plage)}
                </span>
              </div>
            )}

            {creneauChoisi && (
              <div className="space-y-1">
                <Label className="text-xs">Heure exacte d'arrivée</Label>
                <Select value={heure} onValueChange={setHeure}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une heure" />
                  </SelectTrigger>
                  <SelectContent>
                    {heuresOptions.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  Plage du créneau : {matin ? "8h00 – 12h00" : "14h00 – 18h00"}
                </span>
              </div>
            )}

            {/* B.4 — Véhicules en lecture seule, tous affichés avec leur pack */}
            {noVehiculeIds ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                Aucun véhicule n'est associé à cette demande. Impossible de confirmer.
              </div>
            ) : vehiculesDemande.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">
                Chargement des véhicules…
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs">
                  Véhicules à traiter ({vehiculesDemande.length})
                </Label>
                <div className="rounded-md border bg-muted/30 px-3 py-2 space-y-3">
                  {vehiculesDemande.map((vehicule) => (
                    <div key={vehicule.id} className="flex items-start gap-3">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0" />
                      <div className="flex-1">
                        <div className="font-semibold text-sm">
                          {vehicule.immatriculation}
                          {(vehicule.marque || vehicule.modele) && (
                            <span className="text-muted-foreground font-normal ml-2">
                              — {vehicule.marque} {vehicule.modele}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Pack : {formatPackLabel(vehicule.type_pack_souhaite)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {vehiculesDemande.length > 1 && (
                  <p className="text-xs text-muted-foreground italic">
                    L'équipe traitera les {vehiculesDemande.length} véhicules lors
                    de la même visite, dans l'ordre opérationnel optimal.
                  </p>
                )}
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
            <Button onClick={handleConfirmer} disabled={!canConfirm}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {vehiculesDemande.length <= 1
                    ? "Confirmer le RDV"
                    : `Confirmer le RDV (${vehiculesDemande.length} interventions seront créées)`}
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
