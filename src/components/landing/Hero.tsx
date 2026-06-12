// Hero landing B2C — design v2 dark. Accroche serif éditoriale (dernier mot
// en italique accentué), double CTA, lien flotte, bandeau confiance.
// L'illustration gravure R5 E-Tech arrive en Phase 2b (placeholder halo ici).

import { Link } from "@tanstack/react-router";
import { Droplets, Leaf, ShieldCheck, ArrowDown, Building2 } from "lucide-react";
import { ZONE_INTERVENTION } from "@/lib/pricing-b2c";
import { useTweaks } from "./useTweaks";

export function Hero() {
  const { tweaks } = useTweaks();
  // Dernier mot de la 3e ligne accentué (italique + glow).
  const words3 = tweaks.heroLine3.trim().split(" ");
  const lastWord = words3.pop() ?? "";
  const head3 = words3.join(" ");

  return (
    <section className="b2c-section relative overflow-hidden">
      <div className="b2c-hero-halo" aria-hidden="true" />
      <div className="b2c-container relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Colonne texte */}
        <div>
          <p className="b2c-kicker rv">
            Nettoyage circulaire · {ZONE_INTERVENTION.ville}
          </p>
          <h1 className="b2c-display rv rv-d1 mt-5 text-[var(--b2c-tx)]">
            {tweaks.heroLine1}
            <br />
            {tweaks.heroLine2}
            <br />
            {head3}{head3 ? " " : ""}
            <em className="b2c-accent">{lastWord}</em>
          </h1>
          <p className="b2c-lead rv rv-d2 mt-6 max-w-md">
            Nettoyage de votre véhicule à domicile avec des produits bio et une eau
            recyclée en circuit fermé. {ZONE_INTERVENTION.ville} et alentours
            ({ZONE_INTERVENTION.rayonKm} km).
          </p>

          <div className="rv rv-d2 mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/reservation" className="b2c-btn b2c-btn--primary">
              {tweaks.ctaLabel}
            </Link>
            <a href="#boucle" className="b2c-btn b2c-btn--ghost">
              Voir comment l'eau revit
              <ArrowDown className="h-4 w-4" />
            </a>
          </div>

          <Link
            to="/entreprises"
            className="rv mt-5 inline-flex items-center gap-1.5 text-sm text-[var(--b2c-tx-dim)] underline-offset-4 transition-colors hover:text-[var(--b2c-tx)] hover:underline"
          >
            <Building2 className="h-3.5 w-3.5" />
            Je gère une flotte de véhicules
          </Link>

          {/* Bandeau confiance */}
          <div className="rv mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-[var(--b2c-line)] pt-6">
            <TrustItem icon={<Leaf className="h-4 w-4 text-[var(--b2c-accent)]" />} label="Produits bio" />
            <TrustItem
              icon={<Droplets className="h-4 w-4 text-[var(--b2c-accent)]" />}
              label="Eau recyclée en circuit fermé"
            />
            <TrustItem
              icon={<ShieldCheck className="h-4 w-4 text-[var(--b2c-accent)]" />}
              label="Paiement sécurisé"
            />
          </div>
        </div>

        {/* Colonne illustration — placeholder élégant (gravure R5 en Phase 2b) */}
        <div className="rv rv-d1 relative hidden min-h-[360px] lg:block">
          <HeroVisualPlaceholder />
        </div>
      </div>
    </section>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-[var(--b2c-tx)]">
      {icon}
      {label}
    </div>
  );
}

// Placeholder : goutte stylisée au trait + halo. Sera remplacé par la gravure
// R5 E-Tech animée (jets, berme, ruissellement) en Phase 2b.
function HeroVisualPlaceholder() {
  return (
    <div className="b2c-glow-ring absolute inset-4 grid place-items-center rounded-[20px] border border-[var(--b2c-line)] bg-[var(--b2c-surface)]">
      <svg viewBox="0 0 200 200" className="h-48 w-48" fill="none" aria-hidden="true">
        <defs>
          <radialGradient id="hg" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#3FE08F" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3FE08F" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="95" r="80" fill="url(#hg)" />
        {/* Goutte au trait */}
        <path
          d="M100 38 C128 78 142 100 142 122 a42 42 0 0 1 -84 0 C58 100 72 78 100 38 Z"
          stroke="#3FE08F"
          strokeWidth="1.4"
          opacity="0.9"
        />
        <path
          d="M84 120 a16 16 0 0 0 16 16"
          stroke="#3FE08F"
          strokeWidth="1.4"
          opacity="0.5"
        />
      </svg>
      <span className="b2c-kicker absolute bottom-4">gravure R5 · phase 2b</span>
    </div>
  );
}
