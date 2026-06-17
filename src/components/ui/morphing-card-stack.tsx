// Morphing Card Stack — adapté de "Composable Card Stack" (21st.dev, Kousthubha
// Yadiyala) pour la section "Avis clients" de la landing IZOX.
//
// Adaptations IZOX (vs source 21st.dev) :
//   - "use client" retiré (directive Next.js, sans effet sous TanStack Start)
//   - modes grid/list + toggle supprimés : on ne garde que la PILE (stack),
//     seul mode pertinent pour une section témoignages publique
//   - export `Component` générique renommé `MorphingCardStack`, typé sur nos
//     données d'avis (auteur / texte / note) au lieu d'un CardData abstrait
//   - cartes habillées en .b2c-card .b2c-glow-card (charte premium landing,
//     cohérent FAQ/Pricing) au lieu des classes shadcn brutes
//   - note → rangée d'étoiles ; pas d'icône factice
//   - navigation : swipe (drag x) + flèches ‹ › + points indicateurs, le tout
//     a11y (aria-live, aria-label)

import { useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TestimonialEntry {
  id: string;
  auteurNom: string;
  auteurRole: string | null;
  texte: string;
  note: number | null;
  photoUrl: string | null;
}

const SWIPE_THRESHOLD = 50;

export function MorphingCardStack({ testimonials }: { testimonials: TestimonialEntry[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  if (!testimonials || testimonials.length === 0) return null;

  const total = testimonials.length;
  const goNext = () => setActiveIndex((prev) => (prev + 1) % total);
  const goPrev = () => setActiveIndex((prev) => (prev - 1 + total) % total);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const { offset, velocity } = info;
    const swipe = Math.abs(offset.x) * velocity.x;
    if (offset.x < -SWIPE_THRESHOLD || swipe < -1000) {
      goNext();
    } else if (offset.x > SWIPE_THRESHOLD || swipe > 1000) {
      goPrev();
    }
    // léger délai : éviter qu'un drag déclenche aussi un onClick
    setTimeout(() => setIsDragging(false), 0);
  };

  // Réordonne la pile pour que activeIndex soit devant ; on inverse pour que
  // la carte du dessus (stackPosition 0) soit rendue en dernier → au-dessus.
  const ordered = Array.from({ length: total }, (_, i) => {
    const index = (activeIndex + i) % total;
    return { ...testimonials[index], stackPosition: i };
  }).reverse();

  const active = testimonials[activeIndex];

  return (
    <div className="flex flex-col items-center gap-7">
      {/* annonce a11y du témoignage affiché */}
      <div aria-live="polite" className="sr-only">
        Témoignage de {active.auteurNom}
      </div>

      {/* Conteneur de pile — plus grand que les cartes pour laisser dépasser
          l'offset des cartes du dessous. */}
      <div className="relative h-[330px] w-[290px] sm:h-[350px] sm:w-[380px]">
        <AnimatePresence mode="popLayout">
          {ordered.map((card) => {
            const pos = card.stackPosition;
            const isTop = pos === 0;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{
                  opacity: pos > 4 ? 0 : 1,
                  scale: 1,
                  x: 0,
                  top: pos * 10,
                  left: pos * 10,
                  rotate: pos * 2,
                  zIndex: total - pos,
                }}
                exit={{ opacity: 0, scale: 0.85, x: -220 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                drag={isTop ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={handleDragEnd}
                whileDrag={{ scale: 1.02 }}
                onClick={() => {
                  if (isDragging || isTop) return;
                  goNext();
                }}
                // position:absolute FORCÉ en inline — sinon la règle
                // `.izox-b2c .b2c-glow-card{position:relative}` (spécificité 2
                // classes) bat la classe utilitaire .absolute (1 classe) et les
                // cartes retombent dans le flux normal, débordant la page.
                style={{ position: "absolute" }}
                className={cn(
                  "b2c-card b2c-glow-card flex h-[300px] w-[270px] flex-col p-6 sm:h-[320px] sm:w-[350px] sm:p-7",
                  isTop ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                )}
              >
                {card.note ? (
                  <div className="mb-3 flex gap-0.5" aria-hidden="true">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4"
                        style={{
                          color: "var(--b2c-accent)",
                          fill: i < card.note! ? "var(--b2c-accent)" : "none",
                        }}
                      />
                    ))}
                  </div>
                ) : null}

                <p className="text-base font-medium leading-snug text-[var(--b2c-tx)] sm:text-lg">
                  "{card.texte}"
                </p>

                <div className="mt-auto flex items-center gap-3 pt-5">
                  {card.photoUrl ? (
                    <img
                      src={card.photoUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : null}
                  <p className="text-sm italic text-[var(--b2c-tx-dim)]">
                    — {card.auteurNom}
                    {card.auteurRole ? `, ${card.auteurRole}` : ""}
                  </p>
                </div>

                {isTop && total > 1 ? (
                  <span className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-xs text-[var(--b2c-tx-faint)]">
                    Faites glisser pour naviguer
                  </span>
                ) : null}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Navigation : flèches + points */}
      {total > 1 ? (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Témoignage précédent"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--b2c-line)] bg-[var(--b2c-bg2)] text-[var(--b2c-tx)] transition-colors hover:border-[var(--b2c-accent)] hover:text-[var(--b2c-accent)]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-1.5">
            {testimonials.map((t, index) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Aller au témoignage ${index + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === activeIndex
                    ? "w-5 bg-[var(--b2c-accent)]"
                    : "w-1.5 bg-[var(--b2c-tx-faint)] hover:bg-[var(--b2c-tx-dim)]"
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={goNext}
            aria-label="Témoignage suivant"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--b2c-line)] bg-[var(--b2c-bg2)] text-[var(--b2c-tx)] transition-colors hover:border-[var(--b2c-accent)] hover:text-[var(--b2c-accent)]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
