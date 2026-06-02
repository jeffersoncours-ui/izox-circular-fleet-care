import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  startOfISOWeek,
  addWeeks,
  subWeeks,
  format,
  addDays,
  eachDayOfInterval,
  endOfISOWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_SUB_SLOTS = [
  { key: "morning_1",   label: "8h – 9h30",   half: "morning"   },
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

function halfDayOf(subSlot: string): "morning" | "afternoon" {
  return subSlot.startsWith("morning") ? "morning" : "afternoon";
}

type CellKey = `${string}__${SubSlotKey}__${string}`; // operatorId__subSlot__date

function cellKey(operatorId: string, subSlot: SubSlotKey, date: string): CellKey {
  return `${operatorId}__${subSlot}__${date}` as CellKey;
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

// ─── Draggable card ───────────────────────────────────────────────────────────

function InterventionCard({
  intervention,
  color,
  isDragging = false,
  onNavigate,
}: {
  intervention: Intervention;
  color: string;
  isDragging?: boolean;
  onNavigate: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: intervention.id,
    data: intervention,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` }
    : undefined;

  const heure = intervention.heure_intervention
    ? intervention.heure_intervention.slice(0, 5).replace(":", "h")
    : null;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1.5 text-xs shadow-sm select-none"
    >
      {/* Grip — seul déclencheur de drag */}
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing text-muted-foreground shrink-0"
      >
        <GripVertical className="h-3 w-3" />
      </div>
      {/* Zone cliquable → détail */}
      <button
        type="button"
        onClick={() => onNavigate(intervention.id)}
        className="flex items-center gap-1.5 min-w-0 flex-1 hover:underline cursor-pointer text-left"
      >
        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <div className="min-w-0">
          <div className="truncate font-medium">
            {intervention.vehicules?.immatriculation ?? "—"}
          </div>
          {heure && (
            <div className="text-[10px] text-muted-foreground">{heure}</div>
          )}
        </div>
      </button>
    </div>
  );
}

// ─── Droppable cell ───────────────────────────────────────────────────────────

function PlanningCell({
  operatorId,
  subSlot,
  date,
  interventions,
  operatorColor,
  activeId,
  onNavigate,
}: {
  operatorId: string;
  subSlot: SubSlotKey;
  date: string;
  interventions: Intervention[];
  operatorColor: string;
  activeId: string | null;
  onNavigate: (id: string) => void;
}) {
  const id = cellKey(operatorId, subSlot, date);
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[56px] rounded border p-1 space-y-1 transition-colors ${
        isOver ? "border-primary/60 bg-primary/5" : "border-border/60 bg-card/40"
      }`}
    >
      {interventions.map((i) => (
        <InterventionCard
          key={i.id}
          intervention={i}
          color={operatorColor}
          isDragging={i.id === activeId}
          onNavigate={onNavigate}
        />
      ))}
    </div>
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
  const [activeId, setActiveId] = useState<string | null>(null);

  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfISOWeek(currentWeekStart),
  }).slice(0, 5); // lundi–vendredi

  const weekEnd = addDays(currentWeekStart, 4);
  const weekStartStr = format(currentWeekStart, "yyyy-MM-dd");

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

  const defaultOperatorId = operators[0]?.id ?? "";
  const defaultOperatorColor = operators[0]?.color_hex ?? "#6B7280";

  const getCellInterventions = (subSlot: SubSlotKey, date: Date): Intervention[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return interventions.filter(
      (i) =>
        i.date_intervention?.startsWith(dateStr) &&
        subSlotFromHeure(i.heure_intervention, i.time_slot) === subSlot
    );
  };

  const getHalfDayCount = (half: "morning" | "afternoon", dateStr: string): number =>
    interventions.filter(
      (i) =>
        i.date_intervention?.startsWith(dateStr) &&
        halfDayOf(subSlotFromHeure(i.heure_intervention, i.time_slot)) === half
    ).length;

  const getActiveIntervention = () =>
    activeId ? interventions.find((i) => i.id === activeId) ?? null : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const parts = String(over.id).split("__");
    const newOperatorId = parts[0];
    const newSubSlot = parts[1] as SubSlotKey;
    const newDate = parts[2];
    const activeIdStr = String(active.id);
    const intervention = interventions.find((i) => i.id === activeIdStr);
    if (!intervention) return;

    const currentSubSlot = subSlotFromHeure(intervention.heure_intervention, intervention.time_slot);
    if (
      intervention.operator_id === newOperatorId &&
      currentSubSlot === newSubSlot &&
      intervention.date_intervention?.startsWith(newDate)
    )
      return;

    // Capacité max 2 par demi-journée
    const newHalf = halfDayOf(newSubSlot);
    const halfCount = interventions.filter(
      (i) =>
        i.id !== activeIdStr &&
        i.date_intervention?.startsWith(newDate) &&
        halfDayOf(subSlotFromHeure(i.heure_intervention, i.time_slot)) === newHalf
    ).length;
    if (halfCount >= 2) {
      toast.error("Demi-journée complète (2/2)");
      return;
    }

    const newTimeSlot = halfDayOf(newSubSlot);

    // Optimistic update
    const prev = [...interventions];
    setInterventions((cur) =>
      cur.map((i) =>
        i.id === activeIdStr
          ? { ...i, operator_id: newOperatorId, time_slot: newTimeSlot, heure_intervention: null, date_intervention: newDate }
          : i
      )
    );

    const { error } = await supabase
      .from("interventions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ operator_id: newOperatorId, time_slot: newTimeSlot, date_intervention: newDate, heure_intervention: null } as any)
      .eq("id", activeIdStr);

    if (error) {
      toast.error("Erreur lors du déplacement");
      setInterventions(prev);
    } else {
      toast.success("Intervention déplacée");
    }
  };

  const activeIntervention = getActiveIntervention();

  return (
    <div className="space-y-4">
      {/* Navigation semaine */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentWeekStart((w) => subWeeks(w, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
          Semaine préc.
        </Button>

        <p className="text-sm font-semibold text-foreground">
          Semaine du{" "}
          {format(currentWeekStart, "d MMMM", { locale: fr })} au{" "}
          {format(weekEnd, "d MMMM yyyy", { locale: fr })}
        </p>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentWeekStart((w) => addWeeks(w, 1))}
        >
          Semaine suiv.
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DndContext
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {/* Colonne label créneau */}
                  <th className="w-24 p-2 text-left text-muted-foreground font-normal border-b border-border" />
                  {weekDays.map((day) => (
                    <th
                      key={format(day, "yyyy-MM-dd")}
                      className="p-2 text-center border-b border-l border-border min-w-[120px]"
                    >
                      <div className="text-xs font-semibold text-foreground capitalize">
                        {format(day, "EEE", { locale: fr })}
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
                    {/* Label créneau */}
                    <td
                      className={`p-2 text-[10px] text-muted-foreground whitespace-nowrap border-r border-border ${
                        idx > 0 ? "border-t border-border" : ""
                      }`}
                    >
                      <div className="font-medium text-foreground/70">{slot.label}</div>
                    </td>

                    {weekDays.map((day) => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const cellInterventions = getCellInterventions(slot.key, day);
                      const halfCount = getHalfDayCount(slot.half, dateStr);
                      const halfFull = halfCount >= 2;

                      return (
                        <td
                          key={dateStr}
                          className={`p-1 border-l border-border ${idx > 0 ? "border-t border-border" : ""} ${
                            slot.key === "afternoon_1" ? "border-t-2" : ""
                          }`}
                        >
                          <PlanningCell
                            operatorId={defaultOperatorId}
                            subSlot={slot.key}
                            date={dateStr}
                            interventions={cellInterventions}
                            operatorColor={defaultOperatorColor}
                            activeId={activeId}
                            onNavigate={(id) =>
                              navigate({ to: "/admin/interventions/$id", params: { id } })
                            }
                          />
                          {halfFull && cellInterventions.length === 0 && (
                            <div className="text-[9px] text-muted-foreground/50 text-center py-1">
                              Complet
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DragOverlay>
            {activeIntervention && (
              <Card className="px-2 py-1 text-xs shadow-lg flex items-center gap-2 w-fit">
                <GripVertical className="h-3 w-3 text-muted-foreground" />
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: defaultOperatorColor }}
                />
                {activeIntervention.vehicules?.immatriculation ?? "—"}
              </Card>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {!loading && operators.length === 0 && (
        <Card className="p-12 text-center border-border/60">
          <p className="text-muted-foreground">Aucun opérateur trouvé.</p>
        </Card>
      )}
    </div>
  );
}
