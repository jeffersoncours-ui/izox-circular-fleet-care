import { cn } from "@/lib/utils";

// LayeredText — empilement de mots en projection isométrique (réf poster
// « INFINITE PROGRESS … »). Version STATIQUE, fidèle au composant d'origine :
// l'effet vient de l'alternance EXACTE des transforms ligne par ligne
//   pair  : skew(60deg, -30deg) scaleY(0.66667)
//   impair: skew(0deg, -30deg)  scaleY(1.33333)
// + décalage horizontal en cascade (translateX centré sur la liste).
// Le GSAP (roll au hover), le <style jsx> Next-only et les media-queries
// inline (invalides en React) ont été retirés. Responsive via clamp() + em.

interface LayeredTextProps {
  /** Mots empilés, de haut en bas. */
  words?: string[];
  /** Indices (0-based) des mots à colorer en accent. */
  accentIndices?: number[];
  className?: string;
}

export function LayeredText({
  words = ["LAVER", "RÉCUPÉRER", "FILTRER", "RECYCLER", "RÉUTILISER"],
  accentIndices = [],
  className = "",
}: LayeredTextProps) {
  const center = Math.floor(words.length / 2);
  const accessibleText = words.join(" ");

  return (
    <div
      role="img"
      aria-label={accessibleText}
      className={cn(
        "mx-auto select-none font-sans font-black uppercase tracking-[-2px] antialiased",
        "text-[var(--b2c-tx)]",
        className,
      )}
    >
      <ul className="m-0 flex list-none flex-col items-center p-0" aria-hidden="true">
        {words.map((word, index) => {
          const isEven = index % 2 === 0;
          const skew = isEven ? "60deg, -30deg" : "0deg, -30deg";
          const scaleY = isEven ? "0.66667" : "1.33333";
          return (
            <li
              key={`${word}-${index}`}
              className="m-0 whitespace-nowrap"
              style={{
                fontSize: "clamp(2.2rem, 8vw, 5rem)",
                lineHeight: 0.82,
                transform: `translateX(calc(${index - center} * 0.55em)) skew(${skew}) scaleY(${scaleY})`,
                color: accentIndices.includes(index) ? "var(--b2c-accent)" : undefined,
                textShadow: accentIndices.includes(index)
                  ? "0 0 calc(28px * var(--b2c-glow)) rgba(63,216,255,calc(0.55*var(--b2c-glow)))"
                  : undefined,
              }}
            >
              {word}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
