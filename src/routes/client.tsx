import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { ClientHeader, ClientBottomNav } from "@/components/client/ClientNav";

export const Route = createFileRoute("/client")({
  component: ClientLayout,
});

function ClientLayout() {
  return (
    <RoleGuard allowed={["client"]}>
      <div className="min-h-screen flex flex-col bg-background">
        <ClientHeader />
        <main className="flex-1 pb-20">
          <Outlet />
        </main>
        <ClientBottomNav />
      </div>
    </RoleGuard>
  );
}
