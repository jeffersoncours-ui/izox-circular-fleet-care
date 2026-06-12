// Tunnel de réservation B2C — Phase 2 du plan (tasks/brief-landing-b2c.md §6).
// Phase 1 : page d'attente avec capture email (zéro lead perdu) pour que le
// CTA "Réserver" de la landing ne mène jamais à un 404.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { CalendarClock, Loader2, MailCheck, ArrowLeft } from "lucide-react";
import { PublicLayout } from "@/components/landing/PublicLayout";
import { Button } from "@/components/ui/button";
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
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à l'accueil
          </Link>

          <div className="mt-8 rounded-lg border border-border bg-card p-8 text-center shadow-card">
            {sent ? (
              <>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft">
                  <MailCheck className="h-6 w-6 text-success" />
                </div>
                <h1 className="mt-4 font-display text-xl font-bold tracking-tight text-foreground">
                  C'est noté !
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Vous serez parmi les premiers prévenus dès l'ouverture des réservations
                  en ligne. À très vite.
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
                  <CalendarClock className="h-6 w-6 text-primary" />
                </div>
                <h1 className="mt-4 font-display text-xl font-bold tracking-tight text-foreground">
                  Les réservations en ligne ouvrent très bientôt
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Le tunnel de réservation avec paiement sécurisé est en cours de
                  finalisation. Laissez-nous votre email : on vous prévient dès
                  l'ouverture — et vous passerez en priorité.
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
                  <Button type="submit" variant="izox" className="w-full" disabled={sending}>
                    {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Me prévenir de l'ouverture
                  </Button>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Votre email sert uniquement à vous prévenir de l'ouverture des
                    réservations. Pas de newsletter, pas de revente.
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
