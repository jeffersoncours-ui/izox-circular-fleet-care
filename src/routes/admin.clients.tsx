import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building2, Eye, ChevronRight, Download } from "lucide-react";
import { downloadCSV } from "@/lib/csv";
import { CreateClientDialog } from "@/components/admin/CreateClientDialog";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

interface Entreprise {
  id: string;
  nom: string;
  ville: string | null;
  type_client: string;
  email_contact: string | null;
  compte_active: boolean;
  created_at: string;
  montant_net_mensuel: number | null;
}

const TYPE_LABEL: Record<string, string> = {
  vtc: "VTC",
  location: "Location",
  pme: "PME",
};

const TYPE_TONE: Record<string, string> = {
  vtc: "bg-[#E7EFEA] text-[#1B4332] border-[#CBDDD2]",
  location: "bg-[#D5E2F6] text-[#2A6FDB] border-[#B3C8EF]",
  pme: "bg-muted text-muted-foreground border-border",
};

export const Route = createFileRoute("/admin/clients")({
  component: ClientsPage,
});

function ClientsPage() {
  const location = useLocation();
  const [list, setList] = useState<Entreprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [activeRes, resumeRes] = await Promise.all([
      supabase
        .from("v_entreprises_actives")
        .select("id, nom, ville, type_client, email_contact, compte_active, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("v_entreprises_vehicules_resume")
        .select("entreprise_id, montant_net_mensuel"),
    ]);
    const mensualiteMap = new Map(
      ((resumeRes.data ?? []) as Array<{ entreprise_id: string; montant_net_mensuel: string | null }>).map(
        (r) => [r.entreprise_id, r.montant_net_mensuel ? parseFloat(r.montant_net_mensuel) : null]
      )
    );
    const enriched = ((activeRes.data ?? []) as Entreprise[]).map((e) => ({
      ...e,
      montant_net_mensuel: mensualiteMap.get(e.id) ?? null,
    }));
    setList(enriched);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (location.pathname !== "/admin/clients") {
    return <Outlet />;
  }

  const filtered = list.filter((e) => {
    const matchSearch =
      e.nom.toLowerCase().includes(search.toLowerCase()) ||
      (e.ville ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || e.type_client === filter;
    return matchSearch && matchFilter;
  });

  const handleExportCSV = () => {
    const rows = filtered.map((e) => ({
      "Entreprise": e.nom,
      "Type": TYPE_LABEL[e.type_client] ?? e.type_client,
      "Ville": e.ville ?? "",
      "Email": e.email_contact ?? "",
      "MRR (€ HT)": e.montant_net_mensuel ?? "",
      "Compte actif": e.compte_active ? "Oui" : "Non",
      "Créé le": new Date(e.created_at).toLocaleDateString("fr-FR"),
    }));
    const now = new Date().toISOString().slice(0, 10);
    downloadCSV(rows, `clients-izox-${now}.csv`);
  };

  const counts = {
    all: list.length,
    vtc: list.filter((e) => e.type_client === "vtc").length,
    location: list.filter((e) => e.type_client === "location").length,
    pme: list.filter((e) => e.type_client === "pme").length,
  };

  const filters: { key: string; label: string }[] = [
    { key: "all", label: `Tous · ${counts.all}` },
    { key: "vtc", label: `VTC · ${counts.vtc}` },
    { key: "location", label: `Location · ${counts.location}` },
    { key: "pme", label: `PME · ${counts.pme}` },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        crumbs={["Admin", "Clients"]}
        title="Clients"
        sub={`${list.length} entreprise${list.length > 1 ? "s" : ""} suivie${list.length > 1 ? "s" : ""}`}
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Nouveau client
            </Button>
          </div>
        }
      />

      <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-5">
        {/* Search + filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, email, ville…"
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none flex-nowrap">
            {filters.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0",
                  filter === key
                    ? "bg-primary text-white border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table + Cards */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {list.length === 0 ? "Aucun client pour le moment." : "Aucun résultat."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile cards (< lg) */}
            <div className="lg:hidden flex flex-col gap-2">
              {filtered.map((e) => (
                <Link
                  key={e.id}
                  to="/admin/clients/$id"
                  params={{ id: e.id }}
                  className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:bg-muted/20 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground truncate">{e.nom}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold border",
                          TYPE_TONE[e.type_client] ?? TYPE_TONE.pme
                        )}
                      >
                        {TYPE_LABEL[e.type_client] ?? e.type_client}
                      </span>
                      <span className="text-[12px] font-semibold text-primary tabular-nums">
                        {e.montant_net_mensuel != null
                          ? `${formatCurrency(e.montant_net_mensuel)} HT/mois`
                          : "—"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                </Link>
              ))}
            </div>

            {/* Desktop table (>= lg) */}
            <div className="hidden lg:block bg-card border border-border rounded-lg overflow-hidden shadow-card">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {["Entreprise", "Type", "Ville", "Email", "Statut", ""].map((h, i) => (
                      <th
                        key={h || i}
                        className={cn(
                          "px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground",
                          i === 5 ? "text-right" : "text-left"
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, i) => (
                    <tr
                      key={e.id}
                      className={cn(
                        "border-t border-border/60 hover:bg-muted/30 transition-colors",
                        i === 0 && "border-t-0"
                      )}
                    >
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-foreground">{e.nom}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-semibold border",
                            TYPE_TONE[e.type_client] ?? TYPE_TONE.pme
                          )}
                        >
                          {TYPE_LABEL[e.type_client] ?? e.type_client}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">{e.ville ?? "—"}</td>
                      <td className="px-4 py-3.5 font-mono text-[12px] text-muted-foreground">
                        {e.email_contact ?? "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        {e.compte_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#DCEEE4] text-[#1F8A5B] border border-[#1F8A5B]/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1F8A5B]" />
                            actif
                          </span>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] h-5">
                            désactivé
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link to="/admin/clients/$id" params={{ id: e.id }}>
                          <button className="inline-flex items-center justify-center h-7 w-7 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <CreateClientDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </div>
  );
}
