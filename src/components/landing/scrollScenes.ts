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

/* ── 2. Boucle d'eau (tuyau qui se remplit + stations + goutte) ── */
export function installWaterLoop(section: HTMLElement): () => void {
  const draw = section.querySelector<SVGPathElement>("[data-loop-draw]");
  const sheen = section.querySelector<SVGPathElement>("[data-loop-sheen]");
  const drop = section.querySelector<SVGCircleElement>("[data-loop-drop]");
  const stations = Array.from(section.querySelectorAll<SVGGElement>("[data-station]"));
  if (!draw) return () => {};

  const len = draw.getTotalLength();
  draw.style.strokeDasharray = `${len}`;
  if (sheen) sheen.style.strokeDasharray = `${len}`;

  const apply = (fill: number) => {
    const off = len * (1 - fill);
    draw.style.strokeDashoffset = `${off}`;
    if (sheen) sheen.style.strokeDashoffset = `${off}`;
    if (drop) {
      const pt = draw.getPointAtLength(len * clamp(fill, 0.001, 0.999));
      drop.setAttribute("cx", `${pt.x}`);
      drop.setAttribute("cy", `${pt.y}`);
      drop.style.opacity = fill > 0.02 && fill < 0.99 ? "1" : "0";
    }
    for (const st of stations) {
      const t = parseFloat(st.getAttribute("data-station-t") ?? "1");
      st.classList.toggle("lit", fill >= t);
    }
  };

  if (prefersReduced()) {
    apply(1);
    if (drop) drop.style.opacity = "0";
    return () => {};
  }

  // Le remplissage progresse pendant que la section traverse la zone centrale
  // du viewport (p ∈ [0.12, 0.72] → fill 0→1).
  const update = () => apply(remap(viewportProgress(section), 0.12, 0.72));
  const onScroll = rafThrottle(update);
  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  };
}

/* ── 3. Aquaponie (poissons qui nagent au scroll) ── */
export function installAquaponie(section: HTMLElement): () => void {
  const fishes = Array.from(section.querySelectorAll<SVGGElement>("[data-fish]"));
  if (fishes.length === 0) return () => {};

  // Trajectoire de nage : oscillation horizontale + dérive verticale, déphasée
  // par poisson. Domaine utile du bassin ≈ x[96..312], y[206..256].
  const setFish = (p: number) => {
    fishes.forEach((f, i) => {
      const phase = i * 2.1;
      const speed = 1 + i * 0.35;
      const cx = 150 + Math.sin(p * Math.PI * speed + phase) * (70 - i * 12);
      const cy = 218 + i * 14 + Math.cos(p * Math.PI * 1.4 + phase) * 12;
      // Le poisson regarde dans le sens de sa nage (dérivée du sinus).
      const dir = Math.cos(p * Math.PI * speed + phase) >= 0 ? 1 : -1;
      f.style.transform = `translate(${cx}px, ${cy}px) scaleX(${dir})`;
    });
  };

  if (prefersReduced()) {
    setFish(0.2);
    return () => {};
  }

  const update = () => setFish(viewportProgress(section));
  const onScroll = rafThrottle(update);
  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  };
}
