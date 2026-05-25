import { useEffect, useState, useCallback, useMemo } from "react";
import { CalendarPlus, ClipboardList, Loader2, X, CalendarCheck, Snowflake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LigneDemandeRdv,
  type DemandeRdv,
} from "@/components/client/LigneDemandeRdv";
import {
  LignePrestation,
  type PrestationItem,
} from "@/components/client/LignePrestation";
import { CreerDemandeRdvDialog } from "@/components/client/CreerDemandeRdvDialog";
import { AnnulerDemandeDialog } from "@/components/client/AnnulerDemandeDialog";
import { DetailDemandeRdvDialog } from "@/components/client/DetailDemandeRdvDialog";
import { Badge } from "@/components/ui/badge";

interface DemandeGelClient {
  id: string;
  type_demande: "vehicules" | "contrat" | string;
  motif: string | null;
  date_debut: string | null;
  date_fin_prevue: string | null;
  statut: "en_attente" | "validee" | string;
  vehicule_ids: string[] | null;
  created_at: string;
}

interface VehiculeLite {
  id: string;
  immatriculation: string;
}

function formatDateFR(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function MesPrestationsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [demandes, setDemandes] = useState<DemandeRdv[]>([]);
  const [interventions, setInterventions] = useState<PrestationItem[]>([]);
  const [demandesGel, setDemandesGel] = useState<DemandeGelClient[]>([]);
  const [vehiculesMap, setVehiculesMap] = useState<Record<string, string>>({});
  const [showCreer, setShowCreer] = useState(false);
  const [annulation, setAnnulation] = useState<{
    open: boolean;
    type: "gel" | "rdv";
    id: string;
  }>({ open: false, type: "rdv", id: "" });
  const [detailRdvId, setDetailRdvId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = (id: string) => {
    setDetailRdvId(id);
    setDetailOpen(true);
  };


  const load = useCallback(async () => {
    if (!profile?.entreprise_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [dRes, iRes, gRes, vRes] = await Promise.all([
      supabase
        .from("demandes_rdv")
        .select("*")
        .eq("entreprise_id", profile.entreprise_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("interventions")
        .select(
          "id, statut, type_prestation, date_intervention, demande_rdv_id, vehicules(immatriculation, marque, modele)",
        )
        .eq("entreprise_id", profile.entreprise_id)
        .order("date_intervention", { ascending: false }),
      supabase
        .from("demandes_gel")
        .select(
          "id, type_demande, motif, date_debut, date_fin_prevue, statut, vehicule_ids, created_at",
        )
        .eq("entreprise_id", profile.entreprise_id)
        .in("statut", ["en_attente", "validee"])
        .order("created_at", { ascending: false }),
      supabase
        .from("vehicules")
        .select("id, immatriculation")
        .eq("entreprise_id", profile.entreprise_id),
    ]);
    setDemandes((dRes.data ?? []) as unknown as DemandeRdv[]);
    setInterventions((iRes.data ?? []) as unknown as PrestationItem[]);
    setDemandesGel((gRes.data ?? []) as unknown as DemandeGelClient[]);
    const map: Record<string, string> = {};
    for (const v of (vRes.data ?? []) as VehiculeLite[]) {
      map[v.id] = v.immatriculation;
    }
    setVehiculesMap(map);
    setLoading(false);
  }, [profile?.entreprise_id]);

  useEffect(() => {
    load();
  }, [load]);

  const demandesEnAttente = demandes.filter((d) => d.statut === "en_attente");
  const demandesConfirmees = demandes.filter((d) => d.statut === "confirmee");
  const demandesGriseesHisto = demandes.filter(
    (d) => d.statut === "refusee" || d.statut === "annulee_client",
  );
  const interventionsPlanifiees = interventions
    .filter((i) => i.statut === "planifiee")
    .sort((a, b) => (a.date_intervention ?? "").localeCompare(b.date_intervention ?? ""));
  const interventionsValidees = interventions.filter((i) => i.statut === "validee");

  const interventionParDemande = useMemo(() => {
    const map = new Map<string, PrestationItem>();
    for (const intervention of interventions) {
      if (intervention.demande_rdv_id) {
        map.set(intervention.demande_rdv_id, intervention);
      }
    }
    return map;
  }, [interventions]);

  const nbAVenir =
    demandesEnAttente.length +
    demandesConfirmees.length +
    interventionsPlanifiees.length;
  const nbHisto = interventionsValidees.length + demandesGriseesHisto.length;

  if (loading) {
    return (
      <div className="px-4 py-10 max-w-3xl mx-auto flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto pb-24">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mes prestations</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {nbAVenir} à venir · {nbHisto} dans l'historique
          </p>
        </div>
      </div>

      <Tabs defaultValue="a-venir">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="a-venir">À venir ({nbAVenir})</TabsTrigger>
          <TabsTrigger value="historique">Historique ({nbHisto})</TabsTrigger>
        </TabsList>

        <TabsContent value="a-venir" className="space-y-5">
          <Button onClick={() => setShowCreer(true)} className="w-full" variant="izox">
            <CalendarPlus className="h-4 w-4" /> Demander un RDV
          </Button>

          {nbAVenir === 0 ? (
            <EmptyState text="Aucune prestation à venir." />
          ) : (
            <>
              {demandesEnAttente.length > 0 && (
                <Section title="Demandes en attente">
                  {demandesEnAttente.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => openDetail(d.id)}
                      className="block w-full text-left rounded-lg transition-colors hover:bg-muted/30"
                    >
                      <LigneDemandeRdv demande={d} />
                    </button>
                  ))}
                </Section>
              )}
              {demandesConfirmees.length > 0 && (
                <Section title="RDV confirmés">
                  {demandesConfirmees.map((d) => {
                    const interventionLiee = interventionParDemande.get(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => openDetail(d.id)}
                        className="block w-full text-left rounded-lg transition-colors hover:bg-muted/30 space-y-1"
                      >
                        <LigneDemandeRdv demande={d} />
                        {interventionLiee?.date_intervention && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                            <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                            <span>
                              Intervention planifiée le{" "}
                              <strong className="text-foreground">
                                {new Date(
                                  interventionLiee.date_intervention,
                                ).toLocaleDateString("fr-FR", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                })}
                              </strong>
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </Section>
              )}
              {interventionsPlanifiees.length > 0 && (
                <Section title="Interventions planifiées">
                  {interventionsPlanifiees.map((i) => (
                    <LignePrestation key={i.id} item={i} variant="planifiee" />
                  ))}
                </Section>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="historique" className="space-y-5">
          {nbHisto === 0 ? (
            <EmptyState text="Aucune prestation dans l'historique." />
          ) : (
            <>
              {interventionsValidees.length > 0 && (
                <Section title="Interventions terminées">
                  {interventionsValidees.map((i) => (
                    <LignePrestation key={i.id} item={i} variant="validee" />
                  ))}
                </Section>
              )}
              {demandesGriseesHisto.length > 0 && (
                <Section title="Demandes refusées / annulées">
                  {demandesGriseesHisto.map((d) => (
                    <LigneDemandeRdv key={d.id} demande={d} grise />
                  ))}
                </Section>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <CreerDemandeRdvDialog
        open={showCreer}
        onOpenChange={setShowCreer}
        onSubmitted={load}
      />

      <AnnulerDemandeDialog
        open={annulation.open}
        onOpenChange={(o) => setAnnulation((s) => ({ ...s, open: o }))}
        demandeType={annulation.type}
        demandeId={annulation.id}
        onSuccess={load}
      />

      <DetailDemandeRdvDialog
        demandeId={detailRdvId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSuccess={load}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="p-10 text-center shadow-card border-border/60">
      <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
      <p className="text-muted-foreground text-sm">{text}</p>
    </Card>
  );
}
