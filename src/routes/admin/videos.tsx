import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/videos')({
  component: VideosLayout,
})

function VideosLayout() {
  return <Outlet />
}
