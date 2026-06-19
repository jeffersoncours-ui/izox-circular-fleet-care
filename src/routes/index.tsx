import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PublicLayout } from "@/components/landing/PublicLayout";
import { Hero } from "@/components/landing/Hero";
import {
  HowItWorks,
  WaterLoop,
  BeforeAfter,
  Vision,
  SubscriptionTeaser,
  Reviews,
  Faq,
  FinalCta,
} from "@/components/landing/sections";
import { PricingSection } from "@/components/landing/PricingSection";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IZOX — Nettoyage auto éco-responsable à domicile | Évry-Courcouronnes" },
      {
        name: "description",
        content:
          "Nettoyage automobile à domicile avec produits bio et eau recyclée en circuit fermé. Évry-Courcouronnes et 25 km alentours. Réservation en ligne, prix TTC transparents.",
      },
      // Landing publique : indexable — override du noindex global du root
      // (le CRM /admin, /client, /terrain reste bloqué via robots.txt + meta root).
      { name: "robots", content: "index, follow" },
      { name: "googlebot", content: "index, follow" },
      { name: "bingbot", content: "index, follow" },
      { property: "og:title", content: "IZOX — Nettoyage auto éco-responsable à domicile" },
      {
        property: "og:description",
        content:
          "On lave à l'eau. On la récupère. On la fait revivre. Nettoyage circulaire à Évry-Courcouronnes et alentours.",
      },
      { property: "og:type", content: "website" },
      // TODO: remplacer par le domaine final après migration
      { property: "og:url", content: "https://izox-circular-fleet-care.vercel.app/" },
      {
        "script:ld+json": {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": "IZOX Nettoyage Circulaire",
          "description": "Nettoyage automobile à domicile avec eau recyclée en circuit fermé. Citadines, berlines, SUV et utilitaires. Évry-Courcouronnes et Île-de-France sud.",
          "url": "https://izox-circular-fleet-care.vercel.app",
          "logo": {
            "@type": "ImageObject",
            "url": "https://izox-circular-fleet-care.vercel.app/logo-izox-brand.png",
          },
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Évry-Courcouronnes",
            "postalCode": "91000",
            "addressRegion": "Essonne",
            "addressCountry": "FR",
          },
          "areaServed": {
            "@type": "GeoCircle",
            "geoMidpoint": {
              "@type": "GeoCoordinates",
              "latitude": 48.6367,
              "longitude": 2.4416,
            },
            "geoRadius": "25000",
          },
          "openingHoursSpecification": [
            {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
              "opens": "08:00",
              "closes": "18:00",
            },
          ],
          "priceRange": "€€",
          "currenciesAccepted": "EUR",
          "paymentAccepted": "Carte bancaire, espèces",
          "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "Formules de nettoyage automobile",
            "itemListElement": [
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "Service",
                  "name": "Nettoyage Intérieur",
                  "description": "Aspiration complète, plastiques, vitres intérieures, finitions",
                },
                "priceRange": "80€ – 170€ TTC selon le véhicule",
                "priceCurrency": "EUR",
              },
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "Service",
                  "name": "Nettoyage Intérieur + Extérieur",
                  "description": "Intérieur complet + carrosserie, jantes et vitres à l'eau recyclée",
                },
                "priceRange": "110€ – 200€ TTC selon le véhicule",
                "priceCurrency": "EUR",
              },
            ],
          },
        },
      },
      {
        "script:ld+json": {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Dans quelle zone intervenez-vous ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Nous intervenons à Évry-Courcouronnes et dans un rayon de 25 km. Lors de la réservation, votre code postal nous permet de confirmer immédiatement si vous êtes dans la zone. Si vous êtes en dehors, laissez-nous votre email : nous vous préviendrons dès que nous couvrirons votre secteur.",
              },
            },
            {
              "@type": "Question",
              "name": "Comment se passe le paiement ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Vous payez en ligne au moment de la réservation : soit la totalité, soit un acompte de 30 %. Le solde restant se règle sur place, à la fin de l'intervention, par carte (TPE) ou en espèces. Le paiement en ligne est sécurisé.",
              },
            },
            {
              "@type": "Question",
              "name": "Puis-je annuler ma réservation ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Oui. En cas d'annulation, votre acompte vous est intégralement remboursé. S'agissant d'une prestation à date fixe, le droit de rétractation de 14 jours ne s'applique pas (art. L221-28 du Code de la consommation) ; c'est la politique d'annulation ci-dessus qui s'applique.",
              },
            },
            {
              "@type": "Question",
              "name": "Quels produits utilisez-vous ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Exclusivement des produits de nettoyage bio, choisis pour leur efficacité et leur compatibilité avec notre système de recyclage d'eau. Aucun solvant agressif ne touche votre véhicule ni ne part dans la nature.",
              },
            },
            {
              "@type": "Question",
              "name": "Combien de temps dure une intervention ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Comptez environ 1 h 30 à 2 h 30 selon le véhicule, la formule choisie et les options (Puzzi, ozone). Le créneau exact vous est confirmé lors de la réservation.",
              },
            },
            {
              "@type": "Question",
              "name": "Avez-vous besoin d'un point d'eau ou d'une prise ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Non. Nous arrivons en autonomie complète : eau embarquée (recyclée de nos précédentes interventions), matériel et électricité. Il nous faut juste un accès au véhicule et la place de travailler autour.",
              },
            },
          ],
        },
      },
    ],
  }),
  component: LandingPage,
});

// Les callbacks auth Supabase (flow implicit) peuvent atterrir sur `/` avec un
// hash (#access_token=...&type=recovery). detectAuthCallback() dans
// auth-context.tsx les lit au chargement du module ; on redirige ensuite
// CLIENT-SIDE vers /login (un redirect serveur 302 perdrait le hash).
function hasAuthCallback(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hash;
  const s = window.location.search;
  return h.includes("type=recovery") || h.includes("access_token") || s.includes("code=");
}

function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (hasAuthCallback()) {
      navigate({ to: "/login", replace: true });
    }
  }, [navigate]);

  return (
    <PublicLayout>
      <Hero />
      <HowItWorks />
      <WaterLoop />
      <BeforeAfter />
      <PricingSection />
      <Vision />
      <SubscriptionTeaser />
      <Reviews />
      <Faq />
      <FinalCta />
    </PublicLayout>
  );
}
