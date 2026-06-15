// Afficheur 7 segments pour les chiffres fluo de la landing B2C.
// Glow via filter:drop-shadow (text-shadow inopérant sur SVG).
// Respecte prefers-reduced-motion. Anime de 0→valeur via IntersectionObserver.

import { useEffect, useRef, useState } from "react";

// Segments : A (top), B (top-right), C (bottom-right), D (bottom),
//            E (bottom-left), F (top-left), G (middle)
const DIGIT_PATTERNS = [
  [1, 1, 1, 1, 1, 1, 0], // 0
  [0, 1, 1, 0, 0, 0, 0], // 1
  [1, 1, 0, 1, 1, 0, 1], // 2
  [1, 1, 1, 1, 0, 0, 1], // 3
  [0, 1, 1, 0, 0, 1, 1], // 4
  [1, 0, 1, 1, 0, 1, 1], // 5
  [1, 0, 1, 1, 1, 1, 1], // 6
  [1, 1, 1, 0, 0, 0, 0], // 7
  [1, 1, 1, 1, 1, 1, 1], // 8
  [1, 1, 1, 1, 0, 1, 1], // 9
];

const SEGMENT_PATHS = [
  "m 70,0 8,8 -8,8 H 18 L 10,8 18,0 Z",          // A top
  "m 72,18 8,-8 8,8 v 52 l -8,8 -8,-8 z",          // B top-right
  "m 72,90 8,-8 8,8 v 52 l -8,8 -8,-8 z",          // C bottom-right
  "m 70,144 8,8 -8,8 H 18 L 10,152 18,144 Z",       // D bottom
  "m 0,90 8,-8 8,8 v 52 l -8,8 -8,-8 z",            // E bottom-left
  "m 0,18 8,-8 8,8 V 70 L 8,78 0,70 Z",             // F top-left
  "m 70,72 8,8 -8,8 H 18 L 10,80 18,72 Z",          // G middle
];

export function SevenSegmentDigit({
  value,
  height = "clamp(2.4rem, 6vw, 3.4rem)",
}: {
  value: number;
  height?: string;
}) {
  const pattern = value >= 0 && value <= 9 ? DIGIT_PATTERNS[value] : Array(7).fill(0) as number[];
  return (
    <svg
      viewBox="0 0 88 160"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height, width: "auto" }}
      className="b2c-seg-digit"
      aria-hidden="true"
    >
      {SEGMENT_PATHS.map((d, i) => (
        <path key={i} d={d} className={pattern[i] ? "b2c-seg-on" : "b2c-seg-off"} />
      ))}
    </svg>
  );
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

interface SevenSegmentNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  /** Animer de 0→value au scroll (true par défaut). Mettre false pour les prix statiques. */
  animate?: boolean;
  durationMs?: number;
  digitHeight?: string;
  className?: string;
}

export function SevenSegmentNumber({
  value,
  prefix,
  suffix,
  animate = true,
  durationMs = 1100,
  digitHeight = "clamp(2.4rem, 6vw, 3.4rem)",
  className = "",
}: SevenSegmentNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate) {
      setDisplay(value);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduced) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    let start = 0;
    const run = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / durationMs);
      setDisplay(Math.round(value * easeOutCubic(p)));
      if (p < 1) raf = requestAnimationFrame(run);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          raf = requestAnimationFrame(run);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, animate, durationMs]);

  const digits = String(display).split("").map(Number);

  return (
    <span
      ref={ref}
      className={`b2c-seg-number ${className}`}
      aria-label={`${prefix ?? ""}${value}${suffix ?? ""}`}
    >
      {prefix && <span className="b2c-seg-affix">{prefix}</span>}
      {digits.map((d, i) => (
        <SevenSegmentDigit key={i} value={d} height={digitHeight} />
      ))}
      {suffix && <span className="b2c-seg-affix">{suffix}</span>}
    </span>
  );
}
