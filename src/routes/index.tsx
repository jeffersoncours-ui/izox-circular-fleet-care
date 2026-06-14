import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PublicLayout } from "@/components/landing/PublicLayout";
import { Hero } from "@/components/landing/Hero";
import {
  HowItWorks,
  WaterLoop,
  RseProof,
  BeforeAfter,
  Vision,
  SubscriptionTeaser,
  Reviews,
  Faq,
  FinalCta,
} from "@/components/landing/sections";
import { PricingSection } from "@/components/landing/PricingSection";
import { LayeredText } from "@/components/landing/LayeredText";

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
      <RseProof />
      <BeforeAfter />
      <PricingSection />
      <Vision />
      <section className="b2c-section border-t border-[var(--b2c-line)]">
        <div className="b2c-container flex justify-center overflow-hidden py-8">
          <LayeredText accentIndices={[4]} />
        </div>
      </section>
      <SubscriptionTeaser />
      <Reviews />
      <Faq />
      <FinalCta />
    </PublicLayout>
  );
}
