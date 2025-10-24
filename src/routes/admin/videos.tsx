import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/videos')({
  component: VideosPage,
})

function VideosPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Video</h1>
      <p className="text-sm text-muted-foreground">
        Video generisanje
      </p>
    </div>
  )
}
