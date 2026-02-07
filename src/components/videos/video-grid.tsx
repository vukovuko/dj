import { useNavigate } from "@tanstack/react-router";
import { Video } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { VideoCard } from "./video-card";

interface VideoGridProps {
  videos: Array<{
    id: string;
    name: string;
    url: string | null;
    thumbnailUrl: string | null;
    duration: number;
    aspectRatio: "landscape" | "portrait";
    status: "pending" | "generating" | "ready" | "failed";
    errorMessage: string | null;
  }>;
  selectedIds: Set<string>;
  onSelectVideo: (id: string, checked: boolean) => void;
  onPreview: (id: string) => void;
  onDelete: (id: string) => void;
}

export function VideoGrid({
  videos,
  selectedIds,
  onSelectVideo,
  onPreview,
  onDelete,
}: VideoGridProps) {
  const navigate = useNavigate();

  if (videos.length === 0) {
    return (
      <Empty className="border rounded-lg py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Video className="h-12 w-12" />
          </EmptyMedia>
          <EmptyTitle>Nema videa</EmptyTitle>
          <EmptyDescription>
            Kreirajte prvi video koristeći AI generaciju
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => navigate({ to: "/admin/videos/generacija" })}>
            Generiši video
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          isSelected={selectedIds.has(video.id)}
          onSelect={onSelectVideo}
          onPreview={onPreview}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
