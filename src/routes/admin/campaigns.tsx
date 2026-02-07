import { createFileRoute, useRouter } from "@tanstack/react-router";
import { format } from "date-fns";
import { sr } from "date-fns/locale/sr";
import {
  Calendar,
  CheckCircle,
  Clock,
  Play,
  Plus,
  Timer,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  cancelCampaign,
  getCampaigns,
  subscribeToCampaignUpdates,
} from "~/queries/campaigns.server";
import { getVideos } from "~/queries/videos.server";

export const Route = createFileRoute("/admin/campaigns")({
  component: CampaignsPage,
  loader: async () => {
    const [campaigns, videos] = await Promise.all([
      getCampaigns(),
      getVideos(),
    ]);
    return { campaigns, videos };
  },
});

function CampaignsPage() {
  const router = useRouter();
  const { campaigns, videos } = Route.useLoaderData();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(10);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to real-time campaign updates
  useEffect(() => {
    let aborted = false;

    const connectSSE = async () => {
      if (aborted) return;

      try {
        const response = await subscribeToCampaignUpdates();
        if (aborted) return;

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          // Retry connection if reader not available
          reconnectTimeoutRef.current = setTimeout(connectSSE, 3000);
          return;
        }

        while (!aborted) {
          const { value, done } = await reader.read();
          if (done || aborted) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(line.slice(6));
                // Refresh data when campaign status changes
                if (
                  [
                    "COUNTDOWN_START",
                    "VIDEO_PLAY",
                    "VIDEO_END",
                    "CANCELLED",
                  ].includes(parsed.type)
                ) {
                  router.invalidate();
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (error) {
        if (aborted) return;
        console.error("Campaign SSE error:", error);
        // Reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(connectSSE, 5000);
      }
    };

    // Small delay before first connection to let page fully load
    reconnectTimeoutRef.current = setTimeout(connectSSE, 500);

    return () => {
      aborted = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [router]);

  // Filter campaigns by status
  const activeCampaign = campaigns.find(
    (c) => c.status === "countdown" || c.status === "playing",
  );
  const scheduledCampaigns = campaigns.filter((c) => c.status === "scheduled");
  const completedCampaigns = campaigns.filter(
    (c) => c.status === "completed" || c.status === "cancelled",
  );

  // Only show ready videos for selection
  const readyVideos = videos.filter((v) => v.status === "ready");

  const handleCancelCampaign = async () => {
    if (!cancelTarget) return;

    setIsCancelling(true);
    try {
      await cancelCampaign({ data: { id: cancelTarget } });
      toast.success("Kampanja je otkazana");
      setCancelTarget(null);
      router.invalidate();
    } catch (error) {
      console.error("Failed to cancel campaign:", error);
      toast.error("Greška pri otkazivanju kampanje");
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "playing":
        return <Badge className="bg-emerald-500">Prikazuje se</Badge>;
      case "countdown":
        return <Badge className="bg-amber-500">Odbrojavanje</Badge>;
      case "scheduled":
        return <Badge variant="outline">Zakazano</Badge>;
      case "completed":
        return <Badge variant="secondary">Završeno</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Otkazano</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatScheduledTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = d.getTime() - now.getTime();

    if (diff < 0) {
      return format(d, "dd.MM.yyyy HH:mm", { locale: sr });
    }

    if (diff < 24 * 60 * 60 * 1000) {
      return `Danas u ${format(d, "HH:mm")}`;
    }

    return format(d, "dd.MM. HH:mm", { locale: sr });
  };

  const formatCountdown = (seconds: number) => {
    if (seconds === 0) return "Bez odbrojavanja";
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}min`;
  };

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto p-4 md:p-6 max-w-5xl pb-24 md:pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Kampanje</h1>
            <p className="text-sm text-muted-foreground">
              Zakazivanje i praćenje video kampanja na TV ekranu
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova kampanja
          </Button>
        </div>

        {/* Active Campaign */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Play className="h-5 w-5 text-emerald-500" />
              Trenutno
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeCampaign ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  {activeCampaign.videoThumbnailUrl && (
                    <img
                      src={activeCampaign.videoThumbnailUrl}
                      alt={activeCampaign.videoName || "Video"}
                      className="w-20 h-12 object-cover rounded"
                    />
                  )}
                  <div>
                    <p className="font-medium">
                      {activeCampaign.videoName || "Video"}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {getStatusBadge(activeCampaign.status)}
                      {activeCampaign.videoDuration && (
                        <span>Trajanje: {activeCampaign.videoDuration}s</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setCancelTarget(activeCampaign.id)}
                >
                  Prekini
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Nema aktivne kampanje
              </p>
            )}
          </CardContent>
        </Card>

        {/* Scheduled Campaigns */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Zakazano ({scheduledCampaigns.length})
            </CardTitle>
            <CardDescription>
              Kampanje koje čekaju na prikazivanje
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scheduledCampaigns.length > 0 ? (
              <div className="space-y-3">
                {scheduledCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      {campaign.videoThumbnailUrl && (
                        <img
                          src={campaign.videoThumbnailUrl}
                          alt={campaign.videoName || "Video"}
                          className="w-16 h-10 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium">
                          {campaign.videoName || "Video"}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatScheduledTime(campaign.scheduledAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Timer className="h-3.5 w-3.5" />
                            {formatCountdown(campaign.countdownSeconds)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCancelTarget(campaign.id)}
                    >
                      Otkaži
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Nema zakazanih kampanja
              </p>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
              Istorija
            </CardTitle>
            <CardDescription>Prethodne kampanje</CardDescription>
          </CardHeader>
          <CardContent>
            {completedCampaigns.length > 0 ? (
              <div className="space-y-2">
                {completedCampaigns.slice(0, historyLimit).map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 px-3 bg-muted/30 rounded"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm">
                        {campaign.videoName || "Video"}
                      </span>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {campaign.completedAt
                        ? format(
                            new Date(campaign.completedAt),
                            "dd.MM. HH:mm",
                            { locale: sr },
                          )
                        : campaign.scheduledAt
                          ? format(
                              new Date(campaign.scheduledAt),
                              "dd.MM. HH:mm",
                              { locale: sr },
                            )
                          : "-"}
                    </span>
                  </div>
                ))}
                {completedCampaigns.length > historyLimit && (
                  <Button
                    variant="ghost"
                    className="w-full mt-2"
                    onClick={() => setHistoryLimit((prev) => prev + 20)}
                  >
                    Prikaži još ({completedCampaigns.length - historyLimit}{" "}
                    preostalo)
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Nema prethodnih kampanja
              </p>
            )}
          </CardContent>
        </Card>

        {/* Create Campaign Dialog */}
        <CampaignDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          videos={readyVideos}
          onSuccess={() => {
            setCreateDialogOpen(false);
            router.invalidate();
          }}
        />

        {/* Cancel Confirmation Dialog */}
        <AlertDialog
          open={cancelTarget !== null}
          onOpenChange={(open) => !open && setCancelTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Otkaži kampanju</AlertDialogTitle>
              <AlertDialogDescription>
                Da li ste sigurni da želite da otkažete ovu kampanju?
                {activeCampaign?.id === cancelTarget &&
                  " Video će prestati da se prikazuje."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isCancelling}>
                Nazad
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelCampaign}
                disabled={isCancelling}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isCancelling ? "Otkazivanje..." : "Otkaži kampanju"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
