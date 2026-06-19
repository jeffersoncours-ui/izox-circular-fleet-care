import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, User, Phone, Mail, MapPin, Car } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "@/lib/email";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ---------- types ----------

export interface ReservationB2C {
  id: string;
  created_at: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  ville: string;
  code_postal: string;
  vehicule: string;
  formule: string;
  options: unknown; // jsonb
  montant_ttc: number;
  creneaux_preferes: unknown; // jsonb
  statut: "en_attente_paiement" | "confirmee" | "annulee";
}

interface Operator {
  id: string;
  name: string;
  initials: string;
  color_hex: string;
}

interface CreneauPrefere {
  date: string;
  heure: string;
}

// ---------- helpers ----------

function heureToTimeSlot(heure: string): "morning" | "afternoon" {
  return parseInt(heure, 10) < 12 ? "morning" : "afternoon";
}

function parseOptions(options: unknown): string[] {
  if (Array.isArray(options)) return options as string[];
  if (typeof options === "string") {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseCreneaux(creneaux_preferes: unknown): CreneauPrefere[] {
  if (Array.isArray(creneaux_preferes)) return creneaux_preferes as CreneauPrefere[];
  if (typeof creneaux_preferes === "string") {
    try {
      const parsed = JSON.parse(creneaux_preferes);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function formatDateFr(dateStr: string) {
  return format(parseISO(dateStr), "EEEE d MMMM yyyy", { locale: fr });
}

function heureLabel(h: string) {
  return h.replace(":", "h");
}

const FORMULE_LABEL: Record<string, string> = {
  interieur: "Intérieur",
  interieur_exterieur: "Intérieur + Extérieur",
};

const OPTION_LABEL: Record<string, string> = {
  puzzi: "Puzzi injection-extraction",
  ozone: "Traitement ozone",
};

// ---------- component ----------

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: ReservationB2C | null;
  onConfirmed: () => void;
}

export function AssignerReservationB2CDialog({
  open,
  onOpenChange,
  reservation,
  onConfirmed,
}: Props) {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedCreneau, setSelectedCreneau] = useState<CreneauPrefere | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const [showCancel, setShowCancel] = useState(false);
  const [motifAnnulation, setMotifAnnulation] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("operators")
      .select("id, name, initials, color_hex")
      .order("name")
      .then(({ data }) => {
        setOperators((data as Operator[]) ?? []);
        if (data?.length) setSelectedOperatorId(data[0].id);
      });
    setSelectedCreneau(null);
    setShowCancel(false);
    setMotifAnnulation("");
  }, [open]);

  if (!reservation) return null;

  const creneaux = parseCreneaux(reservation.creneaux_preferes);
  const options = parseOptions(reservation.options);

  const handleConfirm = async () => {
    if (!selectedCreneau || !selectedOperatorId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("confirmer_reservation_b2c", {
        p_reservation_id: reservation.id,
        p_operator_id: selectedOperatorId,
        p_date: selectedCreneau.date,
        p_time_slot: heureToTimeSlot(selectedCreneau.heure),
        p_heure: selectedCreneau.heure,
      });
      if (error) throw error;
      // Fire-and-forget confirmation email to customer
      await sendEmail("reservation_b2c_confirmee", reservation.id);
      onConfirmed();
    } catch (err) {
      console.error(err);
      // Show error in dialog
      alert("Erreur lors de la confirmation. Vérifiez les logs.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (motifAnnulation.trim().length < 5) return;
    setCancelling(true);
    try {
      const { error } = await supabase.rpc("annuler_reservation_b2c", {
        p_reservation_id: reservation.id,
        p_motif: motifAnnulation.trim(),
      });
      if (error) throw error;
      onConfirmed();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'annulation.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Réservation B2C — {reservation.prenom} {reservation.nom}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Client info */}
          <div className="rounded-lg border bg-muted/20 p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span className="font-semibold text-foreground">
                {reservation.prenom} {reservation.nom}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span>{reservation.email}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>{reservation.telephone}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>
                {reservation.adresse}, {reservation.code_postal} {reservation.ville}
              </span>
            </div>
          </div>

          {/* Prestation */}
          <div className="rounded-lg border bg-muted/20 p-4 space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Car className="h-3.5 w-3.5" />
              <span className="font-semibold text-foreground capitalize">{reservation.vehicule}</span>
            </div>
            <p className="text-muted-foreground">
              {FORMULE_LABEL[reservation.formule] ?? reservation.formule}
              {options.length > 0 && (
                <> + {options.map((o) => OPTION_LABEL[o] ?? o).join(", ")}</>
              )}
            </p>
            <p className="font-bold text-primary text-base">{reservation.montant_ttc} € TTC</p>
          </div>

          {/* Créneau selection */}
          <div>
            <Label className="mb-2 block">Créneau à confirmer</Label>
            <div className="space-y-2">
              {creneaux.map((c, i) => {
                const isSelected =
                  selectedCreneau?.date === c.date && selectedCreneau?.heure === c.heure;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedCreneau(c)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {formatDateFr(c.date)} à{" "}
                    <span className={isSelected ? "text-primary font-semibold" : ""}>
                      {heureLabel(c.heure)}
                    </span>
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      {heureToTimeSlot(c.heure) === "morning" ? "Matin" : "Après-midi"}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Operator selection */}
          {operators.length > 0 && (
            <div>
              <Label className="mb-2 block">Opérateur assigné</Label>
              <div className="flex flex-wrap gap-2">
                {operators.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => setSelectedOperatorId(op.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                      selectedOperatorId === op.id
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span
                      className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ background: op.color_hex }}
                    >
                      {op.initials}
                    </span>
                    {op.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {!showCancel ? (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setShowCancel(true)}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Annuler la réservation…
              </button>
              <Button
                onClick={handleConfirm}
                disabled={!selectedCreneau || !selectedOperatorId || submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Confirmer
              </Button>
            </div>
          ) : (
            <div className="space-y-3 border-t pt-4">
              <Label htmlFor="motif-annul">Motif d'annulation *</Label>
              <Textarea
                id="motif-annul"
                value={motifAnnulation}
                onChange={(e) => setMotifAnnulation(e.target.value)}
                placeholder="Raison de l'annulation…"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCancel(false)}
                  className="flex-1"
                >
                  Retour
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={motifAnnulation.trim().length < 5 || cancelling}
                  className="flex-1"
                >
                  {cancelling && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Confirmer l'annulation
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
