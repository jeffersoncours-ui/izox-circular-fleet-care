import { useAuth, rolePath, type AppRole } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

interface Props {
  allowed: AppRole[];
  children: ReactNode;
}

/**
 * Client-side route guard. Redirects to /login if not authenticated,
 * or to the user's home if their role is not allowed.
 */
export function RoleGuard({ allowed, children }: Props) {
  const { profile, loading, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    if (profile && !allowed.includes(profile.role)) {
      navigate({ to: rolePath(profile.role) });
    }
  }, [loading, session, profile, allowed, navigate]);

  if (loading || !session || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!allowed.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
}
