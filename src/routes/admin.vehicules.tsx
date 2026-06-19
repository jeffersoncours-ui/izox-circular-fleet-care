import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Car, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/format";
import {
  CartClientPliable,
  type ClientResume,
} from "@/components/admin/CartClientPliable";
import {
  LigneVehiculeAdmin,
  type VehiculeAdminRow,
} from "@/components/admin/LigneVehiculeAdmin";
import { AddVehiculeDialog } from "@/components/client/AddVehiculeDialog";

export const Route = createFileRoute("/admin/vehicules")({
  component: AdminVehiculesPage,
});

function AdminVehiculesPage() {
  const location = useLocation();
  if (location.pathname !== "/admin/vehicules") return <Outlet />;
  return <AdminVehiculesList />;
}

type StatutFilter = "tous" | "actifs" | "en_attente";
type CommercialFilter = "tous" | "mes_clients";
type TriOpt = "alphabetique" | "plus_vehicules" | "mrr_decroissant";

interface VehiculeWithContrat extends VehiculeAdminRow {
  contrats: { commercial_signataire_id: string | null } | null;
}

function AdminVehiculesList() {
  const { user, profile } = useAuth();
  const role = profile?.role;
  const isCommercial = role === "commercial";
  const isAdminStaff = role === "admin" || role === "staff";

  const [clients, setClients] = useState<ClientResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<StatutFilter>("tous");
  const [commercialFilter, setCommercialFilter] = useState<CommercialFilter>("tous");
  const [tri, setTri] = useState<TriOpt>("alphabetique");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [vehiculesMap, setVehiculesMap] = useState<
    Record<string, { loading: boolean; data: VehiculeWithContrat[] }>
  >({});
  const [addDialogFor, setAddDialogFor] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("v_entreprises_vehicules_resume").select("*");
    if (statutFilter === "actifs") q = q.gt("nb_vehicules_actifs", 0);
    else if (statutFilter === "en_attente") q = q.gt("nb_vehicules_en_attente", 0);

    switch (tri) {
      case "alphabetique":
        q = q.order("nom", { ascending: true });
        break;
      case "plus_vehicules":
        q = q.order("nb_vehicules_total", { ascending: false });
        break;
      case "mrr_decroissant":
        q = q.order("montant_net_mensuel", { ascending: false, nullsFirst: false });
        break;
    }
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setClients((data as unknown as ClientResume[]) ?? []);
    setLoading(false);
  }, [statutFilter, tri]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const loadVehicules = useCallback(async (entrepriseId: string) => {
    setVehiculesMap((m) => ({
      ...m,
      [entrepriseId]: { loading: true, data: m[entrepriseId]?.data ?? [] },
    }));
    const { data, error } = await supabase
      .from("vehicules")
      .select(
        "id, immatriculation, marque, modele, type_vehicule, type_pack_souhaite, statut, photo_path, created_by, contrats ( commercial_signataire_id )",
      )
      .eq("entreprise_id", entrepriseId)
      .order("created_at", { ascending: false })
      .limit(11);
    if (error) toast.error(error.message);
    setVehiculesMap((m) => ({
      ...m,
      [entrepriseId]: {
        loading: false,
        data: (data as unknown as VehiculeWithContrat[]) ?? [],
      },
    }));
  }, []);

  const onToggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (!vehiculesMap[id]) loadVehicules(id);
      }
      return next;
    });
  };

  const reloadEntreprise = (id: string) => {
    loadVehicules(id);
    loadClients();
  };

  const clientsFiltres = useMemo(() => {
    let list = clients;
    if (isCommercial && commercialFilter === "mes_clients" && user) {
      list = list.filter((c) => c.commercial_id === user.id);
    }
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((c) => c.nom.toLowerCase().includes(s));
    }
    return list;
  }, [clients, isCommercial, commercialFilter, user, search]);

  const totalClients = clientsFiltres.length;
  const totalVehicules = clientsFiltres.reduce((s, c) => s + c.nb_vehicules_total, 0);
  const totalMRR = clientsFiltres.reduce((s, c) => s + (c.montant_net_mensuel ?? 0), 0);

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        crumbs={["Admin", "Véhicules"]}
        title="Véhicules"
        sub={`${totalVehicules} véhicule${totalVehicules > 1 ? "s" : ""} suivi${totalVehicules > 1 ? "s" : ""} chez ${totalClients} client${totalClients > 1 ? "s" : ""}${isAdminStaff && totalMRR > 0 ? ` · MRR : ${formatCurrency(totalMRR)} HT/mois` : ""}`}
      />

      <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-5">

      <Card className="p-4 shadow-card border-border/60">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom de client..."
              className="pl-10"
            />
          </div>
          <Select value={statutFilter} onValueChange={(v) => setStatutFilter(v as StatutFilter)}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les véhicules</SelectItem>
              <SelectItem value="actifs">Actifs</SelectItem>
              <SelectItem value="en_attente">En attente de validation</SelectItem>
            </SelectContent>
          </Select>
          {isCommercial && (
            <Select
              value={commercialFilter}
              onValueChange={(v) => setCommercialFilter(v as CommercialFilter)}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les clients</SelectItem>
                <SelectItem value="mes_clients">Mes clients</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select value={tri} onValueChange={(v) => setTri(v as TriOpt)}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabetique">Tri alphabétique</SelectItem>
              <SelectItem value="plus_vehicules">Plus de véhicules</SelectItem>
              <SelectItem value="mrr_decroissant">MRR décroissant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement...
        </div>
      ) : clientsFiltres.length === 0 ? (
        <Card className="p-12 text-center shadow-card border-border/60">
          <Car className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {clients.length === 0
              ? "Aucune flotte enregistrée pour le moment"
              : "Aucun résultat"}
          </h3>
          {clients.length === 0 && (
            <>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Commencez par assigner des véhicules à vos clients actifs.
              </p>
              <Button asChild>
                <Link to="/admin/clients">Aller aux clients</Link>
              </Button>
            </>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {clientsFiltres.map((c) => {
            const isOpen = openIds.has(c.entreprise_id);
            const bucket = vehiculesMap[c.entreprise_id];
            return (
              <CartClientPliable
                key={c.entreprise_id}
                client={c}
                isOpen={isOpen}
                onToggle={() => onToggle(c.entreprise_id)}
                onAddVehicule={() => setAddDialogFor(c.entreprise_id)}
              >
                {bucket?.loading ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Chargement des véhicules...
                  </div>
                ) : bucket && bucket.data.length === 0 ? (
                  <div className="py-4 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      Aucun véhicule pour ce client
                    </p>
                    <Button size="sm" onClick={() => setAddDialogFor(c.entreprise_id)}>
                      + Ajouter un premier véhicule
                    </Button>
                  </div>
                ) : (
                  <>
                    {bucket?.data.slice(0, 10).map((v) => (
                      <LigneVehiculeAdmin
                        key={v.id}
                        vehicule={v}
                        commercialSignataireId={
                          v.contrats?.commercial_signataire_id ?? c.commercial_id
                        }
                        onChanged={() => reloadEntreprise(c.entreprise_id)}
                      />
                    ))}
                    {c.nb_vehicules_total > 10 && (
                      <div className="pt-2 text-center">
                        <Link
                          to="/admin/clients/$id"
                          params={{ id: c.entreprise_id }}
                          className="text-sm text-primary hover:underline"
                        >
                          Voir les {c.nb_vehicules_total - 10} véhicules restants sur la fiche
                          client →
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </CartClientPliable>
            );
          })}
        </div>
      )}

      <AddVehiculeDialog
        open={!!addDialogFor}
        onOpenChange={(o) => {
          if (!o) setAddDialogFor(null);
        }}
        entrepriseId={addDialogFor ?? undefined}
        onCreated={() => {
          if (addDialogFor) reloadEntreprise(addDialogFor);
          setAddDialogFor(null);
        }}
      />
      </div>
    </div>
  );
}
