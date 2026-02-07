import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CountdownOverlay } from "~/components/tv/countdown-overlay";
import { VideoPlayerOverlay } from "~/components/tv/video-player-overlay";
import {
  getActiveCampaign,
  subscribeToCampaignUpdates,
} from "~/queries/campaigns.server";
import {
  getTVDisplayProducts,
  subscribeToPriceUpdates,
} from "~/queries/products.server";

interface Product {
  id: string;
  name: string;
  categoryName: string | null;
  currentPrice: string;
  trend: "up" | "down";
}

interface CampaignState {
  status: "idle" | "countdown" | "playing";
  campaign: {
    id: string;
    videoId: string;
    videoName: string | null;
    videoUrl: string | null;
    videoThumbnailUrl: string | null;
    videoDuration: number | null;
    countdownSeconds: number;
    startedAt: Date | null;
  } | null;
  countdownRemaining: number;
}

export const Route = createFileRoute("/")({
  component: TVDisplay,
  loader: async () => {
    return await getTVDisplayProducts();
  },
});

function TVDisplay() {
  const initialData = Route.useLoaderData();
  const [products, setProducts] = useState(initialData);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Campaign state
  const [campaignState, setCampaignState] = useState<CampaignState>({
    status: "idle",
    campaign: null,
    countdownRemaining: 0,
  });
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const campaignReconnectRef = useRef<NodeJS.Timeout | null>(null);

  // Refresh product data
  const refreshProducts = async () => {
    try {
      const fresh = await getTVDisplayProducts();
      setProducts(fresh);
      setLastUpdated(new Date());
      console.log("📊 Products refreshed");
    } catch (error) {
      console.error("❌ Failed to refresh products:", error);
    }
  };

  // Set up real-time updates via Server-Sent Events (SSE)
  useEffect(() => {
    const connectSSE = async () => {
      try {
        // Get the SSE endpoint URL
        const response = await subscribeToPriceUpdates();
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          console.error("❌ No reader available for SSE stream");
          return;
        }

        console.log("🔌 Connected to price update stream");
        setIsConnected(true);

        // Read SSE stream
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);

                // Refresh products when price update notification received
                if (parsed.count !== undefined) {
                  await refreshProducts();
                }
              } catch (e) {
                // Ignore parse errors (e.g., keepalive pings)
              }
            }
          }
        }
      } catch (error) {
        console.error("❌ SSE connection error:", error);
        setIsConnected(false);

        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("🔄 Reconnecting to price update stream...");
          connectSSE();
        }, 5000);
      }
    };

    // Start SSE connection
    connectSSE();

    // Fallback polling every 60 seconds in case SSE fails
    fallbackIntervalRef.current = setInterval(async () => {
      if (!isConnected) {
        console.log("⏰ Fallback poll (SSE disconnected)");
        await refreshProducts();
      }
    }, 60000);

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
    };
  }, []);

  // Calculate remaining countdown seconds
  const calculateCountdownRemaining = useCallback(
    (startedAt: Date | string, countdownSeconds: number) => {
      const started = new Date(startedAt);
      const elapsed = Math.floor((Date.now() - started.getTime()) / 1000);
      return Math.max(0, countdownSeconds - elapsed);
    },
    [],
  );

  // Handle video end - reset to idle
  const handleVideoEnded = useCallback(() => {
    console.log("📺 Video ended, returning to idle");
    setCampaignState({
      status: "idle",
      campaign: null,
      countdownRemaining: 0,
    });
  }, []);

  // Campaign subscription
  useEffect(() => {
    const connectCampaignSSE = async () => {
      try {
        // First, check if there's an active campaign
        const activeCampaign = await getActiveCampaign();
        if (activeCampaign) {
          console.log("📺 Found active campaign:", activeCampaign.status);
          if (
            activeCampaign.status === "countdown" &&
            activeCampaign.startedAt
          ) {
            const remaining = calculateCountdownRemaining(
              activeCampaign.startedAt,
              activeCampaign.countdownSeconds,
            );
            setCampaignState({
              status: "countdown",
              campaign: {
                id: activeCampaign.id,
                videoId: activeCampaign.videoId,
                videoName: activeCampaign.videoName,
                videoUrl: activeCampaign.videoUrl,
                videoThumbnailUrl: activeCampaign.videoThumbnailUrl,
                videoDuration: activeCampaign.videoDuration,
                countdownSeconds: activeCampaign.countdownSeconds,
                startedAt: new Date(activeCampaign.startedAt),
              },
              countdownRemaining: remaining,
            });
          } else if (activeCampaign.status === "playing") {
            setCampaignState({
              status: "playing",
              campaign: {
                id: activeCampaign.id,
                videoId: activeCampaign.videoId,
                videoName: activeCampaign.videoName,
                videoUrl: activeCampaign.videoUrl,
                videoThumbnailUrl: activeCampaign.videoThumbnailUrl,
                videoDuration: activeCampaign.videoDuration,
                countdownSeconds: activeCampaign.countdownSeconds,
                startedAt: activeCampaign.startedAt
                  ? new Date(activeCampaign.startedAt)
                  : null,
              },
              countdownRemaining: 0,
            });
          }
        }

        // Subscribe to campaign updates via SSE
        const response = await subscribeToCampaignUpdates();
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          console.error("❌ No reader available for campaign SSE stream");
          return;
        }

        console.log("📺 Connected to campaign update stream");

        // Read SSE stream
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);
                console.log("📺 Campaign event received:", parsed.type);

                if (parsed.type === "COUNTDOWN_START") {
                  const campaign = parsed.campaign;
                  setCampaignState({
                    status: "countdown",
                    campaign: {
                      id: campaign.id,
                      videoId: campaign.videoId,
                      videoName: campaign.videoName,
                      videoUrl: campaign.videoUrl,
                      videoThumbnailUrl: campaign.videoThumbnailUrl,
                      videoDuration: campaign.videoDuration,
                      countdownSeconds: campaign.countdownSeconds,
                      startedAt: new Date(),
                    },
                    countdownRemaining: campaign.countdownSeconds,
                  });
                } else if (parsed.type === "VIDEO_PLAY") {
                  const campaign = parsed.campaign;
                  setCampaignState((prev) => ({
                    status: "playing",
                    campaign: prev.campaign || {
                      id: campaign.id,
                      videoId: campaign.videoId,
                      videoName: campaign.videoName,
                      videoUrl: campaign.videoUrl,
                      videoThumbnailUrl: campaign.videoThumbnailUrl,
                      videoDuration: campaign.videoDuration,
                      countdownSeconds: campaign.countdownSeconds,
                      startedAt: null,
                    },
                    countdownRemaining: 0,
                  }));
                } else if (
                  parsed.type === "VIDEO_END" ||
                  parsed.type === "CANCELLED"
                ) {
                  setCampaignState({
                    status: "idle",
                    campaign: null,
                    countdownRemaining: 0,
                  });
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (error) {
        console.error("❌ Campaign SSE connection error:", error);

        // Attempt to reconnect after 5 seconds
        campaignReconnectRef.current = setTimeout(() => {
          console.log("🔄 Reconnecting to campaign update stream...");
          connectCampaignSSE();
        }, 5000);
      }
    };

    // Start campaign SSE connection
    connectCampaignSSE();

    // Cleanup
    return () => {
      if (campaignReconnectRef.current) {
        clearTimeout(campaignReconnectRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [calculateCountdownRemaining]);

  // Countdown timer interval
  useEffect(() => {
    if (
      campaignState.status === "countdown" &&
      campaignState.countdownRemaining > 0
    ) {
      countdownIntervalRef.current = setInterval(() => {
        setCampaignState((prev) => {
          const newRemaining = prev.countdownRemaining - 1;
          if (newRemaining <= 0) {
            // Countdown finished - the server will send VIDEO_PLAY event
            return prev;
          }
          return {
            ...prev,
            countdownRemaining: newRemaining,
          };
        });
      }, 1000);

      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }
  }, [campaignState.status, campaignState.countdownRemaining > 0]);

  // Group products by category
  const grouped = products.reduce(
    (acc, product) => {
      const cat = product.categoryName || "Ostalo";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(product);
      return acc;
    },
    {} as Record<string, Product[]>,
  );

  const categories = Object.keys(grouped).sort();
  const leftCategory = categories[0];
  const rightCategory = categories[1];

  return (
    <div className="min-h-screen bg-neutral-900 text-gray-100 p-2 md:p-4 overflow-hidden">
      <div className="grid grid-cols-2 gap-2 md:gap-4 h-screen items-start">
        {/* Left */}
        {leftCategory && (
          <div>
            <h2
              className="text-xl md:text-5xl font-black mb-1 md:mb-2 text-center text-white py-2 md:py-4 px-3 md:px-6 rounded-lg uppercase tracking-wider shadow-lg"
              style={{ backgroundColor: "#06402B" }}
            >
              {leftCategory}
            </h2>
            <div className="space-y-1.5 md:space-y-4">
              {grouped[leftCategory].map((product) => (
                <div
                  key={product.id}
                  className={`flex justify-between items-center border-2 px-2 py-1.5 md:px-6 md:py-5 rounded-lg shadow-lg ${
                    product.trend === "up"
                      ? "border-emerald-700 bg-emerald-800 shadow-emerald-400/30"
                      : "border-red-500 shadow-red-400/30"
                  }`}
                  style={
                    product.trend === "down"
                      ? { backgroundColor: "rgb(189, 31, 31)" }
                      : undefined
                  }
                >
                  <h3 className="text-sm md:text-4xl font-black tracking-wide flex-1 text-white">
                    {product.name.toUpperCase()}
                  </h3>
                  <div className="flex items-center gap-1.5 md:gap-6 ml-2 md:ml-6">
                    <span className="text-sm md:text-4xl font-black text-white tabular-nums whitespace-nowrap">
                      {parseInt(parseFloat(product.currentPrice).toString())}{" "}
                      RSD
                    </span>
                    <div className="flex items-center gap-1 md:gap-2 shrink-0">
                      {product.trend === "up" ? (
                        <ArrowUp
                          className="w-4 h-4 md:w-8 md:h-8 text-emerald-500"
                          strokeWidth={2}
                        />
                      ) : (
                        <ArrowDown
                          className="w-4 h-4 md:w-8 md:h-8 text-rose-500"
                          strokeWidth={2}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right */}
        {rightCategory && (
          <div>
            <h2
              className="text-xl md:text-5xl font-black mb-1 md:mb-2 text-center text-white py-2 md:py-4 px-3 md:px-6 rounded-lg uppercase tracking-wider shadow-lg"
              style={{ backgroundColor: "#341539" }}
            >
              {rightCategory}
            </h2>
            <div className="space-y-1.5 md:space-y-4">
              {grouped[rightCategory].map((product) => (
                <div
                  key={product.id}
                  className={`flex justify-between items-center border-2 px-2 py-1.5 md:px-6 md:py-5 rounded-lg shadow-lg ${
                    product.trend === "up"
                      ? "border-emerald-700 bg-emerald-800 shadow-emerald-400/30"
                      : "border-red-500 shadow-red-400/30"
                  }`}
                  style={
                    product.trend === "down"
                      ? { backgroundColor: "rgb(189, 31, 31)" }
                      : undefined
                  }
                >
                  <h3 className="text-sm md:text-4xl font-black tracking-wide flex-1 text-white">
                    {product.name.toUpperCase()}
                  </h3>
                  <div className="flex items-center gap-1.5 md:gap-6 ml-2 md:ml-6">
                    <span className="text-sm md:text-4xl font-black text-white tabular-nums whitespace-nowrap">
                      {parseInt(parseFloat(product.currentPrice).toString())}{" "}
                      RSD
                    </span>
                    <div className="flex items-center gap-1 md:gap-2 shrink-0">
                      {product.trend === "up" ? (
                        <ArrowUp
                          className="w-4 h-4 md:w-8 md:h-8 text-emerald-500"
                          strokeWidth={2}
                        />
                      ) : (
                        <ArrowDown
                          className="w-4 h-4 md:w-8 md:h-8 text-rose-500"
                          strokeWidth={2}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Campaign Overlays */}
      {campaignState.status === "countdown" && campaignState.campaign && (
        <CountdownOverlay
          secondsRemaining={campaignState.countdownRemaining}
          totalSeconds={campaignState.campaign.countdownSeconds}
          videoName={campaignState.campaign.videoName || "Video"}
          videoThumbnail={campaignState.campaign.videoThumbnailUrl}
        />
      )}

      {campaignState.status === "playing" &&
        campaignState.campaign?.videoUrl && (
          <VideoPlayerOverlay
            videoUrl={campaignState.campaign.videoUrl}
            videoName={campaignState.campaign.videoName || "Video"}
            onEnded={handleVideoEnded}
          />
        )}
    </div>
  );
}
