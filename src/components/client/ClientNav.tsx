import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Home, Car, ClipboardList, FolderOpen, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/admin/NotificationCenter";

// Les factures sont regroupées sous "Documents" (sous-onglet Factures).
const TABS = [
  { to: "/client", label: "Accueil", icon: Home, exact: true },
  { to: "/client/flotte", label: "Ma flotte", icon: Car },
  { to: "/client/prestations", label: "Prestations", icon: ClipboardList },
  { to: "/client/documents", label: "Documents", icon: FolderOpen },
];

export function ClientHeader() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };
  return (
    <header className="bg-card border-b border-border sticky top-0 z-30 shadow-elegant">
      <div className="px-4 py-3 flex items-center justify-between max-w-3xl mx-auto">
        <img src="/logo-izox.png" alt="IZOX" className="h-7 w-auto object-contain" />
        <div className="flex items-center gap-1.5">
          <NotificationCenter
            hideTeamPin
            triggerClassName="relative text-muted-foreground hover:bg-muted hover:text-foreground h-8 w-8"
          />
          <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
            {profile?.prenom} {profile?.nom}
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleLogout}
            className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

export function ClientBottomNav() {
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border">
      <ul className="grid grid-cols-4 max-w-3xl mx-auto" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {TABS.map((tab) => {
          const active = tab.exact
            ? location.pathname === tab.to
            : location.pathname.startsWith(tab.to);
          const Icon = tab.icon;
          return (
            <li key={tab.to}>
              <Link
                to={tab.to}
                className={cn(
                  "flex flex-col items-center justify-center py-2.5 gap-1 transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                <span className={cn("text-[10px] font-medium", active && "font-semibold text-primary")}>
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function ClientDocsLink() {
  return (
    <Link
      to="/client/documents"
      className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
    >
      <FolderOpen className="h-3 w-3" /> Mes documents
    </Link>
  );
}

