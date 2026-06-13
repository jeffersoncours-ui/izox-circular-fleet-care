// Hero landing B2C — design v2 dark. Accroche serif éditoriale (dernier mot
// en italique accentué), double CTA, lien flotte, bandeau confiance.
// L'illustration gravure R5 E-Tech arrive en Phase 2b (placeholder halo ici).

import { Link } from "@tanstack/react-router";
import { Droplets, Leaf, ShieldCheck, ArrowDown } from "lucide-react";
import { ZONE_INTERVENTION } from "@/lib/pricing-b2c";
import { useTweaks } from "./useTweaks";
import { HeroCar } from "./illustrations/HeroCar";

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
          <p className="b2c-kicker rv">Nettoyage circulaire</p>
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
            className="rv b2c-btn b2c-btn--primary mt-2 w-full sm:w-auto"
          >
            Envie d'un abonnement ou société&nbsp;?
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

        {/* Colonne illustration — gravure R5 E-Tech au trait.
            -mx-5 mobile : annule le padding du container pour un rendu pleine largeur. */}
        <div className="rv rv-d1 relative -mx-8 sm:mx-0">
          <HeroCar className="w-full max-w-[900px] mx-auto" />
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
