import {
  createFileRoute,
  Outlet,
  useMatches,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminSidebar } from "~/components/admin-sidebar";
import { SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";
import { Skeleton } from "~/components/ui/skeleton";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  pendingComponent: () => (
    <div className="flex min-h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  ),
});

const pageNames: Record<string, string> = {
  "/admin/": "Kontrolna tabla",
  "/admin": "Kontrolna tabla",
  "/admin/products": "Proizvodi",
  "/admin/products/": "Proizvodi",
  "/admin/products/$id": "Uredi proizvod",
  "/admin/products/new": "Dodaj proizvod",
  "/admin/pricing": "Cene",
  "/admin/pricing/": "Cene",
  "/admin/videos": "Video - Biblioteka",
  "/admin/videos/": "Video - Biblioteka",
  "/admin/videos/generacija": "Video - Generacija",
  "/admin/settings": "Podešavanja",
  "/admin/settings/": "Podešavanja",
};

function AdminLayout() {
  const matches = useMatches();
  const currentRoute = matches[matches.length - 1];
  const currentPage =
    pageNames[currentRoute.routeId] || pageNames[currentRoute.id] || "Admin";
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Client-side auth check
  useEffect(() => {
    if (mounted && !isPending && !session) {
      navigate({ to: "/login" });
    }
  }, [session, isPending, navigate, mounted]);

  // Always render skeleton on server + first client render to avoid hydration mismatch
  if (!mounted || isPending) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!session) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex h-14 items-center justify-between border-b bg-background px-4 shrink-0">
            <h1 className="text-lg font-semibold">{currentPage}</h1>
            <SidebarTrigger />
          </div>
          <div className="flex-1 overflow-auto">
            <Outlet />
          </div>
        </main>
        <AdminSidebar />
      </div>
    </SidebarProvider>
  );
}
