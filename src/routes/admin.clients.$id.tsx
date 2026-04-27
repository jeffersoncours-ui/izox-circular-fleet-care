import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, KeyRound, Car, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { AddVehiculeDialog } from "@/components/client/AddVehiculeDialog";

export const Route = createFileRoute("/admin/clients/$id")({
  component: ClientDetailPage,
});

interface Entreprise {
  id: string;
  nom: string;
  siret: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  email_contact: string | null;
  telephone: string | null;
  type_client: string;
  palier_remise: string;
  compte_active: boolean;
}

interface Vehicule {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  type_vehicule: string | null;
  statut: string;
}

interface ProfileRow {
  id: string;
  prenom: string | null;
  nom: string | null;
}

function ClientDetailPage() {
  const { id } = useParams({ from: "/admin/clients/$id" });
  const { profile } = useAuth();
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [e, v, p] = await Promise.all([
        supabase.from("entreprises").select("*").eq("id", id).maybeSingle(),
        supabase.from("vehicules").select("id, immatriculation, marque, modele, type_vehicule, statut").eq("entreprise_id", id),
        supabase.from("profiles").select("id, prenom, nom").eq("entreprise_id", id),
      ]);
      setEntreprise((e.data as Entreprise) ?? null);
      setVehicules((v.data as Vehicule[]) ?? []);
      setUsers((p.data as ProfileRow[]) ?? []);
      setLoading(false);
    })();
  }, [id]);

  const resetPassword = async (userId: string, prenom: string | null) => {
    setResetting(userId);
    try {
      // Need email — fetch from auth via admin function. We'll use email_contact as fallback.
      // Actually we need the user's email; we'll look it up via a small SQL trick: not possible from client.
      // For now we ask admin function with the email_contact of entreprise OR each user must have email.
      // Better: store email in profiles? we don't. So use entreprise.email_contact if matches first user.
      // Simplest: use the listUsers call from admin function. Adjust function to accept user_id.
      const email = prompt(`Email du compte ${prenom ?? ""} :`);
      if (!email) return;

      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { email, redirect_to: `${window.location.origin}/login` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.link) {
        await navigator.clipboard.writeText(data.link);
        toast.success("Lien de réinitialisation copié");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setResetting(null);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!entreprise) {
    return <div className="p-10 text-muted-foreground">Client introuvable.</div>;
  }

  const isAdmin = profile?.role === "admin";

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <Link to="/admin/clients" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Retour aux clients
      </Link>

      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{entreprise.nom}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="capitalize">{entreprise.type_client}</Badge>
            <Badge variant="outline" className="capitalize">Palier {entreprise.palier_remise}</Badge>
            {!entreprise.compte_active && <Badge variant="destructive">Désactivé</Badge>}
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6 shadow-card border-border/60">
          <h2 className="font-semibold text-foreground mb-4">Coordonnées</h2>
          <dl className="space-y-2 text-sm">
            <Row label="SIRET" value={entreprise.siret} />
            <Row label="Adresse" value={entreprise.adresse} />
            <Row label="Ville" value={[entreprise.code_postal, entreprise.ville].filter(Boolean).join(" ")} />
            <Row label="Email" value={entreprise.email_contact} />
            <Row label="Téléphone" value={entreprise.telephone} />
          </dl>
        </Card>

        <Card className="p-6 shadow-card border-border/60">
          <h2 className="font-semibold text-foreground mb-4">Comptes utilisateurs</h2>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun utilisateur lié.</p>
          ) : (
            <ul className="space-y-3">
              {users.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-2 p-3 bg-muted rounded-md">
                  <div>
                    <p className="font-medium text-sm">{u.prenom} {u.nom}</p>
                  </div>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resetPassword(u.id, u.prenom)}
                      disabled={resetting === u.id}
                    >
                      {resetting === u.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <KeyRound className="h-3 w-3" />
                      )}
                      Réinitialiser
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6 shadow-card border-border/60 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Flotte ({vehicules.length})</h2>
          </div>
          {vehicules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun véhicule enregistré.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {vehicules.map((v) => (
                <div key={v.id} className="flex items-center gap-3 p-3 bg-muted rounded-md">
                  <div className="h-10 w-10 rounded-md bg-primary-soft text-primary flex items-center justify-center">
                    <Car className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{v.marque} {v.modele}</p>
                    <p className="font-mono text-xs text-primary">{v.immatriculation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground text-right">{value || "—"}</dd>
    </div>
  );
}
