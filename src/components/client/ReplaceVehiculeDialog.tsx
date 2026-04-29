import { useEffect, useRef, useState } from "react";
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
import { Card } from "@/components/ui/card";
import { VEHICULE_TYPES, type VehiculeType, getVehiculeLabel } from "./VehiculeIcons";
import { cn } from "@/lib/utils";
import { Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { compressImage } from "@/lib/image";
import { toast } from "sonner";

type PackType = "pack_interieur" | "pack_standard" | "pack_vtc";

const PACK_OPTIONS: Array<{
  value: PackType;
  nom: string;
  prix: number;
  description: string;
}> = [
  {
    value: "pack_interieur",
    nom: "Pack Intérieur",
    prix: 100,
    description: "2x intérieur 6 étapes (45 min)",
  },
  {
    value: "pack_standard",
    nom: "Pack Standard",
    prix: 150,
    description: "2x intérieur + extérieur Karcher (1h15)",
  },
  {
    value: "pack_vtc",
    nom: "Pack VTC/Taxi",
    prix: 190,
    description: "3x intérieur + 1x intérieur+extérieur (4 passages)",
  },
];

interface VehiculeData {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  type_vehicule: string | null;
  type_pack_souhaite?: string | null;
  contrat_id?: string | null;
  entreprise_id?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReplaced?: () => void;
  ancien: VehiculeData | null;
}

export function ReplaceVehiculeDialog({ open, onOpenChange, onReplaced, ancien }: Props) {
  const { profile, user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<VehiculeType | null>(null);
  const [pack, setPack] = useState<PackType | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ marque: "", modele: "", immatriculation: "" });

  useEffect(() => {
    if (open && ancien) {
      setType((ancien.type_vehicule as VehiculeType) ?? null);
      setPack((ancien.type_pack_souhaite as PackType) ?? null);
      setForm({ marque: "", modele: "", immatriculation: "" });
      setPhoto(null);
      setPhotoPreview(null);
    }
  }, [open, ancien]);

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
    if (!ancien) return;
    if (!type) {
      toast.error("Sélectionnez un type de véhicule");
      return;
    }
    if (!pack) {
      toast.error("Sélectionnez une formule");
      return;
    }
    if (!form.immatriculation.trim()) {
      toast.error("Immatriculation obligatoire");
      return;
    }

    const ancienAvaitPack = !!ancien.type_pack_souhaite;
    const memePack = ancienAvaitPack && pack === ancien.type_pack_souhaite;
    const entrepriseId = ancien.entreprise_id ?? profile?.entreprise_id;
    if (!entrepriseId) {
      toast.error("Aucune entreprise associée");
      return;
    }

    setSubmitting(true);
    try {
      const { data: created, error: insErr } = await supabase
        .from("vehicules")
        .insert({
          entreprise_id: entrepriseId,
          immatriculation: form.immatriculation.toUpperCase().trim(),
          marque: form.marque || null,
          modele: form.modele || null,
          type_vehicule: type,
          type_pack_souhaite: pack,
          statut: memePack ? "actif" : "en_attente_validation",
          contrat_id: memePack ? ancien.contrat_id ?? null : null,
        })
        .select("id, entreprise_id")
        .single();
      if (insErr) throw insErr;

      // Upload photo si fournie
      if (photo && created?.id) {
        const compressed = await compressImage(photo, { maxSize: 1200, quality: 0.85 });
        const path = `${created.entreprise_id}/${created.id}/photo.jpg`;
        const { error: upErr } = await supabase.storage
          .from("vehicules")
          .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
        if (!upErr) {
          await supabase.from("vehicules").update({ photo_path: path }).eq("id", created.id);
        }
      }

      if (memePack) {
        // Archive l'ancien et transfère le contrat immédiatement
        const { error: updErr } = await supabase
          .from("vehicules")
          .update({ statut: "remplace", contrat_id: null })
          .eq("id", ancien.id);
        if (updErr) throw updErr;

        await supabase.from("admin_actions_log").insert({
          user_id: user?.id ?? null,
          action: "remplacement_vehicule",
          details: {
            ancien_vehicule_id: ancien.id,
            nouveau_vehicule_id: created.id,
            contrat_id: ancien.contrat_id ?? null,
            statut: "applique",
          },
          nb_entites_impactees: 2,
        });

        toast.success("Véhicule remplacé avec succès.");
      } else {
        // Cas changement de formule OU première demande de pack :
        // on trace la demande pour que l'admin puisse basculer l'ancien
        // véhicule en 'remplace' lors de la validation du nouveau.
        await supabase.from("admin_actions_log").insert({
          user_id: user?.id ?? null,
          action: "remplacement_vehicule",
          details: {
            ancien_vehicule_id: ancien.id,
            nouveau_vehicule_id: created.id,
            contrat_id: ancien.contrat_id ?? null,
            ancien_pack: ancien.type_pack_souhaite ?? null,
            nouveau_pack: pack,
            type_demande: ancienAvaitPack ? "changement_formule" : "premiere_demande_pack",
            statut: "en_attente_validation",
          },
          nb_entites_impactees: 2,
        });

        toast.success(
          ancienAvaitPack
            ? "Votre demande de remplacement a été envoyée. Notre équipe vous recontactera sous 24h."
            : "Votre demande de pack a été envoyée. Notre équipe vous recontactera sous 24h pour valider votre contrat."
        );
      }

      onReplaced?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ancien) return null;
  const ancienTitle =
    ancien.marque || ancien.modele
      ? `${ancien.marque ?? ""} ${ancien.modele ?? ""}`.trim()
      : "Véhicule";
  const memePack = pack === ancien.type_pack_souhaite;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Remplacer un véhicule</DialogTitle>
          <DialogDescription>
            L'ancien véhicule sera archivé et le nouveau le remplacera dans votre flotte.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5 mt-2">
          <Card className="p-3 bg-muted/40 border-border/60">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">
              Ancien véhicule (sera archivé)
            </p>
            <p className="font-semibold text-foreground">{ancienTitle}</p>
            <p className="font-mono text-sm text-primary">{ancien.immatriculation}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {getVehiculeLabel(ancien.type_vehicule)}
              {ancien.type_pack_souhaite && (
                <>
                  {" • "}
                  {PACK_OPTIONS.find((p) => p.value === ancien.type_pack_souhaite)?.nom ??
                    ancien.type_pack_souhaite}
                </>
              )}
            </p>
          </Card>

          <div>
            <Label className="mb-2 block">Type du nouveau véhicule *</Label>
            <div className="grid grid-cols-2 gap-2">
              {VEHICULE_TYPES.map(({ value, label, Icon }) => {
                const active = type === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-3 transition-all text-foreground",
                      active
                        ? "border-primary bg-primary-soft"
                        : "border-border bg-card hover:border-primary/40"
                    )}
                  >
                    <Icon className={cn("h-8 w-auto", active ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-xs font-medium", active && "text-primary")}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Marque</Label>
              <Input value={form.marque} onChange={(e) => setForm({ ...form, marque: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Modèle</Label>
              <Input value={form.modele} onChange={(e) => setForm({ ...form, modele: e.target.value })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Immatriculation *</Label>
              <Input
                required
                value={form.immatriculation}
                onChange={(e) => setForm({ ...form, immatriculation: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Photo (optionnel)</Label>
            {photoPreview ? (
              <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
                <img src={photoPreview} alt="Aperçu" className="w-full h-40 object-cover" />
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
                className="mt-2 w-full border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-5 flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <Upload className="h-5 w-5" />
                <span className="text-sm">Ajouter une photo</span>
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
            <Label className="mb-2 block">Formule *</Label>
            <div className="grid grid-cols-1 gap-2">
              {PACK_OPTIONS.map((p) => {
                const active = pack === p.value;
                const isCurrent = ancien.type_pack_souhaite === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPack(p.value)}
                    className={cn(
                      "text-left rounded-lg border-2 p-3 transition-all bg-card",
                      active ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cn("font-semibold text-sm", active && "text-primary")}>
                        {p.nom}
                        {isCurrent && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground font-normal">
                            (actuel)
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-bold text-foreground">{p.prix} € HT/mois</span>
                    </div>
                    <p className="text-xs text-foreground/80 mt-1">{p.description}</p>
                  </button>
                );
              })}
            </div>
            {pack && !memePack && (
              <p className="text-xs text-amber-700 mt-2">
                Changement de formule : votre demande sera transmise à notre équipe pour validation.
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button type="submit" variant="izox" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : memePack ? (
                "Remplacer"
              ) : (
                "Envoyer la demande"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
