import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Car,
  CheckCircle2,
  Link2,
  Link2Off,
  MessageSquare,
  NotebookPen,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

import { RoleGuard } from "@/components/RoleGuard";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChatWindow } from "@/components/messaging/ChatWindow";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/admin/equipe")({
  component: AdminEquipePage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface OperatorRow {
  id: string;
  name: string;
  initials: string;
  color_hex: string;
  user_id: string | null;
}

interface ProfileRow {
  id: string;
  prenom: string | null;
  nom: string | null;
}

interface NoteAdminRow {
  id: string;
  date_observation: string;
  note: string;
  vehicule_id: string | null;
  entreprise_id: string;
  entreprises: { nom: string } | null;
  vehicules: { immatriculation: string } | null;
}

type EquipeRightTab = "messages" | "notes";

// ─── Page ─────────────────────────────────────────────────────────────────────

function AdminEquipePage() {
  return (
    <RoleGuard allowed={["admin"]}>
      <AdminEquipeInner />
    </RoleGuard>
  );
}

function AdminEquipeInner() {
  const { user } = useAuth();
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [operateurProfiles, setOperateurProfiles] = useState<ProfileRow[]>([]);
  const [linkedProfiles, setLinkedProfiles] = useState<Record<string, ProfileRow>>({});
  const [unreadByUserId, setUnreadByUserId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const [equipeTab, setEquipeTab] = useState<EquipeRightTab>("messages");
  const [notesByUserId, setNotesByUserId] = useState<Record<string, NoteAdminRow[]>>({});
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [linkDialogOpId, setLinkDialogOpId] = useState<string | null>(null);
  const [unlinkDialogOpId, setUnlinkDialogOpId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;

    // Charger les opérateurs
    const { data: ops, error: opsErr } = await supabase
      .from("operators")
      .select("id, name, initials, color_hex, user_id")
      .order("name");
    if (opsErr) { toast.error("Erreur chargement opérateurs"); return; }
    const opRows = (ops ?? []) as OperatorRow[];
    setOperators(opRows);

    // Charger les profils liés (user_id non null)
    const linkedIds = opRows.filter((o) => o.user_id).map((o) => o.user_id!);
    if (linkedIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, prenom, nom")
        .in("id", linkedIds);
      const map: Record<string, ProfileRow> = {};
      for (const p of (profs ?? []) as ProfileRow[]) map[p.id] = p;
      setLinkedProfiles(map);
    }

    // Charger les profils opérateurs disponibles pour la liaison
    const { data: availProfs } = await supabase
      .from("profiles")
      .select("id, prenom, nom")
      .eq("role", "operateur");
    setOperateurProfiles((availProfs ?? []) as ProfileRow[]);

    // Compter les messages non lus par conversation_operator_id
    if (linkedIds.length > 0) {
      const { data: unread } = await (supabase as any)
        .from("operateur_messages")
        .select("conversation_operator_id")
        .is("read_at_admin", null)
        .neq("sender_id", user.id);
      const counts: Record<string, number> = {};
      for (const row of (unread ?? []) as { conversation_operator_id: string }[]) {
        const id = row.conversation_operator_id;
        counts[id] = (counts[id] ?? 0) + 1;
      }
      setUnreadByUserId(counts);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Charger les notes de l'opérateur sélectionné quand l'onglet Notes est actif
  useEffect(() => {
    if (equipeTab !== "notes" || !selectedOpId) return;
    const op = operators.find((o) => o.id === selectedOpId);
    if (!op?.user_id) return;
    const userId = op.user_id;
    if (notesByUserId[userId]) return; // déjà chargé
    let alive = true;
    setLoadingNotes(true);
    (async () => {
      const { data, error } = await supabase
        .from("operateur_notes")
        .select("id, date_observation, note, vehicule_id, entreprise_id, entreprises(nom), vehicules(immatriculation)")
        .eq("operateur_id", userId)
        .order("date_observation", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (!alive) return;
      if (error) toast.error("Erreur chargement notes");
      setNotesByUserId((prev) => ({ ...prev, [userId]: (data as unknown as NoteAdminRow[]) ?? [] }));
      setLoadingNotes(false);
    })();
    return () => { alive = false; };
  }, [equipeTab, selectedOpId, operators, notesByUserId]);

  const selectedOp = operators.find((o) => o.id === selectedOpId) ?? null;

  const handleLinked = (operatorId: string, userId: string, profile: ProfileRow) => {
    setOperators((prev) =>
      prev.map((o) => (o.id === operatorId ? { ...o, user_id: userId } : o))
    );
    setLinkedProfiles((prev) => ({ ...prev, [userId]: profile }));
    setLinkDialogOpId(null);
  };

  const handleUnlinked = (operatorId: string, userId: string) => {
    setOperators((prev) =>
      prev.map((o) => (o.id === operatorId ? { ...o, user_id: null } : o))
    );
    setLinkedProfiles((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setUnlinkDialogOpId(null);
    if (selectedOp?.id === operatorId) setSelectedOpId(null);
  };

  // Profils disponibles (pas encore liés à un opérateur)
  const linkedUserIds = new Set(operators.filter((o) => o.user_id).map((o) => o.user_id!));
  const availableProfiles = operateurProfiles.filter((p) => !linkedUserIds.has(p.id));

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        crumbs={["Admin", "Équipe"]}
        title="Équipe"
        sub="Opérateurs terrain et messagerie"
      />

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : operators.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
              <Users className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium text-foreground">Aucun opérateur configuré</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ajoutez des opérateurs via les paramètres du planning.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ── Panneau gauche : liste opérateurs ── */}
          <div
            className={cn(
              "w-full lg:w-80 shrink-0 border-r border-border flex flex-col overflow-y-auto",
              selectedOpId && "hidden lg:flex"
            )}
          >
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {operators.length} opérateur{operators.length > 1 ? "s" : ""}
              </p>
            </div>
            <div className="divide-y divide-border">
              {operators.map((op) => {
                const profile = op.user_id ? linkedProfiles[op.user_id] : null;
                const unread = op.user_id ? (unreadByUserId[op.user_id] ?? 0) : 0;
                const isSelected = selectedOpId === op.id;

                return (
                  <div
                    key={op.id}
                    className={cn(
                      "p-4 transition-colors",
                      isSelected && "bg-muted/50"
                    )}
                  >
                    {/* En-tête carte */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ backgroundColor: op.color_hex }}
                      >
                        {op.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground text-sm truncate">
                            {op.name}
                          </p>
                          {unread > 0 && (
                            <Badge className="h-5 min-w-5 px-1.5 bg-primary text-primary-foreground text-[10px] font-bold">
                              {unread}
                            </Badge>
                          )}
                        </div>
                        {profile ? (
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                            {[profile.prenom, profile.nom].filter(Boolean).join(" ") || "Compte lié"}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Link2Off className="h-3 w-3 shrink-0" />
                            Aucun compte lié
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {op.user_id ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={() => {
                              setSelectedOpId(op.id);
                            }}
                          >
                            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                            {unread > 0 ? `Chat (${unread})` : "Chat"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            title="Délier le compte terrain"
                            onClick={() => setUnlinkDialogOpId(op.id)}
                          >
                            <Link2Off className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => setLinkDialogOpId(op.id)}
                          disabled={availableProfiles.length === 0}
                        >
                          <Link2 className="h-3.5 w-3.5 mr-1.5" />
                          Lier un compte terrain
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Panneau droit : chat + notes ── */}
          <div
            className={cn(
              "flex-1 flex flex-col min-h-0",
              !selectedOpId && "hidden lg:flex"
            )}
          >
            {selectedOp?.user_id ? (
              <>
                {/* Header opérateur */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedOpId(null)}
                    className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: selectedOp.color_hex }}
                  >
                    {selectedOp.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{selectedOp.name}</p>
                    {linkedProfiles[selectedOp.user_id] && (
                      <p className="text-xs text-muted-foreground">
                        {[
                          linkedProfiles[selectedOp.user_id].prenom,
                          linkedProfiles[selectedOp.user_id].nom,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Onglets Messages / Notes */}
                <div className="flex gap-1 px-4 py-2 border-b border-border shrink-0">
                  <button
                    type="button"
                    onClick={() => setEquipeTab("messages")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                      equipeTab === "messages"
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <MessageSquare className="h-3 w-3" />
                    Messages
                  </button>
                  <button
                    type="button"
                    onClick={() => setEquipeTab("notes")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                      equipeTab === "notes"
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <NotebookPen className="h-3 w-3" />
                    Notes clients
                  </button>
                </div>

                {/* Contenu onglet actif */}
                {equipeTab === "messages" ? (
                  <ChatWindow
                    operatorId={selectedOp.user_id}
                    role="admin"
                    className="flex-1 min-h-0"
                  />
                ) : (
                  <NotesPanel
                    userId={selectedOp.user_id}
                    notes={notesByUserId[selectedOp.user_id] ?? null}
                    loading={loadingNotes}
                  />
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="font-semibold text-foreground">Sélectionnez un opérateur</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Choisissez un opérateur dans la liste pour ouvrir le chat ou consulter ses notes.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Dialog : lier un compte terrain ── */}
      {linkDialogOpId && (
        <LinkOperatorDialog
          operator={operators.find((o) => o.id === linkDialogOpId)!}
          availableProfiles={availableProfiles}
          onClose={() => setLinkDialogOpId(null)}
          onLinked={handleLinked}
        />
      )}

      {/* ── Dialog : délier ── */}
      {unlinkDialogOpId && (
        <UnlinkOperatorDialog
          operator={operators.find((o) => o.id === unlinkDialogOpId)!}
          onClose={() => setUnlinkDialogOpId(null)}
          onUnlinked={handleUnlinked}
        />
      )}
    </div>
  );
}

// ─── Notes panel (lecture seule admin) ───────────────────────────────────────

function NotesPanel({
  userId,
  notes,
  loading,
}: {
  userId: string;
  notes: NoteAdminRow[] | null;
  loading: boolean;
}) {
  if (loading || notes === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <NotebookPen className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <p className="font-semibold text-foreground text-sm">Aucune note</p>
        <p className="text-xs text-muted-foreground mt-1">
          L'opérateur n'a encore écrit aucune note de suivi.
        </p>
      </div>
    );
  }

  // Grouper par client
  const byClient = new Map<string, { nom: string; notes: NoteAdminRow[] }>();
  for (const n of notes) {
    if (!byClient.has(n.entreprise_id)) {
      byClient.set(n.entreprise_id, { nom: n.entreprises?.nom ?? n.entreprise_id.slice(0, 8), notes: [] });
    }
    byClient.get(n.entreprise_id)!.notes.push(n);
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
      {Array.from(byClient.values()).map((client) => (
        <div key={client.nom} className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-foreground">
              {client.nom}
            </p>
            <span className="text-[10px] text-muted-foreground">
              {client.notes.length} note{client.notes.length > 1 ? "s" : ""}
            </span>
          </div>
          {client.notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-border bg-card p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {new Date(n.date_observation + "T00:00:00").toLocaleDateString("fr-FR", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </span>
                {n.vehicules && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Car className="h-3 w-3" />
                    {n.vehicules.immatriculation}
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{n.note}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Dialog : Lier un compte terrain ─────────────────────────────────────────

function LinkOperatorDialog({
  operator,
  availableProfiles,
  onClose,
  onLinked,
}: {
  operator: OperatorRow;
  availableProfiles: ProfileRow[];
  onClose: () => void;
  onLinked: (operatorId: string, userId: string, profile: ProfileRow) => void;
}) {
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!selectedProfileId) return;
    setSaving(true);
    const { error } = await supabase
      .from("operators")
      .update({ user_id: selectedProfileId })
      .eq("id", operator.id);
    if (error) {
      toast.error("Impossible de lier le compte");
    } else {
      const profile = availableProfiles.find((p) => p.id === selectedProfileId)!;
      toast.success("Compte terrain lié avec succès");
      onLinked(operator.id, selectedProfileId, profile);
    }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Lier un compte terrain</DialogTitle>
          <DialogDescription>
            Associer un compte opérateur à{" "}
            <strong>{operator.name}</strong> pour activer la messagerie et
            la visibilité des interventions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {availableProfiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun compte opérateur disponible à lier.
            </p>
          ) : (
            <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un compte opérateur…" />
              </SelectTrigger>
              <SelectContent>
                {availableProfiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {[p.prenom, p.nom].filter(Boolean).join(" ") || p.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button
            variant="izox"
            onClick={handleConfirm}
            disabled={!selectedProfileId || saving}
          >
            {saving ? "Liaison…" : "Lier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog : Délier ──────────────────────────────────────────────────────────

function UnlinkOperatorDialog({
  operator,
  onClose,
  onUnlinked,
}: {
  operator: OperatorRow;
  onClose: () => void;
  onUnlinked: (operatorId: string, userId: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!operator.user_id) return;
    setSaving(true);
    const { error } = await supabase
      .from("operators")
      .update({ user_id: null })
      .eq("id", operator.id);
    if (error) {
      toast.error("Impossible de délier le compte");
    } else {
      toast.success("Compte terrain délié");
      onUnlinked(operator.id, operator.user_id);
    }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Délier le compte terrain</DialogTitle>
          <DialogDescription>
            Cela désactivera la messagerie et la visibilité des
            interventions pour <strong>{operator.name}</strong>. L'historique
            des messages sera conservé.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? "Liaison…" : "Délier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
