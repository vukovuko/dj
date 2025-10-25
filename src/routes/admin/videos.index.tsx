import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { VideoGrid } from '~/components/videos/video-grid'
import { VideosToolbar } from '~/components/videos/videos-toolbar'
import { VideoPreviewDialog } from '~/components/videos/video-preview-dialog'
import { toast } from 'sonner'
import { getVideos, deleteVideos, playVideoOnTV } from '~/queries/videos.server'

// ========== ROUTE ==========

export const Route = createFileRoute('/admin/videos/')({
  component: VideosPage,
  loader: async () => {
    return await getVideos()
  },
})

// ========== COMPONENT ==========

function VideosPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const videos = Route.useLoaderData()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [previewVideo, setPreviewVideo] = useState<typeof videos[0] | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSelectVideo = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const handlePreview = (id?: string) => {
    const videoId = id || Array.from(selectedIds)[0]
    const video = videos.find(v => v.id === videoId)

    if (!video) {
      toast.error('Video nije pronađen')
      return
    }

    if (video.status !== 'ready') {
      toast.error('Video nije spreman')
      return
    }

    setPreviewVideo(video)
  }

  const handleClosePreview = () => {
    setPreviewVideo(null)
  }

  const handleDelete = (id?: string) => {
    setDeleteTarget(id || 'bulk')
  }

  const confirmDelete = async () => {
    const idsToDelete = deleteTarget === 'bulk'
      ? Array.from(selectedIds)
      : [deleteTarget!]

    setIsDeleting(true)
    try {
      const result = await deleteVideos({ data: { ids: idsToDelete } })
      toast.success(`Uspešno obrisano ${result.count} video(a)`)
      setSelectedIds(new Set())
      setDeleteTarget(null)
      router.invalidate()
    } catch (error) {
      console.error('Failed to delete videos:', error)
      toast.error('Greška pri brisanju videa')
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePlayOnTV = async () => {
    const videoId = Array.from(selectedIds)[0]
    const video = videos.find(v => v.id === videoId)

    if (!video) {
      toast.error('Video nije pronađen')
      return
    }

    if (video.status !== 'ready') {
      toast.error('Video nije spreman')
      return
    }

    try {
      await playVideoOnTV({ data: { videoId } })
      toast.success('Video se prikazuje na TV-u')
    } catch (error) {
      console.error('Failed to play video on TV:', error)
      toast.error('Greška pri prikazivanju videa na TV-u')
    }
  }

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto p-6 max-w-7xl">
      {/* Header with always-visible toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Biblioteka</h1>
          <p className="text-sm text-muted-foreground">
            Upravljanje video zapisima
          </p>
        </div>

        {/* Toolbar - always visible, changes based on selection */}
        <div className="flex items-center gap-2">
          {selectedIds.size > 1 ? (
            // Multiple videos selected - only show delete button
            <>
              <span className="text-sm text-muted-foreground mr-2">
                Izabrano: {selectedIds.size}
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete()}
              >
                Izbrisi sve
              </Button>
            </>
          ) : selectedIds.size === 1 ? (
            // Single video selected - show all actions
            <>
              <span className="text-sm text-muted-foreground mr-2">
                Izabrano: 1
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete()}
              >
                Izbrisi
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreview()}
              >
                Pregled
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayOnTV}
              >
                Pusti na TV
              </Button>
            </>
          ) : (
            // No selection - show generate button
            <Button onClick={() => navigate({ to: '/admin/videos/generacija' })}>
              Generiši video
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <VideoGrid
        videos={videos}
        selectedIds={selectedIds}
        onSelectVideo={handleSelectVideo}
        onPreview={handlePreview}
        onDelete={handleDelete}
      />

      {/* Preview Dialog */}
      <VideoPreviewDialog
        video={previewVideo}
        open={previewVideo !== null}
        onOpenChange={(open) => !open && handleClosePreview()}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obriši video</AlertDialogTitle>
            <AlertDialogDescription>
              Da li ste sigurni da želite da obrišete{' '}
              {deleteTarget === 'bulk'
                ? `${selectedIds.size} video(a)`
                : 'ovaj video'}?
              Ova akcija se ne može poništiti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Otkaži</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Brisanje...' : 'Obriši'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  )
}
