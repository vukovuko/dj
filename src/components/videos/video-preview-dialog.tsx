import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

interface VideoPreviewDialogProps {
  video: {
    id: string;
    name: string;
    url: string | null;
    prompt: string;
    duration: number;
    aspectRatio: "landscape" | "portrait";
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoPreviewDialog({
  video,
  open,
  onOpenChange,
}: VideoPreviewDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-pause when dialog closes
  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.pause();
    }
  }, [open]);

  if (!video) return null;

  const formatDuration = (seconds: number) => {
    return `${seconds}s`;
  };

  const formatAspectRatio = (ratio: string) => {
    return ratio === "landscape" ? "Horizontalno" : "Vertikalno";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl">
        <DialogHeader>
          <DialogTitle>{video.name}</DialogTitle>
          <DialogDescription>
            {formatDuration(video.duration)} •{" "}
            {formatAspectRatio(video.aspectRatio)}
          </DialogDescription>
        </DialogHeader>

        {/* Video Player */}
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          {video.url ? (
            <video
              ref={videoRef}
              src={video.url}
              controls
              className="w-full h-full"
              preload="metadata"
            >
              Vaš pretraživač ne podržava video reprodukciju.
            </video>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              Video nije dostupan
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="mt-4 space-y-2">
          <div>
            <span className="text-sm font-medium">Prompt:</span>
            <p className="text-sm text-muted-foreground mt-1">{video.prompt}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
