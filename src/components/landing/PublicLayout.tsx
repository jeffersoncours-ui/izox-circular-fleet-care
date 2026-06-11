// Layout public — navbar + footer des pages vitrine (/, /reservation, /entreprises).
// Distinct des layouts CRM : aucune dépendance à l'auth, mobile-first.

import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublicNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo-izox.png" alt="IZOX" className="h-7 w-auto object-contain" />
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-6 md:flex">
          <a
            href="/#tarifs"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Tarifs
          </a>
          <a
            href="/#boucle"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            La boucle d'eau
          </a>
          <Link
            to="/entreprises"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Entreprises
          </Link>
          <Link to="/login">
            <Button variant="outline" size="sm" className="gap-1.5">
              <LogIn className="h-3.5 w-3.5" />
              Espace client
            </Button>
          </Link>
          <Link to="/reservation">
            <Button variant="izox" size="sm">
              Réserver mon nettoyage
            </Button>
          </Link>
        </nav>

        {/* Mobile */}
        <button
          type="button"
          className="rounded-md p-2 text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-border bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <a
              href="/#tarifs"
              className="py-1.5 text-sm font-medium text-foreground"
              onClick={() => setOpen(false)}
            >
              Tarifs
            </a>
            <a
              href="/#boucle"
              className="py-1.5 text-sm font-medium text-foreground"
              onClick={() => setOpen(false)}
            >
              La boucle d'eau
            </a>
            <Link
              to="/entreprises"
              className="py-1.5 text-sm font-medium text-foreground"
              onClick={() => setOpen(false)}
            >
              Entreprises
            </Link>
            <Link to="/login" onClick={() => setOpen(false)}>
              <Button variant="outline" className="w-full gap-1.5">
                <LogIn className="h-4 w-4" />
                Espace client
              </Button>
            </Link>
            <Link to="/reservation" onClick={() => setOpen(false)}>
              <Button variant="izox" className="w-full">
                Réserver mon nettoyage
              </Button>
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <img src="/logo-izox.png" alt="IZOX" className="h-6 w-auto object-contain" />
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Nettoyage automobile éco-responsable à eau recyclée en circuit fermé.
              Évry-Courcouronnes et alentours (25 km).
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Navigation
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/reservation" className="text-muted-foreground hover:text-foreground">
                  Réserver un nettoyage
                </Link>
              </li>
              <li>
                <Link to="/entreprises" className="text-muted-foreground hover:text-foreground">
                  Offre entreprises & flottes
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-muted-foreground hover:text-foreground">
                  Espace client
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Informations
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {/* TODO : activer les liens quand les contenus juridiques définitifs
                  seront prêts (mentions légales, CGV avec L221-28, confidentialité). */}
              <li>Mentions légales (à venir)</li>
              <li>CGV & politique d'annulation (à venir)</li>
              <li>Politique de confidentialité (à venir)</li>
              <li>
                <a href="mailto:contact@izox.fr" className="hover:text-foreground">
                  contact@izox.fr
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-8 text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} IZOX — Circular Fleet Care. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
