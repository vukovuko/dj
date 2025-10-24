import { createFileRoute, Outlet, useMatches, redirect } from '@tanstack/react-router'
import { SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar'
import { AdminSidebar } from '~/components/admin-sidebar'
import { authClient } from '~/lib/auth-client.ts'
import { Skeleton } from '~/components/ui/skeleton.tsx'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
  pendingComponent: () => (
    <div className="flex min-h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  ),
  beforeLoad: async () => {
    const session = await authClient.getSession()

    if (!session.data) {
      throw redirect({
        to: '/login',
      })
    }

    return { session: session.data }
  },
})

const pageNames: Record<string, string> = {
  '/admin/': 'Kontrolna tabla',
  '/admin/products': 'Proizvodi',
  '/admin/pricing': 'Cene',
  '/admin/videos': 'Video',
  '/admin/settings': 'Podešavanja',
}

function AdminLayout() {
  const matches = useMatches()
  const currentRoute = matches[matches.length - 1]
  const currentPage = pageNames[currentRoute.id] || 'Admin'

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <main className="flex-1 overflow-auto">
          <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4">
            <h1 className="text-lg font-semibold">{currentPage}</h1>
            <SidebarTrigger />
          </div>
          <Outlet />
        </main>
        <AdminSidebar />
      </div>
    </SidebarProvider>
  )
}
