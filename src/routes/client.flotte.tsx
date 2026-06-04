import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Car, ChevronRight, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";

import { AddVehiculeDialog } from "@/components/client/AddVehiculeDialog";
import { PassagesReportesBanner } from "@/components/client/PassagesReportesBanner";
import { getPackLabel } from "@/lib/pricing";

export const Route = createFileRoute("/client/flotte")({
  component: MaFlotte,
});

interface Vehicule {
  id: string;
  immatriculation: string;
  statut: string;
  type_pack_souhaite: string | null;
}

function MaFlotte() {
  const location = useLocation();
  if (location.pathname !== "/client/flotte") {
    return <Outlet />;
  }
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<Vehicule[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!profile?.entreprise_id) return;
    setLoading(true);
    const { data } = await supabase
      .from("vehicules")
      .select("id, immatriculation, statut, type_pack_souhaite")
      .eq("entreprise_id", profile.entreprise_id)
      .in("statut", ["actif", "gele", "en_attente_validation"])
      .order("created_at", { ascending: false });
    setList((data as Vehicule[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [profile]);

  const [statusFilter, setStatusFilter] = useState<"tous" | "actif" | "gele" | "en_attente">("tous");

  const vehiculesActifs = list.filter((v) => v.statut === "actif");
  const vehiculesGeles = list.filter((v) => v.statut === "gele");
  const vehiculesEnAttente = list.filter((v) => v.statut === "en_attente_validation");
  const useAccordion = list.length > 5;

  const filteredList =
    statusFilter === "tous"
      ? list
      : statusFilter === "gele"
      ? list.filter((v) => v.statut === "gele")
      : statusFilter === "en_attente"
      ? list.filter((v) => v.statut === "en_attente_validation")
      : list.filter((v) => v.statut === "actif");

  const renderVehicule = (v: Vehicule) => {
    const isGele = v.statut === "gele";
    const isEnAttente = v.statut === "en_attente_validation";
    return (
      <div
        key={v.id}
        role="button"
        tabIndex={0}
        onClick={() => navigate({ to: "/client/flotte/$id", params: { id: v.id } })}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate({ to: "/client/flotte/$id", params: { id: v.id } });
          }
        }}
        className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors cursor-pointer"
      >
        <div className={cn(
          "h-[60px] w-[60px] flex-shrink-0 rounded-md flex items-center justify-center",
          isGele ? "bg-[#D5E2F6]" : isEnAttente ? "bg-amber-50" : "bg-[#E7EFEA]"
        )}>
          {isGele
            ? <Snowflake className="h-6 w-6 text-[#2A6FDB]" />
            : <Car className={cn("h-6 w-6", isEnAttente ? "text-amber-600" : "text-primary")} />
          }
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-[15px] font-mono tracking-wide">{v.immatriculation}</p>
            {isGele && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold bg-[#D5E2F6] text-[#2A6FDB] border border-[#B3C8EF]">
                gelé
              </span>
            )}
            {isEnAttente && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                en attente
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {v.type_pack_souhaite ? getPackLabel(v.type_pack_souhaite) : "Pack non défini"}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      </div>
    );
  };

  const SectionHead = ({ title, count, tone }: { title: string; count: number; tone?: string }) => (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[12px] font-bold text-foreground">{title}</span>
      <span className={cn(
        "px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
        tone === "gele" ? "bg-[#D5E2F6] text-[#2A6FDB]" :
        tone === "en_attente" ? "bg-amber-50 text-amber-700" :
        "bg-[#E7EFEA] text-primary"
      )}>{count}</span>
    </div>
  );

  const renderList = (items: Vehicule[]) => (
    <div className="flex flex-col gap-2">
      {items.map((v) => renderVehicule(v))}
    </div>
  );

  const filterPills: { key: typeof statusFilter; label: string }[] = [
    { key: "tous", label: `Tous · ${list.length}` },
    { key: "actif", label: `Actifs · ${vehiculesActifs.length}` },
    ...(vehiculesGeles.length > 0 ? [{ key: "gele" as const, label: `Gelés · ${vehiculesGeles.length}` }] : []),
    ...(vehiculesEnAttente.length > 0 ? [{ key: "en_attente" as const, label: `Attente · ${vehiculesEnAttente.length}` }] : []),
  ];

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto pb-24 flex flex-col gap-4">
      <PassagesReportesBanner />

      <header className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {list.length} véhicule{list.length > 1 ? "s" : ""}
          </p>
          <h1 className="text-[24px] font-bold tracking-tight text-foreground mt-0.5">Ma flotte</h1>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Nouveau
        </Button>
      </header>

      {!loading && list.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {filterPills.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors",
                statusFilter === key
                  ? "bg-primary text-white border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : list.length === 0 ? (
        <Card className="p-10 text-center shadow-card border-border/60">
          <Car className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">Aucun véhicule pour le moment.</p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Ajouter mon premier véhicule
          </Button>
        </Card>
      ) : statusFilter !== "tous" ? (
        renderList(filteredList)
      ) : useAccordion ? (
        <Accordion type="multiple" defaultValue={["actifs"]}>
          <AccordionItem value="actifs">
            <AccordionTrigger className="text-sm font-bold">
              Actifs ({vehiculesActifs.length})
            </AccordionTrigger>
            <AccordionContent className="pb-0">{renderList(vehiculesActifs)}</AccordionContent>
          </AccordionItem>
          {vehiculesGeles.length > 0 && (
            <AccordionItem value="geles">
              <AccordionTrigger className="text-sm font-bold">
                <span className="flex items-center gap-2">
                  <Snowflake className="h-4 w-4 text-[#2A6FDB]" />
                  Gelés ({vehiculesGeles.length})
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-0 opacity-80">{renderList(vehiculesGeles)}</AccordionContent>
            </AccordionItem>
          )}
          {vehiculesEnAttente.length > 0 && (
            <AccordionItem value="en_attente">
              <AccordionTrigger className="text-sm font-bold text-amber-700">
                En attente ({vehiculesEnAttente.length})
              </AccordionTrigger>
              <AccordionContent className="pb-0">{renderList(vehiculesEnAttente)}</AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      ) : (
        <div className="flex flex-col gap-5">
          {vehiculesActifs.length > 0 && (
            <section>
              <SectionHead title="Actifs" count={vehiculesActifs.length} />
              {renderList(vehiculesActifs)}
            </section>
          )}
          {vehiculesGeles.length > 0 && (
            <section className="opacity-80">
              <SectionHead title="Gelés" count={vehiculesGeles.length} tone="gele" />
              {renderList(vehiculesGeles)}
            </section>
          )}
          {vehiculesEnAttente.length > 0 && (
            <section>
              <SectionHead title="En attente" count={vehiculesEnAttente.length} tone="en_attente" />
              {renderList(vehiculesEnAttente)}
            </section>
          )}
        </div>
      )}

      <AddVehiculeDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={load}
        mode="client"
        nbVehiculesActifs={vehiculesActifs.length}
      />
    </div>
  );
}
