import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Copy, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateClientDialog({ open, onOpenChange, onCreated }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ email: string; password: string } | null>(null);

  const [form, setForm] = useState({
    nom: "",
    siret: "",
    adresse: "",
    ville: "",
    code_postal: "",
    email_contact: "",
    telephone: "",
    type_client: "flotte",
    prenom: "",
    nom_user: "",
    email_user: "",
  });

  const update = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const reset = () => {
    setForm({
      nom: "",
      siret: "",
      adresse: "",
      ville: "",
      code_postal: "",
      email_contact: "",
      telephone: "",
      type_client: "flotte",
      prenom: "",
      nom_user: "",
      email_user: "",
    });
    setDone(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-client-account", {
        body: {
          entreprise: {
            nom: form.nom,
            siret: form.siret || null,
            adresse: form.adresse || null,
            ville: form.ville || null,
            code_postal: form.code_postal || null,
            email_contact: form.email_contact || null,
            telephone: form.telephone || null,
            type_client: form.type_client,
          },
          user: {
            prenom: form.prenom,
            nom: form.nom_user,
            email: form.email_user,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDone({ email: data.email, password: data.temp_password });
      toast.success("Compte client créé");
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = () => {
    if (!done) return;
    const text = `Connexion IZOX :\nEmail : ${done.email}\nMot de passe provisoire : ${done.password}\n${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    toast.success("Identifiants copiés");
  };

  const close = () => {
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {done ? (
          <div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Compte créé avec succès
              </DialogTitle>
              <DialogDescription>
                Transmettez ces identifiants au client par WhatsApp, SMS ou email.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-3 bg-primary-soft border border-primary/20 rounded-lg p-4">
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-mono text-sm font-medium">{done.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mot de passe provisoire</p>
                <p className="font-mono text-sm font-medium">{done.password}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="izox" onClick={copyLink} className="flex-1">
                <Copy className="h-4 w-4" />
                Copier les identifiants
              </Button>
              <Button variant="outline" onClick={close}>
                Fermer
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Nouveau client</DialogTitle>
              <DialogDescription>
                Crée l'entreprise et le compte de connexion associé.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                  Entreprise
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Nom *" required value={form.nom} onChange={update("nom")} />
                  <Field label="SIRET" value={form.siret} onChange={update("siret")} />
                  <Field label="Adresse" value={form.adresse} onChange={update("adresse")} className="sm:col-span-2" />
                  <Field label="Ville" value={form.ville} onChange={update("ville")} />
                  <Field label="Code postal" value={form.code_postal} onChange={update("code_postal")} />
                  <Field label="Email contact" type="email" value={form.email_contact} onChange={update("email_contact")} />
                  <Field label="Téléphone" value={form.telephone} onChange={update("telephone")} />
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Type de client</Label>
                    <Select value={form.type_client} onValueChange={update("type_client")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flotte">Flotte</SelectItem>
                        <SelectItem value="concession">Concession</SelectItem>
                        <SelectItem value="vtc">VTC</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                  Compte utilisateur (rôle client)
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Prénom *" required value={form.prenom} onChange={update("prenom")} />
                  <Field label="Nom *" required value={form.nom_user} onChange={update("nom_user")} />
                  <Field label="Email de connexion *" required type="email" value={form.email_user} onChange={update("email_user")} className="sm:col-span-2" />
                </div>
              </section>
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={close} disabled={submitting}>
                Annuler
              </Button>
              <Button type="submit" variant="izox" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer le compte"}
              </Button>
            </div>
          </form>
        )}
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
