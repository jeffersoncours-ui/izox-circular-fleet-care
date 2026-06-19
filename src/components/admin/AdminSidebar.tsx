import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Building2,
  Car,
  FileText,
  Users,
  Receipt,
  Snowflake,
  Leaf,
  LogOut,
  Menu,
  CalendarRange,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { NotificationCenter } from "@/components/admin/NotificationCenter";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  badgeKey?: "gel" | "rdv";
}

const NAV: NavItem[] = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/admin/clients", label: "Clients", icon: Building2 },
  { to: "/admin/vehicules", label: "Véhicules", icon: Car },
  { to: "/admin/contrats", label: "Contrats", icon: FileText },
  { to: "/admin/planning", label: "Planning & RDV", icon: CalendarRange, badgeKey: "rdv" },
  { to: "/admin/demandes-gel", label: "Demandes de gel", icon: Snowflake, badgeKey: "gel" },
  { to: "/admin/equipe", label: "Équipe", icon: Users, adminOnly: true },
  { to: "/admin/avis", label: "Avis clients", icon: Star },
  { to: "/admin/facturation", label: "Facturation", icon: Receipt, adminOnly: true },
  { to: "/admin/impact", label: "Impact RSE", icon: Leaf, adminOnly: false },
];

function useDemandesCounts() {
  const [counts, setCounts] = useState({ gel: 0, rdv: 0 });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [g, r] = await Promise.all([
        supabase
          .from("demandes_gel")
          .select("id", { count: "exact", head: true })
          .eq("statut", "en_attente"),
        supabase
          .from("demandes_rdv")
          .select("id", { count: "exact", head: true })
          .eq("statut", "en_attente"),
      ]);
      if (alive) {
        setCounts({ gel: g.count ?? 0, rdv: r.count ?? 0 });
      }
    };
    load();
    const interval = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);
  return counts;
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { profile } = useAuth();
  const location = useLocation();
  const counts = useDemandesCounts();
  const isAdmin = profile?.role === "admin";
  const items = NAV.filter((i) => !i.adminOnly || isAdmin);

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active =
          item.to === "/admin"
            ? location.pathname === "/admin"
            : location.pathname.startsWith(item.to);
        const Icon = item.icon;
        const badge = item.badgeKey ? counts[item.badgeKey] : 0;
        return (
          <li key={item.to}>
            <Link
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
              )}
            >
              {active && (
                <span className="absolute left-0 top-[7px] bottom-[7px] w-[3px] rounded-full bg-primary" />
              )}
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-foreground/40")} />
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                  {badge}
                </Badge>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarFooter({ onAfterLogout }: { onAfterLogout?: () => void }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await signOut();
    onAfterLogout?.();
    navigate({ to: "/login" });
  };
  return (
    <div className="px-4 py-4 border-t border-sidebar-border">
      <div className="mb-3 px-2">
        <p className="text-sm font-medium truncate">
          {profile?.prenom} {profile?.nom}
        </p>
        <p className="text-xs text-sidebar-foreground/70 capitalize">{profile?.role}</p>
      </div>
      <Button
        variant="ghost"
        className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        Déconnexion
      </Button>
    </div>
  );
}

export function AdminSidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-6 py-6 border-b border-sidebar-border flex items-center justify-between gap-2">
        <img
          src="/logo-izox.png"
          alt="IZOX"
          className="h-10 w-auto object-contain"
        />
        <NotificationCenter />
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <NavList />
      </nav>
      <SidebarFooter />
    </aside>
  );
}

export function AdminMobileHeader() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border flex flex-col"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="px-6 py-6 border-b border-sidebar-border">
              <img
                src="/logo-izox.png"
                alt="IZOX"
                className="h-9 w-auto object-contain"
              />
            </div>
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
              <NavList onNavigate={() => setOpen(false)} />
            </nav>
            <SidebarFooter onAfterLogout={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <img src="/logo-izox.png" alt="IZOX" className="h-7 w-auto object-contain" />
      </div>
      <div className="flex items-center gap-2">
        <NotificationCenter />
        <span className="text-xs capitalize">{profile?.role}</span>
      </div>
    </header>
  );
}
