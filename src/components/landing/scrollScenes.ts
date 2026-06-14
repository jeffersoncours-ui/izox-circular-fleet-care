// Contrôleur d'animations scroll-driven (Phase 2c) — le scroll est le SEUL
// moteur universel (mobile-first). Chaque installeur retourne un cleanup.
// prefers-reduced-motion → on fige l'état final (boucle pleine, stations
// allumées, poissons en place) et on n'attache aucun listener.

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

// Remap d'une valeur de [a,b] vers [0,1].
const remap = (v: number, a: number, b: number) => clamp((v - a) / (b - a));

function prefersReduced(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

// Fraction de défilement d'un élément à travers le viewport : 0 quand il
// entre par le bas, 1 quand il sort par le haut. 0.5 ≈ centré.
function viewportProgress(el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || 1;
  return clamp((vh - rect.top) / (vh + rect.height));
}

// rAF throttle : exécute fn au plus une fois par frame.
function rafThrottle(fn: () => void): () => void {
  let ticking = false;
  return () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      fn();
    });
  };
}

/* ── 1. Fil de l'eau (progression globale, fixe à droite) ── */
export function installFilDeLeau(root: HTMLElement): () => void {
  const trail = root.querySelector<HTMLElement>("[data-fil-trail]");
  const drop = root.querySelector<HTMLElement>("[data-fil-drop]");
  if (!trail || !drop) return () => {};

  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? clamp(window.scrollY / max) : 0;
    trail.style.height = `${p * 100}%`;
    drop.style.top = `${p * 100}%`;
  };

  if (prefersReduced()) {
    trail.style.height = "100%";
    drop.style.top = "100%";
    return () => {};
  }

  const onScroll = rafThrottle(update);
  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  };
}

/* ── Code mort supprimé : installWaterLoop était utilisée pour l'animation du schéma SVG de la boucle d'eau.
   Remplacée par une image statique en session 42. ──*/
