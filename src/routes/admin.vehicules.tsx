import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Car, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AddVehiculeDialog } from "@/components/client/AddVehiculeDialog";
import { getVehiculeLabel } from "@/components/client/VehiculeIcons";
import { VehiculeThumbnail } from "@/components/client/VehiculeThumbnail";

export const Route = createFileRoute("/admin/vehicules")({
  component: AdminVehiculesPage,
});

interface VehiculeRow {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  type_vehicule: string | null;
  annee: number | null;
  couleur: string | null;
  kilometrage: number | null;
  notes: string | null;
  statut: string;
  photo_path: string | null;
  entreprise_id: string;
  entreprises: { id: string; nom: string } | null;
}

function AdminVehiculesPage() {
  const location = useLocation();
  if (location.pathname !== "/admin/vehicules") {
    return <Outlet />;
  }
  return <AdminVehiculesList />;
}

function AdminVehiculesList() {
  const [list, setList] = useState<VehiculeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<VehiculeRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VehiculeRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vehicules")
      .select(
        "id, immatriculation, marque, modele, type_vehicule, annee, couleur, kilometrage, notes, statut, photo_path, entreprise_id, entreprises!inner ( id, nom, archived_at )"
      )
      .not("contrat_id", "is", null)
      .is("entreprises.archived_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    }
    setList((data as unknown as VehiculeRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = list.filter((v) => {
    const q = search.toLowerCase();
    return (
      v.immatriculation.toLowerCase().includes(q) ||
      (v.marque ?? "").toLowerCase().includes(q) ||
      (v.modele ?? "").toLowerCase().includes(q) ||
      (v.entreprises?.nom ?? "").toLowerCase().includes(q)
    );
  });

  const onEdit = (v: VehiculeRow) => {
    setEditing(v);
    setEditOpen(true);
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("vehicules").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Véhicule supprimé");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Véhicules</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {list.length} véhicule{list.length > 1 ? "s" : ""} suivi{list.length > 1 ? "s" : ""}
        </p>
      </header>

      <Card className="p-4 mb-6 shadow-card border-border/60">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par immatriculation, marque, modèle ou client..."
            className="pl-10"
          />
        </div>
      </Card>

      {loading ? (
        <p className="text-muted-foreground text-sm">Chargement...</p>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center shadow-card border-border/60">
          <Car className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {list.length === 0 ? "Aucun véhicule pour le moment." : "Aucun résultat."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((v) => {
            const typeLabel = getVehiculeLabel(v.type_vehicule);
            const title =
              v.marque || v.modele
                ? `${v.marque ?? ""} ${v.modele ?? ""}`.trim()
                : "Véhicule";
            return (
              <Link
                key={v.id}
                to="/admin/vehicules/$id"
                params={{ id: v.id }}
                className="block"
              >
                <Card className="p-5 cursor-pointer transition-all duration-150 ease-out hover:bg-muted/40 hover:shadow-strong hover:border-primary/30 shadow-card border-border/60">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <VehiculeThumbnail photoPath={v.photo_path} alt={title} />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{title}</h3>
                        <p className="font-mono text-xs text-primary mt-0.5">{v.immatriculation}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {v.entreprises?.nom ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="hidden sm:inline-flex">
                        {typeLabel}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEdit(v);
                        }}
                        aria-label="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteTarget(v);
                        }}
                        aria-label="Supprimer"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <AddVehiculeDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditing(null);
        }}
        vehicule={editing}
        entrepriseId={editing?.entreprise_id}
        onCreated={load}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce véhicule ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le véhicule {deleteTarget?.immatriculation} sera
              définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
