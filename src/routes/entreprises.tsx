// Route B2B publique — design v2 dark-native. Argumentaire flotte + capture de
// lead (brief §10). Pas de réservation en ligne ici : lead → rappel commercial.

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CHIFFRES_EAU } from "@/lib/pricing-b2c";
import { SevenSegmentNumber, SevenSegmentDigit } from "@/components/landing/SevenSegment";

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
      <section className="b2c-section">
        <div className="b2c-container">
          <div className="max-w-3xl">
            <p className="b2c-kicker rv">IZOX Entreprises · Flottes &amp; professionnels</p>
            <h1 className="b2c-display rv rv-d1 mt-5 !text-[clamp(2.2rem,6vw,3.8rem)] text-[var(--b2c-tx)]">
              Une flotte propre, un budget maîtrisé,{" "}
              <em className="b2c-accent">un impact mesuré.</em>
            </h1>
            <p className="b2c-lead rv rv-d2 mt-5 max-w-xl">
              Nous entretenons vos véhicules directement sur votre site, avec une eau recyclée
              en circuit fermé et un reporting RSE chiffré que vous pouvez présenter à vos
              clients et partenaires.
            </p>
            <a href="#contact" className="shiny-cta rv mt-8">
              <span>Être rappelé par un conseiller</span>
            </a>
          </div>
        </div>
      </section>

      {/* Leviers B2B */}
      <section className="b2c-section border-t border-[var(--b2c-line)]">
        <div className="b2c-container">
          <SectionHeading
            kicker="Pourquoi externaliser chez IZOX"
            title="Pensé pour les gestionnaires de flotte"
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Lever
              icon={<TrendingDown className="h-5 w-5 text-[var(--b2c-accent)]" />}
              title="Coûts dégressifs"
              text="Paliers de remise selon la taille de votre flotte : plus vous avez de véhicules, plus le prix unitaire baisse."
            />
            <Lever
              delay="rv-d1"
              icon={<CalendarCheck className="h-5 w-5 text-[var(--b2c-accent)]" />}
              title="Fiabilité opérationnelle"
              text="Passages planifiés à l'avance, intervention sur votre site, suivi de chaque véhicule dans votre espace client."
            />
            <Lever
              delay="rv-d1"
              icon={<BarChart3 className="h-5 w-5 text-[var(--b2c-accent)]" />}
              title="Reporting RSE"
              text="Eau économisée, pollution évitée, CO₂ : un tableau de bord d'impact exportable pour votre communication."
            />
            <Lever
              delay="rv-d2"
              icon={<FileCheck className="h-5 w-5 text-[var(--b2c-accent)]" />}
              title="Traçabilité complète"
              text="Photos avant/après, checklists signées, factures détaillées : chaque intervention est documentée."
            />
          </div>
        </div>
      </section>

      {/* Preuve RSE */}
      <section className="b2c-section border-t border-[var(--b2c-line)]">
        <div className="b2c-container">
          <p className="b2c-kicker rv">Des chiffres réels, repris dans votre bilan RSE</p>
          <div className="mt-8 grid gap-10 sm:grid-cols-3">
            <B2bStat
              figure={
                <span className="b2c-seg-number" aria-label="2 à 4 fois">
                  <SevenSegmentDigit value={2} />
                  <span className="b2c-seg-affix mx-[0.25em]"> à </span>
                  <SevenSegmentDigit value={4} />
                  <span className="b2c-seg-affix">×</span>
                </span>
              }
              label="moins d'eau qu'un lavage au jet (en moyenne, sur nos interventions)"
            />
            <B2bStat
              figure={<SevenSegmentNumber value={CHIFFRES_EAU.pctRecupere} suffix=" %" />}
              label="de l'eau récupérée sous le véhicule"
              delay="rv-d1"
            />
            <B2bStat
              figure={<SevenSegmentNumber value={CHIFFRES_EAU.pctReinjecte} suffix=" %" />}
              label="réinjectée dans la boucle après recyclage"
              delay="rv-d2"
            />
          </div>
        </div>
      </section>

      {/* Formulaire lead */}
      <section id="contact" className="b2c-section scroll-mt-20 border-t border-[var(--b2c-line)]">
        <div className="b2c-container">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <SectionHeading
                kicker="Parlons de votre flotte"
                title="Demandez votre étude personnalisée"
                subtitle="Laissez-nous vos coordonnées : un conseiller vous rappelle sous 48 h ouvrées avec une proposition adaptée à votre flotte, et vous envoie notre plaquette commerciale."
              />
              <ul className="rv mt-6 space-y-3">
                {[
                  "Abonnements 2 ou 4 passages par mois et par véhicule",
                  "Remises par paliers selon la taille de la flotte",
                  "Intervention sur votre site, sans immobiliser vos équipes",
                  "Espace client en ligne : planning, factures, impact RSE",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-[var(--b2c-tx-dim)]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--b2c-accent)]" />
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

function Lever({
  icon,
  title,
  text,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  delay?: string;
}) {
  return (
    <div className={`b2c-card b2c-glow-card rv ${delay ?? ""} p-5`}>
      <div className="grid h-10 w-10 place-items-center rounded-md bg-[var(--primary-soft)]">
        {icon}
      </div>
      <h3 className="mt-3 font-[var(--b2c-sans)] text-base font-bold text-[var(--b2c-tx)]">
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--b2c-tx-dim)]">{text}</p>
    </div>
  );
}

function B2bStat({
  figure,
  label,
  delay,
}: {
  figure: React.ReactNode;
  label: string;
  delay?: string;
}) {
  return (
    <div className={`rv ${delay ?? ""}`}>
      <p className="leading-none">{figure}</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--b2c-tx-dim)]">{label}</p>
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

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
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
      <div className="b2c-card b2c-glow-card flex flex-col items-center justify-center p-10 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--primary-soft)]">
          <CheckCircle2 className="h-6 w-6 text-[var(--b2c-accent)]" />
        </div>
        <h3 className="mt-4 font-[var(--b2c-sans)] text-lg font-bold text-[var(--b2c-tx)]">
          Demande bien reçue
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--b2c-tx-dim)]">
          Un conseiller IZOX vous rappelle sous 48 h ouvrées avec une proposition adaptée à
          votre flotte. Merci de votre confiance.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="b2c-card b2c-glow-card rv space-y-4 p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-[var(--b2c-accent)]" />
        <p className="font-[var(--b2c-sans)] text-base font-bold text-[var(--b2c-tx)]">
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
          <Input
            id="societe"
            required
            value={form.societe}
            onChange={set("societe")}
            placeholder="Transports Dupont"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="taille">Taille de la flotte</Label>
        <select
          id="taille"
          value={form.taille_flotte}
          onChange={set("taille_flotte")}
          className="flex h-9 w-full rounded-md border border-[var(--b2c-line)] bg-[var(--b2c-bg)] px-3 py-1 text-sm text-[var(--b2c-tx)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--b2c-accent)]"
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
      <button type="submit" className="shiny-cta w-full" disabled={sending}>
        <span className="inline-flex items-center gap-2">
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}
          Être rappelé par un conseiller
        </span>
      </button>
      <p className="text-[11px] leading-relaxed text-[var(--b2c-tx-faint)]">
        Vos coordonnées sont utilisées uniquement pour vous recontacter au sujet de votre
        demande. Aucune prospection sans votre accord.
      </p>
    </form>
  );
}
