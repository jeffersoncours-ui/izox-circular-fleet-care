import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { ChevronLeft, Cookie } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth, rolePath } from "@/lib/auth-context";

// ─── Content ──────────────────────────────────────────────────────────────────

const CGV_SECTIONS = [
  {
    id: "objet",
    title: "1. Objet du contrat",
    content: `IZOX Pro est une plateforme SaaS de gestion de flotte dédiée au nettoyage automobile éco-responsable. Les présentes Conditions Générales de Vente (CGV) régissent l'ensemble des relations contractuelles entre IZOX SAS (ci-après « IZOX ») et ses clients professionnels (ci-après « le Client »).

En accédant à la plateforme IZOX Pro, en créant un compte ou en souscrivant à un abonnement, le Client accepte sans réserve les présentes CGV dans leur version en vigueur à la date de souscription.`,
  },
  {
    id: "services",
    title: "2. Description des services",
    content: `IZOX Pro propose les services suivants dans le cadre des formules d'abonnement souscrites :

• Gestion de flotte véhicules (ajout, suivi statut, gel temporaire)
• Prise de rendez-vous en ligne pour les interventions de nettoyage
• Accès au tableau de bord opérateur terrain (application mobile)
• Suivi de l'impact RSE et des économies en eau réalisées
• Génération de factures mensuelles et historique des prestations
• API d'intégration avec les systèmes de gestion de flotte tiers

Les fonctionnalités disponibles dépendent du palier souscrit (1–5, 6–10, 11–20, 21–50 ou 51–100 véhicules).`,
  },
  {
    id: "paliers",
    title: "3. Paliers tarifaires",
    content: `Les abonnements IZOX Pro sont proposés selon les paliers suivants (tarifs HT, facturés mensuellement) :

• Palier 1–5 véhicules : 90 € / mois
• Palier 6–10 véhicules : 180 € / mois
• Palier 11–20 véhicules : 320 € / mois
• Palier 21–50 véhicules : 750 € / mois
• Palier 51–100 véhicules : sur devis

Tous les prix sont indiqués en euros hors taxes. La TVA applicable est de 20 %. Les tarifs sont révisables annuellement avec un préavis de 30 jours.`,
  },
  {
    id: "gel",
    title: "4. Gel de véhicules",
    content: `Le gel temporaire permet au Client de suspendre le suivi et la facturation d'un véhicule immobilisé. Les conditions applicables sont :

• Quota annuel de 90 jours de gel par contrat (toutes immobilisations cumulées)
• Délai de prévenance minimum de 48 heures avant prise d'effet
• Validation par l'équipe IZOX sous 24 heures ouvrées
• Non rétroactif : un gel ne peut pas prendre effet avant sa date de demande

Au-delà du quota de 90 jours, les jours supplémentaires seront facturés au tarif de 2 € HT/jour/véhicule.`,
  },
  {
    id: "paiement",
    title: "5. Conditions de paiement",
    content: `Les factures sont émises le 1er de chaque mois pour la période précédente. Le paiement est exigible sous 30 jours à compter de la date d'émission.

Modes de paiement acceptés : virement SEPA, carte bancaire (via Stripe), prélèvement automatique SEPA.

Tout retard de paiement entraîne l'application de pénalités égales à 3 fois le taux d'intérêt légal, ainsi qu'une indemnité forfaitaire de recouvrement de 40 €. En cas de non-paiement sous 15 jours après relance, l'accès à la plateforme peut être suspendu.`,
  },
  {
    id: "resilier",
    title: "6. Résiliation",
    content: `Le Client peut résilier son abonnement à tout moment avec un préavis de 30 jours calendaires, adressé par e-mail à ops@izox.fr avec confirmation écrite.

En cas de résiliation en cours de mois, la facturation est proratisée au jour de prise d'effet. Les données du Client sont conservées pendant 90 jours après la résiliation, puis définitivement supprimées conformément à notre politique RGPD.`,
  },
  {
    id: "responsabilite",
    title: "7. Limitation de responsabilité",
    content: `IZOX s'engage à fournir la plateforme avec une disponibilité cible de 99,5 % par mois (hors maintenances planifiées). En cas de défaillance, la responsabilité d'IZOX est limitée au montant des abonnements versés au cours des 3 derniers mois.

IZOX ne saurait être tenu responsable des dommages indirects, perte d'exploitation, perte de données ou manque à gagner résultant de l'utilisation ou de l'indisponibilité temporaire de la plateforme.`,
  },
  {
    id: "juridiction",
    title: "8. Juridiction et droit applicable",
    content: `Les présentes CGV sont soumises au droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable dans les 30 jours suivant la notification du différend. À défaut, le Tribunal de Commerce de Paris sera seul compétent.`,
  },
];

