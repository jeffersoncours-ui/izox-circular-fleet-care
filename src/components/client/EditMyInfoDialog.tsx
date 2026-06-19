import { useEffect, useState, type FormEvent } from "react";
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
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

const EMPTY = {
  prenom: "",
  nom: "",
  adresse: "",
  ville: "",
  code_postal: "",
  telephone: "",
  email_contact: "",
};

export function EditMyInfoDialog({ open, onOpenChange, onUpdated }: Props) {
  const { profile, refresh } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      let entreprise = {
        adresse: "",
        ville: "",
        code_postal: "",
        telephone: "",
        email_contact: "",
      };
      if (profile?.entreprise_id) {
        const { data, error } = await supabase
          .from("entreprises")
          .select("adresse, ville, code_postal, telephone, email_contact")
          .eq("id", profile.entreprise_id)
          .maybeSingle();
        if (error) toast.error("Erreur lors du chargement des informations");
        if (data) {
          entreprise = {
            adresse: data.adresse ?? "",
            ville: data.ville ?? "",
            code_postal: data.code_postal ?? "",
            telephone: data.telephone ?? "",
            email_contact: data.email_contact ?? "",
          };
        }
      }
      setForm({
        prenom: profile?.prenom ?? "",
        nom: profile?.nom ?? "",
        ...entreprise,
      });
      setLoading(false);
    })();
  }, [open, profile]);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-client-info", {
        body: {
          prenom: form.prenom,
          nom: form.nom,
          entreprise: {
            adresse: form.adresse,
            ville: form.ville,
            code_postal: form.code_postal,
            telephone: form.telephone,
            email_contact: form.email_contact,
          },
        },
      });
      if (error || data?.error) throw new Error(data?.error ?? "Erreur");
      toast.success("Informations mises à jour");
      await refresh();
      onUpdated?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mes informations</DialogTitle>
          <DialogDescription>
            Mettez à jour vos coordonnées. Pour modifier votre offre ou votre SIRET,
            contactez IZOX.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="mi-prenom">Prénom</Label>
                <Input id="mi-prenom" value={form.prenom} onChange={update("prenom")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mi-nom">Nom</Label>
                <Input id="mi-nom" value={form.nom} onChange={update("nom")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mi-email">Email de contact</Label>
              <Input
                id="mi-email"
                type="email"
                value={form.email_contact}
                onChange={update("email_contact")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mi-tel">Téléphone</Label>
              <Input id="mi-tel" value={form.telephone} onChange={update("telephone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mi-adresse">Adresse</Label>
              <Input id="mi-adresse" value={form.adresse} onChange={update("adresse")} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2 col-span-1">
                <Label htmlFor="mi-cp">Code postal</Label>
                <Input id="mi-cp" value={form.code_postal} onChange={update("code_postal")} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="mi-ville">Ville</Label>
                <Input id="mi-ville" value={form.ville} onChange={update("ville")} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
