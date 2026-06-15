// Grille tarifaire B2C — design v2 dark. Tabs Intérieur / Int.+Ext., matrice
// TTC complète + options. Sans astérisque caché.

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { SevenSegmentNumber } from "./SevenSegment";
import { VEHICULES_B2C, FORMULES_B2C, PRIX_B2C, OPTIONS_B2C } from "@/lib/pricing-b2c";
import type { FormuleB2C } from "@/lib/pricing-b2c";
import { SectionHeading } from "./sections";

export function PricingSection() {
  const [formule, setFormule] = useState<FormuleB2C>("interieur");

  return (
    <section id="tarifs" className="b2c-section scroll-mt-20 border-t border-[var(--b2c-line)]">
      <div className="b2c-container">
        <SectionHeading
          kicker="Transparence totale"
          title="Nos tarifs"
          subtitle="Tous les prix sont TTC, déplacement inclus dans la zone. Le prix affiché à la réservation est le prix payé, rien de plus."
        />

        <div className="mx-auto mt-8 max-w-2xl">
          {/* Tabs formule */}
          <div className="rv flex justify-center">
            <div className="inline-flex w-full rounded-lg border border-[var(--b2c-line)] bg-[var(--b2c-bg2)] p-1 sm:w-auto">
              {FORMULES_B2C.map((f) => {
                const active = f.id === formule;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormule(f.id)}
                    className={`b2c-mono flex-1 rounded-md px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wider transition-colors sm:flex-none sm:px-6 ${
                      active
                        ? "bg-[var(--b2c-accent)] text-[#06120c]"
                        : "text-[var(--b2c-tx-dim)] hover:text-[var(--b2c-tx)]"
                    }`}
                  >
                    {f.id === "interieur" ? "Intérieur" : "Int. + Ext. (+30 €)"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Liste véhicules pour la formule active */}
          <div className="b2c-card b2c-glow-card rv rv-d1 mt-5 divide-y divide-[var(--b2c-line)]">
            {VEHICULES_B2C.map((v) => (
              <div
                key={v.id}
                className="flex items-baseline justify-between gap-4 px-5 py-4 sm:px-7"
              >
                <div>
                  <p className="font-semibold text-[var(--b2c-tx)]">{v.label}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--b2c-tx-faint)]">{v.exemple}</p>
                </div>
                <SevenSegmentNumber
                  value={PRIX_B2C[formule][v.id]}
                  suffix=" €"
                  animate={false}
                  digitHeight="1.7rem"
                  className="shrink-0"
                />
              </div>
            ))}
          </div>

          {/* Options */}
          <p className="b2c-kicker rv mt-9">Options</p>
          <div className="b2c-card b2c-glow-card rv rv-d1 mt-3 divide-y divide-[var(--b2c-line)]">
            {OPTIONS_B2C.map((o) => (
              <div key={o.id} className="px-5 py-4 sm:px-7">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold text-[var(--b2c-tx)]">{o.label}</p>
                  <div className="shrink-0">
                    {o.prix.citadine === o.prix.utilitaire ? (
                      <SevenSegmentNumber
                        value={o.prix.citadine}
                        suffix=" €"
                        animate={false}
                        digitHeight="1.3rem"
                      />
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "flex-end", gap: "0.12em" }}>
                        <SevenSegmentNumber value={o.prix.citadine} animate={false} digitHeight="1.3rem" />
                        <span className="b2c-seg-affix">–</span>
                        <SevenSegmentNumber value={o.prix.utilitaire} suffix=" €" animate={false} digitHeight="1.3rem" />
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-1 max-w-md text-sm leading-relaxed text-[var(--b2c-tx-dim)]">
                  {o.description}
                </p>
                {o.prix.citadine !== o.prix.utilitaire && (
                  <p className="b2c-mono mt-2 text-[11px] text-[var(--b2c-tx-faint)]">
                    {VEHICULES_B2C.map((v) => `${v.label} ${o.prix[v.id]} €`).join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </div>

          <p className="b2c-mono rv mt-7 text-center text-[11px] uppercase tracking-[0.14em] text-[var(--b2c-tx-faint)]">
            Tous prix TTC · acompte 30 % en ligne, solde sur place
          </p>

          <div className="rv mt-8 text-center">
            <Link to="/reservation" className="shiny-cta">
              <span>Calculer mon prix et réserver</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
