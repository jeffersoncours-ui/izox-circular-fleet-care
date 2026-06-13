// Sections statiques de la landing B2C — design v2 dark (design-brief-v2.md §4).
// Phase 2a : layout dark + reveals (.rv). Les illustrations SVG (boucle tuyau,
// aquaponie) et les animations scroll-driven arrivent en Phase 2b/2c.

import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  Car,
  RefreshCw,
  Recycle,
  Sprout,
  Fish,
  ChevronDown,
  Quote,
} from "lucide-react";
import { CHIFFRES_EAU } from "@/lib/pricing-b2c";
import { WaterLoopDiagram } from "./illustrations/WaterLoopDiagram";
import { AquaponieScene } from "./illustrations/AquaponieScene";
import { installWaterLoop, installAquaponie } from "./scrollScenes";
import { CountUp } from "./CountUp";

/* ── 2. Comment ça marche ─────────────────────────────────────────── */

export function HowItWorks() {
  const steps = [
    {
      icon: <CalendarCheck className="h-6 w-6 text-[var(--b2c-accent)]" />,
      title: "Je réserve",
      text: "Choisissez votre véhicule, votre formule et votre créneau en ligne. Prix affiché en direct, sans surprise.",
    },
    {
      icon: <Car className="h-6 w-6 text-[var(--b2c-accent)]" />,
      title: "On vient",
      text: "Notre équipe intervient chez vous avec tout le matériel : berme de récupération, produits bio, eau embarquée.",
    },
    {
      icon: <RefreshCw className="h-6 w-6 text-[var(--b2c-accent)]" />,
      title: "L'eau repart en boucle",
      text: "L'eau utilisée est pompée, ramenée à notre local, recyclée et réutilisée sur les prochains lavages.",
    },
  ];

  return (
    <section className="b2c-section border-t border-[var(--b2c-line)]">
      <div className="b2c-container">
        <SectionHeading kicker="Simple comme bonjour" title="Comment ça marche" />
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className={`stepcard rv ${i === 1 ? "rv-d1" : i === 2 ? "rv-d2" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-md bg-[var(--primary-soft)]">
                  {s.icon}
                </div>
                <span className="stepcard__num">0{i + 1}</span>
              </div>
              <h3 className="b2c-display--md mt-4 !text-[1.5rem] text-[var(--b2c-tx)]">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--b2c-tx-dim)]">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 3. La boucle d'eau (goutte — contour dessiné au scroll) ───────── */

export function WaterLoop() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) return installWaterLoop(ref.current);
  }, []);

  return (
    <section id="boucle" className="b2c-section scroll-mt-20 border-t border-[var(--b2c-line)]">
      <div className="b2c-container" ref={ref}>
        <SectionHeading
          kicker="Notre différence"
          title={
            <>
              La boucle <em className="b2c-accent">d'eau</em>
            </>
          }
          subtitle="Pas de lavage « sans eau ». Une eau qui travaille, qu'on récupère et qu'on fait revivre — c'est ça, le nettoyage circulaire."
        />

        {/* Goutte — le contour se dessine au scroll, chiffres disposés autour */}
        <div className="mt-12" data-loop-section>
          <div className="rv mx-auto max-w-md text-center">
            <CountUp
              className="b2c-figure b2c-glow-text"
              prefix="~"
              value={CHIFFRES_EAU.litresUtilises}
              suffix=" L"
            />
            <p className="mt-2 text-sm font-semibold text-[var(--b2c-tx)]">
              par véhicule, en moyenne
            </p>
            <p className="mt-1 text-sm text-[var(--b2c-tx-dim)]">
              vs {CHIFFRES_EAU.comparaisonJetMin}–{CHIFFRES_EAU.comparaisonJetMax} L pour un
              lavage au jet à domicile
            </p>
          </div>

          {/* Goutte + légendes courtes aux 4 stations */}
          <div className="rv rv-d1 mt-8">
            <p className="b2c-mono mb-3 text-center text-[10px] uppercase tracking-[0.14em] text-[var(--b2c-tx-dim)]">
              Pression optimisée — la saleté avec un minimum de volume
            </p>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 sm:gap-x-6">
              <p className="b2c-mono text-right text-[10px] uppercase tracking-[0.14em] leading-snug text-[var(--b2c-tx-dim)]">
                Capte 100&nbsp;% des eaux de lavage, rien dans le caniveau
              </p>
              <WaterLoopDiagram className="w-full max-w-[220px] sm:max-w-[260px]" />
              <p className="b2c-mono text-[10px] uppercase tracking-[0.14em] leading-snug text-[var(--b2c-tx-dim)]">
                Ratio d'eau réinjectée pour le futur
              </p>
            </div>
            <p className="b2c-mono mt-3 text-center text-[10px] uppercase tracking-[0.14em] text-[var(--b2c-tx-dim)]">
              Traitement des hydrocarbures et métaux lourds, maîtrise du déchet
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl gap-8 sm:grid-cols-2">
            <div className="rv">
              <CountUp
                className="b2c-figure b2c-glow-text"
                value={CHIFFRES_EAU.pctRecupere}
                suffix=" %"
              />
              <p className="mt-2 text-sm font-semibold text-[var(--b2c-tx)]">
                récupérée sous le véhicule
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--b2c-tx-dim)]">
                Une berme étanche capte l'eau de lavage : {CHIFFRES_EAU.litresRecuperes} L
                repartent avec nous au lieu de finir dans le caniveau.
              </p>
            </div>
            <div className="rv rv-d1">
              <CountUp
                className="b2c-figure b2c-glow-text"
                value={CHIFFRES_EAU.pctReinjecte}
                suffix=" %"
              />
              <p className="mt-2 text-sm font-semibold text-[var(--b2c-tx)]">
                réinjectée dans la boucle
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--b2c-tx-dim)]">
                Après filtration à notre local, {CHIFFRES_EAU.litresReinjectes} L sont
                réutilisés sur les lavages suivants.
              </p>
            </div>
          </div>

          <p className="mt-8 text-xs text-[var(--b2c-tx-faint)]">
            Chiffres moyens mesurés sur nos interventions. Comparaison : lavage au jet à
            domicile ({CHIFFRES_EAU.comparaisonJetMin}–{CHIFFRES_EAU.comparaisonJetMax} L par véhicule).
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── 4. Preuve RSE ────────────────────────────────────────────────── */

export function RseProof() {
  return (
    <section className="b2c-section border-t border-[var(--b2c-line)]">
      <div className="b2c-container">
        <p className="b2c-kicker rv">Des chiffres réels, pas des promesses</p>
        <div className="mt-8 grid gap-10 sm:grid-cols-3">
          <RseStat figure="2 à 4×" label="moins d'eau qu'un lavage au jet à domicile" />
          <RseStat
            figure={<CountUp value={CHIFFRES_EAU.pctRecupere} suffix=" %" />}
            label="de l'eau récupérée sous le véhicule, en moyenne"
            delay="rv-d1"
          />
          <RseStat
            figure={<CountUp value={CHIFFRES_EAU.pctReinjecte} suffix=" %" />}
            label="de l'eau réinjectée dans la boucle après recyclage"
            delay="rv-d2"
          />
        </div>
        <p className="rv mt-8 max-w-2xl text-sm leading-relaxed text-[var(--b2c-tx-dim)]">
          Une démarche éco-responsable mesurée sur le terrain : produits bio, eau recyclée,
          zéro rejet au caniveau. Chaque chiffre correspond à des relevés réels effectués
          lors de nos interventions.
        </p>
      </div>
    </section>
  );
}

function RseStat({
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
      <p className="b2c-figure b2c-glow-text !text-[clamp(2.8rem,7vw,4rem)]">{figure}</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--b2c-tx-dim)]">{label}</p>
    </div>
  );
}

/* ── 5. Avant / après ─────────────────────────────────────────────── */

// Tuile photo avant/après — placeholder hachuré en attendant les vraies
// photos. Glisse depuis la gauche (avant) ou la droite (après) au scroll.
function BaCard({
  tag,
  label,
  dir,
  full,
}: {
  tag?: "avant" | "apres";
  label: string;
  dir: "left" | "right";
  full?: boolean;
}) {
  return (
    <figure
      className={`b2c-card ba-ph rv ${dir === "left" ? "rv-left" : "rv-right"} ${
        full ? "aspect-[16/9] sm:aspect-[21/9]" : "aspect-[4/5] sm:aspect-[4/3]"
      }`}
    >
      {tag && (
        <span className={`ba-tag absolute left-3 top-3 ${tag === "apres" ? "ba-tag--after" : ""}`}>
          {tag === "apres" ? "Après" : "Avant"}
        </span>
      )}
      <figcaption className="ba-ph__label absolute bottom-3 left-3">{label}</figcaption>
    </figure>
  );
}

export function BeforeAfter() {
  // TODO : remplacer par de vraies photos (public/landing/avant-apres-*.jpg)
  // — les libellés (Sellerie / Extérieur / Moquette) seront ajustés à ce moment-là.
  return (
    <section className="b2c-section border-t border-[var(--b2c-line)]">
      <div className="b2c-container">
        <SectionHeading
          kicker="Le résultat"
          title={
            <>
              Avant. <em className="b2c-accent">Après.</em>
            </>
          }
          subtitle="Le résultat parle de lui-même. Photos prises sur nos interventions, sans retouche."
        />
        <div className="mt-10 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <BaCard tag="avant" dir="left" label="Photo — Sellerie" />
            <BaCard tag="apres" dir="right" label="Photo — Sellerie" />
          </div>
          <BaCard dir="right" label="Photo — Extérieur après intervention" full />
          <div className="grid grid-cols-2 gap-4">
            <BaCard tag="avant" dir="left" label="Photo — Moquette" />
            <BaCard tag="apres" dir="right" label="Photo — Moquette" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 7. Vision « demain » ─────────────────────────────────────────── */

export function Vision() {
  const steps = [
    {
      icon: <Recycle className="h-5 w-5 text-[var(--b2c-accent)]" />,
      title: "Compost",
      text: "Les boues organiques issues de la filtration sont valorisées en compost au lieu d'être jetées.",
    },
    {
      icon: <Fish className="h-5 w-5 text-[var(--b2c-accent)]" />,
      title: "Aquaponie",
      text: "Le compost nourrit un bassin aquaponique : les poissons fertilisent l'eau qui alimente les cultures.",
    },
    {
      icon: <Sprout className="h-5 w-5 text-[var(--b2c-accent)]" />,
      title: "Légumes locaux",
      text: "Les légumes produits sont revendus en circuit court — chaque lavage finance un peu de production locale.",
    },
  ];

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) return installAquaponie(ref.current);
  }, []);

  return (
    <section className="b2c-section border-t border-[var(--b2c-line)]">
      <div className="b2c-container" ref={ref}>
        <div className="b2c-card rv p-6 sm:p-10">
          <div className="inline-flex items-center rounded-full border border-[var(--b2c-line-strong)] bg-[var(--primary-soft)] px-3 py-1">
            <span className="b2c-kicker">Notre feuille de route</span>
          </div>
          <h2 className="b2c-display--md mt-4 text-[var(--b2c-tx)]">
            Et demain, l'eau fait pousser des <em className="b2c-accent">légumes</em>
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--b2c-tx-dim)]">
            La boucle ne s'arrête pas au lavage. Notre objectif : que chaque sous-produit du
            nettoyage redevienne une ressource rentable — écologiquement et économiquement.
            Ce n'est pas encore en place : c'est le cap que nous nous sommes fixé.
          </p>

          {/* Scène aquaponie — poissons qui nagent au scroll (Phase 2c).
              -mx-6 mobile : annule le padding de la card pour un rendu pleine largeur. */}
          <div className="rv -mx-6 mt-8 sm:mx-0" data-aqua-section>
            <AquaponieScene className="mx-auto w-full max-w-[480px]" />
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className={`rv ${i === 1 ? "rv-d1" : i === 2 ? "rv-d2" : ""}`}>
                <div className="grid h-10 w-10 place-items-center rounded-md bg-[var(--primary-soft)]">
                  {s.icon}
                </div>
                <h3 className="mt-3 font-[var(--b2c-sans)] text-base font-bold text-[var(--b2c-tx)]">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--b2c-tx-dim)]">{s.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-2xl border-t border-[var(--b2c-line)] pt-6 text-sm leading-relaxed text-[var(--b2c-tx-dim)]">
            Une <span className="font-semibold text-[var(--b2c-tx)]">rentabilité écologique</span> :
            chaque litre économisé et chaque résidu valorisé réduit nos coûts d'exploitation —
            et donc vos prix, durablement.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── 8. Abonnement (module discret) ───────────────────────────────── */

export function SubscriptionTeaser() {
  return (
    <section className="b2c-section !py-12 border-t border-[var(--b2c-line)]">
      <div className="b2c-container">
        <div className="b2c-card rv flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="font-[var(--b2c-sans)] text-lg font-bold text-[var(--b2c-tx)]">
              Vous reviendrez ? L'abonnement vous fait économiser jusqu'à −15 %.
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--b2c-tx-dim)]">
              Pour un véhicule entretenu régulièrement, nos formules 2 ou 4 passages par mois
              reviennent moins cher que des passages ponctuels. Parlez-en avec nous après votre
              premier nettoyage — sans engagement.
            </p>
          </div>
          <a
            href="mailto:contact@izox.fr?subject=Abonnement%20IZOX"
            className="b2c-btn b2c-btn--ghost shrink-0"
          >
            En savoir plus
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── 9. Avis clients ──────────────────────────────────────────────── */

export function Reviews() {
  // Aucun faux avis (L121-2 C. conso) — empty-state honnête tant qu'il n'y en a pas.
  return (
    <section className="b2c-section border-t border-[var(--b2c-line)]">
      <div className="b2c-container">
        <SectionHeading kicker="Ils nous font confiance" title="Avis clients" />
        <div className="b2c-card rv mt-10 border-dashed p-8 text-center">
          <Quote className="mx-auto h-6 w-6 text-[var(--b2c-tx-faint)]" />
          <p className="mt-3 text-sm font-semibold text-[var(--b2c-tx)]">
            Tout juste lancés — vos avis apparaîtront ici.
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-[var(--b2c-tx-dim)]">
            Nous publions uniquement des avis réels de clients ayant réservé une intervention.
            Soyez parmi les premiers !
          </p>
          <Link to="/reservation" className="b2c-btn b2c-btn--primary mt-5">
            Réserver mon nettoyage
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
    <section className="b2c-section border-t border-[var(--b2c-line)]">
      <div className="b2c-container max-w-3xl">
        <SectionHeading kicker="Questions fréquentes" title="FAQ" />
        <div className="b2c-card rv mt-8 divide-y divide-[var(--b2c-line)]">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[var(--b2c-tx)] [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-[var(--b2c-tx-dim)] transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[var(--b2c-tx-dim)]">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 11. CTA final ────────────────────────────────────────────────── */

export function FinalCta() {
  return (
    <section className="b2c-section border-t border-[var(--b2c-line)]">
      <div className="b2c-container text-center">
        <h2 className="b2c-display--md rv text-[var(--b2c-tx)]">
          À votre tour de <em className="b2c-accent">fermer la boucle</em>
        </h2>
        <p className="b2c-lead rv rv-d1 mx-auto mt-4 max-w-md">
          Un véhicule propre, une eau qui revit, un geste pour la planète. Réservez en quelques
          clics.
        </p>
        <div className="rv rv-d2 mt-7 flex justify-center">
          <Link to="/reservation" className="b2c-btn b2c-btn--primary">
            Réserver mon nettoyage
          </Link>
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
  title: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="b2c-kicker rv">{kicker}</p>
      <h2 className="b2c-display--md rv rv-d1 mt-2 text-[var(--b2c-tx)]">{title}</h2>
      {subtitle && <p className="b2c-lead rv rv-d2 mt-3">{subtitle}</p>}
    </div>
  );
}