const RGPD_SECTIONS = [
  {
    id: "responsable",
    title: "1. Responsable du traitement",
    content: `IZOX SAS, société par actions simplifiée au capital de 50 000 €, immatriculée au RCS de Paris sous le numéro 987 654 321, dont le siège social est situé au 42 rue de la Paix, 75002 Paris, est le responsable du traitement de vos données personnelles.

Délégué à la Protection des Données (DPO) : dpo@izox.fr
Adresse postale : IZOX SAS – DPO, 42 rue de la Paix, 75002 Paris`,
  },
  {
    id: "collecte",
    title: "2. Données collectées",
    content: `Dans le cadre de l'utilisation de la plateforme IZOX Pro, les données suivantes sont collectées :

• Données d'identification : nom, prénom, adresse e-mail professionnelle, numéro de téléphone
• Données de compte : identifiants de connexion, préférences utilisateur, journaux d'accès
• Données de flotte : immatriculations, modèles, kilométrages, historiques d'interventions
• Données de facturation : coordonnées bancaires (tokenisées via Stripe), SIRET, adresse de facturation
• Données de localisation : adresses d'interventions (non collectées en temps réel)
• Données techniques : adresses IP, identifiants de session, logs d'utilisation`,
  },
  {
    id: "finalites",
    title: "3. Finalités du traitement",
    content: `Vos données sont traitées pour les finalités suivantes :

• Exécution du contrat de service SaaS et fourniture des fonctionnalités
• Gestion des comptes utilisateurs et authentification (base légale : exécution contractuelle)
• Émission des factures et suivi des paiements (base légale : obligation légale)
• Amélioration des services par analyse anonymisée des usages (base légale : intérêt légitime)
• Communication d'informations relatives aux évolutions de la plateforme (base légale : intérêt légitime)
• Sécurité et prévention de la fraude (base légale : intérêt légitime)`,
  },
  {
    id: "conservation",
    title: "4. Durée de conservation",
    content: `Données de compte actif : durée de la relation contractuelle + 3 ans.
Données de facturation : 10 ans (obligation comptable).
Journaux de connexion : 12 mois glissants.
Données de flotte et interventions : 5 ans après la fin du contrat.

Passé ces délais, les données sont soit supprimées définitivement, soit anonymisées à des fins statistiques.`,
  },
  {
    id: "droits",
    title: "5. Vos droits",
    content: `Conformément au RGPD (Règlement 2016/679) et à la loi Informatique et Libertés, vous disposez des droits suivants :

• Droit d'accès : obtenir une copie de vos données personnelles
• Droit de rectification : corriger des données inexactes ou incomplètes
• Droit à l'effacement : demander la suppression de vos données dans les conditions légales
• Droit à la portabilité : recevoir vos données dans un format structuré et lisible par machine
• Droit d'opposition : vous opposer au traitement de vos données pour des raisons légitimes
• Droit à la limitation : demander la suspension temporaire du traitement

Pour exercer vos droits, contactez notre DPO à dpo@izox.fr ou par courrier. Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).`,
  },
  {
    id: "cookies",
    title: "6. Cookies et traceurs",
    content: `IZOX Pro utilise les types de cookies suivants :

• Cookies strictement nécessaires : authentification, session, sécurité CSRF. Ces cookies ne peuvent pas être désactivés.
• Cookies de performance (Matomo) : mesure d'audience anonymisée, hébergée en France. Soumis à consentement.
• Cookies de fonctionnalité : mémorisation des préférences (langue, thème). Soumis à consentement.

Aucun cookie publicitaire ou de tracking cross-site n'est utilisé. Vous pouvez gérer vos préférences via le gestionnaire de cookies accessible depuis le pied de page.`,
  },
  {
    id: "securite",
    title: "7. Sécurité",
    content: `IZOX met en œuvre les mesures techniques et organisationnelles suivantes pour protéger vos données :

• Chiffrement TLS 1.3 pour toutes les communications réseau
• Chiffrement AES-256 des données au repos sur les serveurs
• Authentification à deux facteurs disponible pour tous les comptes
• Journalisation et surveillance continue des accès
• Audits de sécurité annuels par un prestataire certifié ISO 27001
• Hébergement OVH – datacenters France (Gravelines, Roubaix)
• Plan de reprise d'activité avec RPO < 1h et RTO < 4h`,
  },
  {
    id: "contact",
    title: "8. Contact",
    content: `Pour toute question relative à la protection de vos données personnelles :

Délégué à la Protection des Données
IZOX SAS · 42 rue de la Paix · 75002 Paris
E-mail : dpo@izox.fr
Téléphone : +33 1 23 45 67 89

Dernière mise à jour de la présente politique : 1er juin 2026.`,
  },
];

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/legal")({
  component: LegalPage,
});

