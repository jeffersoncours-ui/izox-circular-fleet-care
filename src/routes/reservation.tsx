import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, User, Building2, Info,
} from "lucide-react";
import { addDays, endOfMonth, startOfDay, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { PublicLayout } from "@/components/landing/PublicLayout";
import { WeekSlotPicker, MAX_CRENEAUX } from "@/components/landing/WeekSlotPicker";
import type { CreneauB2C } from "@/components/landing/WeekSlotPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  VEHICULES_B2C,
  FORMULES_B2C,
  OPTIONS_B2C,
  prixTotalB2C,
  formatPrixTTC,
  type VehiculeB2C,
  type FormuleB2C,
  type OptionB2C,
} from "@/lib/pricing-b2c";

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
      // TODO: remplacer par le domaine final après migration
      { property: "og:url", content: "https://izox-circular-fleet-care.vercel.app/reservation" },
    ],
  }),
  component: ReservationPage,
});

type Step = 1 | 2 | 3 | 4 | 5 | 6 | "success";

type SatEntry = { nb: number; cap: number };

// ---------- helpers ----------

function heureLabel(h: string) {
  return h.replace(":", "h");
}

function formatDateFr(dateStr: string) {
  return format(parseISO(dateStr), "EEEE d MMMM yyyy", { locale: fr });
}

// ---------- sub-components ----------

function StepProgress({ step, onBack }: { step: number; onBack?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-6">
      {onBack ? (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--b2c-tx-dim)] hover:text-[var(--b2c-tx)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour
        </button>
      ) : (
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--b2c-tx-dim)] hover:text-[var(--b2c-tx)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Accueil
        </Link>
      )}
      <span className="text-xs font-mono text-[var(--b2c-tx-dim)]">
        Étape <span className="text-[var(--b2c-accent)]">{step}</span> / 6
      </span>
    </div>
  );
}

