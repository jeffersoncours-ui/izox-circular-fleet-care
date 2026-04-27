import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building2 } from "lucide-react";
import { CreateClientDialog } from "@/components/admin/CreateClientDialog";

interface Entreprise {
  id: string;
  nom: string;
  ville: string | null;
  type_client: string;
  email_contact: string | null;
  compte_active: boolean;
  created_at: string;
}

export const Route = createFileRoute("/admin/clients")({
  component: ClientsPage,
});

function ClientsPage() {
  const [list, setList] = useState<Entreprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("entreprises")
      .select("id, nom, ville, type_client, email_contact, compte_active, created_at")
      .order("created_at", { ascending: false });
    setList((data as Entreprise[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = list.filter(
    (e) =>
      e.nom.toLowerCase().includes(search.toLowerCase()) ||
      (e.ville ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {list.length} entreprise{list.length > 1 ? "s" : ""} suivie{list.length > 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="izox" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Nouveau client
        </Button>
      </header>

      <Card className="p-4 mb-6 shadow-card border-border/60">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou ville..."
            className="pl-10"
          />
        </div>
      </Card>

      {loading ? (
        <p className="text-muted-foreground text-sm">Chargement...</p>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center shadow-card border-border/60">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {list.length === 0 ? "Aucun client pour le moment." : "Aucun résultat."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((e) => (
            <Link
              key={e.id}
              to="/admin/clients/$id"
              params={{ id: e.id }}
              className="block cursor-pointer"
            >
              <Card className="p-5 cursor-pointer transition-all duration-150 ease-out hover:bg-muted/40 hover:shadow-strong hover:border-primary/30 shadow-card border-border/60">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-12 w-12 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{e.nom}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {e.ville ?? "—"} · {e.email_contact ?? "Pas d'email"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="capitalize">
                      {e.type_client}
                    </Badge>
                    {!e.compte_active && (
                      <Badge variant="destructive">Désactivé</Badge>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateClientDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </div>
  );
}
