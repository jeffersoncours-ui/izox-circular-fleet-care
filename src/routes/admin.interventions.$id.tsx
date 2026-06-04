import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Check, X, Loader2, ShieldCheck, CalendarClock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { sendEmail } from "@/lib/email";
import { generateImpactRecords } from "@/lib/impact";
import { toast } from "sonner";
import {
  statutColor,
  statutLabel,
  zonesFor,
  CHECKLIST_INTERIEUR,
  CHECKLIST_EXTERIEUR,
  type Statut,
  type Moment,
} from "@/lib/interventions";
import { getPackLabel } from "@/lib/pricing";
import { PageHeader } from "@/components/ui/page-header";

export const Route = createFileRoute("/admin/interventions/$id")({
  component: AdminInterventionDetail,
});

interface Operator {
  id: string;
  name: string;
  color_hex: string;
}

const TIME_SLOT_LABEL: Record<string, string> = {
  morning: "Matin (08h – 12h)",
  afternoon: "Après-midi (14h – 18h)",
};

interface InterventionFull {
  id: string;
  statut: Statut;
  type_prestation: string;
  demande_rdv_id: string | null;
  date_intervention: string | null;
  time_slot: string | null;
  heure_intervention: string | null;
  operator_id: string | null;
  adresse_intervention: string | null;
  ville_intervention: string | null;
  code_postal_intervention: string | null;
  notes_operateur: string | null;
  signature_url: string | null;
  motif_refus: string | null;
  controle_objets_valeur: boolean;
  controle_degradations: boolean;
  degradations_description: string | null;
  controle_cles_documents: boolean;
  cles_documents_localisation: string | null;
  checklist_interieur: Record<string, string | null>;
  checklist_exterieur: Record<string, string | null>;
  vehicules: { immatriculation: string; marque: string | null; modele: string | null } | null;
  entreprises: { nom: string } | null;
}

interface PhotoEntry {
  zone: string;
  moment: Moment;
  url: string;
  signedUrl: string | null;
}

function AdminInterventionDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [data, setData] = useState<InterventionFull | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [motif, setMotif] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: row } = await supabase
      .from("interventions")
      .select("*, vehicules(immatriculation, marque, modele), entreprises(nom)")
      .eq("id", id)
      .maybeSingle();
    if (!row) {
      toast.error("Fiche introuvable");
      navigate({ to: "/admin/planning", search: { tab: "interventions" } });
      return;
    }
    setData(row as unknown as InterventionFull);

    // Charger l'opérateur si assigné
    const operatorId = (row as unknown as InterventionFull).operator_id;
    if (operatorId) {
      const { data: opRow } = await supabase
        .from("operators")
        .select("id, name, color_hex")
        .eq("id", operatorId)
        .maybeSingle();
      setOperator(opRow ?? null);
    } else {
      setOperator(null);
    }

    const { data: ph } = await supabase
      .from("intervention_photos")
      .select("zone, moment, url")
      .eq("intervention_id", id);

    const list: PhotoEntry[] = [];
    for (const p of (ph as { zone: string; moment: Moment; url: string }[]) || []) {
      const { data: signed } = await supabase.storage
        .from("interventions")
        .createSignedUrl(p.url, 3600);
      list.push({ ...p, signedUrl: signed?.signedUrl ?? null });
    }
    setPhotos(list);

    if (row.signature_url) {
      const { data: sig } = await supabase.storage
        .from("interventions")
        .createSignedUrl(row.signature_url, 3600);
      setSignatureUrl(sig?.signedUrl ?? null);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const validate = async () => {
    if (!data) return;
    setWorking(true);
    const { error } = await supabase
      .from("interventions")
      .update({
        statut: "validee",
        validated_at: new Date().toISOString(),
        validated_by: user?.id ?? null,
        motif_refus: null,
      })
      .eq("id", data.id);
    setWorking(false);
    if (error) {
      toast.error("Validation impossible");
      return;
    }
    sendEmail("intervention_close", data.id);
    generateImpactRecords(data.id);
    toast.success("Fiche validée");
    load();
  };

  const refuse = async () => {
    if (!data) return;
    if (!motif.trim()) {
      toast.error("Motif obligatoire");
      return;
    }
    setWorking(true);
    const { error } = await supabase
      .from("interventions")
      .update({ statut: "en_cours", motif_refus: motif.trim() })
      .eq("id", data.id);
    setWorking(false);
    if (error) {
      toast.error("Refus impossible");
      return;
    }
    toast.success("Fiche renvoyée à l'opérateur");
    setRefuseOpen(false);
    setMotif("");
    load();
  };

  if (loading || !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const typeScope = (t: string) => {
    if (t === "exterieur" || t === "interieur" || t === "complet")
      return t as "exterieur" | "interieur" | "complet";
    // pack_* → complet par défaut pour l'affichage checklists/photos
    return "complet" as const;
  };

  const zones = zonesFor(typeScope(data.type_prestation));
  const photoOf = (zone: string, moment: Moment) =>
    photos.find((p) => p.zone === zone && p.moment === moment);

  const showInt = typeScope(data.type_prestation) !== "exterieur";
  const showExt = typeScope(data.type_prestation) !== "interieur";

  // Le compte-rendu (contrôle, photos, checklists, notes, signature) n'a de sens
  // qu'une fois la prestation effectuée par l'opérateur. Avant (planifiee/en_cours),
  // ces sections n'afficheraient que des cadres vides — on les masque côté admin.
  const todayIso = new Date().toISOString().slice(0, 10);
  const prestationFaite = ["en_revision", "validee", "refusee"].includes(data.statut);

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        crumbs={["Admin", "Interventions"]}
        title={data.vehicules?.immatriculation ?? "Intervention"}
        sub={[
          data.entreprises?.nom,
          [data.vehicules?.marque, data.vehicules?.modele].filter(Boolean).join(" ") || "—",
          data.date_intervention,
        ]
          .filter(Boolean)
          .join(" · ")}
        right={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/admin/planning", search: { tab: "interventions" } })}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
        }
      />
      <div className="p-4 md:p-8 max-w-5xl w-full mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Badge className={statutColor(data.statut)} variant="outline">
          {statutLabel(data.statut)}
        </Badge>
        <Badge variant="secondary">{getPackLabel(data.type_prestation)}</Badge>
      </div>

      {/* Section planification */}
      {(data.date_intervention || data.adresse_intervention || operator) && (
        <Card className="p-5 shadow-card mb-5">
          <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" /> Planification
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {operator && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Opérateur</p>
                <p className="font-medium flex items-center gap-1.5">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: operator.color_hex }}
                  />
                  {operator.name}
                </p>
              </div>
            )}
            {data.date_intervention && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Date & créneau</p>
                <p className="font-medium">{data.date_intervention}</p>
                {data.time_slot && (
                  <p className="text-xs text-muted-foreground">
                    {TIME_SLOT_LABEL[data.time_slot] ?? data.time_slot}
                    {data.heure_intervention && ` · ${data.heure_intervention.slice(0, 5)}`}
                  </p>
                )}
              </div>
            )}
            {(data.adresse_intervention || data.ville_intervention) && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Lieu d'intervention
                </p>
                <p className="font-medium">
                  {[
                    data.adresse_intervention,
                    data.code_postal_intervention,
                    data.ville_intervention,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            )}
          </div>

          {/* Replanifier l'heure : admin only, RDV planifié et daté dans le futur.
              Interdit le jour J / en cours (verrou aussi appliqué côté RPC). */}
          {profile?.role === "admin" &&
            data.demande_rdv_id &&
            data.statut === "planifiee" &&
            (!data.date_intervention || data.date_intervention > todayIso) && (
              <div className="mt-4 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    navigate({
                      to: "/admin/planning",
                      search: { tab: "demandes", demande: data.demande_rdv_id! },
                    })
                  }
                >
                  <CalendarClock className="h-4 w-4 mr-1" /> Modifier l'horaire du RDV
                </Button>
              </div>
            )}
        </Card>
      )}

      {/* Compte-rendu d'intervention : visible uniquement une fois la prestation
          effectuée (en_revision / validee / refusee). */}
      {!prestationFaite && data.statut !== "refusee" && (
        <Card className="p-5 shadow-card mb-5 border-dashed">
          <p className="text-sm text-muted-foreground">
            Le compte-rendu (contrôle, photos, checklists, signature) sera disponible
            une fois la prestation effectuée par l'opérateur.
          </p>
        </Card>
      )}

      {/* Pré-intervention */}
      {prestationFaite && (
      <Card className="p-5 shadow-card mb-5">
        <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" /> Contrôle pré-intervention
        </h2>
        <div className="space-y-2 text-sm">
          <PreItem ok={data.controle_objets_valeur} label="Absence d'objets de valeur vérifiée" />
          <PreItem
            ok={data.controle_degradations}
            label="Dégradations préexistantes signalées"
            detail={data.degradations_description}
          />
          <PreItem
            ok={data.controle_cles_documents}
            label="Localisation clés et documents notée"
            detail={data.cles_documents_localisation}
          />
        </div>
      </Card>
      )}

      {/* Photos */}
      {prestationFaite && (
      <Card className="p-5 shadow-card mb-5">
        <h2 className="font-bold text-foreground mb-4">Photos avant / après</h2>
        <div className="space-y-6">
          {zones.map((z) => {
            const av = photoOf(z.key, "avant");
            const ap = photoOf(z.key, "apres");
            return (
              <div key={z.key}>
                <p className="font-semibold text-sm text-foreground mb-2">{z.label}</p>
                <div className="grid grid-cols-2 gap-3">
                  <PhotoView label="Avant" url={av?.signedUrl ?? null} />
                  <PhotoView label="Après" url={ap?.signedUrl ?? null} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      )}

      {/* Checklists */}
      {prestationFaite && (showInt || showExt) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {showInt && (
            <Card className="p-5 shadow-card">
              <h3 className="font-bold text-foreground mb-3">Checklist intérieur</h3>
              <ul className="space-y-1.5 text-sm">
                {CHECKLIST_INTERIEUR.map((c) => {
                  const ts = data.checklist_interieur?.[c.key];
                  return (
                    <li key={c.key} className="flex justify-between gap-2">
                      <span className={ts ? "text-foreground" : "text-muted-foreground"}>
                        {ts ? "✓" : "○"} {c.label}
                      </span>
                      {ts && <span className="text-xs text-muted-foreground">{fmtTime(ts)}</span>}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
          {showExt && (
            <Card className="p-5 shadow-card">
              <h3 className="font-bold text-foreground mb-3">Checklist extérieur</h3>
              <ul className="space-y-1.5 text-sm">
                {CHECKLIST_EXTERIEUR.map((c) => {
                  const ts = data.checklist_exterieur?.[c.key];
                  return (
                    <li key={c.key} className="flex justify-between gap-2">
                      <span className={ts ? "text-foreground" : "text-muted-foreground"}>
                        {ts ? "✓" : "○"} {c.label}
                      </span>
                      {ts && <span className="text-xs text-muted-foreground">{fmtTime(ts)}</span>}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Notes & signature */}
      {prestationFaite && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <Card className="p-5 shadow-card">
          <h3 className="font-bold text-foreground mb-2">Notes opérateur</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {data.notes_operateur || "—"}
          </p>
        </Card>
        <Card className="p-5 shadow-card">
          <h3 className="font-bold text-foreground mb-2">Signature</h3>
          {signatureUrl ? (
            <img
              src={signatureUrl}
              alt="signature"
              className="bg-white border border-border rounded-lg w-full max-h-40 object-contain"
            />
          ) : (
            <p className="text-sm text-muted-foreground">Aucune signature.</p>
          )}
        </Card>
      </div>
      )}

      {data.statut === "refusee" || data.motif_refus ? (
        <Card className="p-4 shadow-card mb-5 border-red-300 bg-red-50">
          <p className="text-sm font-semibold text-red-900">Motif de refus</p>
          <p className="text-sm text-red-900">{data.motif_refus}</p>
        </Card>
      ) : null}

      {/* Actions */}
      {data.statut === "en_revision" && (
        <div className="sticky bottom-4 z-10 flex gap-2 bg-background p-3 rounded-lg shadow-lg border border-border">
          <Button
            variant="outline"
            className="flex-1 h-12 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
            onClick={() => setRefuseOpen(true)}
            disabled={working}
          >
            <X className="h-4 w-4 mr-1" /> Refuser
          </Button>
          <Button variant="izox" className="flex-1 h-12" onClick={validate} disabled={working}>
            {working ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" /> Valider
              </>
            )}
          </Button>
        </div>
      )}

      <Dialog open={refuseOpen} onOpenChange={setRefuseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la fiche</DialogTitle>
            <DialogDescription>
              Indiquez le motif. La fiche repassera en "en cours" pour correction par l'opérateur.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motif *</Label>
            <Textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={4}
              placeholder="Précisez ce qui doit être corrigé..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefuseOpen(false)} disabled={working}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={refuse} disabled={working || !motif.trim()}>
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer le refus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

function PreItem({ ok, label, detail }: { ok: boolean; label: string; detail?: string | null }) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={`h-5 w-5 rounded-full flex items-center justify-center text-white text-xs shrink-0 mt-0.5 ${
          ok ? "bg-primary" : "bg-muted-foreground/40"
        }`}
      >
        {ok ? <Check className="h-3 w-3" /> : "·"}
      </span>
      <div>
        <p className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</p>
        {detail && <p className="text-xs text-muted-foreground italic mt-0.5">« {detail} »</p>}
      </div>
    </div>
  );
}

function PhotoView({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/40">
      {url ? (
        <img src={url} alt={label} className="w-full h-full object-cover" />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          —
        </div>
      )}
      <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded">
        {label}
      </span>
    </div>
  );
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