function SuccessScreen() {
  return (
    <div className="b2c-card b2c-glow-card p-10 text-center">
      <div
        className="mx-auto grid h-16 w-16 place-items-center rounded-full mb-6"
        style={{ background: "rgba(63,216,255,0.12)" }}
      >
        <CheckCircle2 className="h-8 w-8" style={{ color: "var(--b2c-accent)" }} />
      </div>
      <h1 className="text-2xl font-bold text-[var(--b2c-tx)] mb-3">
        Demande <span className="b2c-accent">reçue</span> !
      </h1>
      <p className="text-sm leading-relaxed text-[var(--b2c-tx-dim)] max-w-sm mx-auto mb-8">
        Nous avons bien enregistré votre demande. Notre équipe vous contactera
        sous 24h ouvrées pour confirmer votre créneau et finaliser le règlement.
      </p>
      <Link to="/" className="b2c-btn inline-flex items-center gap-2">
        Retour à l'accueil
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

// ---------- main component ----------

function ReservationPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);

  // Step 2
  const [vehicule, setVehicule] = useState<VehiculeB2C | null>(null);

  // Step 3
  const [formule, setFormule] = useState<FormuleB2C | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<OptionB2C[]>([]);

  // Step 4
  const [creneaux, setCreneaux] = useState<CreneauB2C[]>([]);
  const [satMap, setSatMap] = useState<Record<string, SatEntry>>({});
  const [satLoading, setSatLoading] = useState(false);

  // Step 6
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [adresse, setAdresse] = useState("");
  const [ville, setVille] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const prix = vehicule && formule ? prixTotalB2C(vehicule, formule, selectedOptions) : 0;

  // Fetch occupancy when entering step 4 — bounded to current month
  useEffect(() => {
    if (step !== 4) return;
    setSatLoading(true);
    const today = startOfDay(new Date());
    const min = addDays(today, 1);
    const max = endOfMonth(today);
    supabase
      .rpc("get_creneaux_disponibles", {
        p_date_debut: format(min, "yyyy-MM-dd"),
        p_date_fin: format(max, "yyyy-MM-dd"),
      })
      .then(({ data }) => {
        const map: Record<string, SatEntry> = {};
        for (const row of (data ?? []) as Array<{
          slot_date: string;
          time_slot: string;
          nb_interventions: number;
          capacite_totale: number;
        }>) {
          map[`${row.slot_date}-${row.time_slot}`] = {
            nb: Number(row.nb_interventions),
            cap: Number(row.capacite_totale),
          };
        }
        setSatMap(map);
      })
      .then(() => setSatLoading(false), () => setSatLoading(false));
  }, [step]);

  const uniqueDates = new Set(creneaux.map((c) => c.date)).size;

  const handleSubmit = async () => {
    if (!prenom.trim() || !nom.trim()) {
      toast.error("Prénom et nom requis.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error("Email invalide.");
      return;
    }
    if (tel.replace(/\D/g, "").length < 10) {
      toast.error("Téléphone invalide (10 chiffres min.).");
      return;
    }
    if (!adresse.trim() || !ville.trim() || !/^\d{5}$/.test(codePostal)) {
      toast.error("Adresse complète requise (rue, ville, code postal à 5 chiffres).");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("create-reservation-b2c", {
        body: {
          prenom: prenom.trim(),
          nom: nom.trim(),
          email: email.trim().toLowerCase(),
          telephone: tel.trim(),
          adresse: adresse.trim(),
          ville: ville.trim(),
          code_postal: codePostal,
          vehicule,
          formule,
          options: selectedOptions,
          montant_ttc: prix,
          creneaux_preferes: creneaux,
        },
      });
      if (error) throw error;
      setStep("success");
    } catch {
      toast.error("Une erreur est survenue. Réessayez dans un instant.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── render ──

  return (
    <PublicLayout>
      <section className="b2c-section">
        <div className="b2c-container max-w-2xl">
          {step === "success" ? (
            <SuccessScreen />
          ) : step === 1 ? (
            <>
              <StepProgress step={1} />
              <div className="b2c-card b2c-glow-card p-8">
                <h2 className="text-xl font-bold text-[var(--b2c-tx)] mb-2">
                  Vous êtes…
                </h2>
                <p className="text-sm text-[var(--b2c-tx-dim)] mb-6">
                  Pour vous orienter vers le bon service
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setStep(2)}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border border-[var(--b2c-line)] hover:border-[var(--b2c-accent)] transition-colors text-center group"
                  >
                    <User className="h-8 w-8 text-[var(--b2c-tx-dim)] group-hover:text-[var(--b2c-accent)] transition-colors" />
                    <span className="font-semibold text-[var(--b2c-tx)]">Particulier</span>
                    <span className="text-xs text-[var(--b2c-tx-dim)]">Usage personnel</span>
                  </button>
                  <button
                    onClick={() => navigate({ to: "/entreprises" })}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border border-[var(--b2c-line)] hover:border-[var(--b2c-accent)] transition-colors text-center group"
                  >
                    <Building2 className="h-8 w-8 text-[var(--b2c-tx-dim)] group-hover:text-[var(--b2c-accent)] transition-colors" />
                    <span className="font-semibold text-[var(--b2c-tx)]">Professionnel</span>
                    <span className="text-xs text-[var(--b2c-tx-dim)]">Flotte d'entreprise</span>
                  </button>
                </div>
              </div>
            </>
          ) : step === 2 ? (
            <>
              <StepProgress step={2} onBack={() => setStep(1)} />
              <div className="b2c-card b2c-glow-card p-8">
                <h2 className="text-xl font-bold text-[var(--b2c-tx)] mb-2">
                  Mon véhicule
                </h2>
                <p className="text-sm text-[var(--b2c-tx-dim)] mb-6">
                  Sélectionnez la catégorie de votre véhicule
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {VEHICULES_B2C.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => { setVehicule(v.id); setStep(3); }}
                      className={`p-4 rounded-xl border text-left transition-colors ${
                        vehicule === v.id
                          ? "border-[var(--b2c-accent)] bg-[rgba(63,216,255,0.08)]"
                          : "border-[var(--b2c-line)] hover:border-[var(--b2c-accent)]"
                      }`}
                    >
                      <p className="font-semibold text-[var(--b2c-tx)]">{v.label}</p>
                      <p className="text-xs text-[var(--b2c-tx-dim)] mt-0.5">{v.exemple}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : step === 3 ? (
            <>
              <StepProgress step={3} onBack={() => setStep(2)} />
              <div className="b2c-card b2c-glow-card p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[var(--b2c-tx)] mb-2">
                    Ma prestation
                  </h2>
                  <p className="text-sm text-[var(--b2c-tx-dim)]">
                    Choisissez votre formule et vos options
                  </p>
                </div>

                {/* Formules */}
                <div className="space-y-3">
                  {FORMULES_B2C.map((f) => {
                    const unitPrice = vehicule ? (
                      f.id === "interieur"
                        ? { citadine: 80, berline: 110, suv: 140, utilitaire: 170 }[vehicule]
                        : { citadine: 110, berline: 140, suv: 170, utilitaire: 200 }[vehicule]
                    ) : 0;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setFormule(f.id)}
                        className={`w-full p-4 rounded-xl border text-left transition-colors ${
                          formule === f.id
                            ? "border-[var(--b2c-accent)] bg-[rgba(63,216,255,0.08)]"
                            : "border-[var(--b2c-line)] hover:border-[var(--b2c-accent)]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-[var(--b2c-tx)]">{f.label}</p>
                            <p className="text-xs text-[var(--b2c-tx-dim)] mt-0.5">{f.description}</p>
                          </div>
                          <span className="text-base font-bold flex-shrink-0" style={{ color: "var(--b2c-accent)" }}>
                            {unitPrice} €
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[var(--b2c-tx)]">Options complémentaires</p>
                  {OPTIONS_B2C.map((o) => {
                    const checked = selectedOptions.includes(o.id as OptionB2C);
                    const optPrice = vehicule ? o.prix[vehicule] : 0;
                    return (
                      <button
                        key={o.id}
                        onClick={() => {
                          setSelectedOptions((prev) =>
                            checked ? prev.filter((x) => x !== o.id) : [...prev, o.id as OptionB2C],
                          );
                        }}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          checked
                            ? "border-[var(--b2c-accent)] bg-[rgba(63,216,255,0.06)]"
                            : "border-[var(--b2c-line)] hover:border-[var(--b2c-accent)]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <div
                              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border flex items-center justify-center"
                              style={{
                                borderColor: checked ? "var(--b2c-accent)" : "var(--b2c-line)",
                                background: checked ? "var(--b2c-accent)" : "transparent",
                              }}
                            >
                              {checked && (
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4L3.5 6.5L9 1" stroke="#06120c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[var(--b2c-tx)]">{o.label}</p>
                              <p className="text-xs text-[var(--b2c-tx-dim)]">{o.description}</p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-[var(--b2c-tx-dim)] flex-shrink-0">+{optPrice} €</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Prix total */}
                <div
                  className="flex items-center justify-between px-4 py-3 rounded-lg"
                  style={{ background: "rgba(63,216,255,0.08)", border: "1px solid rgba(63,216,255,0.25)" }}
                >
                  <span className="text-sm text-[var(--b2c-tx-dim)]">Total TTC</span>
                  <span className="text-xl font-bold" style={{ color: "var(--b2c-accent)" }}>
                    {formatPrixTTC(prix)}
                  </span>
                </div>

                <button
                  onClick={() => setStep(4)}
                  disabled={!formule}
                  className="shiny-cta w-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Choisir mes créneaux
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : step === 4 ? (
            <>
              <StepProgress step={4} onBack={() => setStep(3)} />
              <div className="b2c-card b2c-glow-card p-6 space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-[var(--b2c-tx)] mb-1">
                    Mes créneaux préférés
                  </h2>
                  <p className="text-sm text-[var(--b2c-tx-dim)]">
                    Sélectionnez 2 à {MAX_CRENEAUX} dates ce mois-ci — samedi inclus
                  </p>
                </div>

                {/* Explication du concept multi-créneaux */}
                <div
                  className="flex gap-2.5 rounded-lg p-3"
                  style={{ background: "rgba(63,216,255,0.06)", border: "1px solid rgba(63,216,255,0.18)" }}
                >
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "var(--b2c-accent)" }} />
                  <p className="text-xs leading-relaxed text-[var(--b2c-tx-dim)]">
                    Pour optimiser les déplacements de nos équipes, proposez{" "}
                    <span className="font-medium text-[var(--b2c-tx)]">au moins 2 jours différents</span>.
                    Nous vous confirmerons ensuite le créneau le mieux adapté à notre tournée, un seul
                    horaire par jour suffit.
                  </p>
                </div>

                {satLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--b2c-tx-dim)]" />
                  </div>
                ) : (
                  <WeekSlotPicker
                    selected={creneaux}
                    onSelect={setCreneaux}
                    satMap={satMap}
                  />
                )}

                <button
                  onClick={() => setStep(5)}
                  disabled={uniqueDates < 2}
                  className="shiny-cta w-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uniqueDates < 2
                    ? `Sélectionnez encore ${2 - uniqueDates} date${2 - uniqueDates > 1 ? "s" : ""}`
                    : "Voir le récapitulatif"}
                  {uniqueDates >= 2 && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </>
          ) : step === 5 ? (
            <>
              <StepProgress step={5} onBack={() => setStep(4)} />
              <div className="b2c-card b2c-glow-card p-8 space-y-6">
                <h2 className="text-xl font-bold text-[var(--b2c-tx)]">Récapitulatif</h2>

                <div className="space-y-0 divide-y divide-[var(--b2c-line)]">
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-[var(--b2c-tx-dim)]">Véhicule</span>
                    <span className="font-medium text-[var(--b2c-tx)]">
                      {VEHICULES_B2C.find((v) => v.id === vehicule)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-[var(--b2c-tx-dim)]">Formule</span>
                    <span className="font-medium text-[var(--b2c-tx)]">
                      {FORMULES_B2C.find((f) => f.id === formule)?.label}
                    </span>
                  </div>
                  {selectedOptions.length > 0 && (
                    <div className="flex justify-between py-3 text-sm">
                      <span className="text-[var(--b2c-tx-dim)]">Options</span>
                      <span className="font-medium text-[var(--b2c-tx)] text-right">
                        {OPTIONS_B2C.filter((o) => selectedOptions.includes(o.id as OptionB2C))
                          .map((o) => o.label.split(" — ")[0])
                          .join(", ")}
                      </span>
                    </div>
                  )}
                  <div className="py-3 text-sm">
                    <span className="text-[var(--b2c-tx-dim)]">Créneaux proposés</span>
                    <div className="mt-2 space-y-1.5">
                      {creneaux.map((c) => (
                        <div key={`${c.date}-${c.heure}`} className="flex items-center gap-2">
                          <span
                            className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                            style={{ background: "var(--b2c-accent)" }}
                          />
                          <span className="text-[var(--b2c-tx)]">
                            {formatDateFr(c.date)}{" "}
                            <span className="font-semibold" style={{ color: "var(--b2c-accent)" }}>
                              {heureLabel(c.heure)}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="font-semibold text-[var(--b2c-tx)]">Total TTC</span>
                    <span className="text-xl font-bold" style={{ color: "var(--b2c-accent)" }}>
                      {formatPrixTTC(prix)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setStep(6)}
                  className="shiny-cta w-full flex items-center justify-center gap-2"
                >
                  Mes coordonnées
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : step === 6 ? (
            <>
              <StepProgress step={6} onBack={() => setStep(5)} />
              <div className="b2c-card b2c-glow-card p-8 space-y-6">
                <h2 className="text-xl font-bold text-[var(--b2c-tx)]">Mes coordonnées</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="prenom">Prénom *</Label>
                    <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Jean" autoComplete="given-name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nom">Nom *</Label>
                    <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Dupont" autoComplete="family-name" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jean.dupont@exemple.fr" autoComplete="email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tel">Téléphone *</Label>
                  <Input id="tel" type="tel" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="06 12 34 56 78" autoComplete="tel" inputMode="tel" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adresse">Adresse d'intervention *</Label>
                  <Input id="adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="12 rue de la Paix" autoComplete="street-address" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="ville">Ville *</Label>
                    <Input id="ville" value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Évry-Courcouronnes" autoComplete="address-level2" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cp">Code postal *</Label>
                    <Input
                      id="cp"
                      value={codePostal}
                      onChange={(e) => setCodePostal(e.target.value.replace(/\D/g, "").slice(0, 5))}
                      placeholder="91000"
                      inputMode="numeric"
                      maxLength={5}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-[var(--b2c-tx-dim)] leading-relaxed">
                  * Champs obligatoires. Vos données sont utilisées uniquement pour
                  traiter votre demande. Pas de newsletter, pas de revente.
                </p>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="shiny-cta w-full flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Envoyer ma demande
                </button>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </PublicLayout>
  );
}
