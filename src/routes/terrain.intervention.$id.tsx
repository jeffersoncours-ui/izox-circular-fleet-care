import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Check, AlertTriangle, MapPin, Clock, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/image";
import {
  zonesFor,
  typeScope,
  CHECKLIST_INTERIEUR,
  CHECKLIST_EXTERIEUR,
  type TypePrestation,
  type Statut,
  type Moment,
} from "@/lib/interventions";
import { getPackLabel } from "@/lib/pricing";
import { PhotoSlot, type UploadState } from "@/components/terrain/PhotoSlot";
import { SignaturePad, type SignaturePadHandle } from "@/components/terrain/SignaturePad";

export const Route = createFileRoute("/terrain/intervention/$id")({
  component: PageGuard,
});

function PageGuard() {
  return (
    <RoleGuard allowed={["operateur", "admin"]}>
      <InterventionStepper />
    </RoleGuard>
  );
}

interface InterventionRow {
  id: string;
  statut: Statut;
  type_prestation: string;
  vehicule_id: string;
  entreprise_id: string;
  operateur_id: string | null;
  operator_id: string | null;
  date_intervention: string | null;
  heure_intervention: string | null;
  time_slot: string | null;
  adresse_intervention: string | null;
  ville_intervention: string | null;
  code_postal_intervention: string | null;
  controle_objets_valeur: boolean;
  controle_degradations: boolean;
  degradations_description: string | null;
  controle_cles_documents: boolean;
  cles_documents_localisation: string | null;
  checklist_interieur: Record<string, string | null>;
  checklist_exterieur: Record<string, string | null>;
  notes_operateur: string | null;
  signature_url: string | null;
  motif_refus: string | null;
}

interface VehiculeRow {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  type_vehicule: string | null;
  entreprise_id: string;
  entreprises: { nom: string } | null;
}

interface PhotoRow {
  id: string;
  zone: string;
  moment: Moment;
  url: string;
}

interface PhotoState {
  state: UploadState;
  path: string | null;
  signedUrl: string | null;
  localPreview: string | null;
}

const lsKey = (id: string) => `izox_intervention_${id}`;

function formatHeure(h: string | null | undefined): string {
  if (!h) return "";
  return h.slice(0, 5);
}

function slotLabel(slot: string | null): string {
  if (!slot) return "";
  if (slot === "morning") return "Matin";
  if (slot === "afternoon") return "Après-midi";
  return slot;
}

