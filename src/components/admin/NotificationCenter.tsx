import { useState, useEffect, useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Bell,
  Eye,
  Star,
  Archive,
  Snowflake,
  Sun,
  FileSignature,
  Receipt,
  Activity,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Pin,
  PinOff,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Notification {
  id: string;
  source_action: string;
  source_log_id: string | null;
  titre: string;
  details: Record<string, any>;
  link_url: string | null;
  statut: "non_lu" | "vu" | "priorite" | "archive";
  action_requise: boolean;
  severite: "info" | "warning" | "critical";
  created_at: string;
  read_at: string | null;
  archived_at: string | null;
  epingle_equipe: boolean;
  epingle_par: string | null;
  epingle_at: string | null;
}

interface NotificationCenterProps {
  hideTeamPin?: boolean;
  triggerClassName?: string;
}

export function NotificationCenter({
  hideTeamPin = false,
  triggerClassName,
}: NotificationCenterProps = {}) {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showArchives, setShowArchives] = useState(false);
  const [showConsultees, setShowConsultees] = useState(false);
  const [archives, setArchives] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("notifications_internes")
      .select("*")
      .neq("statut", "archive")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("Erreur fetch notifications:", error);
      return;
    }
    setNotifications((data ?? []) as Notification[]);
  }, [user?.id]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    const { count, error } = await supabase
      .from("notifications_internes")
      .select("id", { count: "exact", head: true })
      .eq("statut", "non_lu");
    if (!error) {
      setUnreadCount(count ?? 0);
    }
  }, [user?.id]);

  const fetchArchives = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("notifications_internes")
      .select("*")
      .eq("statut", "archive")
      .order("archived_at", { ascending: false })
      .limit(20);
    if (!error) {
      setArchives((data ?? []) as Notification[]);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const markAsVu = async (id: string) => {
    const { error } = await supabase
      .from("notifications_internes")
      .update({ statut: "vu", read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, statut: "vu" as const, read_at: new Date().toISOString() }
          : n,
      ),
    );
    fetchUnreadCount();
  };

  const markAsPriorite = async (id: string) => {
    const notif = notifications.find((n) => n.id === id);
    const readAt = notif?.read_at ?? new Date().toISOString();
    const { error } = await supabase
      .from("notifications_internes")
      .update({ statut: "priorite", read_at: readAt })
      .eq("id", id);
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, statut: "priorite" as const, read_at: readAt } : n,
      ),
    );
    fetchUnreadCount();
  };

  const markAsArchive = async (id: string) => {
    const now = new Date().toISOString();
    const notif = notifications.find((n) => n.id === id);
    const readAt = notif?.read_at ?? now;
    const { error } = await supabase
      .from("notifications_internes")
      .update({ statut: "archive", read_at: readAt, archived_at: now })
      .eq("id", id);
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    fetchUnreadCount();
    toast.success("Notification archivée");
  };

  const markAllAsVu = async () => {
    const nonLues = notifications.filter((n) => n.statut === "non_lu");
    if (nonLues.length === 0) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("notifications_internes")
      .update({ statut: "vu", read_at: now })
      .eq("statut", "non_lu");
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    setNotifications((prev) =>
      prev.map((n) =>
        n.statut === "non_lu" ? { ...n, statut: "vu" as const, read_at: now } : n,
      ),
    );
    setUnreadCount(0);
    toast.success("Toutes les notifications marquées comme vues");
  };

  const toggleEpingleEquipe = async (id: string) => {
    const { data, error } = await supabase.rpc("toggle_epingle_equipe", {
      p_notification_id: id,
    });
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    if ((data as any)?.success) {
      fetchNotifications();
      toast.success(
        (data as any).epingle_equipe
          ? "Notification épinglée pour toute l'équipe"
          : "Notification désépinglée",
      );
    } else {
      toast.error((data as any)?.error ?? "Erreur inconnue");
    }
  };

  const handleNotifClick = (notif: Notification) => {
    if (notif.link_url) {
      if (notif.statut === "non_lu") {
        markAsVu(notif.id);
      }
      setOpen(false);
      router.navigate({ to: notif.link_url as any });
    }
  };

  const getNotifIcon = (action: string) => {
    const iconClass = "h-4 w-4 shrink-0";
    switch (action) {
      case "creation_contrat":
        return <FileSignature className={iconClass} />;
      case "gel_contrat":
        return <Snowflake className={iconClass} />;
      case "reactivation_contrat":
        return <Sun className={iconClass} />;
      case "resiliation_contrat":
        return <XCircle className={iconClass} />;
      case "cron_cloture_mensuelle":
        return <Receipt className={iconClass} />;
      case "cron_maintenance_quotidienne":
        return <Activity className={iconClass} />;
      case "cron_maintenance_quotidienne_preavis":
        return <AlertTriangle className={iconClass} />;
      case "emission_facture":
        return <Receipt className={iconClass} />;
      case "annulation_facture_via_avoir":
        return <AlertTriangle className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const getSeveriteClasses = (
    severite: string,
    statut: string,
    epingleEquipe: boolean,
  ) => {
    if (epingleEquipe) {
      if (statut === "non_lu") {
        return "border-l-4 border-l-blue-600 bg-blue-100";
      }
      return "border-l-4 border-l-blue-500 bg-blue-50";
    }
    if (statut === "priorite")
      return "border-l-4 border-l-orange-500 bg-orange-50";
    switch (severite) {
      case "critical":
        return "border-l-4 border-l-red-500 bg-red-50";
      case "warning":
        return "border-l-4 border-l-amber-400 bg-amber-50";
      default:
        return statut === "non_lu"
          ? "border-l-4 border-l-primary bg-primary/5"
          : "border-l-4 border-l-transparent bg-background";
    }
  };

  const getRelativeTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(parseISO(dateStr), {
        addSuffix: true,
        locale: fr,
      });
    } catch {
      return "";
    }
  };

  const epinglees = notifications.filter((n) => n.epingle_equipe);
  const prioritaires = notifications.filter(
    (n) => n.statut === "priorite" && !n.epingle_equipe,
  );
  const nonLues = notifications.filter(
    (n) => n.statut === "non_lu" && !n.epingle_equipe,
  );
  const vues = notifications.filter(
    (n) => n.statut === "vu" && !n.epingle_equipe,
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={
            triggerClassName ??
            "relative text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          }
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:w-[420px] p-0">
        <SheetHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                </Badge>
              )}
            </SheetTitle>
            {nonLues.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsVu}
                className="text-xs text-muted-foreground"
              >
                Tout marquer comme vu
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-2 space-y-1">
            {epinglees.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide px-2 py-1 flex items-center gap-1">
                  <Pin className="h-3 w-3" />
                  Épinglées équipe ({epinglees.length})
                </p>
                {epinglees.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notif={notif}
                    onClick={() => handleNotifClick(notif)}
                    onMarkVu={() => markAsVu(notif.id)}
                    onMarkPriorite={() => markAsPriorite(notif.id)}
                    onArchive={() => markAsArchive(notif.id)}
                    onTogglePin={() => toggleEpingleEquipe(notif.id)}
                    getIcon={getNotifIcon}
                    getClasses={getSeveriteClasses}
                    getTime={getRelativeTime}
                    isEpingleSection
                  />
                ))}
              </div>
            )}

            {prioritaires.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide px-2 py-1">
                  Priorité ({prioritaires.length})
                </p>
                {prioritaires.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notif={notif}
                    onClick={() => handleNotifClick(notif)}
                    onMarkVu={() => markAsVu(notif.id)}
                    onMarkPriorite={() => markAsPriorite(notif.id)}
                    onArchive={() => markAsArchive(notif.id)}
                    onTogglePin={() => toggleEpingleEquipe(notif.id)}
                    getIcon={getNotifIcon}
                    getClasses={getSeveriteClasses}
                    getTime={getRelativeTime}
                  />
                ))}
              </div>
            )}

            {nonLues.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide px-2 py-1">
                  Non lues ({nonLues.length})
                </p>
                {nonLues.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notif={notif}
                    onClick={() => handleNotifClick(notif)}
                    onMarkVu={() => markAsVu(notif.id)}
                    onMarkPriorite={() => markAsPriorite(notif.id)}
                    onArchive={() => markAsArchive(notif.id)}
                    onTogglePin={() => toggleEpingleEquipe(notif.id)}
                    getIcon={getNotifIcon}
                    getClasses={getSeveriteClasses}
                    getTime={getRelativeTime}
                  />
                ))}
              </div>
            )}

            {vues.length > 0 && (
              <div className="mb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-xs text-muted-foreground px-2 py-1"
                  onClick={() => setShowConsultees(!showConsultees)}
                >
                  <span className="uppercase tracking-wide font-semibold">
                    Consultées ({vues.length})
                  </span>
                  {showConsultees ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>

                {showConsultees &&
                  vues.map((notif) => (
                    <NotificationItem
                      key={notif.id}
                      notif={notif}
                      onClick={() => handleNotifClick(notif)}
                      onMarkVu={() => markAsVu(notif.id)}
                      onMarkPriorite={() => markAsPriorite(notif.id)}
                      onArchive={() => markAsArchive(notif.id)}
                      onTogglePin={() => toggleEpingleEquipe(notif.id)}
                      getIcon={getNotifIcon}
                      getClasses={getSeveriteClasses}
                      getTime={getRelativeTime}
                    />
                  ))}
              </div>
            )}

            {notifications.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucune notification</p>
                <p className="text-xs mt-1">
                  Les événements importants apparaîtront ici
                </p>
              </div>
            )}

            <div className="px-2 pt-2 pb-4 border-t mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => {
                  if (!showArchives) fetchArchives();
                  setShowArchives(!showArchives);
                }}
              >
                {showArchives ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Masquer les archives
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Voir les archives
                  </>
                )}
              </Button>

              {showArchives &&
                archives.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notif={notif}
                    onClick={() => handleNotifClick(notif)}
                    onMarkVu={() => {}}
                    onMarkPriorite={() => {}}
                    onArchive={() => {}}
                    onTogglePin={() => {}}
                    getIcon={getNotifIcon}
                    getClasses={getSeveriteClasses}
                    getTime={getRelativeTime}
                    isArchive
                  />
                ))}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

