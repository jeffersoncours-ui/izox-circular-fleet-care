import { useState, useCallback, useEffect } from "react";
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
  isSameDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MAX_PER_CELL = 3;

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
  date_intervention: string | null;
  vehicule?: { immatriculation: string } | null;
  entreprise?: { nom: string } | null;
}

type CellKey = `${string}__${string}__${string}`; // operatorId__timeSlot__date

function cellKey(operatorId: string, timeSlot: string, date: string): CellKey {
  return `${operatorId}__${timeSlot}__${date}` as CellKey;
}

// ─── Draggable card ───────────────────────────────────────────────────────────

function InterventionCard({
  intervention,
  color,
  isDragging = false,
}: {
  intervention: Intervention;
  color: string;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: intervention.id,
    data: intervention,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs shadow-sm select-none"
    >
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing text-muted-foreground shrink-0"
      >
        <GripVertical className="h-3 w-3" />
      </div>
      <div
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="truncate font-medium">
        {intervention.vehicule?.immatriculation ?? "—"}
      </span>
    </div>
  );
}

// ─── Droppable cell ───────────────────────────────────────────────────────────

function PlanningCell({
  operatorId,
  timeSlot,
  date,
  interventions,
  operatorColor,
  activeId,
}: {
  operatorId: string;
  timeSlot: string;
  date: string;
  interventions: Intervention[];
  operatorColor: string;
  activeId: string | null;
}) {
  const id = cellKey(operatorId, timeSlot, date);
  const { setNodeRef, isOver } = useDroppable({ id });
  const count = interventions.length;
  const overflow = Math.max(0, count - MAX_PER_CELL);
  const visible = interventions.slice(0, MAX_PER_CELL);
  const isFull = count >= MAX_PER_CELL;

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] rounded-md border-2 p-1.5 space-y-1 transition-colors ${
        isOver
          ? isFull
            ? "border-destructive/40 bg-destructive/5"
            : "border-primary/60 bg-primary/5"
          : "border-border bg-card/50"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-[10px] font-semibold ${
            isFull ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {count}/{MAX_PER_CELL}
        </span>
      </div>

      {visible.map((i) => (
        <InterventionCard
          key={i.id}
          intervention={i}
          color={operatorColor}
          isDragging={i.id === activeId}
        />
      ))}

      {overflow > 0 && (
        <Badge variant="secondary" className="text-[10px] h-5">
          +{overflow} de plus
        </Badge>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlanningCalendar() {
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

  const weekEnd = addDays(currentWeekStart, 4); // vendredi

  // Clé stable de la semaine (string) pour éviter une boucle de re-fetch :
  // addDays() crée un nouvel objet Date à chaque render, donc on ne peut pas
  // l'utiliser directement comme dépendance.
  const weekStartStr = format(currentWeekStart, "yyyy-MM-dd");

  const loadData = useCallback(async () => {
    setLoading(true);
    const weekEndStr = format(addDays(new Date(weekStartStr), 4), "yyyy-MM-dd");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [opsRes, intsRes] = await Promise.all([
      (supabase.from as any)("operators").select("*").order("name"),
      supabase
        .from("interventions")
        .select("id, operator_id, time_slot, date_intervention, vehicules(immatriculation), entreprises(nom)")
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

  const getCellInterventions = (
    operatorId: string,
    timeSlot: string,
    date: Date
  ): Intervention[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return interventions.filter(
      (i) =>
        i.operator_id === operatorId &&
        i.time_slot === timeSlot &&
        i.date_intervention?.startsWith(dateStr)
    );
  };

  const getActiveIntervention = () =>
    activeId ? interventions.find((i) => i.id === activeId) ?? null : null;

  const getOperatorColor = (id: string) =>
    operators.find((o) => o.id === id)?.color_hex ?? "#6B7280";

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const [newOperatorId, newTimeSlot, newDate] = String(over.id).split("__");
    const activeIdStr = String(active.id);
    const intervention = interventions.find((i) => i.id === activeIdStr);
    if (!intervention) return;

    // No change
    if (
      intervention.operator_id === newOperatorId &&
      intervention.time_slot === newTimeSlot &&
      intervention.date_intervention?.startsWith(newDate)
    )
      return;

    // Check capacity
    const targetCount = getCellInterventions(
      newOperatorId,
      newTimeSlot,
      new Date(newDate)
    ).filter((i) => i.id !== activeIdStr).length;
    if (targetCount >= MAX_PER_CELL) {
      toast.error("Ce créneau est complet (3/3)");
      return;
    }

    // Optimistic update
    const prev = [...interventions];
    setInterventions((cur) =>
      cur.map((i) =>
        i.id === activeIdStr
          ? { ...i, operator_id: newOperatorId, time_slot: newTimeSlot, date_intervention: newDate }
          : i
      )
    );

    const { error } = await supabase
      .from("interventions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ operator_id: newOperatorId, time_slot: newTimeSlot, date_intervention: newDate } as any)
      .eq("id", String(active.id));

    if (error) {
      toast.error("Erreur lors du déplacement");
      setInterventions(prev);
    } else {
      toast.success("Intervention déplacée");
    }
  };

  const TIME_SLOTS = [
    { key: "morning", label: "Matin", sublabel: "08h – 12h" },
    { key: "afternoon", label: "Après-midi", sublabel: "14h – 18h" },
  ] as const;

  const activeIntervention = getActiveIntervention();

  return (
    <div className="space-y-4">
      {/* Week navigation */}
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
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-28 p-2 text-left text-xs text-muted-foreground" />
                  {operators.map((op) => (
                    <th key={op.id} className="p-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: op.color_hex }}
                        >
                          {op.initials}
                        </div>
                        <span className="text-xs font-semibold text-foreground">
                          {op.name}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekDays.map((day) =>
                  TIME_SLOTS.map((slot) => (
                    <tr key={`${format(day, "yyyy-MM-dd")}-${slot.key}`}>
                      {slot.key === "morning" ? (
                        <td rowSpan={2} className="border-t border-border p-2 align-top">
                          <div className="text-xs font-semibold text-foreground capitalize">
                            {format(day, "EEEE", { locale: fr })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(day, "d MMM", { locale: fr })}
                          </div>
                        </td>
                      ) : null}
                      <td
                        className={`border-t border-border p-1 w-4 ${
                          slot.key === "afternoon" ? "border-t-dashed" : ""
                        }`}
                        style={{ width: "112px" }}
                      >
                        <div className="text-[10px] text-muted-foreground px-1">
                          {slot.label}
                          <br />
                          <span className="text-[9px]">{slot.sublabel}</span>
                        </div>
                      </td>
                      {operators.map((op) => (
                        <td
                          key={op.id}
                          className={`border-t border-l border-border p-1 min-w-[160px] ${
                            slot.key === "afternoon" ? "border-t-dashed" : ""
                          }`}
                        >
                          <PlanningCell
                            operatorId={op.id}
                            timeSlot={slot.key}
                            date={format(day, "yyyy-MM-dd")}
                            interventions={getCellInterventions(op.id, slot.key, day)}
                            operatorColor={op.color_hex}
                            activeId={activeId}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <DragOverlay>
            {activeIntervention && (
              <Card className="px-2 py-1 text-xs shadow-lg flex items-center gap-2 w-fit">
                <GripVertical className="h-3 w-3 text-muted-foreground" />
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: getOperatorColor(activeIntervention.operator_id ?? "") }}
                />
                {activeIntervention.vehicule?.immatriculation ?? "—"}
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
