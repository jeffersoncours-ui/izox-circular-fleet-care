import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  startOfISOWeek,
  addWeeks,
  subWeeks,
  format,
  addDays,
  eachDayOfInterval,
  endOfISOWeek,
  isSameDay,
  isToday,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPackLabel } from "@/lib/pricing";
import { statutLabel, statutColor, type Statut } from "@/lib/interventions";

// ─── Constants (business logic — ne pas modifier) ──────────────────────────────

const TIME_SUB_SLOTS = [
  { key: "morning_1",   label: "8h – 9h30",   half: "morning"   },
  { key: "morning_2",   label: "10h – 11h30", half: "morning"   },
  { key: "afternoon_1", label: "14h – 15h30", half: "afternoon" },
  { key: "afternoon_2", label: "16h – 17h30", half: "afternoon" },
] as const;

type SubSlotKey = typeof TIME_SUB_SLOTS[number]["key"];

function subSlotFromHeure(heure: string | null, timeSlot: string | null): SubSlotKey {
  if (!heure) return timeSlot === "morning" ? "morning_1" : "afternoon_1";
  const h = parseInt(heure.slice(0, 2), 10);
  if (h < 10) return "morning_1";
  if (h < 14) return "morning_2";
  if (h < 16) return "afternoon_1";
  return "afternoon_2";
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Operator {
  id: string;
  name: string;
  initials: string;
  color_hex: string;
}

interface Intervention {
  id: string;
  operator_id: string | null;
  time_slot: string | null;
  heure_intervention: string | null;
  date_intervention: string | null;
  statut: Statut | null;
  type_prestation: string | null;
  vehicules?: { immatriculation: string } | null;
  entreprises?: { nom: string } | null;
}

// ─── Intervention card ─────────────────────────────────────────────────────────

function InterventionCard({
  intervention,
  color,
  onNavigate,
}: {
  intervention: Intervention;
  color: string;
  onNavigate: (id: string) => void;
}) {
  const heure = intervention.heure_intervention
    ? intervention.heure_intervention.slice(0, 5).replace(":", "h")
    : null;
  const packLabel = intervention.type_prestation
    ? getPackLabel(intervention.type_prestation)
    : null;

  return (
    <button
      type="button"
      onClick={() => onNavigate(intervention.id)}
      className="group w-full rounded-md border border-border bg-card text-left transition-all hover:shadow-card"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="px-2.5 py-2">
        {/* Ligne 1 : immat + heure */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-mono text-[12px] font-bold text-foreground truncate">
            {intervention.vehicules?.immatriculation ?? "—"}
          </span>
          {heure && (
            <span className="font-mono text-[9px] text-muted-foreground shrink-0">{heure}</span>
          )}
        </div>
        {/* Ligne 2 : client + statut pill */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] text-muted-foreground truncate">
            {intervention.entreprises?.nom ?? ""}
          </span>
          {intervention.statut && (
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-px text-[9px] font-semibold",
                statutColor(intervention.statut)
              )}
            >
              {statutLabel(intervention.statut)}
            </span>
          )}
        </div>
        {/* Ligne 3 : pack tag */}
        {packLabel && (
          <span className="mt-1 inline-block rounded-sm bg-muted px-1.5 py-px text-[9px] font-medium text-muted-foreground">
            {packLabel}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Empty slot (droppable zone visuelle) ──────────────────────────────────────

function EmptySlot() {
  return (
    <div className="flex h-[68px] items-center justify-center gap-2 rounded-md border-2 border-dashed border-border text-muted-foreground/50">
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-border">
        <Plus className="h-3 w-3" />
      </span>
      <span className="text-[11px]">Créneau libre</span>
    </div>
  );
}

// ─── Half-day block (Matin / Après-midi) ──────────────────────────────────────

function HalfDayBlock({
  label,
  timeRange,
  slots,
  operator,
  day,
  interventions,
  getCellInterventions,
  onNavigate,
}: {
  label: string;
  timeRange: string;
  slots: SubSlotKey[];
  operator: Operator;
  day: Date;
  interventions: Intervention[];
  getCellInterventions: (slot: SubSlotKey, date: Date, opId: string) => Intervention[];
  onNavigate: (id: string) => void;
}) {
  return (
    <div>
      {/* Header demi-journée */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-t border-border bg-muted/30">
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: operator.color_hex }}
        />
        <span className="text-[10px] font-semibold text-foreground/70">
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground">· {timeRange}</span>
      </div>
      {/* Slots */}
      <div className="space-y-1.5 p-2">
        {slots.map((slotKey) => {
          const items = getCellInterventions(slotKey, day, operator.id);
          const slot = TIME_SUB_SLOTS.find((s) => s.key === slotKey)!;
          if (items.length === 0) return <EmptySlot key={slotKey} />;
          return (
            <div key={slotKey} className="space-y-1">
              {items.map((i) => (
                <InterventionCard
                  key={i.id}
                  intervention={i}
                  color={operator.color_hex}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Operator column ───────────────────────────────────────────────────────────

function OperatorColumn({
  operator,
  daysToShow,
  getCellInterventions,
  totalInterventions,
  maxSlots,
  onNavigate,
}: {
  operator: Operator;
  daysToShow: Date[];
  getCellInterventions: (slot: SubSlotKey, date: Date, opId: string) => Intervention[];
  totalInterventions: number;
  maxSlots: number;
  onNavigate: (id: string) => void;
}) {
  const color = operator.color_hex;
  const chargeRatio = maxSlots > 0 ? Math.min(totalInterventions / maxSlots, 1) : 0;

  const morningSlotsKeys: SubSlotKey[] = ["morning_1", "morning_2"];
  const afternoonSlotsKeys: SubSlotKey[] = ["afternoon_1", "afternoon_2"];

  return (
    <div className="min-w-[300px] flex-1 rounded-lg border border-border bg-card shadow-elegant overflow-hidden">
      {/* Header opérateur (sticky) */}
      <div
        className="sticky top-0 z-10 border-b-2 px-3 py-2.5"
        style={{
          background: `color-mix(in srgb, ${color} 10%, white)`,
          borderBottomColor: color,
        }}
      >
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {operator.initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="font-display text-[14px] font-bold text-foreground truncate">
                {operator.name}
              </span>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: color }}
              >
                {totalInterventions}/{maxSlots}
              </span>
            </div>
            {/* Barre de charge */}
            <div className="mt-1.5 h-[5px] w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${chargeRatio * 100}%`, backgroundColor: color }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Corps : jours */}
      {daysToShow.map((day) => (
        <div key={format(day, "yyyy-MM-dd")} className="border-b border-border last:border-b-0">
          {/* En-tête jour */}
          <div className="flex items-center gap-2 px-2.5 py-2 bg-muted/20">
            <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
            <span
              className={cn(
                "text-[11px] font-semibold capitalize",
                isToday(day) ? "text-primary" : "text-foreground/70"
              )}
            >
              {format(day, "EEE dd MMM", { locale: fr })}
            </span>
            {isToday(day) && (
              <span className="ml-auto rounded-full bg-primary px-1.5 py-px text-[9px] font-semibold text-primary-foreground">
                Auj.
              </span>
            )}
          </div>

          {/* Matin */}
          <HalfDayBlock
            label="Matin"
            timeRange="08h–12h"
            slots={morningSlotsKeys}
            operator={operator}
            day={day}
            interventions={[]}
            getCellInterventions={getCellInterventions}
            onNavigate={onNavigate}
          />

          {/* Après-midi */}
          <HalfDayBlock
            label="Après-midi"
            timeRange="14h–18h"
            slots={afternoonSlotsKeys}
            operator={operator}
            day={day}
            interventions={[]}
            getCellInterventions={getCellInterventions}
            onNavigate={onNavigate}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function PlanningCalendar() {
  const navigate = useNavigate();
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfISOWeek(new Date())
  );
  const [operators, setOperators] = useState<Operator[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [view, setView] = useState<"semaine" | "jour">("semaine");

  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfISOWeek(currentWeekStart),
  }).slice(0, 5); // lundi–vendredi

  const weekEnd = addDays(currentWeekStart, 4);
  const weekStartStr = format(currentWeekStart, "yyyy-MM-dd");

  // Recale le jour sélectionné dans la semaine affichée
  useEffect(() => {
    const inWeek = weekDays.find((d) => isSameDay(d, selectedDay));
    if (!inWeek) {
      const today = weekDays.find((d) => isSameDay(d, new Date()));
      setSelectedDay(today ?? weekDays[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartStr]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const weekEndStr = format(addDays(new Date(weekStartStr), 4), "yyyy-MM-dd");
    const [opsRes, intsRes] = await Promise.all([
      supabase.from("operators").select("*").order("name"),
      supabase
        .from("interventions")
        .select(
          "id, operator_id, time_slot, heure_intervention, date_intervention, statut, type_prestation, vehicules(immatriculation), entreprises(nom)"
        )
        .not("operator_id", "is", null)
        .neq("statut", "annulee")
        .gte("date_intervention", weekStartStr)
        .lte("date_intervention", weekEndStr),
    ]);
    setOperators((opsRes.data ?? []) as Operator[]);
    setInterventions(((intsRes as { data: unknown }).data ?? []) as unknown as Intervention[]);
    setLoading(false);
  }, [weekStartStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getCellInterventions = (
    subSlot: SubSlotKey,
    date: Date,
    opId: string
  ): Intervention[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return interventions.filter(
      (i) =>
        i.operator_id === opId &&
        i.date_intervention?.startsWith(dateStr) &&
        subSlotFromHeure(i.heure_intervention, i.time_slot) === subSlot
    );
  };

  const goNav = (id: string) =>
    navigate({ to: "/admin/interventions/$id", params: { id } });

  const goToday = () => {
    setCurrentWeekStart(startOfISOWeek(new Date()));
    setSelectedDay(new Date());
    setView("jour");
  };

  const daysToShow = view === "jour" ? [selectedDay] : weekDays;

  // Calcul charge par opérateur (total interventions / nb slots disponibles)
  const maxSlots = daysToShow.length * TIME_SUB_SLOTS.length;

  return (
    <div className="flex flex-col gap-4">
      {/* ─── Header navigation ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Nav semaine */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeekStart((w) => subWeeks(w, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[180px] text-center">
            <span className="font-display text-[13px] font-semibold text-foreground">
              {view === "jour"
                ? format(selectedDay, "EEEE d MMMM yyyy", { locale: fr })
                : `Sem. du ${format(currentWeekStart, "d", { locale: fr })} au ${format(weekEnd, "d MMM yyyy", { locale: fr })}`}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeekStart((w) => addWeeks(w, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Bouton Aujourd'hui */}
          <Button variant="outline" size="sm" onClick={goToday}>
            Aujourd'hui
          </Button>

          {/* Toggle Semaine / Jour */}
          <div className="flex overflow-hidden rounded-md border border-border bg-muted">
            {(["semaine", "jour"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 text-[12px] font-medium transition-colors capitalize",
                  view === v
                    ? "bg-card text-foreground shadow-elegant"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v === "semaine" ? "Semaine" : "Jour"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Sélecteur de jour (vue Jour uniquement) ─── */}
      {view === "jour" && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {weekDays.map((day) => {
            const active = isSameDay(day, selectedDay);
            return (
              <button
                key={format(day, "yyyy-MM-dd")}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "flex shrink-0 flex-col items-center rounded-md border px-4 py-2 transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : isToday(day)
                      ? "border-primary/40 bg-primary-soft text-primary"
                      : "border-border bg-card hover:bg-muted/40"
                )}
              >
                <span className="text-[10px] font-semibold uppercase">
                  {format(day, "EEE", { locale: fr })}
                </span>
                <span className="text-base font-bold">{format(day, "d")}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── États chargement / vide ─── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : operators.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-primary-soft/20 p-12 text-center">
          <Calendar className="h-8 w-8 text-muted-foreground/40" />
          <p className="font-display text-lg font-bold text-foreground">Aucun opérateur</p>
          <p className="text-sm text-muted-foreground">
            Créez au moins un opérateur pour utiliser le planning.
          </p>
        </div>
      ) : (
        /* ─── Board colonnes opérateurs ─── */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {operators.map((op) => {
            const opInterventions = interventions.filter(
              (i) => i.operator_id === op.id
            );
            return (
              <OperatorColumn
                key={op.id}
                operator={op}
                daysToShow={daysToShow}
                getCellInterventions={getCellInterventions}
                totalInterventions={opInterventions.length}
                maxSlots={maxSlots}
                onNavigate={goNav}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
