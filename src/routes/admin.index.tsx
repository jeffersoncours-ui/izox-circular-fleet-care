import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatTile } from "@/components/ui/page-header";
import { Building2, Car, CalendarDays, Wrench, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type AdminCardLink = "/admin/clients" | "/admin/vehicules" | "/admin/planning";

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
      const today = new Date().toISOString().split("T")[0];
      const [c, v, rdv, intv] = await Promise.all([
        supabase.from("v_entreprises_actives").select("id", { count: "exact", head: true }),
        supabase
          .from("vehicules")
          .select("id", { count: "exact", head: true })
          .not("contrat_id", "is", null),
        supabase
          .from("demandes_rdv")
          .select("id", { count: "exact", head: true })
          .eq("statut", "en_attente"),
        supabase
          .from("interventions")
          .select("id", { count: "exact", head: true })
          .eq("statut", "en_cours"),
      ]);
      setStats({
        clients: c.count ?? 0,
        vehicules: v.count ?? 0,
        rdv: rdv.count ?? 0,
        interventions: intv.count ?? 0,
      });
    })();
  }, []);

  const kpis: {
    label: string;
    value: number;
    sub: string;
    accent?: string;
    to: AdminCardLink;
    search?: { tab: "demandes" | "interventions" };
  }[] = [
    {
      label: "Clients actifs",
      value: stats.clients,
      sub: "entreprises suivies",
      to: "/admin/clients",
    },
    {
      label: "Véhicules suivis",
      value: stats.vehicules,
      sub: "sous contrat actif",
      to: "/admin/vehicules",
    },
    {
      label: "RDV en attente",
      value: stats.rdv,
      sub: "demandes à traiter",
      accent: "var(--color-warning)",
      to: "/admin/planning",
      search: { tab: "demandes" },
    },
    {
      label: "Interventions en cours",
      value: stats.interventions,
      sub: "opérateurs actifs",
      accent: "var(--color-info)",
      to: "/admin/planning",
      search: { tab: "interventions" },
    },
  ];

  const quickLinks: { label: string; sub: string; to: AdminCardLink; icon: typeof Building2 }[] = [
    { label: "Clients", sub: "Gérer les entreprises", to: "/admin/clients", icon: Building2 },
    { label: "Véhicules", sub: "Parc automobile", to: "/admin/vehicules", icon: Car },
    { label: "Planning & RDV", sub: "Demandes · Board", to: "/admin/planning", icon: CalendarDays },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        crumbs={["IZOX", "Admin"]}
        title={<>Bonjour{profile?.prenom ? `, ${profile.prenom}` : ""} <span className="text-primary">·</span></>}
        sub="Vue d'ensemble des opérations"
        right={
          <Link to="/admin/clients">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Nouveau client
            </Button>
          </Link>
        }
      />

      <div className="p-6 lg:p-8 flex flex-col gap-8 max-w-7xl w-full mx-auto">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {kpis.map(({ label, value, sub, accent, to, search }) => (
            <Link key={label} to={to} search={search} className="block group h-full">
              <StatTile
                label={label}
                value={value}
                sub={sub}
                accent={accent}
                className="h-full group-hover:border-primary/25 group-hover:shadow-strong transition-all duration-150"
              />
            </Link>
          ))}
        </div>

        {/* Quick access */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">
            Accès rapide
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {quickLinks.map(({ label, sub, to, icon: Icon }) => (
              <Link key={to} to={to} className="block group">
                <div className={cn(
                  "bg-card border border-border rounded-lg p-5 flex items-center gap-4",
                  "shadow-card transition-all duration-150",
                  "group-hover:border-primary/25 group-hover:shadow-strong"
                )}>
                  <div className="h-11 w-11 rounded-lg bg-primary/8 flex items-center justify-center text-primary shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
