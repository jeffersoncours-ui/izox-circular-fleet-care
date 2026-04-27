import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogOut, Search, Plus, Loader2, Car, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  statutColor,
  statutLabel,
  type Statut,
  type TypePrestation,
} from "@/lib/interventions";

export const Route = createFileRoute("/terrain")({
  component: TerrainPage,
});

function TerrainPage() {
  return (
    <RoleGuard allowed={["operateur", "admin"]}>
      <Inner />
    </RoleGuard>
  );
}

interface VehiculeItem {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  entreprise_id: string;
  entreprises: { nom: string } | null;
}

interface InterventionItem {
  id: string;
  statut: Statut;
  type_prestation: TypePrestation;
  date_intervention: string | null;
  vehicules: { immatriculation: string; marque: string | null; modele: string | null } | null;
}

function Inner() {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [vehicules, setVehicules] = useState<VehiculeItem[]>([]);
  const [interventions, setInterventions] = useState<InterventionItem[]>([]);
  const [loadingVeh, setLoadingVeh] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<VehiculeItem | null>(null);
  const [typePrestation, setTypePrestation] = useState<TypePrestation>("complet");
  const [creating, setCreating] = useState(false);

  // Load operator's interventions
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("interventions")
        .select(
          "id, statut, type_prestation, date_intervention, vehicules(immatriculation, marque, modele)"
        )
        .order("created_at", { ascending: false })
        .limit(20);
      setInterventions((data as unknown as InterventionItem[]) || []);
    })();
  }, [user]);

  // Search vehicles (debounced)
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoadingVeh(true);
      let q = supabase
        .from("vehicules")
        .select("id, immatriculation, marque, modele, entreprise_id, entreprises(nom)")
        .eq("statut", "actif")
        .limit(25);
      const term = search.trim();
      if (term) {
        q = q.or(
          `immatriculation.ilike.%${term}%,marque.ilike.%${term}%,modele.ilike.%${term}%`
        );
      }
      const { data, error } = await q;
      if (!cancelled) {
        if (error) toast.error("Recherche impossible");
        setVehicules((data as unknown as VehiculeItem[]) || []);
        setLoadingVeh(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search]);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const startIntervention = async () => {
    if (!selected || !user) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("interventions")
        .insert({
          vehicule_id: selected.id,
          entreprise_id: selected.entreprise_id,
          operateur_id: user.id,
          type_prestation: typePrestation,
          statut: "en_cours",
          date_intervention: new Date().toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      if (error) throw error;
      setOpen(false);
      navigate({ to: "/terrain/intervention/$id", params: { id: data.id } });
    } catch (e) {
      console.error(e);
      toast.error("Impossible de démarrer la fiche");
    } finally {
      setCreating(false);
    }
  };

  const enCours = useMemo(
    () => interventions.filter((i) => i.statut === "en_cours"),
    [interventions]
  );
  const others = useMemo(
    () => interventions.filter((i) => i.statut !== "en_cours"),
    [interventions]
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <img src="/logo-izox.png" alt="IZOX" className="h-7 w-auto object-contain" />
        <Button
          size="icon"
          variant="ghost"
          onClick={handleLogout}
          className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <main className="flex-1 px-4 py-5 max-w-xl mx-auto w-full pb-10 space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Bonjour</p>
          <h1 className="text-2xl font-bold text-foreground">
            {profile?.prenom} {profile?.nom}
          </h1>
        </div>

        {/* Vehicle search */}
        <Card className="p-4 shadow-card border-border/60 space-y-3">
          <div>
            <p className="font-semibold text-foreground">Démarrer une intervention</p>
            <p className="text-xs text-muted-foreground">
              Recherchez un véhicule par immatriculation, marque ou modèle.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un véhicule..."
              className="pl-9 h-12"
            />
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto -mx-1 px-1">
            {loadingVeh && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loadingVeh && vehicules.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun véhicule trouvé.
              </p>
            )}
            {vehicules.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setSelected(v);
                  setTypePrestation("complet");
                  setOpen(true);
                }}
                className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary-soft/40 transition-colors min-h-[48px]"
              >
                <div className="h-10 w-10 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
                  <Car className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{v.immatriculation}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[v.marque, v.modele].filter(Boolean).join(" ") || "—"}
                    {v.entreprises?.nom ? ` · ${v.entreprises.nom}` : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </Card>

        {/* Active interventions */}
        {enCours.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-muted-foreground font-semibold mb-3">
              En cours ({enCours.length})
            </h2>
            <div className="space-y-2">
              {enCours.map((i) => (
                <InterventionCard key={i.id} item={i} />
              ))}
            </div>
          </section>
        )}

        {/* History */}
        <section>
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground font-semibold mb-3">
            Historique
          </h2>
          {others.length === 0 ? (
            <Card className="p-8 text-center shadow-card border-border/60">
              <p className="text-sm text-muted-foreground">Aucune fiche soumise.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {others.map((i) => (
                <InterventionCard key={i.id} item={i} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle fiche d'intervention</DialogTitle>
            <DialogDescription>
              {selected?.immatriculation} —{" "}
              {[selected?.marque, selected?.modele].filter(Boolean).join(" ") || "Véhicule"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1.5 block">Type de prestation</Label>
              <Select value={typePrestation} onValueChange={(v) => setTypePrestation(v as TypePrestation)}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exterieur">Extérieur seul</SelectItem>
                  <SelectItem value="interieur">Intérieur seul</SelectItem>
                  <SelectItem value="complet">Complet (intérieur + extérieur)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="izox"
              className="w-full h-12"
              onClick={startIntervention}
              disabled={creating}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" /> Démarrer
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InterventionCard({ item }: { item: InterventionItem }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate({ to: "/terrain/intervention/$id", params: { id: item.id } })}
      className="w-full text-left p-3 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors flex items-center gap-3 min-h-[64px]"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-foreground truncate">
            {item.vehicules?.immatriculation || "—"}
          </p>
          <Badge className={statutColor(item.statut)} variant="outline">
            {statutLabel(item.statut)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {[item.vehicules?.marque, item.vehicules?.modele].filter(Boolean).join(" ") || "—"} ·{" "}
          {item.type_prestation}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
