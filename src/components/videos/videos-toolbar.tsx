import { Button } from "~/components/ui/button"
import { Eye, Tv } from "lucide-react"

interface VideosToolbarProps {
  selectedCount: number
  onPreview: () => void
  onPlayOnTV: () => void
}

export function VideosToolbar({
  selectedCount,
  onPreview,
  onPlayOnTV,
}: VideosToolbarProps) {
  const hasSelection = selectedCount > 0

  return (
    <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-lg mb-6">
      <div className="text-sm text-muted-foreground">
        Odabrano: <span className="font-medium text-foreground">{selectedCount}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onPreview}
          disabled={!hasSelection}
        >
          <Eye className="h-4 w-4 mr-2" />
          Pregled
        </Button>
        <Button
          size="sm"
          onClick={onPlayOnTV}
          disabled={!hasSelection}
        >
          <Tv className="h-4 w-4 mr-2" />
          Pusti na TV
        </Button>
      </div>
    </div>
  )
}