// ─── Page ─────────────────────────────────────────────────────────────────────

function LegalPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"cgv" | "rgpd">("cgv");
  const [activeSection, setActiveSection] = useState<string>("objet");
  const [cgvAccepted, setCgvAccepted] = useState(false);
  const [cgvAcceptDate, setCgvAcceptDate] = useState<string | null>(null);
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sections = tab === "cgv" ? CGV_SECTIONS : RGPD_SECTIONS;

  useEffect(() => {
    try {
      const cgvTs = localStorage.getItem("izox_cgv_accepted");
      if (cgvTs) {
        setCgvAccepted(true);
        setCgvAcceptDate(
          new Date(parseInt(cgvTs)).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }),
        );
      }
      if (!localStorage.getItem("izox_cookie_consent")) {
        setShowCookieBanner(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  useEffect(() => {
    setActiveSection(sections[0].id);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`legal-${id}`);
    const container = scrollRef.current;
    if (el && container) {
      const containerTop = container.getBoundingClientRect().top;
      const elTop = el.getBoundingClientRect().top;
      container.scrollTo({
        top: container.scrollTop + (elTop - containerTop) - 16,
        behavior: "smooth",
      });
    }
  };

  const acceptCGV = () => {
    const ts = Date.now();
    try {
      localStorage.setItem("izox_cgv_accepted", String(ts));
    } catch {}
    const date = new Date(ts).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    setCgvAccepted(true);
    setCgvAcceptDate(date);
  };

  const acceptCookies = () => {
    try {
      localStorage.setItem("izox_cookie_consent", String(Date.now()));
    } catch {}
    setShowCookieBanner(false);
  };

  const refuseCookies = () => {
    setShowCookieBanner(false);
  };

  return (
    <RoleGuard allowed={["admin", "staff", "commercial", "operateur", "client"]}>
      <div className="flex flex-col h-screen bg-background overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 border-b border-border bg-card px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={rolePath(profile?.role)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Retour
            </Link>
            <div className="w-px h-5 bg-border" />
            <span className="font-semibold text-sm text-foreground">Informations légales</span>
          </div>
          {cgvAccepted && cgvAcceptDate && (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
              CGV acceptées le {cgvAcceptDate}
            </span>
          )}
        </header>

        {/* Tabs */}
        <div className="flex-shrink-0 flex border-b border-border bg-card px-6">
          {(
            [
              { key: "cgv" as const, label: "Conditions Générales de Vente" },
              { key: "rgpd" as const, label: "Politique de confidentialité" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-3 px-5 text-sm border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-[220px] flex-shrink-0 border-r border-border bg-card overflow-y-auto py-3">
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground px-4 mb-2">
              {tab === "cgv" ? "Chapitres" : "Sections"}
            </p>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className="relative block w-full text-left px-4 py-2 text-xs hover:bg-muted/50 transition-colors"
                style={{
                  fontWeight: activeSection === s.id ? 600 : 400,
                  color:
                    activeSection === s.id
                      ? "var(--color-primary)"
                      : "var(--color-muted-foreground)",
                }}
              >
                {activeSection === s.id && (
                  <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-primary rounded-r-full" />
                )}
                <span className={activeSection === s.id ? "pl-1" : ""}>{s.title}</span>
              </button>
            ))}
          </aside>

          {/* Content */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-7 lg:p-8">
            <div className="max-w-[680px]">
              {/* Document header */}
              <div className="mb-7">
                <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-2">
                  {tab === "cgv"
                    ? "Conditions Générales de Vente"
                    : "Politique de confidentialité"}
                </p>
                <h1 className="font-display text-2xl font-bold tracking-tight mb-2 leading-tight">
                  {tab === "cgv"
                    ? "Conditions Générales de Vente IZOX Pro"
                    : "Politique de confidentialité & Protection des données"}
                </h1>
                <p className="text-xs font-mono text-muted-foreground">
                  Version 3.2 · En vigueur au 1er juin 2026
                </p>
              </div>

              {/* Sections */}
              {sections.map((s) => (
                <div key={s.id} id={`legal-${s.id}`} className="mb-8">
                  <h2 className="font-display text-base font-bold tracking-tight mb-3 pb-2 border-b border-border">
                    {s.title}
                  </h2>
                  <p className="text-sm text-foreground/75 leading-relaxed whitespace-pre-line">
                    {s.content}
                  </p>
                </div>
              ))}

              {/* CGV acceptance block */}
              {tab === "cgv" && (
                <div
                  className={`border rounded-lg p-5 mt-2 transition-colors ${
                    cgvAccepted
                      ? "bg-green-50 border-green-300"
                      : "bg-card border-border"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={acceptCGV}
                      disabled={cgvAccepted}
                      aria-label="Accepter les CGV"
                      className={`flex-shrink-0 w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center transition-colors mt-0.5 ${
                        cgvAccepted
                          ? "bg-green-600 border-green-600 cursor-default"
                          : "border-border hover:border-primary cursor-pointer"
                      }`}
                    >
                      {cgvAccepted && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground mb-1">
                        J'accepte les Conditions Générales de Vente IZOX Pro
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        En cochant cette case, vous confirmez avoir lu et accepté les présentes CGV
                        dans leur intégralité.
                      </p>
                      {cgvAccepted && cgvAcceptDate && (
                        <span className="inline-flex items-center gap-1.5 mt-2 text-xs text-green-700 bg-green-100 border border-green-200 px-2.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                          Accepté le {cgvAcceptDate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="h-16" />
            </div>
          </div>
        </div>

        {/* Cookie banner */}
        {showCookieBanner && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-[0_-4px_24px_rgba(17,24,39,.08)] px-6 py-3 flex items-center gap-4 flex-wrap">
            <Cookie className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-[260px]">
              <p className="text-xs font-semibold text-foreground mb-0.5">
                Gestion des cookies
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nous utilisons des cookies nécessaires au fonctionnement, ainsi que des cookies
                d'analyse anonymisée (Matomo, hébergé en France).{" "}
                <button
                  onClick={() => {
                    setTab("rgpd");
                    setTimeout(() => scrollToSection("cookies"), 100);
                  }}
                  className="text-primary font-semibold hover:underline"
                >
                  Personnaliser mes choix
                </button>
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={refuseCookies}
                className="text-xs px-3 py-1.5 border border-border rounded-md text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                Refuser les optionnels
              </button>
              <button
                onClick={acceptCookies}
                className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
              >
                Accepter
              </button>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
