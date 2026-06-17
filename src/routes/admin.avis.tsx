import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Plus, Star, Trash2, Quote } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export const Route = createFileRoute("/admin/avis")({
  component: AdminAvisPage,
});

interface AvisRow {
  id: string;
  auteur_nom: string;
  auteur_role: string | null;
  texte: string;
  note: number | null;
  photo_url: string | null;
  source: string;
  publie: boolean;
  created_at: string;
}

function AdminAvisPage() {
  return (
    <RoleGuard allowed={["admin", "staff"]}>
      <AdminAvisInner />
    </RoleGuard>
  );
}

function AdminAvisInner() {
  const [rows, setRows] = useState<AvisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState<AvisRow | "new" | null>(null);
  const [deleteRow, setDeleteRow] = useState<AvisRow | null>(null);

  const loadData = useCallback(async () => {
    const { data, error } = await supabase
      .from("avis_clients")
      .select("id, auteur_nom, auteur_role, texte, note, photo_url, source, publie, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erreur chargement des avis");
    } else {
      setRows((data ?? []) as AvisRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleTogglePublie = async (row: AvisRow) => {
    const { error } = await supabase
      .from("avis_clients")
      .update({ publie: !row.publie })
      .eq("id", row.id);
    if (error) {
      toast.error("Impossible de mettre à jour la publication");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, publie: !r.publie } : r)));
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    const { error } = await supabase.from("avis_clients").delete().eq("id", deleteRow.id);
    if (error) {
      toast.error("Impossible de supprimer l'avis");
    } else {
      toast.success("Avis supprimé");
      setRows((prev) => prev.filter((r) => r.id !== deleteRow.id));
    }
    setDeleteRow(null);
  };

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        crumbs={["Admin", "Avis clients"]}
        title="Avis clients"
        sub="Avis affichés dans le carrousel de la landing — publication soumise à validation"
        right={
          <Button variant="izox" onClick={() => setEditRow("new")}>
            <Plus className="h-4 w-4 mr-1.5" />
            Ajouter un avis
          </Button>
        }
      />

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
              <Quote className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium text-foreground">Aucun avis</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ajoutez un premier avis client réel pour alimenter le carrousel de la landing.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 md:p-6 space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground text-sm">{row.auteur_nom}</p>
                  {row.auteur_role && (
                    <span className="text-xs text-muted-foreground">{row.auteur_role}</span>
                  )}
                  <Badge variant={row.publie ? "default" : "secondary"} className="text-[10px]">
                    {row.publie ? "Publié" : "Brouillon"}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground capitalize">{row.source}</span>
                </div>
                {row.note && (
                  <div className="flex gap-0.5 mt-1.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5"
                        style={{ fill: i < row.note! ? "currentColor" : "none" }}
                      />
                    ))}
                  </div>
                )}
                <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{row.texte}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Switch checked={row.publie} onCheckedChange={() => handleTogglePublie(row)} />
                  <span className="text-xs text-muted-foreground">Publier</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditRow(row)}>
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteRow(row)}
                  title="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editRow && (
        <AvisDialog
          row={editRow === "new" ? null : editRow}
          onClose={() => setEditRow(null)}
          onSaved={() => {
            setEditRow(null);
            loadData();
          }}
        />
      )}

      {deleteRow && (
        <AlertDialog open onOpenChange={(open) => !open && setDeleteRow(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cet avis ?</AlertDialogTitle>
              <AlertDialogDescription>
                L'avis de <strong>{deleteRow.auteur_nom}</strong> sera définitivement supprimé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// ─── Dialog : créer / modifier un avis ───────────────────────────────────────

function AvisDialog({
  row,
  onClose,
  onSaved,
}: {
  row: AvisRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [auteurNom, setAuteurNom] = useState(row?.auteur_nom ?? "");
  const [auteurRole, setAuteurRole] = useState(row?.auteur_role ?? "");
  const [texte, setTexte] = useState(row?.texte ?? "");
  const [note, setNote] = useState(row?.note ? String(row.note) : "5");
  const [publie, setPublie] = useState(row?.publie ?? false);
  const [saving, setSaving] = useState(false);

  const isValid = auteurNom.trim().length > 0 && texte.trim().length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    const payload = {
      auteur_nom: auteurNom.trim(),
      auteur_role: auteurRole.trim() || null,
      texte: texte.trim(),
      note: Number(note),
      publie,
    };
    const { error } = row
      ? await supabase.from("avis_clients").update(payload).eq("id", row.id)
      : await supabase.from("avis_clients").insert(payload);
    if (error) {
      toast.error("Impossible d'enregistrer l'avis");
    } else {
      toast.success(row ? "Avis mis à jour" : "Avis ajouté");
      onSaved();
    }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{row ? "Modifier l'avis" : "Ajouter un avis"}</DialogTitle>
          <DialogDescription>
            Avis client réel uniquement (aucun avis fictif — L121-2 du Code de la consommation).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="auteur-nom">Nom du client</Label>
            <Input id="auteur-nom" value={auteurNom} onChange={(e) => setAuteurNom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auteur-role">Précision (optionnel)</Label>
            <Input
              id="auteur-role"
              placeholder="ex. Client particulier, Gérant flotte…"
              value={auteurRole}
              onChange={(e) => setAuteurRole(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="texte">Témoignage</Label>
            <Textarea id="texte" rows={4} value={texte} onChange={(e) => setTexte(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Select value={note} onValueChange={setNote}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 4, 3, 2, 1].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} étoile{n > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Switch checked={publie} onCheckedChange={setPublie} />
            <span className="text-sm text-foreground">Publier immédiatement sur la landing</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button variant="izox" onClick={handleSave} disabled={!isValid || saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
