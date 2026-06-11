// Hero landing B2C — accroche circularité + double CTA + bifurcation B2B.
// SSR-first : aucun script d'animation requis pour être interactif (brief §2).

import { Link } from "@tanstack/react-router";
import { Droplets, Leaf, ShieldCheck, ArrowDown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZONE_INTERVENTION } from "@/lib/pricing-b2c";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
        <div className="max-w-3xl">
          <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-primary">
            Nettoyage automobile circulaire · {ZONE_INTERVENTION.ville}
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            On lave à l'eau.
            <br />
            On la récupère.
            <br />
            <span className="text-primary">On la fait revivre.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Nettoyage de votre véhicule à domicile avec des produits bio et une eau
            recyclée en circuit fermé. {ZONE_INTERVENTION.ville} et alentours
            ({ZONE_INTERVENTION.rayonKm} km).
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/reservation">
              <Button variant="izox" size="lg" className="w-full sm:w-auto">
                Réserver mon nettoyage
              </Button>
            </Link>
            <a href="#boucle">
              <Button variant="outline" size="lg" className="w-full gap-2 sm:w-auto">
                Voir comment l'eau revit
                <ArrowDown className="h-4 w-4" />
              </Button>
            </a>
          </div>

          <Link
            to="/entreprises"
            className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            <Building2 className="h-3.5 w-3.5" />
            Je gère une flotte de véhicules
          </Link>
        </div>

        {/* Bandeau confiance */}
        <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-6">
          <TrustItem icon={<Leaf className="h-4 w-4 text-primary" />} label="Produits bio" />
          <TrustItem
            icon={<Droplets className="h-4 w-4 text-primary" />}
            label="Eau recyclée en circuit fermé"
          />
          <TrustItem
            icon={<ShieldCheck className="h-4 w-4 text-primary" />}
            label="Paiement sécurisé"
          />
        </div>
      </div>
    </section>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
      {icon}
      {label}
    </div>
  );
}
