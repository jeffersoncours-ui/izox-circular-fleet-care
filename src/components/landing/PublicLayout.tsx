// Layout public — design v2 dark. Wrapper .izox-b2c qui isole TOUT le dark
// mode du CRM (aucun effet hors de cet arbre). Navbar + footer + fil de l'eau.

import "@/styles/landing-b2c.css";
import { Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Menu, X, LogIn } from "lucide-react";
import {
  TweaksProvider,
  useTweaks,
  themeClass,
  tweaksStyle,
} from "./useTweaks";

function Wordmark() {
  return (
    <span className="b2c-mono text-[15px] font-bold tracking-[0.18em] text-[var(--b2c-tx)]">
      IZOX
      <span className="text-[var(--b2c-accent)]">.</span>
    </span>
  );
}

function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const { tweaks } = useTweaks();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--b2c-line)] bg-[color-mix(in_srgb,var(--b2c-bg)_82%,transparent)] backdrop-blur-md">
      <div className="b2c-container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center">
          <Wordmark />
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-7 md:flex">
          <a href="/#tarifs" className="text-sm text-[var(--b2c-tx-dim)] transition-colors hover:text-[var(--b2c-tx)]">
            Tarifs
          </a>
          <a href="/#boucle" className="text-sm text-[var(--b2c-tx-dim)] transition-colors hover:text-[var(--b2c-tx)]">
            La boucle d'eau
          </a>
          <Link to="/entreprises" className="text-sm text-[var(--b2c-tx-dim)] transition-colors hover:text-[var(--b2c-tx)]">
            Entreprises
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--b2c-tx-dim)] transition-colors hover:text-[var(--b2c-tx)]"
          >
            <LogIn className="h-3.5 w-3.5" />
            Espace client
          </Link>
          <Link to="/reservation" className="b2c-btn b2c-btn--primary !px-4 !py-2 !text-sm">
            {tweaks.ctaLabel}
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          className="rounded-md p-2 text-[var(--b2c-tx)] md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-[var(--b2c-line)] bg-[var(--b2c-bg)] px-5 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <a href="/#tarifs" className="py-1.5 text-sm text-[var(--b2c-tx)]" onClick={() => setOpen(false)}>
              Tarifs
            </a>
            <a href="/#boucle" className="py-1.5 text-sm text-[var(--b2c-tx)]" onClick={() => setOpen(false)}>
              La boucle d'eau
            </a>
            <Link to="/entreprises" className="py-1.5 text-sm text-[var(--b2c-tx)]" onClick={() => setOpen(false)}>
              Entreprises
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 py-1.5 text-sm text-[var(--b2c-tx)]"
              onClick={() => setOpen(false)}
            >
              <LogIn className="h-4 w-4" />
              Espace client
            </Link>
            <Link
              to="/reservation"
              className="b2c-btn b2c-btn--primary mt-1 w-full"
              onClick={() => setOpen(false)}
            >
              {tweaks.ctaLabel}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-[var(--b2c-line)] bg-[var(--b2c-bg2)]">
      <div className="b2c-container py-12">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-[var(--b2c-tx-dim)]">
              Nettoyage automobile éco-responsable à eau recyclée en circuit fermé.
              Évry-Courcouronnes et alentours (25 km).
            </p>
          </div>
          <div>
            <p className="b2c-kicker">Navigation</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/reservation" className="text-[var(--b2c-tx-dim)] hover:text-[var(--b2c-tx)]">
                  Réserver un nettoyage
                </Link>
              </li>
              <li>
                <Link to="/entreprises" className="text-[var(--b2c-tx-dim)] hover:text-[var(--b2c-tx)]">
                  Offre entreprises &amp; flottes
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-[var(--b2c-tx-dim)] hover:text-[var(--b2c-tx)]">
                  Espace client
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="b2c-kicker">Informations</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--b2c-tx-dim)]">
              {/* TODO : activer quand les contenus juridiques définitifs seront prêts. */}
              <li>Mentions légales (à venir)</li>
              <li>CGV &amp; politique d'annulation (à venir)</li>
              <li>Politique de confidentialité (à venir)</li>
              <li>
                <a href="mailto:contact@izox.fr" className="hover:text-[var(--b2c-tx)]">
                  contact@izox.fr
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-10 text-[11px] text-[var(--b2c-tx-faint)]">
          © {new Date().getFullYear()} IZOX — Circular Fleet Care. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}

// Fil de l'eau (fixe à droite). Structure posée ; l'animation scroll
// (height + position de la goutte) est branchée en Phase 2c.
function FilDeLeau() {
  return (
    <div className="fil" aria-hidden="true">
      <div className="fil-track" />
      <div className="fil-trail" data-fil-trail />
      <div className="fil-drop" data-fil-drop />
    </div>
  );
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { tweaks } = useTweaks();
  const rootRef = useRef<HTMLDivElement>(null);

  // Fond du body en dark tant que la landing est montée (anti-seam overscroll).
  useEffect(() => {
    document.body.classList.add("b2c-active");
    return () => document.body.classList.remove("b2c-active");
  }, []);

  // Progressive enhancement : on n'active les reveals (état initial masqué)
  // que si JS tourne. IntersectionObserver révèle au scroll.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.setAttribute("data-anim", "on");

    const els = Array.from(root.querySelectorAll<HTMLElement>(".rv"));
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className={`izox-b2c flex min-h-screen flex-col ${themeClass(tweaks.theme)}`}
      style={tweaksStyle(tweaks)}
    >
      <FilDeLeau />
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <TweaksProvider>
      <LayoutInner>{children}</LayoutInner>
    </TweaksProvider>
  );
}
