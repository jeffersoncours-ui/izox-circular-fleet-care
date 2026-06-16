// Tweaks Panel — ajustement du design v2 en temps réel (design-brief-v2.md).
// Toggle discret en bas à droite → panneau (drawer mobile / carte desktop).
// Toutes les valeurs sont persistées via useTweaks (localStorage).

import { useState } from "react";
import { SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { useTweaks, type B2cTheme, type TitleFont } from "./useTweaks";

const ACCENTS = ["#3FD8FF", "#5BC8E8", "#A8C4B4", "#E8C268"];
const SMOKE_COLORS = ["#155e63", "#0e3a40", "#2a4d3a", "#3a2f4d", "#4d3a2a"];
const THEMES: { id: B2cTheme; label: string }[] = [
  { id: "abysse", label: "Abysse vert" },
  { id: "noir", label: "Noir profond" },
  { id: "nuit", label: "Bleu nuit" },
  { id: "papier", label: "Papier clair" },
];

export function TweaksPanel() {
  const { tweaks, setTweaks, reset } = useTweaks();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fermer les réglages" : "Ouvrir les réglages du thème"}
        className="fixed bottom-5 right-5 z-50 grid h-11 w-11 place-items-center rounded-full border border-[var(--b2c-line-strong)] bg-[var(--b2c-bg2)] text-[var(--b2c-accent)] shadow-lg transition-transform hover:scale-105"
        style={{
          boxShadow:
            "0 0 calc(28px * var(--b2c-glow)) color-mix(in srgb, var(--b2c-accent) 40%, transparent)",
        }}
      >
        {open ? <X className="h-5 w-5" /> : <SlidersHorizontal className="h-5 w-5" />}
      </button>

      {open && (
        <aside
          className="fixed bottom-20 right-5 z-50 max-h-[78vh] w-[min(92vw,340px)] overflow-y-auto rounded-2xl border border-[var(--b2c-line)] bg-[var(--b2c-bg2)] p-5 shadow-2xl"
          role="dialog"
          aria-label="Réglages du design"
        >
          <div className="flex items-center justify-between">
            <p className="b2c-kicker">Personnaliser</p>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 text-[11px] text-[var(--b2c-tx-dim)] hover:text-[var(--b2c-tx)]"
            >
              <RotateCcw className="h-3 w-3" /> Réinitialiser
            </button>
          </div>

          {/* Accent */}
          <Group label="Accent lumineux">
            <Swatches
              value={tweaks.accent}
              options={ACCENTS}
              onPick={(c) => setTweaks({ accent: c })}
            />
          </Group>

          {/* Fond */}
          <Group label="Fond">
            <select
              value={tweaks.theme}
              onChange={(e) => setTweaks({ theme: e.target.value as B2cTheme })}
              aria-label="Fond"
              className="w-full rounded-md border border-[var(--b2c-line)] bg-[var(--b2c-bg)] px-3 py-2 text-sm text-[var(--b2c-tx)]"
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </Group>

          {/* Typographie */}
          <Group label="Titres">
            <Segmented<TitleFont>
              value={tweaks.titleFont}
              options={[
                { id: "serif", label: "Serif éditorial" },
                { id: "outfit", label: "Outfit bold" },
              ]}
              onPick={(v) => setTweaks({ titleFont: v })}
            />
            <Range
              className="mt-3"
              label="Taille des titres"
              min={0.8}
              max={1.25}
              step={0.01}
              value={tweaks.titleScale}
              display={`${Math.round(tweaks.titleScale * 100)} %`}
              onChange={(v) => setTweaks({ titleScale: v })}
            />
          </Group>

          {/* Lumière */}
          <Group label="Intensité de la lueur">
            <Range
              label="Intensité de la lueur"
              min={0}
              max={1}
              step={0.01}
              value={tweaks.glow}
              display={`${Math.round(tweaks.glow * 100)} %`}
              onChange={(v) => setTweaks({ glow: v })}
            />
          </Group>

          {/* Fond animé (fumée) */}
          <Group label="Fond animé — teinte">
            <Swatches
              value={tweaks.smokeColor}
              options={SMOKE_COLORS}
              onPick={(c) => setTweaks({ smokeColor: c })}
            />
            <Range
              className="mt-3"
              label="Intensité du fond"
              min={0}
              max={0.6}
              step={0.01}
              value={tweaks.smokeIntensity}
              display={`${Math.round(tweaks.smokeIntensity * 100)} %`}
              onChange={(v) => setTweaks({ smokeIntensity: v })}
            />
          </Group>

          {/* Textes */}
          <Group label="Accroche">
            <TextRow
              label="Accroche, ligne 1"
              value={tweaks.heroLine1}
              onChange={(v) => setTweaks({ heroLine1: v })}
            />
            <TextRow
              className="mt-2"
              label="Accroche, ligne 2"
              value={tweaks.heroLine2}
              onChange={(v) => setTweaks({ heroLine2: v })}
            />
            <TextRow
              className="mt-2"
              label="Accroche, ligne 3"
              value={tweaks.heroLine3}
              onChange={(v) => setTweaks({ heroLine3: v })}
              hint="Dernier mot mis en accent"
            />
          </Group>

          <Group label="Bouton principal">
            <TextRow
              label="Texte du bouton principal"
              value={tweaks.ctaLabel}
              onChange={(v) => setTweaks({ ctaLabel: v })}
            />
          </Group>
        </aside>
      )}
    </>
  );
}

