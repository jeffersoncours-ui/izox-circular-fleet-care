import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Car, MapPin, MessageSquare, X, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AnnulerDemandeDialog } from "./AnnulerDemandeDialog";

interface DetailDemandeRdvDialogProps {
  demandeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type DemandeDetail = {
  id: string;
  statut: string;
  creneaux_preferes: Array<{ date: string; plage: string }> | unknown;
  date_confirmee?: string | null;
  assigned_date?: string | null;
  assigned_heure?: string | null;
  vehicule_ids: string[];
  commentaires?: string | null;
  adresse_intervention?: string | null;
  ville_intervention?: string | null;
  code_postal_intervention?: string | null;
  created_at: string;
  updated_at?: string | null;
};

type VehiculeMini = {
  id: string;
  immatriculation: string;
  marque?: string | null;
  modele?: string | null;
  type_pack_souhaite: string | null;
};

function formatDateFR(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatPackLabel(code: string | null): string {
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

function formatPlage(p: string): string {
  if (p === "matin") return "Matin";
  if (p === "apres-midi" || p === "apres_midi") return "Après-midi";
  if (p === "soir") return "Soir";
  return p;
}

function getStatutBadge(statut: string) {
  switch (statut) {
    case "en_attente":
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          En attente
        </Badge>
      );
    case "confirmee":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Confirmée
        </Badge>
      );
    case "refusee":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          Refusée
        </Badge>
      );
    case "annulee_client":
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          Annulée
        </Badge>
      );
    default:
      return <Badge variant="outline">{statut}</Badge>;
  }
}

export function DetailDemandeRdvDialog({
  demandeId,
  open,
  onOpenChange,
  onSuccess,
}: DetailDemandeRdvDialogProps) {
  const [demande, setDemande] = useState<DemandeDetail | null>(null);
  const [vehicules, setVehicules] = useState<VehiculeMini[]>([]);
  const [loading, setLoading] = useState(false);
  const [annulerOpen, setAnnulerOpen] = useState(false);

  useEffect(() => {
    if (!demandeId || !open) {
      setDemande(null);
      setVehicules([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: d, error: fetchError } = await supabase
          .from("demandes_rdv")
          .select(
            "id, statut, creneaux_preferes, date_confirmee, assigned_date, assigned_heure, vehicule_ids, commentaires, adresse_intervention, ville_intervention, code_postal_intervention, created_at, updated_at",
          )
          .eq("id", demandeId)
          .maybeSingle();
        if (fetchError) console.error("DetailDemandeRdvDialog fetch error:", fetchError);

        if (cancelled) return;
        if (d) {
          setDemande(d as unknown as DemandeDetail);
          const ids = (d as { vehicule_ids?: string[] }).vehicule_ids ?? [];
          if (ids.length > 0) {
            const { data: vehs } = await supabase
              .from("vehicules")
              .select("id, immatriculation, marque, modele, type_pack_souhaite")
              .in("id", ids);
            if (!cancelled && vehs) setVehicules(vehs as VehiculeMini[]);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [demandeId, open]);

  // Date confirmée : préférer assigned_date (date pure, sans décalage TZ) au
  // composant horaire de date_confirmee (= minuit UTC → 02:00 Paris, faux).
  const dateConfirmeeStr =
    demande?.assigned_date ??
    (demande?.date_confirmee ? demande.date_confirmee.slice(0, 10) : null);
  const heureConfirmee = demande?.assigned_heure
    ? demande.assigned_heure.slice(0, 5).replace(":", "h")
    : null;
  const creneaux = Array.isArray(demande?.creneaux_preferes)
    ? (demande!.creneaux_preferes as Array<{ date: string; plage: string }>)
    : [];

  // Annulable si le RDV est à plus de 48h (date assignée > demain).
  const annulable = (() => {
    if (!demande?.assigned_date) return true; // pas de date → on laisse annuler
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limite = new Date(today);
    limite.setDate(limite.getDate() + 1); // demain inclus = non annulable
    const dRdv = new Date(demande.assigned_date + "T00:00:00");
    return dRdv > limite;
  })();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3 pr-6">
              <DialogTitle>Détail de la demande</DialogTitle>
              {demande && getStatutBadge(demande.statut)}
            </div>
          </DialogHeader>

          {loading && !demande ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !demande ? (
            <p className="text-sm text-muted-foreground py-4">Demande introuvable.</p>
          ) : (
            <div className="space-y-4">
              {demande.statut === "confirmee" && dateConfirmeeStr ? (
                <div className="rounded-md border bg-green-50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Date confirmée</div>
                  <div className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDateFR(dateConfirmeeStr)}
                  </div>
                  {heureConfirmee && (
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <Clock className="h-3.5 w-3.5" />
                      {heureConfirmee}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    Créneaux proposés ({creneaux.length})
                  </div>
                  <div className="space-y-1">
                    {creneaux.map((c, idx) => (
                      <div key={idx} className="text-sm flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDateFR(c.date)} — {formatPlage(c.plage)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground mb-2">
                  Véhicule{vehicules.length > 1 ? "s" : ""} concerné
                  {vehicules.length > 1 ? "s" : ""} ({vehicules.length})
                </div>
                <div className="space-y-2">
                  {vehicules.map((v) => (
                    <div key={v.id} className="flex items-start gap-2">
                      <Car className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {v.immatriculation}
                          {v.marque && (
                            <span className="font-normal text-muted-foreground ml-2">
                              — {v.marque} {v.modele}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatPackLabel(v.type_pack_souhaite)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {demande.statut === "refusee" && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <div className="text-xs text-red-700 mb-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Demande refusée
                  </div>
                </div>
              )}

              {(demande.adresse_intervention || demande.ville_intervention) && (
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    Lieu d'intervention
                  </div>
                  <div className="text-sm">
                    {[
                      demande.adresse_intervention,
                      demande.code_postal_intervention,
                      demande.ville_intervention,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </div>
              )}

              {demande.commentaires && (
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Votre commentaire
                  </div>
                  <div className="text-sm">{demande.commentaires}</div>
                </div>
              )}

              <div className="text-xs text-muted-foreground border-t pt-3">
                Créée le {formatDateFR(demande.created_at)}
                {demande.updated_at && demande.updated_at !== demande.created_at && (
                  <> · Mise à jour le {formatDateFR(demande.updated_at)}</>
                )}
              </div>

              {demande.statut === "en_attente" && (
                <Button
                  variant="outline"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={() => setAnnulerOpen(true)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Annuler ma demande
                </Button>
              )}

              {demande.statut === "confirmee" && (
                annulable ? (
                  <Button
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    onClick={() => setAnnulerOpen(true)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Annuler ce rendez-vous
                  </Button>
                ) : (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      Annulation impossible à moins de 48h du rendez-vous.
                      Contactez IZOX pour toute modification.
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {demande && (
        <AnnulerDemandeDialog
          open={annulerOpen}
          onOpenChange={setAnnulerOpen}
          demandeId={demande.id}
          demandeType="rdv"
          onSuccess={() => {
            onSuccess?.();
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
}
