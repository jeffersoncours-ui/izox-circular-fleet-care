// Carrousel "stagger" avis clients — adapté de Stagger Testimonials (21st.dev).
//
// Adaptations IZOX (vs source 21st.dev) :
//   - "use client" retiré (directive Next.js, sans effet ici)
//   - carte blanche à coin coupé (clipPath) + bandelette diagonale + carte
//     centrale en couleur inversée → remplacées par .b2c-card .b2c-glow-card
//     (cohérent avec FAQ/Pricing/Reviews) ; la carte centrale se distingue
//     par le même état "intensifié" que :hover (cf. landing-b2c.css)
//   - avatars factices (pravatar.cc) retirés : aucune photo par défaut, le
//     slot photoUrl reste prévu pour une future synchro Google Reviews
//   - a11y : cartes non centrales en role="button"/tabIndex/onKeyDown,
//     aria-live annonçant le témoignage actif
//   - prefers-reduced-motion : déjà neutralisé globalement par la règle
//     `.izox-b2c * { transition-duration: 0.001ms !important }` (landing-b2c.css)

import { useEffect, useState } from "react";
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

interface ListItem extends TestimonialEntry {
  _key: number;
}

let keyCounter = 0;
const toListItems = (items: TestimonialEntry[]): ListItem[] =>
  items.map((item) => ({ ...item, _key: keyCounter++ }));

interface CardProps {
  item: ListItem;
  position: number;
  cardSize: number;
  onMove: (steps: number) => void;
}

function TestimonialCard({ item, position, cardSize, onMove }: CardProps) {
  const isCenter = position === 0;
  const depth = Math.abs(position);

  // Effet "deck" : les cartes se chevauchent (offset court) et s'enfoncent
  // (échelle + opacité + z-index décroissants) à mesure qu'on s'éloigne du
  // centre — on voit plusieurs cartes, partiellement cachées par les autres.
  // Seules les cartes à depth <= 2 sont rendues (cf. parent) : la chute
  // échelle/opacité reste donc douce, jamais réduite à un fil quasi invisible.
  const spacing = cardSize * 0.28;
  const scale = Math.max(0.8, 1 - depth * 0.08);
  const opacity = Math.max(0.45, 1 - depth * 0.24);

  const activate = () => {
    if (!isCenter) onMove(position);
  };

  return (
    <div
      role={isCenter ? undefined : "button"}
      tabIndex={isCenter ? undefined : 0}
      aria-label={isCenter ? undefined : `Voir le témoignage de ${item.auteurNom}`}
      onClick={activate}
      onKeyDown={(e) => {
        if (!isCenter && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          activate();
        }
      }}
      className={cn(
        "b2c-card b2c-glow-card absolute left-1/2 top-1/2 flex flex-col p-7 transition-all duration-500 ease-in-out sm:p-8",
        isCenter ? "is-center cursor-default" : "cursor-pointer"
      )}
      style={{
        width: cardSize,
        height: cardSize,
        zIndex: 50 - depth,
        opacity,
        transform: `
          translate(-50%, -50%)
          translateX(${spacing * position}px)
          translateY(${depth * 10}px)
          scale(${scale})
          rotate(${position * 1.5}deg)
        `,
      }}
    >
      {item.photoUrl ? (
        <img src={item.photoUrl} alt="" className="mb-4 h-12 w-12 rounded-full object-cover" />
      ) : null}
      {item.note ? (
        <div className="mb-3 flex gap-0.5" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className="h-4 w-4"
              style={{
                color: "var(--b2c-accent)",
                fill: i < item.note! ? "var(--b2c-accent)" : "none",
              }}
            />
          ))}
        </div>
      ) : null}
      <p className="text-base font-medium leading-snug text-[var(--b2c-tx)] sm:text-lg">
        "{item.texte}"
      </p>
      <p className="mt-auto pt-4 text-sm italic text-[var(--b2c-tx-dim)]">
        — {item.auteurNom}
        {item.auteurRole ? `, ${item.auteurRole}` : ""}
      </p>
    </div>
  );
}

export function TestimonialsStagger({ testimonials }: { testimonials: TestimonialEntry[] }) {
  const [cardSize, setCardSize] = useState(365);
  const [list, setList] = useState<ListItem[]>(() => toListItems(testimonials));

  useEffect(() => {
    setList(toListItems(testimonials));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testimonials]);

  useEffect(() => {
    const updateSize = () => {
      const { matches } = window.matchMedia("(min-width: 640px)");
      setCardSize(matches ? 360 : 255);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  if (testimonials.length < 3) return null;

  const handleMove = (steps: number) => {
    setList((current) => {
      const next = [...current];
      if (steps > 0) {
        for (let i = steps; i > 0; i--) {
          const item = next.shift();
          if (!item) return current;
          next.push({ ...item, _key: keyCounter++ });
        }
      } else {
        for (let i = steps; i < 0; i++) {
          const item = next.pop();
          if (!item) return current;
          next.unshift({ ...item, _key: keyCounter++ });
        }
      }
      return next;
    });
  };

  const centerIndex = Math.floor(list.length / 2);
  const centerName = list[centerIndex]?.auteurNom ?? "";
  // Fenêtre de rendu limitée à 2 cartes de part et d'autre du centre : au-delà,
  // l'effet d'échelle/opacité dégressif les rendrait quasi invisibles et leur
  // sliver clippé par overflow-hidden donnait un artefact visuel "tordu".
  const maxDepth = 2;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: cardSize + 190,
        maskImage:
          "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
      }}
    >
      <div aria-live="polite" className="sr-only">
        Témoignage de {centerName}
      </div>
      {list.map((item, index) => {
        const position = index - centerIndex;
        if (Math.abs(position) > maxDepth) return null;
        return (
          <TestimonialCard
            key={item._key}
            item={item}
            position={position}
            cardSize={cardSize}
            onMove={handleMove}
          />
        );
      })}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        <button
          type="button"
          onClick={() => handleMove(-1)}
          aria-label="Témoignage précédent"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--b2c-line)] bg-[var(--b2c-bg2)] text-[var(--b2c-tx)] transition-colors hover:border-[var(--b2c-accent)] hover:text-[var(--b2c-accent)]"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => handleMove(1)}
          aria-label="Témoignage suivant"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--b2c-line)] bg-[var(--b2c-bg2)] text-[var(--b2c-tx)] transition-colors hover:border-[var(--b2c-accent)] hover:text-[var(--b2c-accent)]"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
