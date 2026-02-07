import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { FileVideo, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { CampaignDialog } from "~/components/campaigns/campaign-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { VideoGrid } from "~/components/videos/video-grid";
import { VideoPreviewDialog } from "~/components/videos/video-preview-dialog";
import { VideosToolbar } from "~/components/videos/videos-toolbar";
import { authClient } from "~/lib/auth-client";
import { deleteVideos, getVideos, uploadVideo } from "~/queries/videos.server";

// ========== ROUTE ==========

export const Route = createFileRoute("/admin/videos/")({
  component: VideosPage,
  loader: async () => {
    return await getVideos();
  },
});

// ========== COMPONENT ==========

function VideosPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const videos = Route.useLoaderData();
  const { data: session } = authClient.useSession();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewVideo, setPreviewVideo] = useState<(typeof videos)[0] | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadAspectRatio, setUploadAspectRatio] = useState<
    "landscape" | "portrait"
  >("landscape");
  const [isUploading, setIsUploading] = useState(false);

  // Campaign dialog state
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [campaignVideoId, setCampaignVideoId] = useState<string | undefined>(
    undefined,
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        setUploadFile(file);
        if (!uploadName) {
          setUploadName(file.name.replace(/\.[^/.]+$/, ""));
        }
      }
    },
    [uploadName],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/mp4": [],
      "video/quicktime": [],
      "video/x-msvideo": [],
      "video/x-matroska": [],
      "video/webm": [],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!uploadFile || !uploadName || !session?.user?.id) {
      toast.error("Molimo popunite sva polja");
      return;
    }

    setIsUploading(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(uploadFile);
      });

      // Get video duration
      const video = document.createElement("video");
      video.preload = "metadata";
      const duration = await new Promise<number>((resolve) => {
        video.onloadedmetadata = () => resolve(Math.round(video.duration));
        video.src = URL.createObjectURL(uploadFile);
      });

      await uploadVideo({
        data: {
          userId: session.user.id,
          name: uploadName,
          duration,
          aspectRatio: uploadAspectRatio,
          fileBase64,
          fileName: uploadFile.name,
        },
      });

      toast.success("Video uspešno otpremljen!");
      setUploadDialogOpen(false);
      setUploadFile(null);
      setUploadName("");
      router.invalidate();
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Greška pri otpremanju videa");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectVideo = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handlePreview = (id?: string) => {
    const videoId = id || Array.from(selectedIds)[0];
    const video = videos.find((v) => v.id === videoId);

    if (!video) {
      toast.error("Video nije pronađen");
      return;
    }

    if (video.status !== "ready") {
      toast.error("Video nije spreman");
      return;
    }

    setPreviewVideo(video);
  };

  const handleClosePreview = () => {
    setPreviewVideo(null);
  };

  const handleDelete = (id?: string) => {
    setDeleteTarget(id || "bulk");
  };

  const confirmDelete = async () => {
    const idsToDelete =
      deleteTarget === "bulk" ? Array.from(selectedIds) : [deleteTarget!];

    setIsDeleting(true);
    try {
      const result = await deleteVideos({ data: { ids: idsToDelete } });
      toast.success(`Uspešno obrisano ${result.count} video(a)`);
      setSelectedIds(new Set());
      setDeleteTarget(null);
      router.invalidate();
    } catch (error) {
      console.error("Failed to delete videos:", error);
      toast.error("Greška pri brisanju videa");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePlayOnTV = () => {
    const videoId = Array.from(selectedIds)[0];
    const video = videos.find((v) => v.id === videoId);

    if (!video) {
      toast.error("Video nije pronađen");
      return;
    }

    if (video.status !== "ready") {
      toast.error("Video nije spreman");
      return;
    }

    // Open campaign dialog with preselected video
    setCampaignVideoId(videoId);
    setCampaignDialogOpen(true);
  };

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto p-4 md:p-6 max-w-7xl pb-24 md:pb-6">
        {/* Header with always-visible toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Biblioteka</h1>
            <p className="text-sm text-muted-foreground">
              Upravljanje video zapisima
            </p>
          </div>

          {/* Toolbar - desktop only */}
          <div className="hidden md:flex items-center gap-2">
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
                <Button variant="outline" size="sm" onClick={handlePlayOnTV}>
                  Pusti na TV
                </Button>
              </>
            ) : (
              // No selection - show generate and upload buttons
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setUploadDialogOpen(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Otpremi
                </Button>
                <Button
                  onClick={() => navigate({ to: "/admin/videos/generacija" })}
                >
                  Generiši video
                </Button>
              </div>
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

        {/* Mobile Sticky Toolbar - always visible on mobile */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-4 z-50">
          {selectedIds.size > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">
                Izabrano: {selectedIds.size}
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete()}
              >
                Izbrisi
              </Button>
              {selectedIds.size === 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview()}
                  >
                    Pregled
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePlayOnTV}>
                    Pusti na TV
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Otpremi
              </Button>
              <Button
                className="flex-1"
                onClick={() => navigate({ to: "/admin/videos/generacija" })}
              >
                Generiši video
              </Button>
            </div>
          )}
        </div>

        {/* Preview Dialog */}
        <VideoPreviewDialog
          video={previewVideo}
          open={previewVideo !== null}
          onOpenChange={(open) => !open && handleClosePreview()}
        />

        {/* Delete Confirmation */}
        <AlertDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Obriši video</AlertDialogTitle>
              <AlertDialogDescription>
                Da li ste sigurni da želite da obrišete{" "}
                {deleteTarget === "bulk"
                  ? `${selectedIds.size} video(a)`
                  : "ovaj video"}
                ? Ova akcija se ne može poništiti.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Otkaži
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Brisanje..." : "Obriši"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Upload Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Otpremi video</DialogTitle>
              <DialogDescription>
                Izaberite video fajl sa vašeg računara
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Video fajl</Label>
                <div
                  {...getRootProps()}
                  className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${
                    isDragActive
                      ? "border-muted-foreground bg-accent"
                      : uploadFile
                        ? "border-muted-foreground bg-accent/50"
                        : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  }
                `}
                >
                  <input {...getInputProps()} />
                  {uploadFile && !isDragActive ? (
                    <div className="space-y-2">
                      <FileVideo className="h-10 w-10 mx-auto text-foreground" />
                      <p className="font-medium">{uploadFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Kliknite ili prevucite da zamenite
                      </p>
                    </div>
                  ) : isDragActive ? (
                    <div className="space-y-2">
                      <Upload className="h-10 w-10 mx-auto text-foreground animate-bounce" />
                      <p className="font-medium">Pustite video ovde...</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                      <p className="font-medium">Prevucite video ovde</p>
                      <p className="text-sm text-muted-foreground">
                        ili kliknite da izaberete fajl
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="video-name">Naziv</Label>
                <Input
                  id="video-name"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="Unesite naziv videa"
                />
              </div>
              <div className="space-y-2">
                <Label>Orijentacija</Label>
                <Select
                  value={uploadAspectRatio}
                  onValueChange={(v) =>
                    setUploadAspectRatio(v as "landscape" | "portrait")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landscape">
                      Horizontalno (16:9)
                    </SelectItem>
                    <SelectItem value="portrait">Vertikalno (9:16)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setUploadDialogOpen(false)}
                disabled={isUploading}
              >
                Otkaži
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!uploadFile || !uploadName || isUploading}
              >
                {isUploading ? "Otpremanje..." : "Otpremi"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Campaign Dialog */}
        <CampaignDialog
          open={campaignDialogOpen}
          onOpenChange={(open) => {
            setCampaignDialogOpen(open);
            if (!open) setCampaignVideoId(undefined);
          }}
          videos={videos
            .filter((v) => v.status === "ready")
            .map((v) => ({
              id: v.id,
              name: v.name,
              thumbnailUrl: v.thumbnailUrl,
              duration: v.duration,
            }))}
          preselectedVideoId={campaignVideoId}
          onSuccess={() => {
            setCampaignDialogOpen(false);
            setCampaignVideoId(undefined);
            setSelectedIds(new Set());
          }}
        />
      </div>
    </div>
  );
}
