import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Building2, Car, CalendarDays, Wrench } from "lucide-react";

type AdminCardLink = "/admin/clients" | "/admin/vehicules" | "/admin/rendez-vous" | "/admin/interventions";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    clients: 0,
    vehicules: 0,
    rdv: 0,
    interventions: 0,
  });

  useEffect(() => {
    (async () => {
      const [c, v] = await Promise.all([
        supabase.from("v_entreprises_actives" as never).select("id", { count: "exact", head: true }),
        supabase.from("vehicules").select("id", { count: "exact", head: true }).not("contrat_id", "is", null),
      ]);
      setStats({
        clients: c.count ?? 0,
        vehicules: v.count ?? 0,
        rdv: 0,
        interventions: 0,
      });
    })();
  }, []);

  const cards: { label: string; value: number; icon: typeof Building2; to: AdminCardLink }[] = [
    { label: "Clients", value: stats.clients, icon: Building2, to: "/admin/clients" },
    { label: "Véhicules suivis", value: stats.vehicules, icon: Car, to: "/admin/vehicules" },
    { label: "RDV à venir", value: stats.rdv, icon: CalendarDays, to: "/admin/rendez-vous" },
    { label: "Interventions du mois", value: stats.interventions, icon: Wrench, to: "/admin/interventions" },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">
          Bonjour {profile?.prenom ?? ""}
        </p>
        <h1 className="text-3xl font-bold text-foreground mt-1">Tableau de bord</h1>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, to }) => (
          <Link key={label} to={to} className="block">
            <Card className="p-5 shadow-card border-border/60 cursor-pointer transition-all duration-150 ease-out hover:bg-muted/40 hover:shadow-strong hover:border-primary/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                    {label}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary-soft flex items-center justify-center text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid lg:grid-cols-2 gap-6">
        <Card className="p-6 shadow-card border-border/60">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Activité récente
          </h2>
          <p className="text-sm text-muted-foreground">
            Le suivi des dernières interventions et rendez-vous apparaîtra ici prochainement.
          </p>
        </Card>
        <Card className="p-6 shadow-card border-border/60">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Prochaines étapes
          </h2>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Ajoutez vos premiers clients depuis l'onglet Clients</li>
            <li>Planifiez les rendez-vous avec vos opérateurs</li>
            <li>Suivez les interventions terrain en temps réel</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
