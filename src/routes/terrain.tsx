import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Search,
  Clock,
  History,
  User,
  ChevronRight,
  Loader2,
  Car,
  LogOut,
  Play,
  RefreshCw,
  Plus,
  MapPin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  statutColor,
  statutLabel,
  type Statut,
  type TypePrestation,
} from "@/lib/interventions";
import { getPackLabel } from "@/lib/pricing";
import { cn } from "@/lib/utils";

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

type Tab = "encours" | "recherche" | "histoire" | "profil";

interface InterventionDashboard {
  id: string;
  statut: Statut;
  type_prestation: string;
  date_intervention: string | null;
  heure_intervention: string | null;
  adresse_intervention: string | null;
  ville_intervention: string | null;
  vehicules: {
    immatriculation: string;
    marque: string | null;
    modele: string | null;
    type_vehicule: string | null;
    entreprises: { nom: string } | null;
  } | null;
}

interface VehiculeItem {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  entreprise_id: string;
  entreprises: { nom: string } | null;
}

function getLocalStep(interventionId: string): number {
  try {
    const raw = localStorage.getItem(`izox_intervention_${interventionId}`);
    if (raw) {
      const d = JSON.parse(raw);
      return typeof d.step === "number" ? d.step : 1;
    }
  } catch { /* ignore */ }
  return 1;
}

function formatHeure(h: string | null): string {
  if (!h) return "";
  return h.slice(0, 5);
}