// ─────────────────────────────────────────────
function InterventionStepper() {
  const { id } = Route.useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [intervention, setIntervention] = useState<InterventionRow | null>(null);
  const [vehicule, setVehicule] = useState<VehiculeRow | null>(null);
  const [photos, setPhotos] = useState<Record<string, PhotoState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [takingCharge, setTakingCharge] = useState(false);
  const sigRef = useRef<SignaturePadHandle>(null);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: int, error } = await supabase
        .from("interventions")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !int) {
        toast.error("Fiche introuvable");
        navigate({ to: "/terrain" });
        return;
      }
      setIntervention(int as unknown as InterventionRow);

      const { data: veh } = int.vehicule_id
        ? await supabase
            .from("vehicules")
            .select("id, immatriculation, marque, modele, type_vehicule, entreprise_id, entreprises(nom)")
            .eq("id", int.vehicule_id)
            .maybeSingle()
        : { data: null };
      if (!cancelled) setVehicule(veh as VehiculeRow | null);

      const { data: ph } = await supabase
        .from("intervention_photos")
        .select("id, zone, moment, url")
        .eq("intervention_id", id);

      const next: Record<string, PhotoState> = {};
      for (const p of (ph as PhotoRow[]) || []) {
        const k = `${p.zone}__${p.moment}`;
        const { data: signed } = await supabase.storage
          .from("interventions")
          .createSignedUrl(p.url, 3600);
        next[k] = { state: "done", path: p.url, signedUrl: signed?.signedUrl ?? null, localPreview: null };
      }
      if (!cancelled) setPhotos(next);

      if (int.signature_url) setHasSignature(true);

      try {
        const raw = localStorage.getItem(lsKey(id));
        if (raw) {
          const cached = JSON.parse(raw);
          if (typeof cached.step === "number") setStep(cached.step);
        }
      } catch { /* ignore */ }

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, navigate]);

  const persistLocal = useCallback(
    (patch: Partial<{ step: number }>) => {
      try {
        const raw = localStorage.getItem(lsKey(id));
        const cur = raw ? JSON.parse(raw) : {};
        localStorage.setItem(lsKey(id), JSON.stringify({ ...cur, ...patch, ts: Date.now() }));
      } catch { /* ignore */ }
    },
    [id]
  );

  const updateIntervention = useCallback(
    async (patch: Partial<InterventionRow>) => {
      if (!intervention) return;
      setIntervention({ ...intervention, ...patch });
      const { error } = await supabase
        .from("interventions")
        .update(patch as never)
        .eq("id", intervention.id);
      if (error) toast.error("Sauvegarde impossible");
    },
    [intervention]
  );

  const uploadPhoto = async (zoneKey: string, moment: Moment, file: File) => {
    if (!intervention) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Seules les images sont acceptées");
      return;
    }
    const k = `${zoneKey}__${moment}`;
    const localPreview = URL.createObjectURL(file);
    setPhotos((p) => ({ ...p, [k]: { state: "uploading", path: null, signedUrl: null, localPreview } }));
    try {
      const blob = await compressImage(file, { maxSize: 1200, quality: 0.85 });
      const path = `${intervention.id}/${zoneKey}_${moment}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("interventions")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;

      await supabase.from("intervention_photos").delete()
        .eq("intervention_id", intervention.id).eq("zone", zoneKey).eq("moment", moment);
      const { error: insErr } = await supabase.from("intervention_photos").insert({
        intervention_id: intervention.id, zone: zoneKey, moment, url: path,
      });
      if (insErr) throw insErr;

      const { data: signed } = await supabase.storage.from("interventions").createSignedUrl(path, 3600);
      setPhotos((p) => ({ ...p, [k]: { state: "done", path, signedUrl: signed?.signedUrl ?? null, localPreview } }));
    } catch {
      setPhotos((p) => ({ ...p, [k]: { ...(p[k] || { path: null, signedUrl: null, localPreview }), state: "error" } }));
      toast.error("Échec upload — réessayez en touchant la photo");
    }
  };

  const prendreEnCharge = async () => {
    if (!user || !intervention) return;
    setTakingCharge(true);
    try {
      const { error } = await supabase.rpc("prendre_en_charge_intervention", { p_intervention_id: id });
      if (error) throw error;
      setIntervention({ ...intervention, statut: "en_cours", operateur_id: user.id });
    } catch {
      toast.error("Impossible de prendre en charge");
    } finally {
      setTakingCharge(false);
    }
  };

  const scope = intervention ? typeScope(intervention.type_prestation) : "complet";
  const zones = useMemo(() => (intervention ? zonesFor(scope) : []), [intervention, scope]);

  const zoneComplete = useCallback((zKey: string) => {
    return photos[`${zKey}__avant`]?.state === "done" && photos[`${zKey}__apres`]?.state === "done";
  }, [photos]);

  const zonesComplete = useMemo(() => zones.filter((z) => zoneComplete(z.key)).length, [zones, zoneComplete]);

  const checklistInt = (intervention?.checklist_interieur || {}) as Record<string, string | null>;
  const checklistExt = (intervention?.checklist_exterieur || {}) as Record<string, string | null>;

  const showInterior = scope === "interieur" || scope === "complet";
  const showExterior = scope === "exterieur" || scope === "complet";

  const interiorComplete = !showInterior ? true : CHECKLIST_INTERIEUR.every((c) => !!checklistInt[c.key]);
  const exteriorComplete = !showExterior ? true : CHECKLIST_EXTERIEUR.every((c) => !!checklistExt[c.key]);

  const preControleOk =
    !!intervention &&
    intervention.controle_objets_valeur &&
    intervention.controle_degradations &&
    intervention.controle_cles_documents &&
    (!intervention.controle_degradations || !!intervention.degradations_description?.trim());

  const allZonesDone = zones.length > 0 && zonesComplete === zones.length;

  const canSubmit =
    preControleOk &&
    allZonesDone &&
    interiorComplete &&
    exteriorComplete &&
    hasSignature &&
    intervention?.statut !== "validee" &&
    intervention?.statut !== "en_revision";

  const goStep = (n: number) => {
    setStep(n);
    persistLocal({ step: n });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleChecklist = async (scope_: "int" | "ext", key: string, checked: boolean) => {
    if (!intervention) return;
    const target = scope_ === "int" ? { ...checklistInt } : { ...checklistExt };
    target[key] = checked ? new Date().toISOString() : null;
    await updateIntervention(
      scope_ === "int" ? { checklist_interieur: target as never } : { checklist_exterieur: target as never }
    );
  };

  const submit = async () => {
    if (!intervention || !canSubmit) return;
    setSubmitting(true);
    try {
      if (sigRef.current && !sigRef.current.isEmpty()) {
        const blob = await sigRef.current.toBlob();
        if (blob) {
          const path = `${intervention.id}/signature.png`;
          const { error: upErr } = await supabase.storage
            .from("interventions")
            .upload(path, blob, { upsert: true, contentType: "image/png" });
          if (upErr) throw upErr;
          await supabase.from("interventions").update({ signature_url: path }).eq("id", intervention.id);
        }
      }
      const { error } = await supabase
        .from("interventions")
        .update({ statut: "en_revision", submitted_at: new Date().toISOString() })
        .eq("id", intervention.id);
      if (error) throw error;
      try { localStorage.removeItem(lsKey(id)); } catch { /* ignore */ }
      toast.success("Fiche soumise pour validation");
      navigate({ to: "/terrain" });
    } catch {
      toast.error("Soumission impossible");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !intervention) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const readOnly = intervention.statut === "en_revision" || intervention.statut === "validee";
  const packLabel = getPackLabel(intervention.type_prestation);
  const entreprise = vehicule?.entreprises?.nom;
  const intNum = `#${id.slice(0, 8).toUpperCase()}`;

  // Vue planifiée — avant prise en charge
  if (intervention.statut === "planifiee") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-primary text-primary-foreground sticky top-0 z-20 px-4 py-3 flex items-center gap-3">
          <Button
            size="icon" variant="ghost"
            className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
            onClick={() => navigate({ to: "/terrain" })}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-xs opacity-70 font-mono">{intNum} · {profile?.prenom}</p>
          </div>
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs shrink-0">planifiée</Badge>
        </header>

        <main className="flex-1 px-4 py-6 max-w-xl mx-auto w-full space-y-4">
          {entreprise && packLabel && (
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {entreprise} · {packLabel}
            </p>
          )}
          <h1 className="text-2xl font-black text-foreground">
            {vehicule?.immatriculation}
            {vehicule?.modele ? <span className="font-normal"> · {vehicule.modele}</span> : null}
          </h1>

          <div className="rounded-xl bg-card border border-border divide-y divide-border">
            {intervention.date_intervention && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {new Date(intervention.date_intervention + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                  {intervention.heure_intervention && (
                    <p className="text-xs text-muted-foreground">
                      {formatHeure(intervention.heure_intervention)} · {slotLabel(intervention.time_slot)}
                    </p>
                  )}
                </div>
              </div>
            )}
            {intervention.adresse_intervention && (
              <div className="flex items-center gap-3 px-4 py-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{intervention.adresse_intervention}</p>
                  {(intervention.ville_intervention || intervention.code_postal_intervention) && (
                    <p className="text-xs text-muted-foreground">
                      {[intervention.code_postal_intervention, intervention.ville_intervention].filter(Boolean).join(" ")}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="h-4 w-4 text-muted-foreground shrink-0 text-xs font-bold flex items-center justify-center">🚗</div>
              <p className="text-sm text-foreground">
                {[vehicule?.marque, vehicule?.modele, vehicule?.type_vehicule].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          <Button
            variant="izox"
            className="w-full h-14 text-base font-bold"
            disabled={takingCharge}
            onClick={prendreEnCharge}
          >
            {takingCharge ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Play className="h-5 w-5 mr-2" />Prendre en charge</>}
          </Button>
        </main>
      </div>
    );
  }

  // ── Stepper normal (en_cours / en_revision / validee / refusee)
  const STEPS = [
    { n: 1, label: "PRÉ-CONTRÔLE" },
    { n: 2, label: "PHOTOS" },
    { n: 3, label: "SIGNATURE" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-20">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <Button
            size="icon" variant="ghost"
            className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
            onClick={() => navigate({ to: "/terrain" })}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-xs opacity-70 font-mono truncate">{intNum} · {profile?.prenom}</p>
            {entreprise && (
              <p className="text-xs opacity-70 truncate">
                {entreprise}{packLabel ? ` · ${packLabel}` : ""}
              </p>
            )}
          </div>
          <Badge
            className={cn(
              "text-xs shrink-0",
              intervention.statut === "en_cours" ? "bg-white/20 text-white border-white/30" :
              intervention.statut === "en_revision" ? "bg-amber-400/20 text-amber-100 border-amber-400/30" :
              intervention.statut === "validee" ? "bg-green-400/20 text-green-100 border-green-400/30" :
              "bg-red-400/20 text-red-100 border-red-400/30"
            )}
          >
            {intervention.statut === "en_cours" ? "en cours" :
             intervention.statut === "en_revision" ? "à valider" :
             intervention.statut === "validee" ? "validée" : "refusée"}
          </Badge>
        </div>

        {/* Titre véhicule */}
        <div className="px-4 pb-2">
          <p className="text-base font-black text-primary-foreground">
            {vehicule?.immatriculation}
            {vehicule?.modele ? <span className="font-semibold opacity-80"> · {vehicule.modele}</span> : null}
          </p>
        </div>

        {/* Stepper avec labels */}
        <div className="px-4 pb-3 grid grid-cols-3 gap-1.5">
          {STEPS.map(({ n, label }) => (
            <div key={n}>
              <div className={cn(
                "h-1 rounded-full mb-1.5",
                n <= step ? "bg-primary-foreground" : "bg-primary-foreground/25"
              )} />
              <p className={cn(
                "text-[9px] font-bold tracking-widest",
                n <= step ? "text-primary-foreground/90" : "text-primary-foreground/35"
              )}>
                {n} · {label}
              </p>
            </div>
          ))}
        </div>
      </header>

      {/* Refus banner */}
      {intervention.motif_refus && intervention.statut === "en_cours" && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex gap-2 items-start">
          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
          <div className="text-sm text-red-900">
            <p className="font-semibold">Corrections demandées :</p>
            <p>{intervention.motif_refus}</p>
          </div>
        </div>
      )}

      <main className="flex-1 px-4 py-5 max-w-2xl mx-auto w-full pb-28">
        {step === 1 && (
          <Step1 vehicule={vehicule} intervention={intervention} onChange={updateIntervention} readOnly={readOnly} />
        )}
        {step === 2 && (
          <Step2
            zones={zones}
            photos={photos}
            zonesComplete={zonesComplete}
            zoneComplete={zoneComplete}
            onPick={uploadPhoto}
            interiorChecklist={checklistInt}
            exteriorChecklist={checklistExt}
            showInterior={showInterior}
            showExterior={showExterior}
            onToggleChecklist={toggleChecklist}
            readOnly={readOnly}
          />
        )}
        {step === 3 && (
          <Step3
            intervention={intervention}
            onChange={updateIntervention}
            sigRef={sigRef}
            onSignatureChange={setHasSignature}
            readOnly={readOnly}
            preControleOk={preControleOk}
            interiorComplete={interiorComplete}
            exteriorComplete={exteriorComplete}
            allZonesDone={allZonesDone}
            hasSignature={hasSignature}
          />
        )}
      </main>

      {/* Footer sticky */}
      <footer className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 z-20">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => goStep(step - 1)} disabled={step === 1}>
            ← Précéd.
          </Button>
          {step < 3 && (
            <Button type="button" variant="izox" className="flex-1 h-12" onClick={() => goStep(step + 1)} disabled={step === 1 && !preControleOk}>
              Continuer →
            </Button>
          )}
          {step === 3 && (
            <Button type="button" variant="izox" className="flex-1 h-12" onClick={submit} disabled={!canSubmit || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Soumettre <Check className="h-4 w-4 ml-1" /></>}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 1 — Pré-contrôle
// ─────────────────────────────────────────────
function Step1({
  vehicule, intervention, onChange, readOnly,
}: {
  vehicule: VehiculeRow | null;
  intervention: InterventionRow;
  onChange: (p: Partial<InterventionRow>) => Promise<void>;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-card border border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Véhicule</p>
        <p className="text-xl font-black text-foreground">{vehicule?.immatriculation}</p>
        <p className="text-sm text-muted-foreground">
          {[vehicule?.marque, vehicule?.modele, vehicule?.type_vehicule].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="rounded-xl bg-card border border-border p-4 space-y-4">
        <div>
          <h3 className="font-bold text-foreground">Contrôle pré-intervention</h3>
          <p className="text-xs text-muted-foreground mt-0.5">3 vérifications obligatoires (protection juridique).</p>
        </div>

        <CheckRow
          checked={intervention.controle_objets_valeur} disabled={readOnly}
          label="Absence d'objets de valeur vérifiée"
          onChange={(v) => onChange({ controle_objets_valeur: v })}
        />

        <div className="space-y-2">
          <CheckRow
            checked={intervention.controle_degradations} disabled={readOnly}
            label="Dégradations préexistantes signalées"
            onChange={(v) => onChange({ controle_degradations: v, degradations_description: v ? intervention.degradations_description : null })}
          />
          {intervention.controle_degradations && (
            <Textarea
              disabled={readOnly}
              placeholder="Décrire les dégradations *"
              value={intervention.degradations_description || ""}
              onChange={(e) => onChange({ degradations_description: e.target.value })}
              className="text-sm" rows={3}
            />
          )}
        </div>

        <div className="space-y-2">
          <CheckRow
            checked={intervention.controle_cles_documents} disabled={readOnly}
            label="Localisation clés et documents notée"
            onChange={(v) => onChange({ controle_cles_documents: v, cles_documents_localisation: v ? intervention.cles_documents_localisation : null })}
          />
          {intervention.controle_cles_documents && (
            <Textarea
              disabled={readOnly}
              placeholder="Où sont les clés et documents"
              value={intervention.cles_documents_localisation || ""}
              onChange={(e) => onChange({ cles_documents_localisation: e.target.value })}
              className="text-sm" rows={2}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 2 — Photos + Checklists
// ─────────────────────────────────────────────
function Step2({
  zones, photos, zonesComplete, zoneComplete, onPick,
  interiorChecklist, exteriorChecklist,
  showInterior, showExterior, onToggleChecklist, readOnly,
}: {
  zones: ReturnType<typeof zonesFor>;
  photos: Record<string, PhotoState>;
  zonesComplete: number;
  zoneComplete: (k: string) => boolean;
  onPick: (zone: string, m: Moment, f: File) => void;
  interiorChecklist: Record<string, string | null>;
  exteriorChecklist: Record<string, string | null>;
  showInterior: boolean;
  showExterior: boolean;
  onToggleChecklist: (scope: "int" | "ext", key: string, checked: boolean) => void;
  readOnly: boolean;
}) {
  const intDone = CHECKLIST_INTERIEUR.filter((c) => !!interiorChecklist[c.key]).length;
  const extDone = CHECKLIST_EXTERIEUR.filter((c) => !!exteriorChecklist[c.key]).length;

  return (
    <div className="space-y-4">
      {/* Section photos */}
      <div className="rounded-xl bg-card border border-border p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="font-bold text-foreground text-sm">Photos · avant / après</p>
          <span className="text-sm font-semibold text-foreground">{zonesComplete}/{zones.length}</span>
        </div>
        <p className="text-xs text-muted-foreground">Photographiez chaque zone avant et après le nettoyage.</p>
      </div>

      {zones.map((z) => {
        const av = photos[`${z.key}__avant`];
        const ap = photos[`${z.key}__apres`];
        const done = zoneComplete(z.key);
        return (
          <div key={z.key} className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{z.label}</p>
              <Badge className={cn(
                "text-xs",
                done ? "bg-green-100 text-green-800 border-green-300" : "bg-muted text-muted-foreground border-border"
              )}>
                {done ? "ok" : "à faire"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PhotoSlot moment="avant" state={av?.state ?? "idle"} url={av?.signedUrl ?? null} localPreview={av?.localPreview ?? null} disabled={readOnly} onPick={(f) => onPick(z.key, "avant", f)} />
              <PhotoSlot moment="apres" state={ap?.state ?? "idle"} url={ap?.signedUrl ?? null} localPreview={ap?.localPreview ?? null} disabled={readOnly} onPick={(f) => onPick(z.key, "apres", f)} />
            </div>
          </div>
        );
      })}

      {/* Checklist intérieur */}
      {showInterior && (
        <div className="rounded-xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-foreground">Checklist intérieur</p>
            <span className="text-sm font-semibold text-foreground">{intDone}/{CHECKLIST_INTERIEUR.length}</span>
          </div>
          {CHECKLIST_INTERIEUR.map((c) => (
            <CheckRow
              key={c.key}
              checked={!!interiorChecklist[c.key]}
              disabled={readOnly}
              label={c.label}
              hint={interiorChecklist[c.key] ? formatTime(interiorChecklist[c.key]!) : undefined}
              onChange={(v) => onToggleChecklist("int", c.key, v)}
            />
          ))}
        </div>
      )}

      {/* Checklist extérieur */}
      {showExterior && (
        <div className="rounded-xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-foreground">Checklist extérieur</p>
            <span className="text-sm font-semibold text-foreground">{extDone}/{CHECKLIST_EXTERIEUR.length}</span>
          </div>
          {CHECKLIST_EXTERIEUR.map((c) => (
            <CheckRow
              key={c.key}
              checked={!!exteriorChecklist[c.key]}
              disabled={readOnly}
              label={c.label}
              hint={exteriorChecklist[c.key] ? formatTime(exteriorChecklist[c.key]!) : undefined}
              onChange={(v) => onToggleChecklist("ext", c.key, v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 3 — Notes + Signature
// ─────────────────────────────────────────────
function Step3({
  intervention, onChange, sigRef, onSignatureChange, readOnly,
  preControleOk, interiorComplete, exteriorComplete, allZonesDone, hasSignature,
}: {
  intervention: InterventionRow;
  onChange: (p: Partial<InterventionRow>) => Promise<void>;
  sigRef: React.RefObject<SignaturePadHandle | null>;
  onSignatureChange: (b: boolean) => void;
  readOnly: boolean;
  preControleOk: boolean;
  interiorComplete: boolean;
  exteriorComplete: boolean;
  allZonesDone: boolean;
  hasSignature: boolean;
}) {
  const reqs: { ok: boolean; label: string }[] = [
    { ok: preControleOk, label: "Contrôle pré-intervention complet" },
    { ok: allZonesDone, label: "Toutes les zones photographiées" },
    { ok: interiorComplete, label: "Checklist intérieur cochée" },
    { ok: exteriorComplete, label: "Checklist extérieur cochée" },
    { ok: hasSignature, label: "Signature présente" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-card border border-border p-4 space-y-3">
        <p className="font-bold text-foreground">Notes opérateur</p>
        <Textarea
          disabled={readOnly}
          placeholder="Observations, conseils, alertes..."
          value={intervention.notes_operateur || ""}
          onChange={(e) => onChange({ notes_operateur: e.target.value })}
          rows={5}
        />
      </div>

      <div className="rounded-xl bg-card border border-border p-4 space-y-3">
        <p className="font-bold text-foreground">Signature</p>
        <SignaturePad ref={sigRef} onChange={onSignatureChange} />
      </div>

      <div className="rounded-xl bg-card border border-border p-4 space-y-2.5">
        <p className="font-bold text-foreground mb-1">Validation finale</p>
        {reqs.map((r) => (
          <div key={r.label} className="flex items-center gap-2.5 text-sm">
            <span className={cn(
              "h-5 w-5 rounded-full flex items-center justify-center text-white text-xs shrink-0",
              r.ok ? "bg-primary" : "bg-muted-foreground/30"
            )}>
              {r.ok ? <Check className="h-3 w-3" /> : null}
            </span>
            <span className={r.ok ? "text-foreground" : "text-muted-foreground"}>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Shared components
// ─────────────────────────────────────────────
function CheckRow({
  checked, label, hint, disabled, onChange,
}: {
  checked: boolean;
  label: string;
  hint?: string;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={cn(
      "flex items-start gap-3 cursor-pointer select-none rounded-lg p-2 -mx-2 hover:bg-muted/40 transition-colors",
      disabled && "opacity-60 cursor-not-allowed"
    )}>
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={(v) => onChange(!!v)} className="mt-0.5 h-5 w-5" />
      <div className="flex-1">
        <span className="text-sm text-foreground leading-tight">{label}</span>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </label>
  );
}

function formatTime(iso: string): string {
  try {
    return `Validé à ${new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return "Validé";
  }
}
