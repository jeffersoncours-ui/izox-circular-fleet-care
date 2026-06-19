// Galerie « flip » avant/après — adaptée de Flip Gallery (21st.dev, Le Thanh).
// Effet split-flap : l'image est coupée en deux moitiés (haut/bas) ; à la
// navigation, le volet du haut pivote vers le bas et celui du bas vers le haut.
//
// Adaptations IZOX (vs source 21st.dev) :
//   - styles déplacés dans landing-b2c.css, scopés .izox-b2c (zéro fuite CRM)
//   - types stricts, guards DOM, cleanup des timeouts au unmount
//   - bug stale-closure corrigé : l'index est passé explicitement (la source
//     lisait currentIndex via la closure → image décalée d'un cran)
//   - prefers-reduced-motion : swap instantané sans flip
//   - couleurs sur tokens b2c, libellés/aria FR

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryItem {
  /** Libellé affiché sous la galerie (ex. « Sellerie — après »). */
  title: string;
  /** URL de l'image. Vide pour l'instant : slot placeholder translucide. */
  url: string;
}

// Option A : avant → après du même véhicule, alternés. URLs vides en attendant
// les vraies photos (fournies par l'utilisateur le moment venu).
const ITEMS: GalleryItem[] = [
  { title: "Sellerie — avant", url: "" },
  { title: "Sellerie — après", url: "" },
  { title: "Extérieur — avant", url: "" },
  { title: "Extérieur — après", url: "" },
  { title: "Moquette — avant", url: "" },
  { title: "Moquette — après", url: "" },
];

const FLIP_SPEED = 750;
const flipTiming: KeyframeAnimationOptions = { duration: FLIP_SPEED, iterations: 1 };

// flip down (sens avant)
const flipAnimationTop: Keyframe[] = [
  { transform: "rotateX(0)" },
  { transform: "rotateX(-90deg)" },
  { transform: "rotateX(-90deg)" },
];
const flipAnimationBottom: Keyframe[] = [
  { transform: "rotateX(90deg)" },
  { transform: "rotateX(90deg)" },
  { transform: "rotateX(0)" },
];

// flip up (sens arrière)
const flipAnimationTopReverse: Keyframe[] = [
  { transform: "rotateX(-90deg)" },
  { transform: "rotateX(-90deg)" },
  { transform: "rotateX(0)" },
];
const flipAnimationBottomReverse: Keyframe[] = [
  { transform: "rotateX(0)" },
  { transform: "rotateX(90deg)" },
  { transform: "rotateX(90deg)" },
];

export function FlipGallery() {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniteRef = useRef<HTMLDivElement[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Applique l'image (ou l'état placeholder vide) d'un volet pour un index donné.
  const setActiveImage = (el: HTMLElement, index: number) => {
    const url = ITEMS[index].url;
    el.style.backgroundImage = url ? `url('${url}')` : "";
    el.toggleAttribute("data-empty", !url);
  };

  // Met à jour le titre affiché sous la galerie pour un index donné.
  const setImageTitle = (index: number) => {
    const gallery = containerRef.current;
    if (!gallery) return;
    gallery.setAttribute("data-title", ITEMS[index].title);
    gallery.style.setProperty("--title-y", "0");
    gallery.style.setProperty("--title-opacity", "1");
  };

  // Initialisation : récupère les volets et affiche la première image.
  useEffect(() => {
    const gallery = containerRef.current;
    if (!gallery) return;
    uniteRef.current = Array.from(gallery.querySelectorAll<HTMLDivElement>(".flip-unite"));
    uniteRef.current.forEach((el) => setActiveImage(el, 0));
    setImageTitle(0);

    // Cleanup : purge les timeouts en cours si on démonte pendant une anim.
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateGallery = (nextIndex: number, isReverse: boolean) => {
    const gallery = containerRef.current;
    if (!gallery) return;

    // Purge les timeouts de l'anim précédente : évite la croissance non bornée
    // du tableau et coupe les swaps en cours si on enchaîne les clics.
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Mouvement réduit : swap instantané, pas de flip.
    if (reduced) {
      uniteRef.current.forEach((el) => setActiveImage(el, nextIndex));
      setImageTitle(nextIndex);
      return;
    }

    const topAnim = isReverse ? flipAnimationTopReverse : flipAnimationTop;
    const bottomAnim = isReverse ? flipAnimationBottomReverse : flipAnimationBottom;

    const overlayTop = gallery.querySelector<HTMLElement>(".flip-overlay-top");
    const overlayBottom = gallery.querySelector<HTMLElement>(".flip-overlay-bottom");
    overlayTop?.animate(topAnim, flipTiming);
    overlayBottom?.animate(bottomAnim, flipTiming);

    // Masque le titre courant le temps de l'animation.
    gallery.style.setProperty("--title-y", "-1rem");
    gallery.style.setProperty("--title-opacity", "0");
    gallery.setAttribute("data-title", "");

    // Met à jour chaque volet, avec un léger décalage pour que le flip paraisse continu.
    uniteRef.current.forEach((el, idx) => {
      const delay =
        (isReverse && idx !== 1 && idx !== 2) || (!isReverse && (idx === 1 || idx === 2))
          ? FLIP_SPEED - 200
          : 0;
      const t = setTimeout(() => setActiveImage(el, nextIndex), delay);
      timeoutsRef.current.push(t);
    });

    // Réaffiche le titre à mi-animation.
    const tTitle = setTimeout(() => setImageTitle(nextIndex), FLIP_SPEED * 0.5);
    timeoutsRef.current.push(tTitle);
  };

  const updateIndex = (increment: number) => {
    const newIndex = (currentIndex + increment + ITEMS.length) % ITEMS.length;
    setCurrentIndex(newIndex);
    updateGallery(newIndex, increment < 0);
  };

  return (
    <div className="flip-frame">
      <div
        id="flip-gallery"
        ref={containerRef}
        className="flip-stack"
        style={{ perspective: "800px" }}
      >
        <div className="flip-unite flip-top" />
        <div className="flip-unite flip-bottom" />
        <div className="flip-unite flip-overlay-top" />
        <div className="flip-unite flip-overlay-bottom" />
      </div>

      <div className="flip-nav">
        <button
          type="button"
          onClick={() => updateIndex(-1)}
          aria-label="Précédent"
          className="flip-nav__btn"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => updateIndex(1)}
          aria-label="Suivant"
          className="flip-nav__btn"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
