import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "staff" | "commercial" | "operateur" | "client";

export interface Profile {
  id: string;
  prenom: string | null;
  nom: string | null;
  entreprise_id: string | null;
  role: AppRole;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isRecovery: boolean;
  clearRecovery: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Detect auth callbacks in the URL at module load time, before Supabase
// processes the URL (which strips the hash / code param).
// Covers both PKCE flow (?code=) and implicit flow (#type=recovery or #access_token).
function detectAuthCallback(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hash;
  const s = window.location.search;
  return (
    h.includes("type=recovery") ||
    h.includes("access_token") ||
    s.includes("code=")
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // True when a PASSWORD_RECOVERY flow is in progress.
  // Seeded from the URL so it's correct before the async code exchange fires.
  const [isRecovery, setIsRecovery] = useState(detectAuthCallback);

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, prenom, nom, entreprise_id, role")
      .eq("id", uid)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    // 1. Subscribe FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      } else if (event === "SIGNED_OUT") {
        setIsRecovery(false);
      }
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // defer to avoid deadlocks
        setTimeout(() => loadProfile(newSession.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    // 2. THEN check existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refresh = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  const clearRecovery = useCallback(() => setIsRecovery(false), []);

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, isRecovery, clearRecovery, signIn, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function rolePath(role: AppRole | undefined | null): string {
  switch (role) {
    case "admin":
    case "staff":
    case "commercial":
      return "/admin";
    case "operateur":
      return "/terrain";
    case "client":
      return "/client";
    default:
      return "/login";
  }
}
