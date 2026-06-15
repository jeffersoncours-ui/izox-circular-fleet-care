// Tunnel de réservation B2C — design v2 dark-native.
// Phase 2 actuelle : page d'attente avec capture email (zéro lead perdu) — le
// CTA "Réserver" de la landing ne mène jamais à un 404. Le tunnel multi-step +
// paiement Stripe sera implémenté quand le compte Stripe sera configuré.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { CalendarClock, Loader2, MailCheck, ArrowLeft } from "lucide-react";
import { PublicLayout } from "@/components/landing/PublicLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reservation")({
  head: () => ({
    meta: [
      { title: "Réserver mon nettoyage — IZOX" },
      {
        name: "description",
        content:
          "Réservez votre nettoyage automobile à domicile en ligne. Évry-Courcouronnes et 25 km alentours.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: ReservationPage,
});

function ReservationPage() {
  const [email, setEmail] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    const { error } = await supabase.functions.invoke("create-lead", {
      body: { type: "b2c_attente", email, code_postal: codePostal },
    });
    setSending(false);
    if (error) {
      toast.error("Une erreur est survenue", { description: "Réessayez dans un instant." });
    } else {
      setSent(true);
    }
  };

  return (
    <PublicLayout>
      <section className="b2c-section">
        <div className="b2c-container max-w-xl">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--b2c-tx-dim)] hover:text-[var(--b2c-tx)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à l'accueil
          </Link>

          <div className="b2c-card mt-8 p-8 text-center">
            {sent ? (
              <>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--primary-soft)]">
                  <MailCheck className="h-6 w-6 text-[var(--b2c-accent)]" />
                </div>
                <h1 className="b2c-display--md mt-4 !text-[1.7rem] text-[var(--b2c-tx)]">
                  C'est <em className="b2c-accent">noté</em> !
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[var(--b2c-tx-dim)]">
                  Vous serez parmi les premiers prévenus dès l'ouverture des réservations en
                  ligne. À très vite.
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--primary-soft)]">
                  <CalendarClock className="h-6 w-6 text-[var(--b2c-accent)]" />
                </div>
                <h1 className="b2c-display--md mt-4 !text-[1.7rem] text-[var(--b2c-tx)]">
                  Les réservations en ligne ouvrent <em className="b2c-accent">très bientôt</em>
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[var(--b2c-tx-dim)]">
                  Le tunnel de réservation avec paiement sécurisé est en cours de finalisation.
                  Laissez-nous votre email : on vous prévient dès l'ouverture — et vous passerez
                  en priorité.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="vous@exemple.fr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cp">Code postal (optionnel)</Label>
                    <Input
                      id="cp"
                      inputMode="numeric"
                      maxLength={5}
                      placeholder="91000"
                      value={codePostal}
                      onChange={(e) => setCodePostal(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                  <button type="submit" className="shiny-cta w-full" disabled={sending}>
                    <span className="inline-flex items-center gap-2">
                      {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Me prévenir de l'ouverture
                    </span>
                  </button>
                  <p className="text-[11px] leading-relaxed text-[var(--b2c-tx-faint)]">
                    Votre email sert uniquement à vous prévenir de l'ouverture des réservations.
                    Pas de newsletter, pas de revente.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
