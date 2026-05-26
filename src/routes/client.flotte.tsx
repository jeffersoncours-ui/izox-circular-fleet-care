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

  const vehiculesActifs = list.filter((v) => v.statut === "actif");
  const vehiculesGeles = list.filter((v) => v.statut === "gele");
  const vehiculesEnAttente = list.filter((v) => v.statut === "en_attente_validation");
  const useAccordion = list.length > 5;

  const renderVehicule = (v: Vehicule, tone?: "gele" | "en_attente") => (
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
      className="flex items-center gap-3 p-3 rounded-md border border-border/60 bg-card hover:bg-muted/30 transition-colors cursor-pointer"
    >
      <Car
        className={
          tone === "gele"
            ? "h-5 w-5 text-blue-700 shrink-0"
            : tone === "en_attente"
            ? "h-5 w-5 text-orange-700 shrink-0"
            : "h-5 w-5 text-muted-foreground shrink-0"
        }
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm font-mono truncate">{v.immatriculation}</p>
        <p className="text-xs text-muted-foreground truncate">
          {v.type_pack_souhaite ? getPackLabel(v.type_pack_souhaite) : "Pack non défini"}
          {tone === "gele" && " · gelé"}
          {tone === "en_attente" && " · en attente"}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );

  const renderSection = (items: Vehicule[], tone?: "gele" | "en_attente") => (
    <div className="grid sm:grid-cols-2 gap-2">
      {items.map((v) => renderVehicule(v, tone))}
    </div>
  );

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <PassagesReportesBanner />
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ma flotte</h1>
          <p className="text-sm text-muted-foreground">
            {vehiculesActifs.length} véhicule{vehiculesActifs.length > 1 ? "s" : ""} actif
            {vehiculesActifs.length > 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="izox" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : list.length === 0 ? (
        <Card className="p-10 text-center shadow-card border-border/60">
          <Car className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">Aucun véhicule pour le moment.</p>
          <Button variant="izox" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Ajouter mon premier véhicule
          </Button>
        </Card>
      ) : useAccordion ? (
        <Accordion type="multiple" defaultValue={["actifs"]}>
          <AccordionItem value="actifs">
            <AccordionTrigger>Véhicules actifs ({vehiculesActifs.length})</AccordionTrigger>
            <AccordionContent>{renderSection(vehiculesActifs)}</AccordionContent>
          </AccordionItem>
          {vehiculesGeles.length > 0 && (
            <AccordionItem value="geles">
              <AccordionTrigger className="text-blue-700">
                <span className="flex items-center gap-2">
                  <Snowflake className="h-4 w-4" />
                  Véhicules gelés ({vehiculesGeles.length})
                </span>
              </AccordionTrigger>
              <AccordionContent className="opacity-75">
                {renderSection(vehiculesGeles, "gele")}
              </AccordionContent>
            </AccordionItem>
          )}
          {vehiculesEnAttente.length > 0 && (
            <AccordionItem value="en_attente">
              <AccordionTrigger className="text-orange-700">
                En attente ({vehiculesEnAttente.length})
              </AccordionTrigger>
              <AccordionContent>{renderSection(vehiculesEnAttente, "en_attente")}</AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      ) : (
        <div className="space-y-5">
          {vehiculesActifs.length > 0 && (
            <section>
              <h3 className="text-sm font-medium mb-2">
                Véhicules actifs ({vehiculesActifs.length})
              </h3>
              {renderSection(vehiculesActifs)}
            </section>
          )}
          {vehiculesGeles.length > 0 && (
            <section className="opacity-75">
              <h3 className="text-sm font-medium mb-2 text-blue-700 flex items-center gap-2">
                <Snowflake className="h-4 w-4" />
                Véhicules gelés ({vehiculesGeles.length})
              </h3>
              {renderSection(vehiculesGeles, "gele")}
            </section>
          )}
          {vehiculesEnAttente.length > 0 && (
            <section>
              <h3 className="text-sm font-medium mb-2 text-orange-700">
                En attente ({vehiculesEnAttente.length})
              </h3>
              {renderSection(vehiculesEnAttente, "en_attente")}
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
