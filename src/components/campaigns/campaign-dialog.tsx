import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
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
import { authClient } from "~/lib/auth-client";
import { createCampaign } from "~/queries/campaigns.server";

interface Video {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  duration: number | null;
}

interface CampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videos: Video[];
  onSuccess: () => void;
  preselectedVideoId?: string;
}

export function CampaignDialog({
  open,
  onOpenChange,
  videos,
  onSuccess,
  preselectedVideoId,
}: CampaignDialogProps) {
  const { data: session } = authClient.useSession();

  // Helper to get default time (now + 1 minute)
  const getDefaultTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const [selectedVideoId, setSelectedVideoId] = useState(
    preselectedVideoId || "",
  );
  const [scheduleType, setScheduleType] = useState<"now" | "later">("now");
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [scheduledTime, setScheduledTime] = useState(getDefaultTime());
  const [countdownSeconds, setCountdownSeconds] = useState("60");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeError, setTimeError] = useState("");

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSelectedVideoId(preselectedVideoId || "");
      setScheduleType("now");
      // Default to today's date
      setScheduledDate(new Date().toISOString().split("T")[0]);
      // Default to current time + 1 minute
      const now = new Date();
      now.setMinutes(now.getMinutes() + 1);
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      setScheduledTime(`${hours}:${minutes}`);
      setCountdownSeconds("60");
      setTimeError("");
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    if (!selectedVideoId) {
      toast.error("Izaberite video");
      return;
    }

    if (!session?.user?.id) {
      toast.error("Niste prijavljeni");
      return;
    }

    let scheduledAt: Date;

    if (scheduleType === "now") {
      // Schedule for 3 seconds from now (immediate)
      scheduledAt = new Date(Date.now() + 3 * 1000);
    } else {
      if (!scheduledDate || !scheduledTime) {
        toast.error("Unesite datum i vreme");
        return;
      }
      scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);

      if (isNaN(scheduledAt.getTime())) {
        toast.error("Unesite ispravan datum i vreme");
        return;
      }

      if (scheduledAt <= new Date()) {
        toast.error("Zakazano vreme mora biti u budućnosti");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await createCampaign({
        data: {
          videoId: selectedVideoId,
          scheduledAt: scheduledAt.toISOString(),
          countdownSeconds: parseInt(countdownSeconds),
          createdBy: session.user.id,
        },
      });

      toast.success(
        scheduleType === "now"
          ? "Kampanja kreirana! Video će se prikazati za nekoliko sekundi."
          : "Kampanja je zakazana!",
      );
      onSuccess();
    } catch (error) {
      console.error("Failed to create campaign:", error);
      toast.error("Greška pri kreiranju kampanje");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVideo = videos.find((v) => v.id === selectedVideoId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova kampanja</DialogTitle>
          <DialogDescription>
            Zakažite prikazivanje videa na TV ekranu
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Video Selection */}
          <div className="space-y-2">
            <Label>Video</Label>
            {videos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Nema videa za prikazivanje.{" "}
                <Link
                  to="/admin/videos/generacija"
                  className="text-primary underline"
                  onClick={() => onOpenChange(false)}
                >
                  Napravite video
                </Link>{" "}
                pa se vratite ovde.
              </p>
            ) : (
              <>
                <Select
                  value={selectedVideoId}
                  onValueChange={setSelectedVideoId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Izaberite video" />
                  </SelectTrigger>
                  <SelectContent>
                    {videos.map((video) => (
                      <SelectItem key={video.id} value={video.id}>
                        {video.name}
                        {video.duration && ` (${video.duration}s)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedVideo?.thumbnailUrl && (
                  <img
                    src={selectedVideo.thumbnailUrl}
                    alt={selectedVideo.name}
                    className="w-full h-32 object-cover rounded-lg mt-2"
                  />
                )}
              </>
            )}
          </div>

          {/* Schedule Type */}
          <div className="space-y-2">
            <Label>Kada prikazati</Label>
            <Select
              value={scheduleType}
              onValueChange={(v) => setScheduleType(v as "now" | "later")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="now">Odmah</SelectItem>
                <SelectItem value="later">Zakaži</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date/Time picker (only shown when scheduling for later) */}
          {scheduleType === "later" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date">Datum</Label>
                <Input
                  id="date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Vreme (24h)</Label>
                <div className="relative pb-5">
                  <Input
                    id="time"
                    type="text"
                    placeholder="HH:MM"
                    pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]"
                    value={scheduledTime}
                    aria-invalid={!!timeError}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^[0-9:]*$/.test(value)) {
                        setScheduledTime(value);
                        setTimeError("");
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      let hours = "";
                      let minutes = "";

                      // Handle "1924" or "924" format (no colon)
                      if (/^\d{3,4}$/.test(value)) {
                        if (value.length === 4) {
                          // "1924" -> "19:24"
                          hours = value.slice(0, 2);
                          minutes = value.slice(2);
                        } else {
                          // "924" -> "09:24"
                          hours = value.slice(0, 1).padStart(2, "0");
                          minutes = value.slice(1);
                        }
                      }
                      // Handle "19:24" or "9:5" format (with colon)
                      else {
                        const match = value.match(/^(\d{1,2}):(\d{1,2})$/);
                        if (match) {
                          hours = match[1].padStart(2, "0");
                          minutes = match[2].padStart(2, "0");
                        }
                      }

                      // Validate and set
                      if (
                        hours &&
                        minutes &&
                        parseInt(hours) < 24 &&
                        parseInt(minutes) < 60
                      ) {
                        setScheduledTime(`${hours}:${minutes}`);
                        setTimeError("");
                      } else if (value !== "") {
                        setTimeError("Unesite vreme u formatu HH:MM");
                      }
                    }}
                  />
                  {timeError && (
                    <p className="absolute left-0 top-full text-sm text-destructive">
                      {timeError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Countdown Duration */}
          <div className="space-y-2">
            <Label>Odbrojavanje pre videa</Label>
            <Select
              value={countdownSeconds}
              onValueChange={setCountdownSeconds}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Bez odbrojavanja</SelectItem>
                <SelectItem value="10">10 sekundi</SelectItem>
                <SelectItem value="30">30 sekundi</SelectItem>
                <SelectItem value="60">1 minut</SelectItem>
                <SelectItem value="120">2 minuta</SelectItem>
                <SelectItem value="300">5 minuta</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Odbrojavanje se prikazuje na TV-u pre početka videa
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Otkaži
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedVideoId || isSubmitting}
          >
            {isSubmitting
              ? "Kreiranje..."
              : scheduleType === "now"
                ? "Pusti odmah"
                : "Zakaži"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
