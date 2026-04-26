import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Car, CalendarDays, Sparkles, Award } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/client/")({
  component: ClientHome,
});

function ClientHome() {
  const { profile } = useAuth();
  const [vehiculeCount, setVehiculeCount] = useState(0);
  const [palier, setPalier] = useState<string>("");

  useEffect(() => {
    if (!profile?.entreprise_id) return;
    (async () => {
      const v = await supabase
        .from("vehicules")
        .select("id", { count: "exact", head: true })
        .eq("entreprise_id", profile.entreprise_id!);
      setVehiculeCount(v.count ?? 0);
      // Le palier ne s'affiche que si un contrat actif existe en base
      // pour cette entreprise. Tant que la table contrats n'existe pas
      // ou qu'aucun contrat actif n'est lié, on n'affiche aucun palier.
      setPalier("");
    })();
  }, [profile]);

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
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
        <SummaryCard
          icon={Award}
          label="Palier"
          value={palier ? palier : "Aucun contrat"}
          sub={palier ? "tarifaire actif" : "Contactez IZOX"}
          highlight={!palier}
        />
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
