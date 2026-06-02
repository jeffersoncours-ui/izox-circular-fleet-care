import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, ChevronRight, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { statutColor, statutLabel, type Statut, type TypePrestation } from "@/lib/interventions";

interface Item {
  id: string;
  statut: Statut;
  type_prestation: TypePrestation;
  date_intervention: string | null;
  created_at: string;
  vehicules: { immatriculation: string; marque: string | null; modele: string | null } | null;
  entreprises: { nom: string } | null;
}

export function InterventionsListPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"tous" | Statut>("tous");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("interventions")
      .select(
        "id, statut, type_prestation, date_intervention, created_at, vehicules(immatriculation, marque, modele), entreprises(nom)"
      )
      .order("created_at", { ascending: false });
    setItems((data as unknown as Item[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = items
    .filter((i) => filter === "tous" || i.statut === filter)
    .filter((i) => {
      if (!search.trim()) return true;
      const t = search.toLowerCase();
      return (
        i.vehicules?.immatriculation?.toLowerCase().includes(t) ||
        i.entreprises?.nom?.toLowerCase().includes(t) ||
        i.vehicules?.marque?.toLowerCase().includes(t) ||
        i.vehicules?.modele?.toLowerCase().includes(t)
      );
    });

  const aValider = items.filter((i) => i.statut === "en_revision").length;

  return (
    <div>
      {aValider > 0 && (
        <div className="mb-4">
          <Badge className="bg-red-500 text-white border-0 animate-pulse">
            {aValider} fiche{aValider > 1 ? "s" : ""} à valider
          </Badge>
        </div>
      )}

      <Card className="p-4 shadow-card mb-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (immat, client, marque...)"
            className="pl-9 h-10"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-full md:w-56 h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            <SelectItem value="en_revision">À valider</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="validee">Validées</SelectItem>
            <SelectItem value="refusee">Refusées</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center shadow-card border-border/60">
          <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aucune fiche trouvée.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => navigate({ to: "/admin/interventions/$id", params: { id: i.id } })}
              className="w-full text-left p-4 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-semibold text-foreground">
                    {i.vehicules?.immatriculation || "—"}
                  </p>
                  <Badge className={statutColor(i.statut)} variant="outline">
                    {statutLabel(i.statut)}
                  </Badge>
                  <Badge variant="secondary" className="capitalize">
                    {i.type_prestation}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {i.entreprises?.nom || "—"} ·{" "}
                  {[i.vehicules?.marque, i.vehicules?.modele].filter(Boolean).join(" ") || "—"} ·{" "}
                  {i.date_intervention || new Date(i.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
