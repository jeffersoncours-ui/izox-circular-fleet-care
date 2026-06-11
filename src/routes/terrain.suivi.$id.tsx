import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Car, CalendarDays, ChevronUp,
  Loader2, NotebookPen, Plus, Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

import { RoleGuard } from "@/components/RoleGuard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/terrain/suivi/$id")({
  component: TerrainClientPage,
});

function TerrainClientPage() {
  return (
    <RoleGuard allowed={["operateur", "admin"]}>
      <Inner />
    </RoleGuard>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface VehiculeOption {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
}

interface NoteRow {
  id: string;
  date_observation: string;
  note: string;
  vehicule_id: string | null;
  vehicules: { immatriculation: string } | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateFr(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const s = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Inner ────────────────────────────────────────────────────────────────────

function Inner() {
  const { id: entrepriseId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [entrepriseNom, setEntrepriseNom] = useState<string>("");
  const [vehicules, setVehicules] = useState<VehiculeOption[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire ajout note
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(todayIso());
  const [formVehiculeId, setFormVehiculeId] = useState<string>("");
  const [formNote, setFormNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Chargement initial
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      // Nom entreprise
      const { data: entData } = await supabase
        .from("entreprises")
        .select("nom")
        .eq("id", entrepriseId)
        .single();
      if (!alive) return;
      setEntrepriseNom((entData as any)?.nom ?? "Client");

      // Véhicules du client (via interventions réalisées par cet opérateur)
      const { data: vData } = await supabase
        .from("interventions")
        .select("vehicules(id, immatriculation, marque, modele)")
        .eq("entreprise_id", entrepriseId)
        .not("statut", "in", '("annulee","planifiee")')
        .limit(100);
      if (!alive) return;
      const vMap = new Map<string, VehiculeOption>();
      for (const row of (vData ?? []) as any[]) {
        const v = row.vehicules;
        if (v?.id && !vMap.has(v.id)) vMap.set(v.id, v);
      }
      setVehicules(Array.from(vMap.values()).sort((a, b) =>
        a.immatriculation.localeCompare(b.immatriculation)
      ));

      // Notes existantes
      const { data: nData, error: nErr } = await supabase
        .from("operateur_notes")
        .select("id, date_observation, note, vehicule_id, vehicules(immatriculation), created_at")
        .eq("entreprise_id", entrepriseId)
        .eq("operateur_id", user.id)
        .order("date_observation", { ascending: false })
        .order("created_at", { ascending: false });
      if (nErr) toast.error("Erreur chargement des notes");
      if (alive) {
        setNotes((nData as unknown as NoteRow[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [entrepriseId, user?.id]);

  const handleAddNote = async () => {
    if (!formNote.trim() || !user?.id) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("operateur_notes")
        .insert({
          entreprise_id: entrepriseId,
          vehicule_id: formVehiculeId || null,
          operateur_id: user.id,
          date_observation: formDate,
          note: formNote.trim(),
        })
        .select("id, date_observation, note, vehicule_id, vehicules(immatriculation), created_at")
        .single();
      if (error) throw error;
      setNotes((prev) => [data as unknown as NoteRow, ...prev].sort((a, b) =>
        b.date_observation.localeCompare(a.date_observation) ||
        b.created_at.localeCompare(a.created_at)
      ));
      setFormNote("");
      setFormDate(todayIso());
      setFormVehiculeId("");
      setShowForm(false);
      toast.success("Note ajoutée");
    } catch {
      toast.error("Impossible d'ajouter la note");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const { error } = await supabase
      .from("operateur_notes")
      .delete()
      .eq("id", noteId);
    if (error) { toast.error("Impossible de supprimer la note"); return; }
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    toast.success("Note supprimée");
  };

  // Groupement par date pour l'affichage
  const grouped = useMemo(() => {
    const map = new Map<string, NoteRow[]>();
    for (const n of notes) {
      if (!map.has(n.date_observation)) map.set(n.date_observation, []);
      map.get(n.date_observation)!.push(n);
    }
    return Array.from(map.entries());
  }, [notes]);

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">
      {/* Header */}
      <div className="bg-foreground text-white px-4 pt-12 pb-5">
        <button
          type="button"
          onClick={() => navigate({ to: "/terrain" })}
          className="flex items-center gap-1.5 text-white/60 text-sm mb-4 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Suivi
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-primary uppercase mb-0.5">
              Journal client
            </p>
            <h1 className="text-2xl font-black text-white leading-tight">{entrepriseNom}</h1>
            <p className="text-sm text-white/50 mt-0.5">
              {notes.length} note{notes.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="shrink-0 h-10 w-10 rounded-xl bg-primary flex items-center justify-center"
          >
            {showForm ? <ChevronUp className="h-5 w-5 text-primary-foreground" /> : <Plus className="h-5 w-5 text-primary-foreground" />}
          </button>
        </div>
      </div>

      {/* Formulaire ajout note */}
      {showForm && (
        <div className="px-4 pt-4 pb-2 border-b border-border space-y-3 bg-muted/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Nouvelle note
          </p>
          {/* Date picker */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Date d'observation
            </label>
            <input
              type="date"
              value={formDate}
              max={todayIso()}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          {/* Véhicule optionnel */}
          {vehicules.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5" />
                Véhicule (optionnel)
              </label>
              <select
                value={formVehiculeId}
                onChange={(e) => setFormVehiculeId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">— Aucun véhicule spécifique —</option>
                {vehicules.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.immatriculation}{v.marque ? ` · ${v.marque}` : ""}{v.modele ? ` ${v.modele}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          {/* Note */}
          <Textarea
            value={formNote}
            onChange={(e) => setFormNote(e.target.value)}
            placeholder="Observation, remarque, info clé..."
            rows={3}
            className="text-sm resize-none"
          />
          <div className="flex gap-2 pb-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9"
              onClick={() => { setShowForm(false); setFormNote(""); }}
            >
              Annuler
            </Button>
            <Button
              variant="izox"
              size="sm"
              className="flex-1 h-9"
              disabled={!formNote.trim() || saving}
              onClick={handleAddNote}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}
            </Button>
          </div>
        </div>
      )}

      {/* Corps */}
      <div className="px-4 py-4 space-y-4 flex-1">
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && notes.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
              <NotebookPen className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">Aucune note</p>
            <p className="text-sm text-muted-foreground mt-1">
              Appuyez sur <strong>+</strong> pour ajouter votre première observation.
            </p>
          </div>
        )}

        {grouped.map(([date, noteList]) => (
          <div key={date} className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {formatDateFr(date)}
            </p>
            {noteList.map((n) => (
              <NoteCard key={n.id} note={n} onDelete={handleDeleteNote} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Carte note ───────────────────────────────────────────────────────────────

function NoteCard({
  note,
  onDelete,
}: {
  note: NoteRow;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
      {note.vehicules && (
        <div className="flex items-center gap-1.5">
          <Car className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground">
            {note.vehicules.immatriculation}
          </span>
        </div>
      )}
      <p className="text-sm text-foreground whitespace-pre-wrap">{note.note}</p>
      <div className="flex items-center justify-end pt-1">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-destructive">Supprimer ?</span>
            <button
              type="button"
              onClick={() => onDelete(note.id)}
              className="text-xs font-semibold text-destructive hover:underline"
            >
              Oui
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-muted-foreground hover:underline"
            >
              Non
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="p-1 rounded hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        )}
      </div>
    </div>
  );
}
