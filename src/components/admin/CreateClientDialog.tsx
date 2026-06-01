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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, Mail, Link2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateClientDialog({ open, onOpenChange, onCreated }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ email: string; emailSent: boolean; inviteLink: string | null } | null>(null);
  const [commerciaux, setCommerciaux] = useState<
    Array<{ id: string; prenom: string | null; nom: string | null }>
  >([]);

  const [form, setForm] = useState({
    nom: "",
    siret: "",
    adresse: "",
    ville: "",
    code_postal: "",
    email_contact: "",
    telephone: "",
    type_client: "flotte",
    commercial_id: "",
    prenom: "",
    nom_user: "",
    email_user: "",
  });

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
      setCommerciaux((profs as any) ?? []);
    })();
  }, [open]);

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
      commercial_id: "",
      prenom: "",
      nom_user: "",
      email_user: "",
    });
    setDone(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.commercial_id) {
      toast.error("Commercial responsable obligatoire");
      return;
    }
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
            commercial_id: form.commercial_id,
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
      setDone({ email: data.email, emailSent: !!data.email_sent, inviteLink: data.invite_link ?? null });
      toast.success("Compte client créé");
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = () => {
    if (!done?.inviteLink) return;
    navigator.clipboard.writeText(done.inviteLink);
    toast.success("Lien copié");
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
                {done.emailSent
                  ? "Un email de bienvenue a été envoyé au client avec son lien de connexion."
                  : "Le lien d'accès est prêt. Transmettez-le au client."}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 rounded-lg border border-primary/20 bg-primary-soft p-4 flex items-center gap-3">
              {done.emailSent ? (
                <Mail className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <Link2 className="h-5 w-5 text-primary shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {done.emailSent ? "Email envoyé à" : "Email du compte"}
                </p>
                <p className="font-mono text-sm font-medium truncate">{done.email}</p>
              </div>
            </div>

            {done.emailSent ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Le client recevra un lien pour définir son mot de passe. Ce lien est valable 24 heures.
              </p>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                L'email de bienvenue n'a pas pu être envoyé automatiquement. Copiez le lien ci-dessous et transmettez-le au client.
              </p>
            )}

            <div className="mt-4 flex gap-2 justify-end">
              {!done.emailSent && done.inviteLink && (
                <Button variant="outline" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                  Copier le lien
                </Button>
              )}
              <Button variant="izox" onClick={close}>Fermer</Button>
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
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Commercial responsable *</Label>
                    <Select
                      value={form.commercial_id}
                      onValueChange={update("commercial_id")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un commercial..." />
                      </SelectTrigger>
                      <SelectContent>
                        {commerciaux.length === 0 ? (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            Aucun commercial disponible
                          </div>
                        ) : (
                          commerciaux.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {[c.prenom, c.nom].filter(Boolean).join(" ") || "Sans nom"}
                            </SelectItem>
                          ))
                        )}
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
