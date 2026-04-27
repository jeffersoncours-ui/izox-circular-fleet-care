import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Loader2, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/image";
import {
  zonesFor,
  CHECKLIST_INTERIEUR,
  CHECKLIST_EXTERIEUR,
  type TypePrestation,
  type Statut,
  type Moment,
} from "@/lib/interventions";
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
  type_prestation: TypePrestation;
  vehicule_id: string;
  entreprise_id: string;
  operateur_id: string;
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
}

interface PhotoRow {
  id: string;
  zone: string;
  moment: Moment;
  url: string; // storage path
}

interface PhotoState {
  state: UploadState;
  path: string | null;
  signedUrl: string | null;
  localPreview: string | null;
}

const lsKey = (id: string) => `izox_intervention_${id}`;

function InterventionStepper() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [intervention, setIntervention] = useState<InterventionRow | null>(null);
  const [vehicule, setVehicule] = useState<VehiculeRow | null>(null);
  const [photos, setPhotos] = useState<Record<string, PhotoState>>({});
  const [submitting, setSubmitting] = useState(false);
  const sigRef = useRef<SignaturePadHandle>(null);
  const [hasSignature, setHasSignature] = useState(false);

  // Load
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
            .select("id, immatriculation, marque, modele, type_vehicule, entreprise_id")
            .eq("id", int.vehicule_id)
            .maybeSingle()
        : { data: null };
      if (!cancelled) setVehicule(veh as VehiculeRow | null);

      // Load photos
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
        next[k] = {
          state: "done",
          path: p.url,
          signedUrl: signed?.signedUrl ?? null,
          localPreview: null,
        };
      }
      if (!cancelled) setPhotos(next);

      // Restore signature preview if any
      if (int.signature_url) {
        setHasSignature(true);
      }

      // Restore localStorage step
      try {
        const raw = localStorage.getItem(lsKey(id));
        if (raw) {
          const cached = JSON.parse(raw);
          if (typeof cached.step === "number") setStep(cached.step);
        }
      } catch {
        /* ignore */
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const persistLocal = useCallback(
    (patch: Partial<{ step: number }>) => {
      try {
        const raw = localStorage.getItem(lsKey(id));
        const cur = raw ? JSON.parse(raw) : {};
        localStorage.setItem(lsKey(id), JSON.stringify({ ...cur, ...patch, ts: Date.now() }));
      } catch {
        /* ignore */
      }
    },
    [id]
  );

  // --- mutations to DB (debounced via direct calls)
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

  // Photo upload
  const uploadPhoto = async (zoneKey: string, moment: Moment, file: File) => {
    if (!intervention) return;
    const k = `${zoneKey}__${moment}`;
    const localPreview = URL.createObjectURL(file);
    setPhotos((p) => ({
      ...p,
      [k]: { state: "uploading", path: null, signedUrl: null, localPreview },
    }));

    try {
      const blob = await compressImage(file, { maxSize: 1200, quality: 0.85 });
      const path = `${intervention.id}/${zoneKey}_${moment}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("interventions")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;

      // Upsert photo row (delete existing then insert to keep simple)
      await supabase
        .from("intervention_photos")
        .delete()
        .eq("intervention_id", intervention.id)
        .eq("zone", zoneKey)
        .eq("moment", moment);

      const { error: insErr } = await supabase.from("intervention_photos").insert({
        intervention_id: intervention.id,
        zone: zoneKey,
        moment,
        url: path,
      });
      if (insErr) throw insErr;

      const { data: signed } = await supabase.storage
        .from("interventions")
        .createSignedUrl(path, 3600);

      setPhotos((p) => ({
        ...p,
        [k]: {
          state: "done",
          path,
          signedUrl: signed?.signedUrl ?? null,
          localPreview,
        },
      }));
    } catch (e) {
      console.error(e);
      setPhotos((p) => ({
        ...p,
        [k]: { ...(p[k] || { path: null, signedUrl: null, localPreview }), state: "error" },
      }));
      toast.error("Échec upload — réessayez en touchant la photo");
    }
  };

  const zones = useMemo(
    () => (intervention ? zonesFor(intervention.type_prestation) : []),
    [intervention]
  );

  const totalPhotosNeeded = zones.length * 2;
  const photosDone = Object.values(photos).filter((p) => p.state === "done").length;
  const uploadProgress = totalPhotosNeeded
    ? Math.round((photosDone / totalPhotosNeeded) * 100)
    : 0;

  const checklistInt = (intervention?.checklist_interieur || {}) as Record<string, string | null>;
  const checklistExt = (intervention?.checklist_exterieur || {}) as Record<string, string | null>;

  const showInteriorChecklist =
    intervention && (intervention.type_prestation === "interieur" || intervention.type_prestation === "complet");
  const showExteriorChecklist =
    intervention && (intervention.type_prestation === "exterieur" || intervention.type_prestation === "complet");

  const interiorComplete = !showInteriorChecklist
    ? true
    : CHECKLIST_INTERIEUR.every((c) => !!checklistInt[c.key]);
  const exteriorComplete = !showExteriorChecklist
    ? true
    : CHECKLIST_EXTERIEUR.every((c) => !!checklistExt[c.key]);

  const preControleOk =
    !!intervention &&
    intervention.controle_objets_valeur &&
    intervention.controle_degradations &&
    intervention.controle_cles_documents &&
    (!intervention.controle_degradations || !!intervention.degradations_description?.trim());

  const allPhotosDone = photosDone === totalPhotosNeeded && totalPhotosNeeded > 0;

  const canSubmit =
    preControleOk &&
    allPhotosDone &&
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

  const toggleChecklist = async (
    scope: "int" | "ext",
    key: string,
    checked: boolean
  ) => {
    if (!intervention) return;
    const target = scope === "int" ? { ...checklistInt } : { ...checklistExt };
    target[key] = checked ? new Date().toISOString() : null;
    await updateIntervention(
      scope === "int"
        ? { checklist_interieur: target as never }
        : { checklist_exterieur: target as never }
    );
  };

  const submit = async () => {
    if (!intervention || !canSubmit) return;
    setSubmitting(true);
    try {
      // Upload signature
      if (sigRef.current && !sigRef.current.isEmpty()) {
        const blob = await sigRef.current.toBlob();
        if (blob) {
          const path = `${intervention.id}/signature.png`;
          const { error: upErr } = await supabase.storage
            .from("interventions")
            .upload(path, blob, { upsert: true, contentType: "image/png" });
          if (upErr) throw upErr;
          await supabase
            .from("interventions")
            .update({ signature_url: path })
            .eq("id", intervention.id);
        }
      }

      const { error } = await supabase
        .from("interventions")
        .update({ statut: "en_revision", submitted_at: new Date().toISOString() })
        .eq("id", intervention.id);
      if (error) throw error;

      try {
        localStorage.removeItem(lsKey(id));
      } catch {
        /* ignore */
      }
      toast.success("Fiche soumise pour validation");
      navigate({ to: "/terrain" });
    } catch (e) {
      console.error(e);
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground sticky top-0 z-20">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
            onClick={() => navigate({ to: "/terrain" })}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-xs opacity-80">Fiche d'intervention</p>
            <p className="font-semibold truncate">
              {vehicule?.immatriculation || "Véhicule"} — Étape {step}/3
            </p>
          </div>
          <Badge variant="secondary" className="capitalize">
            {intervention.type_prestation}
          </Badge>
        </div>
        {/* Stepper */}
        <div className="px-4 pb-3 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                s <= step ? "bg-primary-foreground" : "bg-primary-foreground/30"
              )}
            />
          ))}
        </div>
      </header>

      {intervention.motif_refus && intervention.statut === "en_cours" && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 text-sm text-red-900 flex gap-2 items-start">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Fiche refusée — corrections demandées :</p>
            <p>{intervention.motif_refus}</p>
          </div>
        </div>
      )}

      <main className="flex-1 px-4 py-5 max-w-2xl mx-auto w-full pb-28">
        {step === 1 && (
          <Step1
            vehicule={vehicule}
            intervention={intervention}
            onChange={updateIntervention}
            readOnly={readOnly}
          />
        )}

        {step === 2 && (
          <Step2
            zones={zones}
            photos={photos}
            uploadProgress={uploadProgress}
            photosDone={photosDone}
            totalPhotos={totalPhotosNeeded}
            onPick={uploadPhoto}
            interiorChecklist={checklistInt}
            exteriorChecklist={checklistExt}
            showInterior={!!showInteriorChecklist}
            showExterior={!!showExteriorChecklist}
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
            allPhotosDone={allPhotosDone}
            hasSignature={hasSignature}
          />
        )}
      </main>

      {/* Sticky footer nav */}
      <footer className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 z-20">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12"
            onClick={() => goStep(step - 1)}
            disabled={step === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          {step < 3 && (
            <Button
              type="button"
              variant="izox"
              className="flex-1 h-12"
              onClick={() => goStep(step + 1)}
              disabled={step === 1 && !preControleOk}
            >
              Suivant <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 3 && (
            <Button
              type="button"
              variant="izox"
              className="flex-1 h-12"
              onClick={submit}
              disabled={!canSubmit || submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Soumettre <Check className="h-4 w-4 ml-1" /></>}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

// ──────── Steps ────────

function Step1({
  vehicule,
  intervention,
  onChange,
  readOnly,
}: {
  vehicule: VehiculeRow | null;
  intervention: InterventionRow;
  onChange: (p: Partial<InterventionRow>) => Promise<void>;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-5">
      <Card className="p-4 shadow-card">
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
          Véhicule
        </p>
        <p className="text-lg font-bold text-foreground">{vehicule?.immatriculation}</p>
        <p className="text-sm text-muted-foreground">
          {[vehicule?.marque, vehicule?.modele, vehicule?.type_vehicule]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </Card>

      <Card className="p-4 shadow-card space-y-4">
        <div>
          <h3 className="font-bold text-foreground">Contrôle pré-intervention</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Les 3 vérifications sont obligatoires (protection juridique).
          </p>
        </div>

        <CheckRow
          checked={intervention.controle_objets_valeur}
          disabled={readOnly}
          label="Absence d'objets de valeur vérifiée"
          onChange={(v) => onChange({ controle_objets_valeur: v })}
        />

        <div className="space-y-2">
          <CheckRow
            checked={intervention.controle_degradations}
            disabled={readOnly}
            label="Dégradations préexistantes signalées"
            onChange={(v) =>
              onChange({
                controle_degradations: v,
                degradations_description: v ? intervention.degradations_description : null,
              })
            }
          />
          {intervention.controle_degradations && (
            <Textarea
              disabled={readOnly}
              placeholder="Décrire les dégradations *"
              value={intervention.degradations_description || ""}
              onChange={(e) => onChange({ degradations_description: e.target.value })}
              className="text-sm"
              rows={3}
            />
          )}
        </div>

        <div className="space-y-2">
          <CheckRow
            checked={intervention.controle_cles_documents}
            disabled={readOnly}
            label="Localisation clés et documents notée"
            onChange={(v) =>
              onChange({
                controle_cles_documents: v,
                cles_documents_localisation: v ? intervention.cles_documents_localisation : null,
              })
            }
          />
          {intervention.controle_cles_documents && (
            <Textarea
              disabled={readOnly}
              placeholder="Où sont les clés et documents"
              value={intervention.cles_documents_localisation || ""}
              onChange={(e) => onChange({ cles_documents_localisation: e.target.value })}
              className="text-sm"
              rows={2}
            />
          )}
        </div>
      </Card>
    </div>
  );
}

function Step2({
  zones,
  photos,
  uploadProgress,
  photosDone,
  totalPhotos,
  onPick,
  interiorChecklist,
  exteriorChecklist,
  showInterior,
  showExterior,
  onToggleChecklist,
  readOnly,
}: {
  zones: ReturnType<typeof zonesFor>;
  photos: Record<string, PhotoState>;
  uploadProgress: number;
  photosDone: number;
  totalPhotos: number;
  onPick: (zone: string, m: Moment, f: File) => void;
  interiorChecklist: Record<string, string | null>;
  exteriorChecklist: Record<string, string | null>;
  showInterior: boolean;
  showExterior: boolean;
  onToggleChecklist: (scope: "int" | "ext", key: string, checked: boolean) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-5">
      <Card className="p-4 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-foreground">Photos avant / après</p>
          <span className="text-xs text-muted-foreground">
            {photosDone}/{totalPhotos}
          </span>
        </div>
        <Progress value={uploadProgress} className="h-2" />
      </Card>

      {zones.map((z) => {
        const av = photos[`${z.key}__avant`];
        const ap = photos[`${z.key}__apres`];
        return (
          <Card key={z.key} className="p-4 shadow-card">
            <p className="font-semibold text-foreground mb-3">{z.label}</p>
            <div className="grid grid-cols-2 gap-3">
              <PhotoSlot
                moment="avant"
                state={av?.state ?? "idle"}
                url={av?.signedUrl ?? null}
                localPreview={av?.localPreview ?? null}
                disabled={readOnly}
                onPick={(f) => onPick(z.key, "avant", f)}
              />
              <PhotoSlot
                moment="apres"
                state={ap?.state ?? "idle"}
                url={ap?.signedUrl ?? null}
                localPreview={ap?.localPreview ?? null}
                disabled={readOnly}
                onPick={(f) => onPick(z.key, "apres", f)}
              />
            </div>
          </Card>
        );
      })}

      {showInterior && (
        <Card className="p-4 shadow-card space-y-3">
          <p className="font-semibold text-foreground">Checklist intérieur</p>
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
        </Card>
      )}

      {showExterior && (
        <Card className="p-4 shadow-card space-y-3">
          <p className="font-semibold text-foreground">Checklist extérieur</p>
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
        </Card>
      )}
    </div>
  );
}

function Step3({
  intervention,
  onChange,
  sigRef,
  onSignatureChange,
  readOnly,
  preControleOk,
  interiorComplete,
  exteriorComplete,
  allPhotosDone,
  hasSignature,
}: {
  intervention: InterventionRow;
  onChange: (p: Partial<InterventionRow>) => Promise<void>;
  sigRef: React.RefObject<SignaturePadHandle | null>;
  onSignatureChange: (b: boolean) => void;
  readOnly: boolean;
  preControleOk: boolean;
  interiorComplete: boolean;
  exteriorComplete: boolean;
  allPhotosDone: boolean;
  hasSignature: boolean;
}) {
  const reqs: { ok: boolean; label: string }[] = [
    { ok: preControleOk, label: "Contrôle pré-intervention complet" },
    { ok: allPhotosDone, label: "Toutes les photos avant/après uploadées" },
    { ok: interiorComplete, label: "Checklist intérieur cochée" },
    { ok: exteriorComplete, label: "Checklist extérieur cochée" },
    { ok: hasSignature, label: "Signature présente" },
  ];

  return (
    <div className="space-y-5">
      <Card className="p-4 shadow-card space-y-3">
        <Label className="font-semibold text-foreground">Notes opérateur</Label>
        <Textarea
          disabled={readOnly}
          placeholder="Observations, conseils, alertes..."
          value={intervention.notes_operateur || ""}
          onChange={(e) => onChange({ notes_operateur: e.target.value })}
          rows={5}
        />
      </Card>

      <Card className="p-4 shadow-card space-y-3">
        <Label className="font-semibold text-foreground">Signature</Label>
        <SignaturePad ref={sigRef} onChange={onSignatureChange} />
      </Card>

      <Card className="p-4 shadow-card space-y-2">
        <p className="font-semibold text-foreground mb-2">Validation finale</p>
        {reqs.map((r) => (
          <div key={r.label} className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center text-white text-xs",
                r.ok ? "bg-primary" : "bg-muted-foreground/40"
              )}
            >
              {r.ok ? <Check className="h-3 w-3" /> : "·"}
            </span>
            <span className={r.ok ? "text-foreground" : "text-muted-foreground"}>{r.label}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function CheckRow({
  checked,
  label,
  hint,
  disabled,
  onChange,
}: {
  checked: boolean;
  label: string;
  hint?: string;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 cursor-pointer select-none rounded-md p-2 -mx-2 hover:bg-muted/40",
        disabled && "opacity-70 cursor-not-allowed"
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onChange(!!v)}
        className="mt-0.5 h-5 w-5"
      />
      <div className="flex-1">
        <span className="text-sm text-foreground leading-tight">{label}</span>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </label>
  );
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return `Validé à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return "Validé";
  }
}
