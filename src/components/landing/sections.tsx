// Sections statiques de la landing B2C (brief §4).
// Phase 1 : contenu SSR sans animation. Les animations scroll-driven
// (fil de l'eau, boucle SVG) arrivent en Phase 4 par-dessus cette ossature.

import { Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  Car,
  RefreshCw,
  Droplets,
  Recycle,
  Sprout,
  Fish,
  Camera,
  ChevronDown,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHIFFRES_EAU } from "@/lib/pricing-b2c";

/* ── 2. Comment ça marche ─────────────────────────────────────────── */

export function HowItWorks() {
  const steps = [
    {
      icon: <CalendarCheck className="h-6 w-6 text-primary" />,
      title: "Je réserve",
      text: "Choisissez votre véhicule, votre formule et votre créneau en ligne. Prix affiché en direct, sans surprise.",
    },
    {
      icon: <Car className="h-6 w-6 text-primary" />,
      title: "On vient",
      text: "Notre équipe intervient chez vous avec tout le matériel : berme de récupération, produits bio, eau embarquée.",
    },
    {
      icon: <RefreshCw className="h-6 w-6 text-primary" />,
      title: "L'eau repart en boucle",
      text: "L'eau utilisée est pompée, ramenée à notre local, recyclée et réutilisée sur les prochains lavages.",
    },
  ];

  return (
    <section className="bg-muted/40 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          kicker="Simple comme bonjour"
          title="Comment ça marche"
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="rounded-lg border border-border bg-card p-6 shadow-card"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-soft">
                  {s.icon}
                </div>
                <span className="font-mono text-xs font-bold text-muted-foreground">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 3. La boucle d'eau (section signature — version statique Phase 1) ── */

export function WaterLoop() {
  const stages = [
    {
      icon: <Droplets className="h-5 w-5" />,
      title: "Lavage",
      figure: `~${CHIFFRES_EAU.litresUtilises} L`,
      caption: "par véhicule, en moyenne sur nos interventions",
      detail: `Contre ${CHIFFRES_EAU.comparaisonJetMin} à ${CHIFFRES_EAU.comparaisonJetMax} L pour un lavage au jet à domicile.`,
    },
    {
      icon: <RefreshCw className="h-5 w-5" />,
      title: "Berme & pompage",
      figure: `${CHIFFRES_EAU.pctRecupere} %`,
      caption: "de l'eau récupérée sous le véhicule",
      detail: `Une berme étanche capte l'eau de lavage : ${CHIFFRES_EAU.litresRecuperes} L repartent avec nous au lieu de finir dans le caniveau.`,
    },
    {
      icon: <Recycle className="h-5 w-5" />,
      title: "Recyclage",
      figure: `${CHIFFRES_EAU.pctReinjecte} %`,
      caption: "de l'eau réinjectée dans la boucle",
      detail: `Après filtration à notre local, ${CHIFFRES_EAU.litresReinjectes} L sont réutilisés sur les lavages suivants.`,
    },
  ];

  return (
    <section id="boucle" className="scroll-mt-20 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          kicker="Notre différence"
          title="La boucle d'eau"
          subtitle="Pas de lavage « sans eau ». Une eau qui travaille, qu'on récupère et qu'on fait revivre — c'est ça, le nettoyage circulaire."
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {stages.map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-lg border border-border bg-card p-6 shadow-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  {s.icon}
                </div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Étape {i + 1}
                </span>
              </div>
              <p className="mt-5 font-mono text-4xl font-bold tracking-tight text-primary">
                {s.figure}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{s.caption}</p>
              <h3 className="sr-only">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.detail}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Chiffres moyens mesurés sur nos interventions. Comparaison : lavage au jet à
          domicile ({CHIFFRES_EAU.comparaisonJetMin}–{CHIFFRES_EAU.comparaisonJetMax} L
          par véhicule).
        </p>
      </div>
    </section>
  );
}

/* ── 4. Preuve RSE ────────────────────────────────────────────────── */

export function RseProof() {
  return (
    <section className="bg-primary py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-primary-foreground/70">
          Des chiffres réels, pas des promesses
        </p>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          <RseStat
            figure="2 à 4×"
            label="moins d'eau qu'un lavage au jet à domicile"
          />
          <RseStat
            figure={`${CHIFFRES_EAU.pctRecupere} %`}
            label="de l'eau récupérée sous le véhicule, en moyenne"
          />
          <RseStat
            figure={`${CHIFFRES_EAU.pctReinjecte} %`}
            label="de l'eau réinjectée dans la boucle après recyclage"
          />
        </div>
        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-primary-foreground/80">
          Une démarche éco-responsable mesurée sur le terrain : produits bio, eau
          recyclée, zéro rejet au caniveau. Chaque chiffre correspond à des relevés
          réels effectués lors de nos interventions.
        </p>
      </div>
    </section>
  );
}

function RseStat({ figure, label }: { figure: string; label: string }) {
  return (
    <div>
      <p className="font-mono text-4xl font-bold tracking-tight text-primary-foreground sm:text-5xl">
        {figure}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-primary-foreground/80">{label}</p>
    </div>
  );
}

/* ── 5. Avant / après ─────────────────────────────────────────────── */

export function BeforeAfter() {
  // TODO : remplacer les placeholders par de vraies photos avant/après
  // (public/landing/avant-apres-*.jpg) dès les premières interventions B2C.
  const slots = ["Habitacle", "Sièges", "Carrosserie", "Jantes"];

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          kicker="La preuve par l'image"
          title="Avant / après"
          subtitle="Le résultat parle de lui-même. Photos prises sur nos interventions, sans retouche."
        />
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {slots.map((label) => (
            <div
              key={label}
              className="flex aspect-[4/5] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-center"
            >
              <Camera className="h-6 w-6 text-muted-foreground/60" />
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Photos à venir — premières interventions en cours
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 7. Vision « demain » ─────────────────────────────────────────── */

export function Vision() {
  const steps = [
    {
      icon: <Recycle className="h-5 w-5 text-primary" />,
      title: "Compost",
      text: "Les boues organiques issues de la filtration sont valorisées en compost au lieu d'être jetées.",
    },
    {
      icon: <Fish className="h-5 w-5 text-primary" />,
      title: "Aquaponie",
      text: "Le compost nourrit un bassin aquaponique : les poissons fertilisent l'eau qui alimente les cultures.",
    },
    {
      icon: <Sprout className="h-5 w-5 text-primary" />,
      title: "Légumes locaux",
      text: "Les légumes produits sont revendus en circuit court — chaque lavage finance un peu de production locale.",
    },
  ];

  return (
    <section className="bg-muted/40 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-lg border border-border bg-card p-6 shadow-card sm:p-10">
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary-soft px-3 py-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
              Notre feuille de route
            </span>
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Et demain, l'eau fait pousser des légumes
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            La boucle ne s'arrête pas au lavage. Notre objectif : que chaque sous-produit
            du nettoyage redevienne une ressource rentable — écologiquement et
            économiquement. Ce n'est pas encore en place : c'est le cap que nous nous
            sommes fixé.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.title}>
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft">
                  {s.icon}
                </div>
                <h3 className="mt-3 font-display text-base font-bold tracking-tight text-foreground">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 8. Abonnement (module discret) ───────────────────────────────── */

export function SubscriptionTeaser() {
  return (
    <section className="bg-white py-12 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-5 rounded-lg border border-border bg-muted/40 p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
              Vous reviendrez ? L'abonnement vous fait économiser.
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Pour un véhicule entretenu régulièrement, nos formules d'abonnement
              reviennent moins cher que des passages ponctuels. Parlez-en avec nous
              après votre premier nettoyage — sans engagement.
            </p>
          </div>
          <a href="mailto:contact@izox.fr?subject=Abonnement%20IZOX" className="shrink-0">
            <Button variant="outline" size="sm">
              En savoir plus
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── 9. Avis clients ──────────────────────────────────────────────── */

export function Reviews() {
  // Lancement : aucun avis publié tant qu'il n'y a pas de vrais avis vérifiables
  // (publier de faux avis = pratique commerciale trompeuse, art. L121-2 C. conso).
  return (
    <section className="bg-muted/40 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading kicker="Ils nous font confiance" title="Avis clients" />
        <div className="mt-10 rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <Quote className="mx-auto h-6 w-6 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-semibold text-foreground">
            Tout juste lancés — vos avis apparaîtront ici.
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            Nous publions uniquement des avis réels de clients ayant réservé une
            intervention. Soyez parmi les premiers !
          </p>
          <Link to="/reservation" className="mt-5 inline-block">
            <Button variant="izox" size="sm">
              Réserver mon nettoyage
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── 10. FAQ ──────────────────────────────────────────────────────── */

const FAQ_ITEMS = [
  {
    q: "Dans quelle zone intervenez-vous ?",
    a: "Nous intervenons à Évry-Courcouronnes et dans un rayon de 25 km. Lors de la réservation, votre code postal nous permet de confirmer immédiatement si vous êtes dans la zone. Si vous êtes en dehors, laissez-nous votre email : nous vous préviendrons dès que nous couvrirons votre secteur.",
  },
  {
    q: "Comment se passe le paiement ?",
    a: "Vous payez en ligne au moment de la réservation : soit la totalité, soit un acompte de 30 %. Le solde restant se règle sur place, à la fin de l'intervention, par carte (TPE) ou en espèces. Le paiement en ligne est sécurisé.",
  },
  {
    q: "Puis-je annuler ma réservation ?",
    a: "Oui. En cas d'annulation, votre acompte vous est intégralement remboursé. À noter : s'agissant d'une prestation à date fixe, le droit de rétractation de 14 jours ne s'applique pas (art. L221-28 du Code de la consommation) — c'est la politique d'annulation ci-dessus qui s'applique.",
  },
  {
    q: "Quels produits utilisez-vous ?",
    a: "Exclusivement des produits de nettoyage bio, choisis pour leur efficacité et leur compatibilité avec notre système de recyclage d'eau. Aucun solvant agressif ne touche votre véhicule ni ne part dans la nature.",
  },
  {
    q: "Combien de temps dure une intervention ?",
    a: "Comptez environ 1 h 30 à 2 h 30 selon le véhicule, la formule choisie et les options (Puzzi, ozone). Le créneau exact vous est confirmé lors de la réservation.",
  },
  {
    q: "Avez-vous besoin d'un point d'eau ou d'une prise ?",
    a: "Non. Nous arrivons en autonomie complète : eau embarquée (recyclée de nos précédentes interventions), matériel et électricité. Il nous faut juste un accès au véhicule et la place de travailler autour.",
  },
];

export function Faq() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading kicker="Questions fréquentes" title="FAQ" />
        <div className="mt-8 divide-y divide-border rounded-lg border border-border bg-card shadow-card">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Utilitaire commun ────────────────────────────────────────────── */

export function SectionHeading({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-primary">
        {kicker}
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {subtitle}
        </p>
      )}
    </div>
  );
}
