import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Building2,
  FileText,
  CalendarDays,
  Wrench,
  Users,
  Receipt,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/admin/clients", label: "Clients", icon: Building2 },
  { to: "/admin/contrats", label: "Contrats", icon: FileText },
  { to: "/admin/rendez-vous", label: "Rendez-vous", icon: CalendarDays },
  { to: "/admin/interventions", label: "Interventions", icon: Wrench },
  { to: "/admin/equipe", label: "Équipe", icon: Users, adminOnly: true },
  { to: "/admin/facturation", label: "Facturation", icon: Receipt, adminOnly: true },
];

export function AdminSidebar() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = profile?.role === "admin";

  const items = NAV.filter((i) => !i.adminOnly || isAdmin);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-6 py-6 border-b border-sidebar-border">
        <img
          src="/logo-izox.png"
          alt="IZOX"
          className="h-10 w-auto object-contain"
        />
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {items.map((item) => {
            const active =
              item.to === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

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
    </aside>
  );
}

export function AdminMobileHeader() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };
  return (
    <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
      <img src="/logo-izox.png" alt="IZOX" className="h-7 w-auto object-contain" />
      <div className="flex items-center gap-2 text-xs">
        <span className="capitalize">{profile?.role}</span>
        <Button size="icon" variant="ghost" onClick={handleLogout} className="text-sidebar-foreground">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
