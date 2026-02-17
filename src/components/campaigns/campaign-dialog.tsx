import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

interface Product {
  id: string;
  name: string;
  currentPrice: string;
  minPrice: string;
  maxPrice: string;
  categoryName: string | null;
}

interface CampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videos: Video[];
  products: Product[];
  onSuccess: () => void;
  preselectedVideoId?: string;
}

export function CampaignDialog({
  open,
  onOpenChange,
  videos,
  products,
  onSuccess,
  preselectedVideoId,
}: CampaignDialogProps) {
  const { data: session } = authClient.useSession();

  const [selectedVideoId, setSelectedVideoId] = useState(
    preselectedVideoId || "",
  );
  const [videoSearch, setVideoSearch] = useState("");
  const [isVideoDropdownOpen, setIsVideoDropdownOpen] = useState(false);
  const videoSearchRef = useRef<HTMLDivElement>(null);
  const [scheduleType, setScheduleType] = useState<"now" | "later">("now");
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [scheduledTime, setScheduledTime] = useState("");
  const [countdownSeconds, setCountdownSeconds] = useState("60");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeError, setTimeError] = useState("");

  // Product highlight state
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productSearchRef = useRef<HTMLDivElement>(null);
  const [promotionalPrice, setPromotionalPrice] = useState("");
  const [highlightDuration, setHighlightDuration] = useState("5");

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        videoSearchRef.current &&
        !videoSearchRef.current.contains(e.target as Node)
      ) {
        setIsVideoDropdownOpen(false);
      }
      if (
        productSearchRef.current &&
        !productSearchRef.current.contains(e.target as Node)
      ) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredVideos = videos.filter((v) =>
    v.name.toLowerCase().includes(videoSearch.toLowerCase()),
  );

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()),
  );

  // Reset form when dialog opens (useEffect catches both parent-driven and internal opens)
  useEffect(() => {
    if (!open) return;
    setSelectedVideoId(preselectedVideoId || "");
    setVideoSearch("");
    setIsVideoDropdownOpen(false);
    setScheduleType("now");
    setScheduledDate(new Date().toISOString().split("T")[0]);
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    setScheduledTime(
      `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
    );
    setCountdownSeconds("60");
    setTimeError("");
    // Reset product highlight fields
    setSelectedProductId("");
    setProductSearch("");
    setIsProductDropdownOpen(false);
    setPromotionalPrice("");
    setHighlightDuration("5");
  }, [open, preselectedVideoId, videos]);

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

    // Validate product highlight fields
    if (selectedProductId && !promotionalPrice) {
      toast.error("Unesite novu cenu za istaknuti koktel");
      return;
    }
    if (selectedProductId && selectedProduct) {
      const priceNum = parseFloat(promotionalPrice);
      const minPrice = Math.round(parseFloat(selectedProduct.minPrice));
      const maxPrice = Math.round(parseFloat(selectedProduct.maxPrice));
      if (isNaN(priceNum) || priceNum <= 0) {
        toast.error("Cena mora biti pozitivan broj");
        return;
      }
      if (priceNum < minPrice || priceNum > maxPrice) {
        toast.error(`Cena mora biti između ${minPrice} i ${maxPrice} RSD`);
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
          ...(selectedProductId && {
            productId: selectedProductId,
            promotionalPrice: parseFloat(promotionalPrice),
            highlightDurationSeconds: parseInt(highlightDuration),
          }),
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
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova kampanja</DialogTitle>
          <DialogDescription>
            Zakažite prikazivanje videa na TV ekranu
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto min-h-0">
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
                {selectedVideoId && selectedVideo ? (
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                    {selectedVideo.thumbnailUrl && (
                      <img
                        src={selectedVideo.thumbnailUrl}
                        alt=""
                        className="w-10 h-6 object-cover rounded shrink-0"
                      />
                    )}
                    <span className="flex-1 text-sm truncate">
                      {selectedVideo.name}
                      {selectedVideo.duration && (
                        <span className="text-muted-foreground ml-1">
                          ({selectedVideo.duration}s)
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVideoId("");
                        setVideoSearch("");
                      }}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div ref={videoSearchRef} className="relative">
                    <Input
                      placeholder="Pretražite video..."
                      value={videoSearch}
                      onChange={(e) => {
                        setVideoSearch(e.target.value);
                        setIsVideoDropdownOpen(true);
                      }}
                      onFocus={() => setIsVideoDropdownOpen(true)}
                      autoFocus={!selectedVideoId}
                    />
                    {isVideoDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
                        {filteredVideos.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            Nema rezultata
                          </div>
                        ) : (
                          filteredVideos.map((video) => (
                            <button
                              key={video.id}
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent cursor-pointer text-left"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSelectedVideoId(video.id);
                                setVideoSearch("");
                                setIsVideoDropdownOpen(false);
                              }}
                            >
                              {video.thumbnailUrl && (
                                <img
                                  src={video.thumbnailUrl}
                                  alt=""
                                  className="w-10 h-6 object-cover rounded"
                                />
                              )}
                              <span>
                                {video.name}
                                {video.duration && (
                                  <span className="text-muted-foreground ml-1">
                                    ({video.duration}s)
                                  </span>
                                )}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {/* Product Highlight (optional) */}
          <div className="space-y-2 border-t pt-4">
            <Label>Istaknuti koktel</Label>
            <p className="text-xs text-muted-foreground">
              Opciono &mdash; koktel koji se ističe na TV-u nakon videa
            </p>

            {selectedProductId && selectedProduct ? (
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <span className="flex-1 text-sm truncate">
                  {selectedProduct.name}
                  <span className="text-muted-foreground ml-1">
                    ({Math.round(parseFloat(selectedProduct.currentPrice))} RSD)
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductId("");
                    setProductSearch("");
                    setPromotionalPrice("");
                  }}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div ref={productSearchRef} className="relative">
                <Input
                  placeholder="Pretražite koktel..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setIsProductDropdownOpen(true);
                  }}
                  onFocus={() => setIsProductDropdownOpen(true)}
                />
                {isProductDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
                    {filteredProducts.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Nema rezultata
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent cursor-pointer text-left"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedProductId(product.id);
                            setProductSearch("");
                            setIsProductDropdownOpen(false);
                          }}
                        >
                          <span className="truncate">{product.name}</span>
                          <span className="text-muted-foreground shrink-0">
                            {Math.round(parseFloat(product.currentPrice))} RSD
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Promotional price + duration (only when product selected) */}
            {selectedProductId && selectedProduct && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="promo-price" className="text-xs">
                    Nova cena (RSD)
                  </Label>
                  <Input
                    id="promo-price"
                    type="number"
                    min={Math.round(parseFloat(selectedProduct.minPrice))}
                    max={Math.round(parseFloat(selectedProduct.maxPrice))}
                    placeholder={Math.round(
                      parseFloat(selectedProduct.currentPrice),
                    ).toString()}
                    value={promotionalPrice}
                    onChange={(e) => setPromotionalPrice(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Min: {Math.round(parseFloat(selectedProduct.minPrice))}{" "}
                    &mdash; Max:{" "}
                    {Math.round(parseFloat(selectedProduct.maxPrice))} RSD
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Trajanje prikaza</Label>
                  <Select
                    value={highlightDuration}
                    onValueChange={setHighlightDuration}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 sekunde</SelectItem>
                      <SelectItem value="5">5 sekundi</SelectItem>
                      <SelectItem value="8">8 sekundi</SelectItem>
                      <SelectItem value="10">10 sekundi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
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
