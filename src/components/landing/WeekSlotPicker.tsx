import { useState } from "react";
import {
  addDays, addWeeks, subWeeks, startOfWeek,
  format, endOfMonth, startOfDay, isAfter,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isDateSelectableB2C } from "@/lib/calendrier-contraintes";

export interface CreneauB2C {
  date: string; // YYYY-MM-DD
  heure: "08:00" | "10:00" | "14:00" | "16:00";
}

type SatEntry = { nb: number; cap: number };

const HOUR_SLOTS = [
  { heure: "08:00" as const, label: "08h", timeSlot: "morning" as const },
  { heure: "10:00" as const, label: "10h", timeSlot: "morning" as const },
  { heure: "14:00" as const, label: "14h", timeSlot: "afternoon" as const },
  { heure: "16:00" as const, label: "16h", timeSlot: "afternoon" as const },
];

export const MAX_CRENEAUX = 3;

interface Props {
  selected: CreneauB2C[];
  onSelect: (creneaux: CreneauB2C[]) => void;
  satMap: Record<string, SatEntry>;
}

export function WeekSlotPicker({ selected, onSelect, satMap }: Props) {
  const today = startOfDay(new Date());
  const monthEnd = endOfMonth(today);
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const [weekStart, setWeekStart] = useState(thisWeekStart);

  // Mon–Sat (6 days, skip Sun)
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

  const canPrev = isAfter(weekStart, thisWeekStart);
  const nextWeekStart = addWeeks(weekStart, 1);
  const canNext = !isAfter(nextWeekStart, monthEnd);

  const isSlotFull = (day: Date, timeSlot: "morning" | "afternoon") => {
    const key = `${format(day, "yyyy-MM-dd")}-${timeSlot}`;
    const entry = satMap[key];
    return !!entry && entry.cap > 0 && entry.nb >= entry.cap;
  };

  const getDaySelection = (dateStr: string) =>
    selected.find((c) => c.date === dateStr);

  const handleClick = (dateStr: string, heure: CreneauB2C["heure"]) => {
    const onDay = getDaySelection(dateStr);
    if (onDay?.heure === heure) {
      // Toggle off
      onSelect(selected.filter((c) => c.date !== dateStr));
      return;
    }
    if (onDay) {
      // Replace hour on same day
      onSelect(selected.map((c) => (c.date === dateStr ? { date: dateStr, heure } : c)));
      return;
    }
    if (selected.length >= MAX_CRENEAUX) return;
    onSelect([...selected, { date: dateStr, heure }]);
  };

  const sat = addDays(weekStart, 5);
  const weekLabel = `${format(weekStart, "d", { locale: fr })} – ${format(sat, "d MMM yyyy", { locale: fr })}`;

  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekStart(subWeeks(weekStart, 1))}
          disabled={!canPrev}
          aria-label="Semaine précédente"
          className="p-1.5 rounded-lg disabled:opacity-25 disabled:cursor-not-allowed text-[var(--b2c-tx-dim)] hover:text-[var(--b2c-tx)] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-semibold text-[var(--b2c-tx)] capitalize">
          {weekLabel}
        </span>
        <button
          onClick={() => setWeekStart(addWeeks(weekStart, 1))}
          disabled={!canNext}
          aria-label="Semaine suivante"
          className="p-1.5 rounded-lg disabled:opacity-25 disabled:cursor-not-allowed text-[var(--b2c-tx-dim)] hover:text-[var(--b2c-tx)] transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day columns: Mon–Sat */}
      <div className="grid grid-cols-6 gap-1">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const selectable = isDateSelectableB2C(day);
          const onDay = getDaySelection(dateStr);
          const maxReached = selected.length >= MAX_CRENEAUX && !onDay;

          return (
            <div key={dateStr} className="flex flex-col items-center gap-1">
              {/* Day header */}
              <span className="text-[9px] uppercase tracking-widest font-semibold text-[var(--b2c-tx-dim)]">
                {format(day, "EEE", { locale: fr }).replace(".", "").slice(0, 3)}
              </span>
              <span
                className={`text-sm font-bold leading-none mb-0.5 ${
                  selectable ? "text-[var(--b2c-tx)]" : "text-[var(--b2c-tx-dim)] opacity-30"
                }`}
              >
                {format(day, "d")}
              </span>

              {/* Hour chips */}
              {HOUR_SLOTS.map((slot) => {
                const isSel = onDay?.heure === slot.heure;
                const full = isSlotFull(day, slot.timeSlot);
                const disabled = !selectable || (full && !isSel) || (!isSel && maxReached);

                return (
                  <button
                    key={slot.heure}
                    onClick={() => handleClick(dateStr, slot.heure)}
                    disabled={disabled}
                    className={`w-full text-[11px] py-1.5 rounded-md border transition-all font-medium leading-none ${
                      isSel
                        ? ""
                        : disabled
                        ? "opacity-25 cursor-not-allowed border-[var(--b2c-line)] text-[var(--b2c-tx-dim)]"
                        : "border-[var(--b2c-line)] text-[var(--b2c-tx-dim)] hover:border-[var(--b2c-accent)] hover:text-[var(--b2c-accent)]"
                    }`}
                    style={
                      isSel
                        ? { background: "var(--b2c-accent)", color: "#06120c", borderColor: "var(--b2c-accent)" }
                        : {}
                    }
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Status hint */}
      <p className="text-[11px] text-center text-[var(--b2c-tx-dim)]">
        {selected.length === 0 && "Choisissez 2 à 3 dates différentes"}
        {selected.length === 1 && "Encore 1 date minimum"}
        {selected.length === 2 && "1 date supplémentaire possible (optionnel)"}
        {selected.length === MAX_CRENEAUX && "Sélection complète ✓"}
      </p>
    </div>
  );
}