interface NotificationItemProps {
  notif: Notification;
  onClick: () => void;
  onMarkVu: () => void;
  onMarkPriorite: () => void;
  onArchive: () => void;
  onTogglePin: () => void;
  getIcon: (action: string) => React.ReactNode;
  getClasses: (severite: string, statut: string, epingleEquipe: boolean) => string;
  getTime: (dateStr: string) => string;
  isArchive?: boolean;
  isEpingleSection?: boolean;
}

function NotificationItem({
  notif,
  onClick,
  onMarkVu,
  onMarkPriorite,
  onArchive,
  onTogglePin,
  getIcon,
  getClasses,
  getTime,
  isArchive = false,
  isEpingleSection = false,
}: NotificationItemProps) {
  return (
    <Card
      className={`p-3 mb-1 cursor-pointer hover:bg-muted/50 transition-colors ${getClasses(notif.severite, notif.statut, notif.epingle_equipe)}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getIcon(notif.source_action)}</div>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm leading-tight ${notif.statut === "non_lu" ? "font-semibold" : "font-normal"}`}
          >
            {notif.titre}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {getTime(notif.created_at)}
          </p>
          {isEpingleSection && (
            <Badge
              variant="outline"
              className="mt-1 text-xs border-blue-300 text-blue-600"
            >
              <Pin className="h-2.5 w-2.5 mr-1" />
              Épinglé équipe
            </Badge>
          )}
          {notif.action_requise && notif.statut !== "archive" && (
            <Badge
              variant="outline"
              className="mt-1 text-xs border-orange-300 text-orange-600"
            >
              Action requise
            </Badge>
          )}
        </div>

        {!isArchive && (
          <div
            className="flex items-center gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {notif.statut === "non_lu" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onMarkVu}
                title="Marquer comme vu"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            )}
            {notif.statut !== "priorite" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onMarkPriorite}
                title="Marquer comme priorité"
              >
                <Star className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onTogglePin}
              title={
                notif.epingle_equipe
                  ? "Désépingler de l'équipe"
                  : "Épingler pour l'équipe"
              }
            >
              {notif.epingle_equipe ? (
                <PinOff className="h-3.5 w-3.5 text-blue-600" />
              ) : (
                <Pin className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onArchive}
              title="Archiver"
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {notif.link_url && (
          <ExternalLink className="h-3 w-3 text-muted-foreground/50 shrink-0 mt-1" />
        )}
      </div>
    </Card>
  );
}
