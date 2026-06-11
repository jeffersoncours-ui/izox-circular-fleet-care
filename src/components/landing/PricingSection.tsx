// Grille tarifaire B2C — matrice complète, prix TTC, sans astérisque caché.

import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  VEHICULES_B2C,
  FORMULES_B2C,
  PRIX_B2C,
  OPTIONS_B2C,
} from "@/lib/pricing-b2c";
import { SectionHeading } from "./sections";

export function PricingSection() {
  return (
    <section id="tarifs" className="scroll-mt-20 bg-muted/40 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          kicker="Transparence totale"
          title="Nos tarifs"
          subtitle="Tous les prix sont TTC, déplacement inclus dans la zone. Le prix affiché à la réservation est le prix payé — rien de plus."
        />

        {/* Matrice formules × véhicules */}
        <div className="mt-10 overflow-x-auto rounded-lg border border-border bg-card shadow-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-foreground">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-white">
                  Véhicule
                </th>
                {FORMULES_B2C.map((f) => (
                  <th
                    key={f.id}
                    className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-white"
                  >
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VEHICULES_B2C.map((v) => (
                <tr key={v.id} className="border-t border-border">
                  <td className="px-4 py-3.5">
                    <span className="font-semibold text-foreground">{v.label}</span>
                    <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
                      {v.exemple}
                    </span>
                  </td>
                  {FORMULES_B2C.map((f) => (
                    <td
                      key={f.id}
                      className="px-4 py-3.5 text-right font-mono font-semibold text-foreground"
                    >
                      {PRIX_B2C[f.id][v.id]} €
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Options */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {OPTIONS_B2C.map((o) => (
            <div key={o.id} className="rounded-lg border border-border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-base font-bold tracking-tight text-foreground">
                    {o.label}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {o.description}
                  </p>
                </div>
                <p className="shrink-0 font-mono text-sm font-semibold text-primary">
                  {o.prix.citadine === o.prix.utilitaire
                    ? `${o.prix.citadine} €`
                    : `${o.prix.citadine}–${o.prix.utilitaire} €`}
                </p>
              </div>
              {o.prix.citadine !== o.prix.utilitaire && (
                <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                  {VEHICULES_B2C.map((v) => `${v.label} ${o.prix[v.id]} €`).join(" · ")}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link to="/reservation">
            <Button variant="izox" size="lg">
              Calculer mon prix et réserver
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
