import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatTile } from "@/components/ui/page-header";
import { Building2, Car, CalendarDays, Plus, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type AdminCardLink =
  | "/admin/clients"
  | "/admin/vehicules"
  | "/admin/planning"
  | "/admin/facturation"
  | "/admin/contrats";

type AlertItem = {
  label: string;
  count: number;
  to: AdminCardLink;
  search?: { tab: "demandes" | "interventions" };
  severity: "warn" | "danger";
};

function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    clients: 0,
    vehicules: 0,
    rdv: 0,
    interventions: 0,
  });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const h48ago = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const d30ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const today = now.toISOString().split("T")[0];
      const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const [c, v, rdv, intv, enRevision, brouillonsAnciens, rdvAttente, contratsExp] =
        await Promise.all([
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
          supabase
            .from("interventions")
            .select("id", { count: "exact", head: true })
            .eq("statut", "en_revision")
            .lt("updated_at", h24ago),
          supabase
            .from("factures")
            .select("id", { count: "exact", head: true })
            .eq("statut", "brouillon")
            .lt("created_at", d30ago),
          supabase
            .from("demandes_rdv")
            .select("id", { count: "exact", head: true })
            .eq("statut", "en_attente")
            .lt("created_at", h48ago),
          supabase
            .from("contrats")
            .select("id", { count: "exact", head: true })
            .eq("statut", "actif")
            .not("date_fin", "is", null)
            .gte("date_fin", today)
            .lte("date_fin", in30days),
        ]);

      setStats({
        clients: c.count ?? 0,
        vehicules: v.count ?? 0,
        rdv: rdv.count ?? 0,
        interventions: intv.count ?? 0,
      });

      const rawAlerts: AlertItem[] = [
        {
          label: "Fiche(s) en révision depuis plus de 24h",
          count: enRevision.count ?? 0,
          to: "/admin/planning",
          search: { tab: "interventions" },
          severity: "danger",
        },
        {
          label: "Demande(s) RDV sans réponse depuis plus de 48h",
          count: rdvAttente.count ?? 0,
          to: "/admin/planning",
          search: { tab: "demandes" },
          severity: "danger",
        },
        {
          label: "Brouillon(s) de facture non émis depuis plus de 30 jours",
          count: brouillonsAnciens.count ?? 0,
          to: "/admin/facturation",
          severity: "warn",
        },
        {
          label: "Contrat(s) arrivant à échéance dans 30 jours",
          count: contratsExp.count ?? 0,
          to: "/admin/contrats",
          severity: "warn",
        },
      ];
      setAlerts(rawAlerts.filter((a) => a.count > 0));
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

        {/* Alertes */}
        {alerts.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">
              À traiter
            </h2>
            <div className="flex flex-col gap-2">
              {alerts.map((a) => (
                <Link key={a.label} to={a.to} search={a.search} className="block group">
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg border text-sm transition-colors",
                      a.severity === "danger"
                        ? "bg-red-50 border-red-200 text-red-800 group-hover:border-red-400"
                        : "bg-amber-50 border-amber-200 text-amber-800 group-hover:border-amber-400"
                    )}
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 opacity-70" />
                    <span className="flex-1">{a.label}</span>
                    <span className="font-bold tabular-nums">{a.count}</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-40 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

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
