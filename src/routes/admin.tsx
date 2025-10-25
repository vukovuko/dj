import { createFileRoute, Outlet, useMatches, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar'
import { AdminSidebar } from '~/components/admin-sidebar'
import { authClient } from '~/lib/auth-client'
import { Skeleton } from '~/components/ui/skeleton'

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
})

const pageNames: Record<string, string> = {
  '/admin/': 'Kontrolna tabla',
  '/admin': 'Kontrolna tabla',
  '/admin/products': 'Proizvodi',
  '/admin/products/': 'Proizvodi',
  '/admin/products/$id': 'Uredi proizvod',
  '/admin/products/new': 'Dodaj proizvod',
  '/admin/pricing': 'Cene',
  '/admin/pricing/': 'Cene',
  '/admin/videos': 'Video - Biblioteka',
  '/admin/videos/': 'Video - Biblioteka',
  '/admin/videos/generacija': 'Video - Generacija',
  '/admin/settings': 'Podešavanja',
  '/admin/settings/': 'Podešavanja',
}

function AdminLayout() {
  const matches = useMatches()
  const currentRoute = matches[matches.length - 1]
  const currentPage = pageNames[currentRoute.routeId] || pageNames[currentRoute.id] || 'Admin'
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()

  // Client-side auth check
  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: '/login' })
    }
  }, [session, isPending, navigate])

  // Show loading while checking session
  if (isPending) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!session) {
    return null
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
  )
}
