import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VEHICULE_TYPES, type VehiculeType } from "./VehiculeIcons";
import { cn } from "@/lib/utils";
import { Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getVehiculePhotoUrl } from "@/lib/vehicule-photo";
import { useAuth } from "@/lib/auth-context";
import { compressImage } from "@/lib/image";
import { toast } from "sonner";
import { getProchainPalier, getPalier, getAllPacks, type PackType } from "@/lib/pricing";
import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

const PALIER_LABELS: Record<string, string> = {
  pro: "Pro",
  business: "Business",
  premium: "Premium",
};

interface VehiculeData {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  type_vehicule: string | null;
  annee: number | null;
  couleur: string | null;
  kilometrage: number | null;
  notes: string | null;
  photo_path: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  entrepriseId?: string;
  vehicule?: VehiculeData | null;
  /** @deprecated le rôle de l'utilisateur connecté détermine désormais le comportement automatiquement */
  mode?: "admin" | "client";
  nbVehiculesActifs?: number;
}

export function AddVehiculeDialog({
  open,
  onOpenChange,
  onCreated,
  entrepriseId,
  vehicule,
  nbVehiculesActifs = 0,
}: Props) {
  const { profile } = useAuth();
  const targetEntrepriseId = entrepriseId ?? profile?.entreprise_id ?? null;
  const isEdit = !!vehicule;
  // L'action se règle automatiquement selon le rôle :
  // admin/staff → activation directe, autres → en attente de validation.
  const role = profile?.role;
  const isStaffSide = role === "admin" || role === "staff";
  const needsValidation = !isEdit && !isStaffSide;
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<VehiculeType | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [packSouhaite, setPackSouhaite] = useState<PackType | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    marque: "",
    modele: "",
    immatriculation: "",
    annee: "",
    couleur: "",
    kilometrage: "",
    notes: "",
  });

  const nouveauTotal = nbVehiculesActifs + 1;
  // L'upsell n'est pertinent que côté client (pas pour admin/staff en interne)
  const changementPalier = needsValidation && getPalier(nbVehiculesActifs) !== getPalier(nouveauTotal);
  const upsell = changementPalier ? getProchainPalier(nbVehiculesActifs) : null;


  useEffect(() => {
    if (open && vehicule) {
      setForm({
        marque: vehicule.marque ?? "",
        modele: vehicule.modele ?? "",
        immatriculation: vehicule.immatriculation ?? "",
        annee: vehicule.annee != null ? String(vehicule.annee) : "",
        couleur: vehicule.couleur ?? "",
        kilometrage: vehicule.kilometrage != null ? String(vehicule.kilometrage) : "",
        notes: vehicule.notes ?? "",
      });
      setType((vehicule.type_vehicule as VehiculeType) ?? null);
      // Load existing photo via signed URL
      getVehiculePhotoUrl(vehicule.photo_path).then((url) => setPhotoPreview(url));
    }
  }, [open, vehicule]);

  const reset = () => {
    setForm({ marque: "", modele: "", immatriculation: "", annee: "", couleur: "", kilometrage: "", notes: "" });
    setType(null);
    setPhoto(null);
    setPhotoPreview(null);
    setPackSouhaite(null);
  };

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEntrepriseId && !isEdit) {
      toast.error("Aucune entreprise associée");
      return;
    }
    if (!type) {
      toast.error("Sélectionnez un type de véhicule");
      return;
    }
    // Pack obligatoire pour TOUTE création (admin comme client)
    if (!isEdit && !packSouhaite) {
      toast.error("Sélectionnez une formule");
      return;
    }
    setSubmitting(true);
    try {
      const immat = form.immatriculation.toUpperCase().trim();
      const annee = form.annee ? parseInt(form.annee.replace(/\D/g, ""), 10) || null : null;
      const kilometrage = form.kilometrage ? parseInt(form.kilometrage.replace(/\D/g, ""), 10) || null : null;

      let vehiculeId = vehicule?.id;
      let entrepriseForPath = targetEntrepriseId;

      if (isEdit && vehicule) {
        const { error: updErr } = await supabase
          .from("vehicules")
          .update({
            immatriculation: immat,
            marque: form.marque || null,
            modele: form.modele || null,
            annee,
            couleur: form.couleur || null,
            kilometrage,
            notes: form.notes || null,
            type_vehicule: type,
          })
          .eq("id", vehicule.id);
        if (updErr) throw updErr;
      } else {
        // Création : RPC unifiée ajouter_vehicule() qui gère création/greffe du contrat
        const { data, error: rpcErr } = await supabase.rpc("ajouter_vehicule", {
          p_entreprise_id: targetEntrepriseId!,
          p_type_vehicule: type,
          p_immatriculation: immat,
          p_pack: packSouhaite!,
          p_marque: form.marque || null,
          p_modele: form.modele || null,
          p_annee: annee,
          p_couleur: form.couleur || null,
          p_kilometrage: kilometrage,
          p_photo_path: null,
          p_notes: form.notes || null,
        });
        if (rpcErr) throw rpcErr;
        const result = data as {
          vehicule_id: string;
          contrat_cree: boolean;
          statut_vehicule: string;
          numero_contrat: string | null;
        } | null;
        if (!result?.vehicule_id) throw new Error("Réponse invalide de la fonction d'ajout");
        vehiculeId = result.vehicule_id;
        entrepriseForPath = targetEntrepriseId!;

        if (photo && vehiculeId && entrepriseForPath) {
          const compressed = await compressImage(photo, { maxSize: 1200, quality: 0.85 });
          const path = `${entrepriseForPath}/${vehiculeId}/photo.jpg`;
          const { error: upErr } = await supabase.storage
            .from("vehicules")
            .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
          if (upErr) throw upErr;
          await supabase.from("vehicules").update({ photo_path: path }).eq("id", vehiculeId);
        }

        // Toast contextualisé selon création/greffe et statut
        if (result.contrat_cree && result.statut_vehicule === "actif") {
          toast.success(`Véhicule et contrat ${result.numero_contrat ?? ""} créés`);
        } else if (result.contrat_cree) {
          toast.success("Demande envoyée, validation sous 24h");
        } else if (result.statut_vehicule === "actif") {
          toast.success("Véhicule ajouté au contrat existant");
        } else {
          toast.success("Demande d'ajout envoyée, validation sous 24h");
        }
      }

      if (isEdit && photo && vehiculeId && entrepriseForPath) {
        const compressed = await compressImage(photo, { maxSize: 1200, quality: 0.85 });
        const path = `${entrepriseForPath}/${vehiculeId}/photo.jpg`;
        const { error: upErr } = await supabase.storage
          .from("vehicules")
          .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
        if (upErr) throw upErr;
        await supabase.from("vehicules").update({ photo_path: path }).eq("id", vehiculeId);
        toast.success("Véhicule mis à jour");
      } else if (isEdit) {
        toast.success("Véhicule mis à jour");
      }
      onCreated?.();
      onOpenChange(false);
      setTimeout(reset, 200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onOpenChange(false);
          setTimeout(reset, 200);
        } else {
          onOpenChange(true);
        }
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le véhicule" : "Ajouter un véhicule"}</DialogTitle>
          <DialogDescription>
            Renseignez les informations principales de votre véhicule.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5 mt-2">
          <div>
            <Label className="mb-2 block">Type de véhicule *</Label>
            <div className="grid grid-cols-2 gap-2">
              {VEHICULE_TYPES.map(({ value, label, Icon }) => {
                const active = type === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all text-foreground",
                      active
                        ? "border-primary bg-primary-soft"
                        : "border-border bg-card hover:border-primary/40"
                    )}
                  >
                    <Icon className={cn("h-10 w-auto", active ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-sm font-medium", active && "text-primary")}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Marque" value={form.marque} onChange={(v) => setForm({ ...form, marque: v })} />
            <Field label="Modèle" value={form.modele} onChange={(v) => setForm({ ...form, modele: v })} />
            <Field label="Immatriculation *" required value={form.immatriculation} onChange={(v) => setForm({ ...form, immatriculation: v })} className="col-span-2" />
            <Field
              label="Année"
              value={form.annee}
              onChange={(v) => setForm({ ...form, annee: v.replace(/\D/g, "").slice(0, 4) })}
              inputMode="numeric"
              pattern="[0-9]*"
            />
            <Field label="Couleur" value={form.couleur} onChange={(v) => setForm({ ...form, couleur: v })} />
            <Field
              label="Kilométrage"
              value={form.kilometrage}
              onChange={(v) => setForm({ ...form, kilometrage: v.replace(/\D/g, "") })}
              inputMode="numeric"
              pattern="[0-9]*"
              className="col-span-2"
            />
          </div>

          <div>
            <Label>Photo du véhicule</Label>
            {photoPreview ? (
              <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
                <img src={photoPreview} alt="Aperçu" className="w-full h-48 object-cover" />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={removePhoto}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-2 w-full border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-6 flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <Upload className="h-6 w-6" />
                <span className="text-sm">{isEdit ? "Remplacer la photo" : "Ajouter une photo"}</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPhotoChange}
              className="hidden"
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Précisions optionnelles..."
              className="mt-1.5"
              rows={3}
            />
          </div>

          {isClientMode && (
            <div>
              <Label className="mb-2 block">Formule souhaitée *</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {getAllPacks().map((p) => {
                  const active = packSouhaite === p.type;
                  return (
                    <button
                      key={p.type}
                      type="button"
                      onClick={() => setPackSouhaite(p.type)}
                      className={cn(
                        "text-left rounded-lg border-2 p-3 transition-all bg-card",
                        active ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40"
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={cn("font-semibold text-sm", active && "text-primary")}>{p.label}</span>
                        <span className="text-sm font-bold text-foreground">{p.prix_ht} € HT/mois</span>
                      </div>
                      <p className="text-xs text-foreground/80 mt-1">{p.description}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Bonus : {p.bonus}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Tarif HT par véhicule selon votre palier actuel. Ajout effectif après validation par notre équipe.
              </p>
            </div>
          )}

          {isClientMode && upsell && (
            <Card className="p-4 border-primary/40 bg-primary-soft">
              <div className="flex gap-3">
                <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-foreground">
                  <p>
                    Avec ce véhicule, votre flotte passe à <strong>{nouveauTotal}</strong> véhicules et déclenche le Palier{" "}
                    <strong>{PALIER_LABELS[upsell.prochainPalier] ?? upsell.prochainPalier}</strong> !
                  </p>
                  <p className="mt-1">
                    Économie estimée sur votre facture : <strong>-{upsell.gainMensuelEstime} €/mois</strong>.
                  </p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    Notre équipe vous contactera pour valider votre nouvelle mensualité.
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button type="submit" variant="izox" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEdit ? (
                "Enregistrer"
              ) : isClientMode ? (
                "Envoyer la demande"
              ) : (
                "Ajouter"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  className,
  inputMode,
  pattern,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  className?: string;
  inputMode?: "numeric" | "text" | "tel" | "search" | "email" | "url" | "decimal" | "none";
  pattern?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      <Input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        pattern={pattern}
      />
    </div>
  );
}
