// Grille tarifaire B2C — design v2 dark. Tabs Intérieur / Int.+Ext., matrice
// TTC complète + options. Sans astérisque caché.

import { useState } from "react";
import { Link } from "@tanstack/react-router";
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
          subtitle="Tous les prix sont TTC, déplacement inclus dans la zone. Le prix affiché à la réservation est le prix payé — rien de plus."
        />

        {/* Tabs formule */}
        <div className="rv mt-8 inline-flex rounded-lg border border-[var(--b2c-line)] bg-[var(--b2c-bg2)] p-1">
          {FORMULES_B2C.map((f) => {
            const active = f.id === formule;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormule(f.id)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
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

        {/* Matrice véhicules pour la formule active */}
        <div className="rv rv-d1 mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VEHICULES_B2C.map((v) => (
            <div key={v.id} className="b2c-card p-5">
              <p className="text-sm font-semibold text-[var(--b2c-tx)]">{v.label}</p>
              <p className="mt-0.5 text-[11px] text-[var(--b2c-tx-faint)]">{v.exemple}</p>
              <p className="b2c-figure mt-4 !text-[2rem]">{PRIX_B2C[formule][v.id]} €</p>
              <p className="b2c-mono text-[11px] text-[var(--b2c-tx-dim)]">TTC</p>
            </div>
          ))}
        </div>

        {/* Options */}
        <div className="rv rv-d2 mt-5 grid gap-4 sm:grid-cols-2">
          {OPTIONS_B2C.map((o) => (
            <div key={o.id} className="b2c-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-[var(--b2c-tx)]">{o.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--b2c-tx-dim)]">
                    {o.description}
                  </p>
                </div>
                <p className="b2c-mono shrink-0 text-sm font-semibold text-[var(--b2c-accent)]">
                  {o.prix.citadine === o.prix.utilitaire
                    ? `${o.prix.citadine} €`
                    : `${o.prix.citadine}–${o.prix.utilitaire} €`}
                </p>
              </div>
              {o.prix.citadine !== o.prix.utilitaire && (
                <p className="b2c-mono mt-3 text-[11px] text-[var(--b2c-tx-faint)]">
                  {VEHICULES_B2C.map((v) => `${v.label} ${o.prix[v.id]} €`).join(" · ")}
                </p>
              )}
            </div>
          ))}
        </div>

        <p className="rv mt-6 text-xs text-[var(--b2c-tx-faint)]">
          Tous prix TTC · acompte 30 % en ligne, solde sur place (TPE ou espèces).
        </p>

        <div className="rv mt-8 text-center">
          <Link to="/reservation" className="b2c-btn b2c-btn--primary">
            Calculer mon prix et réserver
          </Link>
        </div>
      </div>
    </section>
  );
}
