import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Car,
  CalendarDays,
  Sparkles,
  Award,
  Leaf,
  KeyRound,
  UserCog,
  ChevronRight,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PassagesReportesBanner } from "@/components/client/PassagesReportesBanner";
import { ChangePasswordDialog } from "@/components/client/ChangePasswordDialog";
import { EditMyInfoDialog } from "@/components/client/EditMyInfoDialog";
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

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
function fmtYear(iso: string): string {
  return String(new Date(iso).getFullYear());
}

function ClientHome() {
  const { profile } = useAuth();
  const [vehiculeCount, setVehiculeCount] = useState(0);
  const [palier, setPalier] = useState<string>("");
  const [numeroContrat, setNumeroContrat] = useState<string>("");
  const [contratId, setContratId] = useState<string>("");
  const [prochainRdvDate, setProchainRdvDate] = useState<string | null>(null);
  const [dernierePrestDate, setDernierePrestDate] = useState<string | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (!profile?.entreprise_id) return;
    (async () => {
      const today = new Date().toISOString().split("T")[0];
      const [v, contratRes, rdvRes, prestRes] = await Promise.all([
        supabase
          .from("vehicules")
          .select("id", { count: "exact", head: true })
          .eq("entreprise_id", profile.entreprise_id!)
          .in("statut", ["actif", "en_attente_validation"]),
        supabase
          .from("contrats")
          .select("id, numero_contrat, statut")
          .eq("entreprise_id", profile.entreprise_id!)
          .in("statut", ["actif", "en_attente_validation"])
          .order("date_debut", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("demandes_rdv")
          .select("assigned_date")
          .eq("entreprise_id", profile.entreprise_id!)
          .eq("statut", "confirmee")
          .gte("assigned_date", today)
          .order("assigned_date", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("interventions")
          .select("date_intervention")
          .eq("entreprise_id", profile.entreprise_id!)
          .eq("statut", "validee")
          .order("date_intervention", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      const count = v.count ?? 0;
      setVehiculeCount(count);
      if (rdvRes.data?.assigned_date) setProchainRdvDate(rdvRes.data.assigned_date as string);
      if (prestRes.data?.date_intervention) setDernierePrestDate(prestRes.data.date_intervention as string);

      const contrat = contratRes.data;
      if (contrat) {
        const p =
          count >= 20 ? "premium" : count >= 10 ? "business" : count >= 5 ? "pro" : "starter";
        setPalier(p);
        setNumeroContrat(contrat.numero_contrat ?? "");
        setContratId(contrat.id);
      } else {
        setPalier("");
        setNumeroContrat("");
        setContratId("");
      }
    })();
  }, [profile]);

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto pb-24 flex flex-col gap-4">
      <PassagesReportesBanner />

      {/* Page header */}
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
        </p>
        <h1 className="text-[26px] font-bold tracking-tight text-foreground mt-1 leading-tight">
          Bonjour {profile?.prenom},{" "}
          <span className="text-primary">tout est sous contrôle.</span>
        </h1>
      </header>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/client/flotte">
          <StatCard
            icon={Car}
            label="Véhicules"
            value={String(vehiculeCount)}
            sub="dans la flotte"
          />
        </Link>
        <Link to="/client/prestations">
          <StatCard
            icon={CalendarDays}
            label="Prochain RDV"
            value={prochainRdvDate ? fmtShort(prochainRdvDate) : "—"}
            sub={prochainRdvDate ? fmtYear(prochainRdvDate) : "aucun RDV"}
            accent={prochainRdvDate ? "var(--color-warning)" : undefined}
          />
        </Link>
        <Link to="/client/prestations">
          <StatCard
            icon={Sparkles}
            label="Dernière prestation"
            value={dernierePrestDate ? fmtShort(dernierePrestDate) : "—"}
            sub={dernierePrestDate ? fmtYear(dernierePrestDate) : "aucune"}
          />
        </Link>
        {palier ? (
          contratId ? (
            <Link to="/client/contrats/$id" params={{ id: contratId }}>
              <PalierCard palier={palier} vehiculeCount={vehiculeCount} numero={numeroContrat} />
            </Link>
          ) : (
            <PalierCard palier={palier} vehiculeCount={vehiculeCount} numero={numeroContrat} />
          )
        ) : (
          <StatCard icon={Award} label="Palier" value="—" sub="Contactez IZOX" />
        )}
      </div>

      {/* Hero contrat dark */}
      <div className="bg-foreground text-card rounded-lg p-5 flex flex-col gap-3 relative overflow-hidden">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
          Contrat actif · {numeroContrat || "—"}
        </p>
        <div
          className="text-[52px] font-bold leading-none tracking-[-1px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {vehiculeCount}
          <span className="text-primary text-[36px] ml-1">véh.</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/20 text-[#7CC9A5] border border-primary/30">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {PALIER_LABEL[palier] ?? "Starter"}
          </span>
          <span className="text-white/45 text-xs">palier actif</span>
        </div>
        {/* bg icon */}
        <Car className="absolute right-4 bottom-4 h-20 w-20 text-white opacity-[0.06]" />
      </div>

      {/* Impact RSE */}
      <Link to="/client/impact" className="block">
        <div className="bg-[#E7EFEA] border border-[#CBDDD2] rounded-lg p-4 flex items-center gap-3 hover:bg-[#DCEEE4] transition-colors">
          <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <Leaf className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary">Mon Impact RSE</p>
            <p className="text-[11px] text-primary/60 mt-0.5">
              Eau économisée · Pollution évitée · Compost produit
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-primary/40" />
        </div>
      </Link>

      {/* Mon compte */}
      <div className="bg-card border border-border rounded-lg p-4 shadow-card flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Mon compte</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Informations et mot de passe
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => setInfoOpen(true)}>
            <UserCog className="h-3.5 w-3.5" />
            Modifier mes informations
          </Button>
          <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => setPwOpen(true)}>
            <KeyRound className="h-3.5 w-3.5" />
            Changer mon mot de passe
          </Button>
        </div>
      </div>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
      <EditMyInfoDialog open={infoOpen} onOpenChange={setInfoOpen} />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Car;
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-card h-full hover:border-primary/25 hover:shadow-strong transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground/50" />
      </div>
      <p
        className="text-[28px] font-bold leading-none tracking-tight capitalize"
        style={{
          fontFamily: "var(--font-display)",
          color: accent ?? "var(--color-foreground)",
        }}
      >
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1.5">{sub}</p>
    </div>
  );
}

function PalierCard({
  palier,
  vehiculeCount,
  numero,
}: {
  palier: string;
  vehiculeCount: number;
  numero: string;
}) {
  return (
    <div className="bg-[#E7EFEA] border border-[#CBDDD2] rounded-lg p-4 h-full hover:bg-[#DCEEE4] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-primary/70">
          Palier
        </span>
        <Award className="h-3.5 w-3.5 text-primary/50" />
      </div>
      <p
        className="text-[28px] font-bold leading-none tracking-tight text-primary capitalize"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {PALIER_LABEL[palier] ?? palier}
      </p>
      <p className="text-[11px] text-primary/60 mt-1.5">
        {vehiculeCount} véhicule{vehiculeCount > 1 ? "s" : ""} actif{vehiculeCount > 1 ? "s" : ""}
      </p>
      {numero && (
        <p className="text-[10px] text-primary/50 mt-0.5 font-mono truncate">{numero}</p>
      )}
    </div>
  );
}
