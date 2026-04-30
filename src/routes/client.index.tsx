import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Car, CalendarDays, Sparkles, Award } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PassagesReportesBanner } from "@/components/client/PassagesReportesBanner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/client/")({
  component: ClientHome,
});

const PALIER_LABEL: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
  premium: "Premium",
};

const PALIER_CARD_CLASS: Record<string, string> = {
  starter: "bg-muted text-muted-foreground",
  pro: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
  business: "bg-primary/10 text-primary",
  premium: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
};

function ClientHome() {
  const { profile } = useAuth();
  const [vehiculeCount, setVehiculeCount] = useState(0);
  const [palier, setPalier] = useState<string>("");
  const [numeroContrat, setNumeroContrat] = useState<string>("");

  useEffect(() => {
    if (!profile?.entreprise_id) return;
    (async () => {
      const v = await supabase
        .from("vehicules")
        .select("id", { count: "exact", head: true })
        .eq("entreprise_id", profile.entreprise_id!)
        .eq("statut", "actif");
      const count = v.count ?? 0;
      setVehiculeCount(count);

      // Récupère le contrat actif (le plus récent) pour calculer le palier
      const { data: contrat } = await supabase
        .from("contrats")
        .select("numero_contrat, statut")
        .eq("entreprise_id", profile.entreprise_id!)
        .eq("statut", "actif")
        .order("date_debut", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (contrat) {
        // Calcul du palier depuis le nb de véhicules actifs
        const p =
          count >= 20 ? "premium" : count >= 10 ? "business" : count >= 5 ? "pro" : "starter";
        setPalier(p);
        setNumeroContrat(contrat.numero_contrat ?? "");
      } else {
        setPalier("");
        setNumeroContrat("");
      }
    })();
  }, [profile]);

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <PassagesReportesBanner />
      <header className="mb-6">
        <p className="text-sm text-muted-foreground">Bonjour</p>
        <h1 className="text-2xl font-bold text-foreground">{profile?.prenom} {profile?.nom}</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/client/flotte">
          <SummaryCard
            icon={Car}
            label="Véhicules"
            value={String(vehiculeCount)}
            sub="dans la flotte"
          />
        </Link>
        <SummaryCard
          icon={CalendarDays}
          label="Prochain RDV"
          value="—"
          sub="aucun RDV"
        />
        <SummaryCard
          icon={Sparkles}
          label="Dernière prestation"
          value="—"
          sub="aucune prestation"
        />
        {palier ? (
          <PalierCard
            palier={palier}
            vehiculeCount={vehiculeCount}
            numeroContrat={numeroContrat}
          />
        ) : (
          <SummaryCard
            icon={Award}
            label="Palier"
            value="Aucun contrat"
            sub="Contactez IZOX"
            highlight
          />
        )}
      </div>

      <Card className="mt-6 p-5 bg-primary text-primary-foreground border-none shadow-strong">
        <h2 className="font-semibold text-lg">Bienvenue chez IZOX</h2>
        <p className="text-sm text-primary-foreground/85 mt-1">
          Gérez votre flotte et suivez les prestations de nettoyage circulaire en un coup d'œil.
        </p>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: typeof Car;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <Card className="p-4 shadow-card border-border/60 h-full">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="text-2xl font-bold text-foreground capitalize">{value}</p>
      <p className={`text-[11px] mt-1 ${highlight ? "text-primary font-medium" : "text-muted-foreground"}`}>{sub}</p>
    </Card>
  );
}

function PalierCard({
  palier,
  vehiculeCount,
  numeroContrat,
}: {
  palier: string;
  vehiculeCount: number;
  numeroContrat: string;
}) {
  const cls = PALIER_CARD_CLASS[palier] ?? "bg-card text-foreground";
  return (
    <Card className={cn("p-4 shadow-card border-border/60 h-full", cls)}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs uppercase tracking-wide font-medium opacity-80">Palier</p>
        <Award className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold capitalize">{PALIER_LABEL[palier] ?? palier}</p>
      <p className="text-[11px] mt-1 opacity-80">
        {vehiculeCount} véhicule{vehiculeCount > 1 ? "s" : ""} actif{vehiculeCount > 1 ? "s" : ""}
      </p>
      {numeroContrat && (
        <p className="text-[11px] opacity-70 truncate">Contrat {numeroContrat}</p>
      )}
    </Card>
  );
}
