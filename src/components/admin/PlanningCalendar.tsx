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
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, ChevronRight as Arrow } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_SUB_SLOTS = [
  { key: "morning_1",   label: "8h – 9h30",    half: "morning"   },
  { key: "morning_2",   label: "10h – 11h30",  half: "morning"   },
  { key: "afternoon_1", label: "14h – 15h30",  half: "afternoon" },
  { key: "afternoon_2", label: "16h – 17h30",  half: "afternoon" },
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

// ─── Types ────────────────────────────────────────────────────────────────────

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
  vehicules?: { immatriculation: string } | null;
  entreprises?: { nom: string } | null;
}

// ─── Intervention card (cliquable → fiche) ─────────────────────────────────────

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
  return (
    <button
      type="button"
      onClick={() => onNavigate(intervention.id)}
      className="w-full flex items-center gap-2 rounded-md border bg-card px-2 py-2 text-xs shadow-sm hover:bg-muted/40 transition-colors text-left"
    >
      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">
          {intervention.vehicules?.immatriculation ?? "—"}
        </div>
        <div className="truncate text-[10px] text-muted-foreground">
          {heure ? heure + " · " : ""}
          {intervention.entreprises?.nom ?? ""}
        </div>
      </div>
      <Arrow className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlanningCalendar() {
  const navigate = useNavigate();
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfISOWeek(new Date())
  );
  const [operators, setOperators] = useState<Operator[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfISOWeek(currentWeekStart),
  }).slice(0, 5); // lundi–vendredi

  const weekEnd = addDays(currentWeekStart, 4);
  const weekStartStr = format(currentWeekStart, "yyyy-MM-dd");

  // Recale le jour sélectionné dans la semaine affichée (défaut : aujourd'hui si présent, sinon lundi)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from as any)("operators").select("*").order("name"),
      supabase
        .from("interventions")
        .select("id, operator_id, time_slot, heure_intervention, date_intervention, vehicules(immatriculation), entreprises(nom)")
        .not("operator_id", "is", null)
        .neq("statut", "annulee")
        .gte("date_intervention", weekStartStr)
        .lte("date_intervention", weekEndStr),
    ]);
    setOperators(((opsRes as { data: unknown }).data ?? []) as Operator[]);
    setInterventions(((intsRes as { data: unknown }).data ?? []) as unknown as Intervention[]);
    setLoading(false);
  }, [weekStartStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const defaultOperatorColor = operators[0]?.color_hex ?? "#6B7280";

  const getCellInterventions = (subSlot: SubSlotKey, date: Date): Intervention[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return interventions.filter(
      (i) =>
        i.date_intervention?.startsWith(dateStr) &&
        subSlotFromHeure(i.heure_intervention, i.time_slot) === subSlot
    );
  };

  const goNav = (id: string) => navigate({ to: "/admin/interventions/$id", params: { id } });

  return (
    <div className="space-y-4">
      {/* Navigation semaine */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentWeekStart((w) => subWeeks(w, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Semaine préc.</span>
        </Button>

        <p className="text-sm font-semibold text-foreground text-center">
          {format(currentWeekStart, "d MMM", { locale: fr })} –{" "}
          {format(weekEnd, "d MMM yyyy", { locale: fr })}
        </p>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentWeekStart((w) => addWeeks(w, 1))}
        >
          <span className="hidden sm:inline">Semaine suiv.</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : operators.length === 0 ? (
        <Card className="p-12 text-center border-border/60">
          <p className="text-muted-foreground">Aucun opérateur trouvé.</p>
        </Card>
      ) : (
        <>
          {/* ─── Vue mobile : sélecteur de jour + créneaux empilés ─── */}
          <div className="md:hidden space-y-3">
            <div className="grid grid-cols-5 gap-1.5">
              {weekDays.map((day) => {
                const active = isSameDay(day, selectedDay);
                return (
                  <button
                    key={format(day, "yyyy-MM-dd")}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`flex flex-col items-center rounded-lg border py-2 transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-muted/40"
                    }`}
                  >
                    <span className="text-[11px] font-semibold capitalize">
                      {format(day, "EEE", { locale: fr })}
                    </span>
                    <span className="text-sm font-bold">{format(day, "d")}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              {TIME_SUB_SLOTS.map((slot) => {
                const cell = getCellInterventions(slot.key, selectedDay);
                return (
                  <div key={slot.key} className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      {slot.label}
                    </p>
                    {cell.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 italic">Libre</p>
                    ) : (
                      <div className="space-y-2">
                        {cell.map((i) => (
                          <InterventionCard
                            key={i.id}
                            intervention={i}
                            color={defaultOperatorColor}
                            onNavigate={goNav}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Vue desktop : grille semaine ─── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="w-24 p-2 text-left text-muted-foreground font-normal border-b border-border" />
                  {weekDays.map((day) => (
                    <th
                      key={format(day, "yyyy-MM-dd")}
                      className="p-2 text-center border-b border-l border-border"
                    >
                      <div className="text-xs font-semibold text-foreground capitalize">
                        {format(day, "EEEE", { locale: fr })}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {format(day, "d MMM", { locale: fr })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SUB_SLOTS.map((slot, idx) => (
                  <tr
                    key={slot.key}
                    className={slot.key === "afternoon_1" ? "border-t-2 border-border" : ""}
                  >
                    <td
                      className={`p-2 text-[10px] whitespace-nowrap border-r border-border ${
                        idx > 0 ? "border-t border-border" : ""
                      }`}
                    >
                      <div className="font-medium text-foreground/70">{slot.label}</div>
                    </td>
                    {weekDays.map((day) => (
                      <td
                        key={format(day, "yyyy-MM-dd")}
                        className={`p-1 border-l border-border align-top ${
                          idx > 0 ? "border-t border-border" : ""
                        }`}
                      >
                        <div className="min-h-[52px] space-y-1">
                          {getCellInterventions(slot.key, day).map((i) => (
                            <InterventionCard
                              key={i.id}
                              intervention={i}
                              color={defaultOperatorColor}
                              onNavigate={goNav}
                            />
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