/* ── Sous-composants ── */

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-[var(--b2c-line)] pt-4">
      <p className="mb-2 text-[11px] font-medium text-[var(--b2c-tx-dim)]">{label}</p>
      {children}
    </div>
  );
}

function Swatches({
  value,
  options,
  onPick,
}: {
  value: string;
  options: string[];
  onPick: (c: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {options.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          aria-label={`Couleur ${c}`}
          aria-pressed={value.toLowerCase() === c.toLowerCase()}
          className={`h-7 w-7 rounded-full border transition-transform hover:scale-110 ${
            value.toLowerCase() === c.toLowerCase()
              ? "border-white ring-2 ring-white/40"
              : "border-transparent"
          }`}
          style={{ background: c }}
        />
      ))}
      <label className="ml-1 grid h-7 w-7 cursor-pointer place-items-center rounded-full border border-[var(--b2c-line)] text-[10px] text-[var(--b2c-tx-dim)]">
        <input
          type="color"
          value={value}
          onChange={(e) => onPick(e.target.value)}
          className="sr-only"
        />
        +
      </label>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onPick,
  className = "",
}: {
  value: T;
  options: { id: T; label: string }[];
  onPick: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex rounded-md border border-[var(--b2c-line)] bg-[var(--b2c-bg)] p-0.5 ${className}`}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onPick(o.id)}
          aria-pressed={value === o.id}
          className={`rounded px-2.5 py-1.5 text-xs transition-colors ${
            value === o.id
              ? "bg-[var(--b2c-accent)] text-[#06120c]"
              : "text-[var(--b2c-tx-dim)] hover:text-[var(--b2c-tx)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Range({
  label,
  min,
  max,
  step,
  value,
  display,
  onChange,
  className = "",
}: {
  label?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  display: string;
  onChange: (v: number) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between text-[11px] text-[var(--b2c-tx-dim)]">
        <span>{label}</span>
        <span className="b2c-mono text-[var(--b2c-accent)]">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--b2c-accent)]"
      />
    </div>
  );
}

function TextRow({
  value,
  onChange,
  hint,
  label,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label ?? hint}
        className="w-full rounded-md border border-[var(--b2c-line)] bg-[var(--b2c-bg)] px-3 py-2 text-sm text-[var(--b2c-tx)]"
      />
      {hint && <p className="mt-1 text-[10px] text-[var(--b2c-tx-faint)]">{hint}</p>}
    </div>
  );
}
