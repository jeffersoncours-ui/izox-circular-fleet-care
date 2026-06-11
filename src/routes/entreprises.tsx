// Route B2B publique — argumentaire flotte + capture de lead (brief §10).
// Pas de réservation en ligne ici : lead → rappel commercial.

import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  Building2,
  TrendingDown,
  CalendarCheck,
  BarChart3,
  FileCheck,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { PublicLayout } from "@/components/landing/PublicLayout";
import { SectionHeading } from "@/components/landing/sections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CHIFFRES_EAU } from "@/lib/pricing-b2c";

export const Route = createFileRoute("/entreprises")({
  head: () => ({
    meta: [
      { title: "Nettoyage de flotte automobile éco-responsable — IZOX Entreprises" },
      {
        name: "description",
        content:
          "Externalisez le nettoyage de votre flotte : intervention sur site, reporting RSE chiffré, facturation simple. Essonne et Île-de-France sud.",
      },
      { name: "robots", content: "index, follow" },
      { name: "googlebot", content: "index, follow" },
      { name: "bingbot", content: "index, follow" },
      { property: "og:title", content: "IZOX Entreprises — Nettoyage de flotte éco-responsable" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: EntreprisesPage,
});

const TAILLES_FLOTTE = ["1 à 4 véhicules", "5 à 9 véhicules", "10 à 19 véhicules", "20 véhicules et +"];

function EntreprisesPage() {
  return (
    <PublicLayout>
      {/* Hero B2B */}
      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-primary">
              IZOX Entreprises · Flottes & professionnels
            </p>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              Une flotte propre, un budget maîtrisé,
              <br className="hidden sm:block" />
              <span className="text-primary"> un impact mesuré.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              Nous entretenons vos véhicules directement sur votre site, avec une eau
              recyclée en circuit fermé et un reporting RSE chiffré que vous pouvez
              présenter à vos clients et partenaires.
            </p>
            <a href="#contact" className="mt-8 inline-block">
              <Button variant="izox" size="lg">
                Être rappelé par un conseiller
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Leviers B2B */}
      <section className="bg-muted/40 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            kicker="Pourquoi externaliser chez IZOX"
            title="Pensé pour les gestionnaires de flotte"
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Lever
              icon={<TrendingDown className="h-5 w-5 text-primary" />}
              title="Coûts dégressifs"
              text="Paliers de remise selon la taille de votre flotte : plus vous avez de véhicules, plus le prix unitaire baisse."
            />
            <Lever
              icon={<CalendarCheck className="h-5 w-5 text-primary" />}
              title="Fiabilité opérationnelle"
              text="Passages planifiés à l'avance, intervention sur votre site, suivi de chaque véhicule dans votre espace client."
            />
            <Lever
              icon={<BarChart3 className="h-5 w-5 text-primary" />}
              title="Reporting RSE"
              text="Eau économisée, pollution évitée, CO₂ : un tableau de bord d'impact exportable pour votre communication."
            />
            <Lever
              icon={<FileCheck className="h-5 w-5 text-primary" />}
              title="Traçabilité complète"
              text="Photos avant/après, checklists signées, factures détaillées : chaque intervention est documentée."
            />
          </div>
        </div>
      </section>

      {/* Preuve RSE réutilisée */}
      <section className="bg-primary py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            <B2bStat figure="2 à 4×" label="moins d'eau qu'un lavage au jet (en moyenne, sur nos interventions)" />
            <B2bStat figure={`${CHIFFRES_EAU.pctRecupere} %`} label="de l'eau récupérée sous le véhicule" />
            <B2bStat figure={`${CHIFFRES_EAU.pctReinjecte} %`} label="réinjectée dans la boucle après recyclage" />
          </div>
          <p className="mt-6 text-sm text-primary-foreground/80">
            Des chiffres mesurés sur le terrain — que votre entreprise peut reprendre
            dans son propre bilan RSE, preuves à l'appui.
          </p>
        </div>
      </section>

      {/* Formulaire lead */}
      <section id="contact" className="scroll-mt-20 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <SectionHeading
                kicker="Parlons de votre flotte"
                title="Demandez votre étude personnalisée"
                subtitle="Laissez-nous vos coordonnées : un conseiller vous rappelle sous 48 h ouvrées avec une proposition adaptée à votre flotte, et vous envoie notre plaquette commerciale."
              />
              <ul className="mt-6 space-y-3">
                {[
                  "Abonnements 2 ou 4 passages par mois et par véhicule",
                  "Remises par paliers selon la taille de la flotte",
                  "Intervention sur votre site, sans immobiliser vos équipes",
                  "Espace client en ligne : planning, factures, impact RSE",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <LeadForm />
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function Lever({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft">
        {icon}
      </div>
      <h3 className="mt-3 font-display text-base font-bold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function B2bStat({ figure, label }: { figure: string; label: string }) {
  return (
    <div>
      <p className="font-mono text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
        {figure}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-primary-foreground/80">{label}</p>
    </div>
  );
}

function LeadForm() {
  const [form, setForm] = useState({
    nom: "",
    societe: "",
    taille_flotte: TAILLES_FLOTTE[0],
    email: "",
    telephone: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    const { error } = await supabase.functions.invoke("create-lead", {
      body: { type: "b2b", ...form },
    });
    setSending(false);
    if (error) {
      toast.error("Une erreur est survenue", { description: "Réessayez dans un instant." });
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-10 text-center shadow-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 className="h-6 w-6 text-success" />
        </div>
        <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-foreground">
          Demande bien reçue
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Un conseiller IZOX vous rappelle sous 48 h ouvrées avec une proposition
          adaptée à votre flotte. Merci de votre confiance.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-card sm:p-8"
    >
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <p className="font-display text-base font-bold tracking-tight text-foreground">
          Votre flotte
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nom">Votre nom</Label>
          <Input id="nom" required value={form.nom} onChange={set("nom")} placeholder="Jean Dupont" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="societe">Société</Label>
          <Input id="societe" required value={form.societe} onChange={set("societe")} placeholder="Transports Dupont" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="taille">Taille de la flotte</Label>
        <select
          id="taille"
          value={form.taille_flotte}
          onChange={set("taille_flotte")}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {TAILLES_FLOTTE.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="email-b2b">Email professionnel</Label>
          <Input
            id="email-b2b"
            type="email"
            required
            value={form.email}
            onChange={set("email")}
            placeholder="j.dupont@societe.fr"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tel">Téléphone</Label>
          <Input
            id="tel"
            type="tel"
            required
            value={form.telephone}
            onChange={set("telephone")}
            placeholder="06 12 34 56 78"
          />
        </div>
      </div>
      <Button type="submit" variant="izox" className="w-full" disabled={sending}>
        {sending && <Loader2 className="h-4 w-4 animate-spin" />}
        Être rappelé par un conseiller
      </Button>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Vos coordonnées sont utilisées uniquement pour vous recontacter au sujet de
        votre demande. Aucune prospection sans votre accord.
      </p>
    </form>
  );
}
