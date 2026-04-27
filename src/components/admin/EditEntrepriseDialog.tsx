import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Entreprise {
  id: string;
  nom: string;
  siret?: string | null;
  adresse?: string | null;
  ville: string | null;
  code_postal?: string | null;
  email_contact: string | null;
  telephone?: string | null;
  type_client: string;
  palier_remise: string;
  commercial_id?: string | null;
  compte_active: boolean;
}

interface Commercial {
  id: string;
  prenom: string | null;
  nom: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entreprise: Entreprise;
  onUpdated?: () => void;
}

export function EditEntrepriseDialog({ open, onOpenChange, entreprise, onUpdated }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [commerciaux, setCommerciaux] = useState<Commercial[]>([]);

  const [form, setForm] = useState({
    nom: entreprise.nom ?? "",
    siret: entreprise.siret ?? "",
    adresse: entreprise.adresse ?? "",
    ville: entreprise.ville ?? "",
    code_postal: entreprise.code_postal ?? "",
    email_contact: entreprise.email_contact ?? "",
    telephone: entreprise.telephone ?? "",
    type_client: entreprise.type_client ?? "flotte",
    palier_remise: entreprise.palier_remise ?? "starter",
    commercial_id: entreprise.commercial_id ?? "none",
    compte_active: entreprise.compte_active ?? true,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      nom: entreprise.nom ?? "",
      siret: entreprise.siret ?? "",
      adresse: entreprise.adresse ?? "",
      ville: entreprise.ville ?? "",
      code_postal: entreprise.code_postal ?? "",
      email_contact: entreprise.email_contact ?? "",
      telephone: entreprise.telephone ?? "",
      type_client: entreprise.type_client ?? "flotte",
      palier_remise: entreprise.palier_remise ?? "starter",
      commercial_id: entreprise.commercial_id ?? "none",
      compte_active: entreprise.compte_active ?? true,
    });
  }, [open, entreprise]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "commercial");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) {
        setCommerciaux([]);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, prenom, nom")
        .in("id", ids);
      setCommerciaux((profs as Commercial[]) ?? []);
    })();
  }, [open]);

  const update = <K extends keyof typeof form>(k: K) => (v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("entreprises")
        .update({
          nom: form.nom,
          siret: form.siret || null,
          adresse: form.adresse || null,
          ville: form.ville || null,
          code_postal: form.code_postal || null,
          email_contact: form.email_contact || null,
          telephone: form.telephone || null,
          type_client: form.type_client as "flotte" | "concession" | "vtc" | "autre",
          palier_remise: form.palier_remise as "starter" | "pro" | "business" | "premium",
          commercial_id: form.commercial_id === "none" ? null : form.commercial_id,
          compte_active: form.compte_active,
        })
        .eq("id", entreprise.id);
      if (error) throw error;
      toast.success("Modifications enregistrées");
      onUpdated?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Modifier l'entreprise</DialogTitle>
            <DialogDescription>Mettre à jour les informations du client.</DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            <Field label="Nom *" required value={form.nom} onChange={update("nom")} className="sm:col-span-2" />
            <div className="space-y-1.5">
              <Label>Type de client</Label>
              <Select value={form.type_client} onValueChange={update("type_client")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flotte">Flotte</SelectItem>
                  <SelectItem value="concession">Concession</SelectItem>
                  <SelectItem value="vtc">VTC</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Palier de remise</Label>
              <Select value={form.palier_remise} onValueChange={update("palier_remise")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Field label="Email contact" type="email" value={form.email_contact} onChange={update("email_contact")} />
            <Field label="Téléphone" value={form.telephone} onChange={update("telephone")} />
            <Field label="Adresse" value={form.adresse} onChange={update("adresse")} className="sm:col-span-2" />
            <Field label="Ville" value={form.ville} onChange={update("ville")} />
            <Field label="Code postal" value={form.code_postal} onChange={update("code_postal")} />
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Commercial assigné</Label>
              <Select value={form.commercial_id} onValueChange={update("commercial_id")}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {commerciaux.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {[c.prenom, c.nom].filter(Boolean).join(" ") || "Sans nom"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between sm:col-span-2 rounded-md border border-border/60 p-3">
              <div>
                <Label htmlFor="compte_active" className="cursor-pointer">Compte actif</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Désactiver bloque l'accès du client à son espace.
                </p>
              </div>
              <Switch
                id="compte_active"
                checked={form.compte_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, compte_active: v }))}
              />
            </div>
          </div>

          <div className="mt-6 flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button type="submit" variant="izox" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      <Input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
