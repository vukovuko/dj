import { createFileRoute, Outlet, useMatches } from '@tanstack/react-router'
import { SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar'
import { AdminSidebar } from '~/components/admin-sidebar'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
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
