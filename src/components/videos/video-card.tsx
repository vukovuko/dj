import { Card } from "~/components/ui/card"
import { Checkbox } from "~/components/ui/checkbox"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { Badge } from "~/components/ui/badge"
import { MoreVertical, Eye, Trash2, Loader2 } from "lucide-react"

interface VideoCardProps {
  video: {
    id: string
    name: string
    url: string | null
    thumbnailUrl: string | null
    duration: number
    aspectRatio: "landscape" | "portrait"
    status: "pending" | "generating" | "ready" | "failed"
    errorMessage: string | null
  }
  isSelected: boolean
  onSelect: (id: string, checked: boolean) => void
  onPreview: (id: string) => void
  onDelete: (id: string) => void
}

export function VideoCard({
  video,
  isSelected,
  onSelect,
  onPreview,
  onDelete,
}: VideoCardProps) {
  const getStatusBadge = () => {
    switch (video.status) {
      case "pending":
        return <Badge variant="secondary">Na čekanju</Badge>
      case "generating":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Generisanje...
          </Badge>
        )
      case "ready":
        return <Badge>Spreman</Badge>
      case "failed":
        return <Badge variant="destructive">Greška</Badge>
    }
  }

  const formatDuration = (seconds: number) => {
    return `${seconds}s`
  }

  const formatAspectRatio = (ratio: string) => {
    return ratio === "landscape" ? "Horizontalno" : "Vertikalno"
  }

  const canInteract = video.status === "ready"

  return (
    <Card className="relative overflow-hidden group">
      {/* Checkbox - top left */}
      <div className="absolute top-3 left-3 z-10">
        <div className="bg-background/80 backdrop-blur-sm rounded p-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(video.id, checked as boolean)}
            aria-label={`Izaberi ${video.name}`}
            disabled={!canInteract}
          />
        </div>
      </div>

      {/* Thumbnail */}
      <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
        {video.status === "ready" && video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.name}
            className="w-full h-full object-cover"
          />
        ) : video.status === "ready" && !video.thumbnailUrl ? (
          <img
            src="https://placehold.co/640x360/1f1f1f/808080?text=Video+Thumbnail"
            alt={video.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            {video.status === "generating" && (
              <>
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p className="text-sm">Generisanje...</p>
              </>
            )}
            {video.status === "pending" && (
              <p className="text-sm">Na čekanju</p>
            )}
            {video.status === "failed" && (
              <p className="text-sm text-destructive">Greška</p>
            )}
          </div>
        )}

        {/* Hover overlay for preview */}
        {canInteract && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onPreview(video.id)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Pregled
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-sm line-clamp-2 flex-1">
            {video.name}
          </h3>

          {/* 3-dot menu - bottom right */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mt-1"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Otvori meni</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onPreview(video.id)}
                disabled={!canInteract}
              >
                <Eye className="mr-2 h-4 w-4" />
                Pregled
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(video.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Obriši
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDuration(video.duration)}</span>
          <span>•</span>
          <span>{formatAspectRatio(video.aspectRatio)}</span>
        </div>

        {/* Status */}
        <div className="mt-2">{getStatusBadge()}</div>

        {/* Error message */}
        {video.status === "failed" && video.errorMessage && (
          <p className="mt-2 text-xs text-destructive line-clamp-2">
            {video.errorMessage}
          </p>
        )}
      </div>
    </Card>
  )
}
