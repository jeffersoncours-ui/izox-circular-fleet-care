import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

// Client-side redirect only — NOT a server-side beforeLoad.
// The server-side 302 redirect would strip the URL hash, causing Supabase
// auth callbacks (#access_token=...&type=recovery) to be lost before
// detectAuthCallback() in auth-context.tsx can read them.
function IndexPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/login", replace: true });
  }, [navigate]);
  return null;
}
