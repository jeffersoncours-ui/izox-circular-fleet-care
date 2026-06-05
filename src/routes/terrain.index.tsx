import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays, ClipboardList, FileText, User,
  ChevronRight, Loader2, Car, LogOut,
  Play, MapPin, Phone, Clock, X, Search,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { statutColor, statutLabel, type Statut } from "@/lib/interventions";
import { getPackLabel } from "@/lib/pricing";
import { cn } from "@/lib/utils";

import { RoleGuard } from "@/components/RoleGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/terrain/")({
  component: TerrainPage,
});

function TerrainPage() {
  return (
    <RoleGuard allowed={["operateur", "admin"]}>
      <Inner />
    </RoleGuard>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "planning" | "interventions" | "suivi" | "profil";
type FiltreInterventions = "tous" | "futur" | "en_cours" | "en_revision" | "realise" | "annule";

interface InterventionRow {
  id: string;
  statut: Statut;
  type_prestation: string;
  date_intervention: string | null;
  heure_intervention: string | null;
  time_slot: string | null;
  adresse_intervention: string | null;
  ville_intervention: string | null;
  telephone_intervention: string | null;
  vehicules: {
    immatriculation: string;
    marque: string | null;
    modele: string | null;
    type_vehicule: string | null;
    entreprises: { id: string; nom: string } | null;
  } | null;
}

interface InterventionObs {
  id: string;
  date_intervention: string | null;
  heure_intervention: string | null;
  type_prestation: string;
  statut: Statut;
  vehicules: { id: string; immatriculation: string; marque: string | null; modele: string | null } | null;
}

interface EntrepriseOption {
  id: string;
  nom: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatHeure(h: string | null): string {
  if (!h) return "";
  return h.slice(0, 5);
}

function formatDateFr(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const s = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getLocalStep(id: string): number {
  try {
    const raw = localStorage.getItem(`izox_intervention_${id}`);
    if (raw) {
      const d = JSON.parse(raw);
      return typeof d.step === "number" ? d.step : 1;
    }
  } catch { /* ignore */ }
  return 1;
}

function getUnlockDate(i: InterventionRow): Date {
  const dateStr = i.date_intervention ?? todayIso();
  const timeStr = i.heure_intervention
    ? i.heure_intervention.slice(0, 8)
    : i.time_slot === "afternoon"
    ? "14:00:00"
    : "08:00:00";
  return new Date(`${dateStr}T${timeStr}`);
}

function formatCountdown(unlockDate: Date): string {
  const diff = unlockDate.getTime() - Date.now();
  if (diff <= 0) return "";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

// ─── Inner (composant principal) ─────────────────────────────────────────────

function Inner() {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("planning");
  const [interventions, setInterventions] = useState<InterventionRow[]>([]);
  const [loadingInt, setLoadingInt] = useState(true);
  const [takingCharge, setTakingCharge] = useState<string | null>(null);
  const [selectedIntervention, setSelectedIntervention] = useState<InterventionRow | null>(null);

  const loadInterventions = useCallback(async () => {
    const { data, error } = await supabase
      .from("interventions")
      .select(
        "id, statut, type_prestation, date_intervention, heure_intervention, time_slot, " +
        "adresse_intervention, ville_intervention, telephone_intervention, " +
        "vehicules(immatriculation, marque, modele, type_vehicule, entreprises(id, nom))"
      )
      .order("date_intervention", { ascending: false })
      .order("heure_intervention", { ascending: true })
      .limit(100);
    if (!error) setInterventions((data as unknown as InterventionRow[]) ?? []);
    setLoadingInt(false);
  }, []);

  useEffect(() => { loadInterventions(); }, [loadInterventions]);

  const prendreEnCharge = async (interventionId: string) => {
    setTakingCharge(interventionId);
    try {
      const { error } = await (supabase as any).rpc("prendre_en_charge_intervention", {
        p_intervention_id: interventionId,
      });
      if (error) throw error;
      setSelectedIntervention(null);
      navigate({ to: "/terrain/intervention/$id", params: { id: interventionId } });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur réseau — réessayez");
    } finally {
      setTakingCharge(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const today = todayIso();
  const enCours = useMemo(
    () => interventions.filter((i) => i.statut === "en_cours"),
    [interventions]
  );
  const todayPlanifiees = useMemo(
    () => interventions.filter((i) => i.statut === "planifiee" && i.date_intervention === today),
    [interventions, today]
  );
  const matinPlanifiees = useMemo(
    () =>
      todayPlanifiees
        .filter((i) => i.time_slot === "morning")
        .sort((a, b) => (a.heure_intervention ?? "").localeCompare(b.heure_intervention ?? "")),
    [todayPlanifiees]
  );
  const amPlanifiees = useMemo(
    () =>
      todayPlanifiees
        .filter((i) => i.time_slot === "afternoon")
        .sort((a, b) => (a.heure_intervention ?? "").localeCompare(b.heure_intervention ?? "")),
    [todayPlanifiees]
  );
  const todayCity = useMemo(() => {
    const all = [...enCours, ...todayPlanifiees];
    return all.find((i) => i.ville_intervention)?.ville_intervention ?? null;
  }, [enCours, todayPlanifiees]);

  if (loadingInt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const bottomNavItems: { tabId: Tab; icon: LucideIcon; label: string; badge?: number }[] = [
    { tabId: "planning",      icon: CalendarDays,  label: "Planning",      badge: todayPlanifiees.length || undefined },
    { tabId: "interventions", icon: ClipboardList, label: "Interventions", badge: enCours.length || undefined },
    { tabId: "suivi",         icon: FileText,      label: "Suivi" },
    { tabId: "profil",        icon: User,          label: "Profil" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">
      {tab === "planning" && (
        <TabPlanning
          profile={profile}
          todayCity={todayCity}
          enCours={enCours}
          matinPlanifiees={matinPlanifiees}
          amPlanifiees={amPlanifiees}
          todayCount={todayPlanifiees.length}
          onCardClick={setSelectedIntervention}
          onNavigate={(id) => navigate({ to: "/terrain/intervention/$id", params: { id } })}
        />
      )}
      {tab === "interventions" && (
        <TabInterventions interventions={interventions} />
      )}
      {tab === "suivi" && (
        <TabSuivi userId={user?.id ?? ""} />
      )}
      {tab === "profil" && (
        <TabProfil profile={profile} enCoursCount={enCours.length} onLogout={handleLogout} />
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-30">
        <div className="grid grid-cols-4 max-w-lg mx-auto">
          {bottomNavItems.map(({ tabId, icon: Icon, label, badge }) => (
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
                {badge != null && badge > 0 && (
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

      {/* Bottom sheet détail RDV (Planning) */}
      {selectedIntervention && (
        <RdvDetailSheet
          intervention={selectedIntervention}
          takingCharge={takingCharge === selectedIntervention.id}
          hasEnCours={enCours.length > 0}
          onClose={() => setSelectedIntervention(null)}
          onPrendreEnCharge={() => prendreEnCharge(selectedIntervention.id)}
        />
      )}
    </div>
  );
}

// ─── Tab PLANNING ─────────────────────────────────────────────────────────────

function TabPlanning({
  profile,
  todayCity,
  enCours,
  matinPlanifiees,
  amPlanifiees,
  todayCount,
  onCardClick,
  onNavigate,
}: {
  profile: ReturnType<typeof useAuth>["profile"];
  todayCity: string | null;
  enCours: InterventionRow[];
  matinPlanifiees: InterventionRow[];
  amPlanifiees: InterventionRow[];
  todayCount: number;
  onCardClick: (i: InterventionRow) => void;
  onNavigate: (id: string) => void;
}) {
  const now = new Date();
  const dateLine = now
    .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    .toUpperCase();
  const matinCount = matinPlanifiees.length;
  const amCount = amPlanifiees.length;

  return (
    <div className="flex flex-col">
      {/* Hero sombre */}
      <div className="bg-foreground text-white px-4 pt-12 pb-6">
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
        <p className="text-[10px] text-white/40 font-semibold tracking-widest mb-1">{dateLine}</p>
        <h1 className="text-[28px] font-bold text-white leading-tight tracking-tight">
          {todayCount === 0 && enCours.length === 0
            ? "Aucune intervention aujourd'hui"
            : `${todayCount} intervention${todayCount > 1 ? "s" : ""}${matinCount > 0 ? ` · ${matinCount} matin` : ""}${amCount > 0 ? ` · ${amCount} après-midi` : ""}`}
        </h1>
      </div>

      <div className="px-4 py-5 space-y-6">
        {/* Banner intervention en cours */}
        {enCours.length > 0 && (
          <button
            type="button"
            onClick={() => onNavigate(enCours[0].id)}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-primary text-primary-foreground"
          >
            <div className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse shrink-0" />
            <div className="flex-1 text-left min-w-0">
              <p className="font-bold text-sm">
                {enCours.length} intervention{enCours.length > 1 ? "s" : ""} en cours
              </p>
              <p className="text-xs opacity-80 truncate">
                {enCours[0].vehicules?.immatriculation} — Continuer →
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>
        )}

        {/* Section Matin */}
        {matinPlanifiees.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
              Matin · 08h–12h · {matinPlanifiees.length}
            </h2>
            <div className="space-y-2">
              {matinPlanifiees.map((i) => (
                <PlanningCard key={i.id} item={i} onClick={() => onCardClick(i)} />
              ))}
            </div>
          </section>
        )}

        {/* Section Après-midi */}
        {amPlanifiees.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
              Après-midi · 14h–18h · {amPlanifiees.length}
            </h2>
            <div className="space-y-2">
              {amPlanifiees.map((i) => (
                <PlanningCard key={i.id} item={i} onClick={() => onCardClick(i)} />
              ))}
            </div>
          </section>
        )}

        {todayCount === 0 && enCours.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
              <CalendarDays className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">Rien de prévu aujourd'hui</p>
            <p className="text-sm text-muted-foreground mt-1">
              Votre planning est vide pour cette journée.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanningCard({ item, onClick }: { item: InterventionRow; onClick: () => void }) {
  const entreprise = item.vehicules?.entreprises?.nom ?? "";
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-muted/30 transition-colors"
    >
      <div className="text-right shrink-0 w-12">
        <p className="text-base font-bold text-foreground leading-tight tabular-nums">
          {item.heure_intervention ? formatHeure(item.heure_intervention) : "—"}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-foreground leading-tight truncate">
          {item.vehicules?.immatriculation ?? "—"}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {[item.vehicules?.marque, item.vehicules?.modele].filter(Boolean).join(" ")}
          {entreprise ? ` · ${entreprise}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-primary/10 text-primary">
          {getPackLabel(item.type_prestation)}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}

// ─── Bottom sheet détail RDV ──────────────────────────────────────────────────

function RdvDetailSheet({
  intervention,
  takingCharge,
  hasEnCours,
  onClose,
  onPrendreEnCharge,
}: {
  intervention: InterventionRow;
  takingCharge: boolean;
  hasEnCours: boolean;
  onClose: () => void;
  onPrendreEnCharge: () => void;
}) {
  const [now, setNow] = useState(new Date());
  const unlockDate = useMemo(() => getUnlockDate(intervention), [intervention]);
  const locked = now < unlockDate;
  const countdown = locked ? formatCountdown(unlockDate) : "";

  useEffect(() => {
    if (!locked) return;
    const timer = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(timer);
  }, [locked]);

  const entreprise = intervention.vehicules?.entreprises?.nom ?? "";
  const vehicule = [intervention.vehicules?.marque, intervention.vehicules?.modele]
    .filter(Boolean)
    .join(" ");
  const packLabel = getPackLabel(intervention.type_prestation);
  const slotLabel = intervention.time_slot === "afternoon" ? "Après-midi" : "Matin";
  const stepLabel = intervention.statut === "en_cours"
    ? `step ${getLocalStep(intervention.id)}/3`
    : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-2xl max-h-[88vh] overflow-y-auto pb-8">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <p className="font-bold text-foreground text-lg leading-tight">
              {intervention.vehicules?.immatriculation ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">{vehicule}</p>
          </div>
          <div className="flex items-center gap-2">
            {stepLabel && (
              <span className="rounded-full bg-foreground text-white text-xs font-bold px-2.5 py-1">
                {stepLabel}
              </span>
            )}
            <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-muted">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Client */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Client</p>
            <p className="font-semibold text-foreground">{entreprise || "—"}</p>
          </div>

          {/* Lieu & Contact */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Lieu & Contact</p>
            {intervention.adresse_intervention && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-foreground">{intervention.adresse_intervention}</p>
                  {intervention.ville_intervention && (
                    <p className="text-sm text-foreground">{intervention.ville_intervention}</p>
                  )}
                </div>
              </div>
            )}
            {intervention.telephone_intervention && (
              <a
                href={`tel:${intervention.telephone_intervention}`}
                className="flex items-center gap-2 text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">{intervention.telephone_intervention}</span>
              </a>
            )}
          </div>

          {/* Pack + Créneau */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Pack</p>
              <p className="font-bold text-foreground text-sm">{packLabel}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Créneau</p>
              <p className="font-bold text-foreground text-sm">
                {intervention.heure_intervention
                  ? `${formatHeure(intervention.heure_intervention)} · ${slotLabel}`
                  : slotLabel}
              </p>
            </div>
          </div>

          {/* Action */}
          {intervention.statut === "en_cours" ? (
            <Button variant="izox" className="w-full h-12" onClick={onClose}>
              <ChevronRight className="h-4 w-4 mr-2" />
              Continuer l'intervention
            </Button>
          ) : locked ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
              <Clock className="h-5 w-5 text-amber-600 mx-auto mb-1" />
              <p className="text-sm font-semibold text-amber-900">Intervention verrouillée</p>
              <p className="text-xs text-amber-700 mt-1">
                Débloquage dans{" "}
                <span className="font-bold tabular-nums">{countdown}</span>
              </p>
            </div>
          ) : hasEnCours ? (
            <Button variant="outline" className="w-full h-12" disabled>
              Terminez d'abord l'intervention en cours
            </Button>
          ) : (
            <Button
              variant="izox"
              className="w-full h-12"
              disabled={takingCharge}
              onClick={onPrendreEnCharge}
            >
              {takingCharge
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><Play className="h-4 w-4 mr-2" />Démarrer l'intervention</>}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Tab INTERVENTIONS ────────────────────────────────────────────────────────

const FILTRE_LABELS: Record<FiltreInterventions, string> = {
  tous:         "Tous",
  futur:        "À venir",
  en_cours:     "En cours",
  en_revision:  "En révision",
  realise:      "Réalisé",
  annule:       "Annulé",
};

function TabInterventions({ interventions }: { interventions: InterventionRow[] }) {
  const navigate = useNavigate();
  const [filtre, setFiltre] = useState<FiltreInterventions>("tous");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = interventions;
    switch (filtre) {
      case "futur":       list = list.filter((i) => i.statut === "planifiee"); break;
      case "en_cours":    list = list.filter((i) => i.statut === "en_cours"); break;
      case "en_revision": list = list.filter((i) => i.statut === "en_revision"); break;
      case "realise":     list = list.filter((i) => i.statut === "validee"); break;
      case "annule":      list = list.filter((i) => i.statut === "annulee"); break;
      default:            list = list.filter((i) => i.statut !== "annulee"); break;
    }
    const s = search.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (i) =>
          i.vehicules?.immatriculation?.toLowerCase().includes(s) ||
          (i.vehicules?.entreprises?.nom ?? "").toLowerCase().includes(s) ||
          (i.ville_intervention ?? "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [interventions, filtre, search]);

  return (
    <div className="flex flex-col">
      <div className="bg-background px-4 pt-12 pb-3 sticky top-0 z-10 border-b border-border space-y-3">
        <h2 className="text-xl font-black text-foreground">Interventions</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Immat, client, ville..."
              className="pl-9 h-10"
            />
          </div>
          <Select value={filtre} onValueChange={(v) => setFiltre(v as FiltreInterventions)}>
            <SelectTrigger className="w-36 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FILTRE_LABELS) as FiltreInterventions[]).map((f) => (
                <SelectItem key={f} value={f}>{FILTRE_LABELS[f]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="px-4 py-4 space-y-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <ClipboardList className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Aucune intervention trouvée</p>
          </div>
        )}
        {filtered.map((i) => (
          <button
            key={i.id}
            type="button"
            onClick={() => navigate({ to: "/terrain/intervention/$id", params: { id: i.id } })}
            className="w-full text-left flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-foreground">
                  {i.vehicules?.immatriculation ?? "—"}
                </p>
                <Badge className={cn("text-xs", statutColor(i.statut))} variant="outline">
                  {statutLabel(i.statut)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {[i.vehicules?.marque, i.vehicules?.modele].filter(Boolean).join(" ")}
                {i.vehicules?.entreprises?.nom ? ` · ${i.vehicules.entreprises.nom}` : ""}
              </p>
              {i.date_intervention && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDateFr(i.date_intervention)}
                  {i.heure_intervention ? ` · ${formatHeure(i.heure_intervention)}` : ""}
                </p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Tab SUIVI ────────────────────────────────────────────────────────────────

function TabSuivi({ userId }: { userId: string }) {
  return (
    <div className="flex flex-col">
      <div className="px-4 pt-12 pb-3 border-b border-border">
        <h2 className="text-xl font-black text-foreground mb-3">Suivi</h2>
        <div className="flex gap-2">
          <span className="px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold">
            Observations clients
          </span>
        </div>
      </div>
      <TabObservations userId={userId} />
    </div>
  );
}

function TabObservations({ userId }: { userId: string }) {
  const [entreprises, setEntreprises] = useState<EntrepriseOption[]>([]);
  const [selectedEntId, setSelectedEntId] = useState<string>("");
  const [searchEnt, setSearchEnt] = useState("");
  const [interventions, setInterventions] = useState<InterventionObs[]>([]);
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [savingObs, setSavingObs] = useState<Record<string, boolean>>({});
  const [loadingInts, setLoadingInts] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("interventions")
        .select("entreprises(id, nom)")
        .not("statut", "in", '("annulee","planifiee")')
        .limit(200);
      if (!data) return;
      const map = new Map<string, string>();
      for (const row of data as any[]) {
        const ent = row.entreprises;
        if (ent?.id && ent?.nom) map.set(ent.id, ent.nom);
      }
      const list = Array.from(map.entries())
        .map(([id, nom]) => ({ id, nom }))
        .sort((a, b) => a.nom.localeCompare(b.nom));
      setEntreprises(list);
    })();
  }, [userId]);

  useEffect(() => {
    if (!selectedEntId) { setInterventions([]); setObservations({}); return; }
    setLoadingInts(true);
    let alive = true;
    (async () => {
      const { data: intData } = await supabase
        .from("interventions")
        .select("id, date_intervention, heure_intervention, type_prestation, statut, vehicules(id, immatriculation, marque, modele)")
        .eq("entreprise_id", selectedEntId)
        .in("statut", ["en_revision", "validee"])
        .order("date_intervention", { ascending: false })
        .limit(50);
      if (!alive) return;
      const ints = (intData as unknown as InterventionObs[]) ?? [];
      setInterventions(ints);

      if (ints.length > 0) {
        const ids = ints.map((i) => i.id);
        const { data: obsData } = await (supabase as any)
          .from("operateur_observations")
          .select("intervention_id, note")
          .in("intervention_id", ids)
          .eq("operateur_id", userId);
        if (!alive) return;
        const obsMap: Record<string, string> = {};
        for (const row of (obsData ?? []) as any[]) {
          obsMap[row.intervention_id] = row.note ?? "";
        }
        setObservations(obsMap);
      }
      setLoadingInts(false);
    })();
    return () => { alive = false; };
  }, [selectedEntId, userId]);

  const saveObservation = async (interventionId: string, note: string) => {
    setSavingObs((prev) => ({ ...prev, [interventionId]: true }));
    try {
      const { error } = await (supabase as any)
        .from("operateur_observations")
        .upsert(
          {
            intervention_id: interventionId,
            operateur_id: userId,
            note,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "intervention_id,operateur_id" }
        );
      if (error) throw error;
    } catch {
      toast.error("Impossible de sauvegarder l'observation");
    } finally {
      setSavingObs((prev) => ({ ...prev, [interventionId]: false }));
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { vehicule: InterventionObs["vehicules"]; items: InterventionObs[] }
    >();
    for (const i of interventions) {
      const vehId = i.vehicules?.id ?? "unknown";
      if (!map.has(vehId)) map.set(vehId, { vehicule: i.vehicules, items: [] });
      map.get(vehId)!.items.push(i);
    }
    return Array.from(map.values());
  }, [interventions]);

  const filteredEnts = entreprises.filter((e) =>
    e.nom.toLowerCase().includes(searchEnt.toLowerCase())
  );

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Sélecteur client */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchEnt}
            onChange={(e) => setSearchEnt(e.target.value)}
            placeholder="Rechercher un client..."
            className="pl-9 h-10"
          />
        </div>
        <Select value={selectedEntId} onValueChange={setSelectedEntId}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Sélectionner un client..." />
          </SelectTrigger>
          <SelectContent>
            {filteredEnts.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">Aucun client trouvé</div>
            ) : (
              filteredEnts.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {!selectedEntId && (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Sélectionnez un client pour consulter ses observations
          </p>
        </div>
      )}

      {selectedEntId && loadingInts && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedEntId && !loadingInts && grouped.length === 0 && (
        <div className="flex flex-col items-center py-8 text-center">
          <p className="text-sm text-muted-foreground">Aucune intervention réalisée pour ce client.</p>
        </div>
      )}

      {grouped.map(({ vehicule, items }) => (
        <div key={vehicule?.id ?? "unknown"} className="space-y-2">
          <div className="flex items-center gap-2 pt-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <p className="font-bold text-foreground text-sm">
              {vehicule?.immatriculation ?? "—"}
              <span className="font-normal text-muted-foreground">
                {" "}· {[vehicule?.marque, vehicule?.modele].filter(Boolean).join(" ")}
              </span>
            </p>
          </div>
          {items.map((i) => (
            <div key={i.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {i.date_intervention ? formatDateFr(i.date_intervention) : "—"}
                    {i.heure_intervention ? ` · ${formatHeure(i.heure_intervention)}` : ""}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {getPackLabel(i.type_prestation)}
                  </p>
                </div>
                <Badge className={cn("text-xs", statutColor(i.statut))} variant="outline">
                  {statutLabel(i.statut)}
                </Badge>
              </div>
              <Textarea
                value={observations[i.id] ?? ""}
                onChange={(e) =>
                  setObservations((prev) => ({ ...prev, [i.id]: e.target.value }))
                }
                onBlur={() => saveObservation(i.id, observations[i.id] ?? "")}
                placeholder="Ajouter une observation (clés, contact, remarques...)"
                rows={2}
                className="text-sm resize-none"
              />
              {savingObs[i.id] && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sauvegarde...
                </p>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Tab PROFIL ───────────────────────────────────────────────────────────────

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
        <div className="p-4 rounded-xl bg-card border border-border mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Session en cours
          </p>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                enCoursCount > 0 ? "bg-primary animate-pulse" : "bg-muted-foreground"
              )}
            />
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
        <div className="mt-4 text-center">
          <Link
            to="/legal"
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors"
          >
            CGV &amp; Confidentialité
          </Link>
        </div>
      </div>
    </div>
  );
}