function formatDateFr(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const jour = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return jour.charAt(0).toUpperCase() + jour.slice(1);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────
function Inner() {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("encours");
  const [interventions, setInterventions] = useState<InterventionDashboard[]>([]);
  const [loadingInt, setLoadingInt] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [vehicules, setVehicules] = useState<VehiculeItem[]>([]);
  const [loadingVeh, setLoadingVeh] = useState(false);
  const [dialogVehicle, setDialogVehicle] = useState<VehiculeItem | null>(null);
  const [typePrestation, setTypePrestation] = useState<TypePrestation>("complet");
  const [creating, setCreating] = useState(false);
  const [takingCharge, setTakingCharge] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadInterventions = useCallback(async (silent = false) => {
    if (!silent) setLoadingInt(true);
    else setRefreshing(true);
    const { data, error } = await supabase
      .from("interventions")
      .select(
        "id, statut, type_prestation, date_intervention, heure_intervention, adresse_intervention, ville_intervention, vehicules(immatriculation, marque, modele, type_vehicule, entreprises(nom))"
      )
      .not("statut", "in", '("annulee")')
      .order("date_intervention", { ascending: true })
      .order("heure_intervention", { ascending: true })
      .limit(50);
    if (!error) setInterventions((data as unknown as InterventionDashboard[]) ?? []);
    setLoadingInt(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadInterventions(); }, [loadInterventions]);

  // Auto-refresh 30s quand sur l'onglet en cours
  useEffect(() => {
    if (tab !== "encours") {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      return;
    }
    refreshTimerRef.current = setInterval(() => loadInterventions(true), 30_000);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [tab, loadInterventions]);

  // Recherche véhicules (debounce 250ms)
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
      if (term) q = q.or(`immatriculation.ilike.%${term}%,marque.ilike.%${term}%,modele.ilike.%${term}%`);
      const { data, error } = await q;
      if (!cancelled) {
        if (error) toast.error("Recherche impossible");
        setVehicules((data as unknown as VehiculeItem[]) ?? []);
        setLoadingVeh(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search]);

  const startIntervention = async () => {
    if (!dialogVehicle || !user) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("interventions")
        .insert({
          vehicule_id: dialogVehicle.id,
          entreprise_id: dialogVehicle.entreprise_id,
          operateur_id: user.id,
          type_prestation: typePrestation,
          statut: "en_cours",
          date_intervention: todayIso(),
        })
        .select("id")
        .single();
      if (error) throw error;
      setDialogVehicle(null);
      navigate({ to: "/terrain/intervention/$id", params: { id: data.id } });
    } catch {
      toast.error("Impossible de démarrer la fiche");
    } finally {
      setCreating(false);
    }
  };

  const prendreEnCharge = async (interventionId: string) => {
    setTakingCharge(interventionId);
    try {
      const { error } = await (supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: unknown }> })
        .rpc("prendre_en_charge_intervention", { p_intervention_id: interventionId });
      if (error) throw error;
      // Mise à jour optimiste
      setInterventions((prev) =>
        prev.map((i) => i.id === interventionId ? { ...i, statut: "en_cours" as Statut } : i)
      );
      navigate({ to: "/terrain/intervention/$id", params: { id: interventionId } });
    } catch {
      toast.error("Impossible de prendre en charge cette intervention");
    } finally {
      setTakingCharge(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const today = todayIso();
  const enCours = useMemo(() => interventions.filter((i) => i.statut === "en_cours"), [interventions]);
  const avenir = useMemo(
    () => interventions.filter((i) => i.statut === "planifiee" && (i.date_intervention ?? "") >= today),
    [interventions, today]
  );
  const histoire = useMemo(
    () => interventions.filter((i) => !["en_cours", "planifiee"].includes(i.statut)),
    [interventions]
  );

  const todayCity = useMemo(() => {
    return (
      enCours.find((i) => i.ville_intervention)?.ville_intervention ??
      interventions.find((i) => i.date_intervention === today && i.ville_intervention)?.ville_intervention ??
      null
    );
  }, [enCours, interventions, today]);

  // en_cours = toujours actif (quel que soit date_intervention) + planifiées d'aujourd'hui
  const todayCount = useMemo(
    () => enCours.length + avenir.filter((i) => i.date_intervention === today).length,
    [enCours, avenir, today]
  );

  if (loadingInt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">
      {/* ── Tab contents ── */}
      {tab === "encours" && (
        <TabEnCours
          profile={profile}
          todayCity={todayCity}
          todayCount={todayCount}
          enCours={enCours}
          avenir={avenir}
          histoireRecente={histoire.slice(0, 5)}
          refreshing={refreshing}
          takingCharge={takingCharge}
          onRefresh={() => loadInterventions(true)}
          onPrendreEnCharge={prendreEnCharge}
        />
      )}

      {tab === "recherche" && (
        <TabRecherche
          search={search}
          onSearchChange={setSearch}
          vehicules={vehicules}
          loading={loadingVeh}
          onSelect={(v) => { setDialogVehicle(v); setTypePrestation("complet"); }}
        />
      )}

      {tab === "histoire" && (
        <TabHistoire histoire={histoire} />
      )}

      {tab === "profil" && (
        <TabProfil profile={profile} enCoursCount={enCours.length} onLogout={handleLogout} />
      )}

      {/* ── Bottom nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-30">
        <div className="grid grid-cols-4 max-w-lg mx-auto">
          {(
            [
              { tabId: "recherche" as Tab, icon: Search,  label: "Recherche", badge: 0 },
              { tabId: "encours"   as Tab, icon: Clock,   label: "En cours",  badge: enCours.length + avenir.length },
              { tabId: "histoire"  as Tab, icon: History,  label: "Histoire", badge: 0 },
              { tabId: "profil"    as Tab, icon: User,    label: "Profil",    badge: 0 },
            ]
          ).map(({ tabId, icon: Icon, label, badge }) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setTab(tabId)}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 px-1 text-[10px] font-semibold uppercase tracking-wide transition-colors relative",
                tab === tabId ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </div>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Dialog démarrer intervention manuelle ── */}
      <Dialog open={!!dialogVehicle} onOpenChange={(o) => !o && setDialogVehicle(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle intervention</DialogTitle>
            <DialogDescription>
              {dialogVehicle?.immatriculation} —{" "}
              {[dialogVehicle?.marque, dialogVehicle?.modele].filter(Boolean).join(" ") || "Véhicule"}
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
            <Button variant="izox" className="w-full h-12" onClick={startIntervention} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-2" />Démarrer</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab EN COURS
// ─────────────────────────────────────────────
function TabEnCours({
  profile,
  todayCity,
  todayCount,
  enCours,
  avenir,
  histoireRecente,
  refreshing,
  takingCharge,
  onRefresh,
  onPrendreEnCharge,
}: {
  profile: ReturnType<typeof useAuth>["profile"];
  todayCity: string | null;
  todayCount: number;
  enCours: InterventionDashboard[];
  avenir: InterventionDashboard[];
  histoireRecente: InterventionDashboard[];
  refreshing: boolean;
  takingCharge: string | null;
  onRefresh: () => void;
  onPrendreEnCharge: (id: string) => void;
}) {
  const navigate = useNavigate();
  const now = new Date();
  const dateLine = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();

  return (
    <div className="flex flex-col">
      {/* Hero sombre */}
      <div className="bg-slate-900 text-white px-4 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">IZ</span>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">
              Terrain{todayCity ? ` · ${todayCity}` : ""}
            </p>
            <p className="font-semibold text-white leading-tight">
              {profile?.prenom} {profile?.nom}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 font-semibold tracking-wider mb-1">{dateLine}</p>
        <h1 className="text-3xl font-black text-white leading-none">
          {todayCount === 0
            ? "Aucune intervention aujourd'hui"
            : `${todayCount} intervention${todayCount > 1 ? "s" : ""}${enCours.length > 0 ? ` · ${enCours.length} en cours` : ""}`}
        </h1>
      </div>

      <div className="px-4 py-5 space-y-6">
        {/* Section En cours */}
        {enCours.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">
                En cours · {enCours.length}
              </h2>
              <button
                type="button"
                onClick={onRefresh}
                className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
                Auto-refresh 30s
              </button>
            </div>
            <div className="space-y-3">
              {enCours.map((i) => (
                <EnCoursCard
                  key={i.id}
                  item={i}
                  onClick={() => navigate({ to: "/terrain/intervention/$id", params: { id: i.id } })}
                />
              ))}
            </div>
          </section>
        )}

        {/* Section À venir */}
        {avenir.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">
                À venir · {avenir.length}
              </h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Jusqu'à 18:00
              </span>
            </div>
            <div className="space-y-2">
              {avenir.map((i) => (
                <AvenirCard
                  key={i.id}
                  item={i}
                  loading={takingCharge === i.id}
                  hasEnCours={enCours.length > 0}
                  onPrendreEnCharge={() => onPrendreEnCharge(i.id)}
                  onNavigate={() => navigate({ to: "/terrain/intervention/$id", params: { id: i.id } })}
                />
              ))}
            </div>
          </section>
        )}

        {enCours.length === 0 && avenir.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">Aucune intervention active</p>
            <p className="text-sm text-muted-foreground mt-1">
              Recherchez un véhicule pour démarrer une fiche.
            </p>
          </div>
        )}

        {/* Historique récent */}
        {histoireRecente.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Historique · 7J
            </h2>
            <div className="space-y-2">
              {histoireRecente.map((i) => (
                <HistoireCard key={i.id} item={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Cards
// ─────────────────────────────────────────────
function EnCoursCard({ item, onClick }: { item: InterventionDashboard; onClick: () => void }) {
  const step = getLocalStep(item.id);
  const entreprise = item.vehicules?.entreprises?.nom;
  const typeLabel = getPackLabel(item.type_prestation);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl overflow-hidden bg-slate-900 text-white shadow-lg"
    >
      <div className="flex items-center gap-3 p-4">
        <div className="h-14 w-14 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
          <Car className="h-7 w-7 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-white text-lg leading-tight truncate">
                {item.vehicules?.immatriculation ?? "—"}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {[item.vehicules?.marque, item.vehicules?.modele].filter(Boolean).join(" ")}
                {entreprise ? ` · ${entreprise}` : ""}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-700 text-white text-xs font-bold px-2.5 py-1">
              step {step}/3
            </span>
          </div>
          <p className="text-xs text-primary font-semibold mt-1">
            {item.heure_intervention ? `${formatHeure(item.heure_intervention)} → ` : ""}
            EN COURS
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-500 shrink-0" />
      </div>
      {typeLabel && (
        <div className="px-4 pb-3">
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            {typeLabel}
          </span>
        </div>
      )}
    </button>
  );
}

function AvenirCard({
  item,
  loading,
  hasEnCours,
  onPrendreEnCharge,
  onNavigate,
}: {
  item: InterventionDashboard;
  loading: boolean;
  hasEnCours: boolean;
  onPrendreEnCharge: () => void;
  onNavigate: () => void;
}) {
  const entreprise = item.vehicules?.entreprises?.nom;
  const typeLabel = getPackLabel(item.type_prestation);
  return (
    <button
      type="button"
      onClick={onNavigate}
      className="w-full text-left rounded-xl bg-card border border-border p-4 flex items-center gap-3 hover:border-primary/40 hover:bg-muted/30 transition-colors"
    >
      <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Car className="h-7 w-7 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-foreground text-base leading-tight truncate">
              {item.vehicules?.immatriculation ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {[item.vehicules?.marque, item.vehicules?.modele].filter(Boolean).join(" ")}
              {entreprise ? ` · ${entreprise}` : ""}
            </p>
          </div>
          <Badge className="shrink-0 bg-amber-100 text-amber-900 border border-amber-300 text-xs">
            planifiée
          </Badge>
        </div>
        {item.heure_intervention && (
          <p className="text-xs text-muted-foreground mt-1">
            {formatHeure(item.heure_intervention)} · PLANIFIÉE
          </p>
        )}
        {item.date_intervention && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDateFr(item.date_intervention)}
          </p>
        )}
        {item.ville_intervention && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" />{item.ville_intervention}
          </p>
        )}
        {typeLabel && (
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
            {typeLabel}
          </p>
        )}
        <Button
          size="sm"
          variant="izox"
          className="mt-3 h-8 text-xs px-3"
          disabled={loading || hasEnCours}
          title={hasEnCours ? "Terminez votre intervention en cours d'abord" : undefined}
          onClick={(e) => { e.stopPropagation(); onPrendreEnCharge(); }}
        >
          {loading
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : hasEnCours
              ? "Intervention en cours..."
              : <><Play className="h-3 w-3 mr-1" />Prendre en charge</>
          }
        </Button>
      </div>
    </button>
  );
}

function HistoireCard({ item }: { item: InterventionDashboard }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate({ to: "/terrain/intervention/$id", params: { id: item.id } })}
      className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors"
    >
      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
        <span className="text-xs">{item.statut === "validee" ? "✓" : item.statut === "refusee" ? "✗" : "⏳"}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate">
          {item.vehicules?.immatriculation ?? "—"}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {item.vehicules?.entreprises?.nom ?? ""}
          {item.date_intervention ? ` · ${item.date_intervention.slice(5).replace("-", ".")}` : ""}
        </p>
      </div>
      <Badge className={cn("shrink-0 text-xs", statutColor(item.statut))} variant="outline">
        {statutLabel(item.statut)}
      </Badge>
    </button>
  );
}

// ─────────────────────────────────────────────
// Tab RECHERCHE
// ─────────────────────────────────────────────
function TabRecherche({
  search,
  onSearchChange,
  vehicules,
  loading,
  onSelect,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  vehicules: VehiculeItem[];
  loading: boolean;
  onSelect: (v: VehiculeItem) => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="bg-background px-4 pt-12 pb-4 sticky top-0 z-10 border-b border-border">
        <h2 className="text-xl font-black text-foreground mb-3">Recherche</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Immat, marque, modèle..."
            className="pl-9 h-12"
            autoFocus
          />
        </div>
      </div>

      <div className="px-4 py-4 space-y-2">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && vehicules.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {search ? "Aucun véhicule trouvé" : "Tapez pour rechercher un véhicule"}
            </p>
          </div>
        )}
        {vehicules.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onSelect(v)}
            className="w-full text-left flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary-soft/30 transition-colors"
          >
            <div className="h-11 w-11 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
              <Car className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground">{v.immatriculation}</p>
              <p className="text-xs text-muted-foreground truncate">
                {[v.marque, v.modele].filter(Boolean).join(" ") || "—"}
                {v.entreprises?.nom ? ` · ${v.entreprises.nom}` : ""}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab HISTOIRE
// ─────────────────────────────────────────────
function TabHistoire({ histoire }: { histoire: InterventionDashboard[] }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col">
      <div className="px-4 pt-12 pb-4">
        <h2 className="text-xl font-black text-foreground">Historique</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{histoire.length} fiche{histoire.length > 1 ? "s" : ""}</p>
      </div>
      <div className="px-4 space-y-2 pb-6">
        {histoire.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <History className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Aucune fiche dans l'historique</p>
          </div>
        )}
        {histoire.map((i) => (
          <button
            key={i.id}
            type="button"
            onClick={() => navigate({ to: "/terrain/intervention/$id", params: { id: i.id } })}
            className="w-full text-left flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors"
          >
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm",
              i.statut === "validee" ? "bg-primary-soft text-primary" :
              i.statut === "refusee" ? "bg-red-100 text-red-700" :
              "bg-amber-100 text-amber-700"
            )}>
              {i.statut === "validee" ? "✓" : i.statut === "refusee" ? "✗" : "⏳"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground">
                {i.vehicules?.immatriculation ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {[i.vehicules?.marque, i.vehicules?.modele].filter(Boolean).join(" ")}
                {i.vehicules?.entreprises?.nom ? ` · ${i.vehicules.entreprises.nom}` : ""}
              </p>
              {i.date_intervention && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDateFr(i.date_intervention)}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge className={cn("text-xs", statutColor(i.statut))} variant="outline">
                {statutLabel(i.statut)}
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab PROFIL
// ─────────────────────────────────────────────
function TabProfil({
  profile,
  enCoursCount,
  onLogout,
}: {
  profile: ReturnType<typeof useAuth>["profile"];
  enCoursCount: number;
  onLogout: () => void;
}) {
  const initials = [profile?.prenom?.[0], profile?.nom?.[0]].filter(Boolean).join("").toUpperCase();
  return (
    <div className="flex flex-col">
      <div className="px-4 pt-12 pb-6">
        <h2 className="text-xl font-black text-foreground mb-6">Profil</h2>

        {/* Avatar + nom */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border mb-4">
          <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-black text-lg">{initials}</span>
          </div>
          <div>
            <p className="font-bold text-foreground text-lg">
              {profile?.prenom} {profile?.nom}
            </p>
            <p className="text-sm text-muted-foreground capitalize">{profile?.role}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 rounded-xl bg-card border border-border mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Session en cours
          </p>
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-2 w-2 rounded-full",
              enCoursCount > 0 ? "bg-primary animate-pulse" : "bg-muted-foreground"
            )} />
            <p className="text-sm text-foreground">
              {enCoursCount > 0
                ? `${enCoursCount} intervention${enCoursCount > 1 ? "s" : ""} en cours`
                : "Aucune intervention active"}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full h-12 text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}
