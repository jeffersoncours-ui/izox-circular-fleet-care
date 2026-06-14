// Tweaks — état du design v2 ajustable en temps réel (design-brief-v2.md §Tweaks).
// Phase 2a : structure + persistence localStorage + application CSS variables.
// Le panneau d'UI (sliders, color pickers) est branché en Phase 2d.

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type B2cTheme = "abysse" | "noir" | "nuit" | "papier";
export type TitleFont = "serif" | "outfit";

export interface Tweaks {
  accent: string; // #3FD8FF par défaut
  theme: B2cTheme;
  titleFont: TitleFont;
  titleScale: number; // 0.8 .. 1.25
  glow: number; // 0 .. 1
  heroLine1: string;
  heroLine2: string;
  heroLine3: string; // dernier mot accentué
  ctaLabel: string;
}

export const DEFAULT_TWEAKS: Tweaks = {
  accent: "#3FD8FF",
  theme: "abysse",
  titleFont: "serif",
  titleScale: 1.25,
  glow: 0.75,
  heroLine1: "On lave à l'eau.",
  heroLine2: "On la récupère.",
  heroLine3: "On la fait revivre.",
  ctaLabel: "Réserver mon nettoyage",
};

const STORAGE_KEY = "izox_b2c_tweaks";

const THEME_CLASS: Record<B2cTheme, string> = {
  abysse: "",
  noir: "t-noir",
  nuit: "t-nuit",
  papier: "t-papier",
};

interface TweaksContextValue {
  tweaks: Tweaks;
  setTweaks: (patch: Partial<Tweaks>) => void;
  reset: () => void;
}

const TweaksContext = createContext<TweaksContextValue | undefined>(undefined);

function loadTweaks(): Tweaks {
  if (typeof window === "undefined") return DEFAULT_TWEAKS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TWEAKS;
    return { ...DEFAULT_TWEAKS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_TWEAKS;
  }
}

export function TweaksProvider({ children }: { children: React.ReactNode }) {
  // SSR-safe : on démarre sur les valeurs par défaut, on hydrate au mount.
  const [tweaks, setState] = useState<Tweaks>(DEFAULT_TWEAKS);

  useEffect(() => {
    setState(loadTweaks());
  }, []);

  const setTweaks = useCallback((patch: Partial<Tweaks>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* quota / mode privé : on ignore, l'état React reste la source */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setState(DEFAULT_TWEAKS);
  }, []);

  return (
    <TweaksContext.Provider value={{ tweaks, setTweaks, reset }}>{children}</TweaksContext.Provider>
  );
}

export function useTweaks(): TweaksContextValue {
  const ctx = useContext(TweaksContext);
  if (!ctx) throw new Error("useTweaks doit être utilisé dans <TweaksProvider>");
  return ctx;
}

// Classe de thème à appliquer sur le wrapper .izox-b2c.
export function themeClass(theme: B2cTheme): string {
  return THEME_CLASS[theme];
}

// Variables CSS inline dérivées des tweaks (appliquées sur le wrapper).
export function tweaksStyle(t: Tweaks): React.CSSProperties {
  const vars: Record<string, string> = {
    "--b2c-accent": t.accent,
    "--b2c-glow": String(t.glow),
    "--b2c-tscale": String(t.titleScale),
    "--primary": t.accent,
    "--ring": t.accent,
  };
  if (t.titleFont === "outfit") {
    vars["--b2c-serif"] = "'Outfit', system-ui, sans-serif";
  }
  return vars as React.CSSProperties;
}
