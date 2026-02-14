// Server-only queries for video campaigns
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/db";
import { products, quickAds, user, videoCampaigns, videos } from "~/db/schema";

// Get all campaigns with video info, ordered by scheduledAt
export const getCampaigns = createServerFn({ method: "GET" }).handler(
  async () => {
    const results = await db
      .select({
        id: videoCampaigns.id,
        videoId: videoCampaigns.videoId,
        scheduledAt: videoCampaigns.scheduledAt,
        countdownSeconds: videoCampaigns.countdownSeconds,
        status: videoCampaigns.status,
        startedAt: videoCampaigns.startedAt,
        completedAt: videoCampaigns.completedAt,
        createdBy: videoCampaigns.createdBy,
        createdAt: videoCampaigns.createdAt,
        // Video info
        videoName: videos.name,
        videoUrl: videos.url,
        videoThumbnailUrl: videos.thumbnailUrl,
        videoDuration: videos.duration,
        videoAspectRatio: videos.aspectRatio,
        // Creator info
        creatorName: user.name,
        // Highlight info
        productId: videoCampaigns.productId,
        promotionalPrice: videoCampaigns.promotionalPrice,
        highlightDurationSeconds: videoCampaigns.highlightDurationSeconds,
        productName: products.name,
      })
      .from(videoCampaigns)
      .leftJoin(videos, eq(videoCampaigns.videoId, videos.id))
      .leftJoin(user, eq(videoCampaigns.createdBy, user.id))
      .leftJoin(products, eq(videoCampaigns.productId, products.id))
      .orderBy(desc(videoCampaigns.scheduledAt));

    return results;
  },
);

// Get active campaign (countdown or playing) for TV display
export const getActiveCampaign = createServerFn({ method: "GET" }).handler(
  async () => {
    const [active] = await db
      .select({
        id: videoCampaigns.id,
        videoId: videoCampaigns.videoId,
        scheduledAt: videoCampaigns.scheduledAt,
        countdownSeconds: videoCampaigns.countdownSeconds,
        status: videoCampaigns.status,
        startedAt: videoCampaigns.startedAt,
        // Video info
        videoName: videos.name,
        videoUrl: videos.url,
        videoThumbnailUrl: videos.thumbnailUrl,
        videoDuration: videos.duration,
        videoAspectRatio: videos.aspectRatio,
      })
      .from(videoCampaigns)
      .leftJoin(videos, eq(videoCampaigns.videoId, videos.id))
      .where(
        or(
          eq(videoCampaigns.status, "countdown"),
          eq(videoCampaigns.status, "playing"),
        ),
      )
      .limit(1);

    return active || null;
  },
);

// Get current TV state for polling fallback
// Returns what should currently be showing on TV
export const getTVState = createServerFn({ method: "GET" }).handler(
  async () => {
    // Check for active video campaign
    const [activeCampaign] = await db
      .select({
        id: videoCampaigns.id,
        videoId: videoCampaigns.videoId,
        status: videoCampaigns.status,
        startedAt: videoCampaigns.startedAt,
        countdownSeconds: videoCampaigns.countdownSeconds,
        videoName: videos.name,
        videoUrl: videos.url,
        videoThumbnailUrl: videos.thumbnailUrl,
        videoDuration: videos.duration,
      })
      .from(videoCampaigns)
      .leftJoin(videos, eq(videoCampaigns.videoId, videos.id))
      .where(
        or(
          eq(videoCampaigns.status, "countdown"),
          eq(videoCampaigns.status, "playing"),
        ),
      )
      .limit(1);

    if (activeCampaign) {
      return {
        type: activeCampaign.status as "countdown" | "playing",
        campaign: activeCampaign,
      };
    }

    // Check for currently-playing quick ad (lastPlayedAt + duration > now)
    const [activeQuickAd] = await db
      .select({
        id: quickAds.id,
        displayText: quickAds.displayText,
        displayPrice: quickAds.displayPrice,
        productId: quickAds.productId,
        promotionalPrice: quickAds.promotionalPrice,
        durationSeconds: quickAds.durationSeconds,
        lastPlayedAt: quickAds.lastPlayedAt,
        productName: products.name,
        currentPrice: products.currentPrice,
      })
      .from(quickAds)
      .leftJoin(products, eq(quickAds.productId, products.id))
      .where(
        sql`${quickAds.lastPlayedAt} IS NOT NULL AND ${quickAds.lastPlayedAt} + (${quickAds.durationSeconds} || ' seconds')::interval > NOW()`,
      )
      .orderBy(desc(quickAds.lastPlayedAt))
      .limit(1);

    if (activeQuickAd && activeQuickAd.lastPlayedAt) {
      const displayText =
        activeQuickAd.productName || activeQuickAd.displayText || "";
      const price = activeQuickAd.productId
        ? activeQuickAd.promotionalPrice
        : activeQuickAd.displayPrice;
      const elapsed = Math.floor(
        (Date.now() - new Date(activeQuickAd.lastPlayedAt).getTime()) / 1000,
      );
      const remaining = Math.max(0, activeQuickAd.durationSeconds - elapsed);

      return {
        type: "quick_ad" as const,
        quickAd: {
          id: activeQuickAd.id,
          displayText,
          price: price || null,
          oldPrice: null,
          durationSeconds: remaining,
        },
      };
    }

    return { type: "idle" as const };
  },
);

// Get upcoming scheduled campaigns
export const getUpcomingCampaigns = createServerFn({ method: "GET" }).handler(
  async () => {
    const results = await db
      .select({
        id: videoCampaigns.id,
        videoId: videoCampaigns.videoId,
        scheduledAt: videoCampaigns.scheduledAt,
        countdownSeconds: videoCampaigns.countdownSeconds,
        status: videoCampaigns.status,
        // Video info
        videoName: videos.name,
        videoThumbnailUrl: videos.thumbnailUrl,
        videoDuration: videos.duration,
      })
      .from(videoCampaigns)
      .leftJoin(videos, eq(videoCampaigns.videoId, videos.id))
      .where(eq(videoCampaigns.status, "scheduled"))
      .orderBy(videoCampaigns.scheduledAt);

    return results;
  },
);

// Create a new campaign
const createCampaignSchema = z.object({
  videoId: z.string().uuid(),
  scheduledAt: z
    .string()
    .refine((v) => !isNaN(new Date(v).getTime()), "Neispravan datum")
    .refine((v) => new Date(v) > new Date(), "Datum mora biti u budućnosti"),
  countdownSeconds: z
    .number()
    .refine((v) => [0, 10, 30, 60, 120, 300].includes(v)),
  createdBy: z.string().min(1),
  // Optional highlight fields
  productId: z.string().uuid().optional(),
  promotionalPrice: z.number().positive().optional(),
  highlightDurationSeconds: z.number().min(3).max(15).optional(),
});

export const createCampaign = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createCampaignSchema.parse(data))
  .handler(async ({ data }) => {
    const [campaign] = await db
      .insert(videoCampaigns)
      .values({
        videoId: data.videoId,
        scheduledAt: new Date(data.scheduledAt),
        countdownSeconds: data.countdownSeconds,
        createdBy: data.createdBy,
        productId: data.productId,
        promotionalPrice: data.promotionalPrice?.toString(),
        highlightDurationSeconds: data.highlightDurationSeconds,
      })
      .returning();

    console.log(`✅ Campaign created: ${campaign.id}`);
    return campaign;
  });

// Cancel a scheduled campaign
export const cancelCampaign = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const [updated] = await db
      .update(videoCampaigns)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(videoCampaigns.id, data.id))
      .returning();

    if (!updated) {
      throw new Error("Campaign not found");
    }

    // Send notification to TV
    await notifyCampaignUpdate("CANCELLED", updated.id);

    console.log(`❌ Campaign cancelled: ${data.id}`);
    return updated;
  });

// Update campaign status (used by background job)
export const updateCampaignStatus = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      status: "scheduled" | "countdown" | "playing" | "completed" | "cancelled";
      startedAt?: string;
      completedAt?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const updateData: Record<string, unknown> = {
      status: data.status,
      updatedAt: new Date(),
    };

    if (data.startedAt) {
      updateData.startedAt = new Date(data.startedAt);
    }
    if (data.completedAt) {
      updateData.completedAt = new Date(data.completedAt);
    }

    const [updated] = await db
      .update(videoCampaigns)
      .set(updateData)
      .where(eq(videoCampaigns.id, data.id))
      .returning();

    return updated;
  });

// Helper function to send PostgreSQL NOTIFY for campaign updates
async function notifyCampaignUpdate(type: string, campaignId: string) {
  const payload = JSON.stringify({
    type,
    campaignId,
    timestamp: new Date().toISOString(),
  });
  // NOTIFY doesn't support parameterized queries, must use raw SQL
  const escapedPayload = payload.replace(/'/g, "''");
  await db.execute(sql.raw(`NOTIFY campaign_update, '${escapedPayload}'`));
}

// SSE subscription for campaign updates (TV display)
export const subscribeToCampaignUpdates = createServerFn({
  method: "GET",
}).handler(async () => {
  // Import the campaign notifications module
  const { initializeCampaignListener, addClient, removeClient } = await import(
    "~/lib/campaign-notifications"
  );

  // Initialize PostgreSQL LISTEN if not already done
  await initializeCampaignListener();

  const stream = new ReadableStream({
    start(controller) {
      // Add this client to the broadcast list
      addClient(controller);

      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));

      // Send keepalive ping every 30 seconds to prevent connection timeout
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // Client disconnected, clean up
          clearInterval(pingInterval);
          removeClient(controller);
        }
      }, 30000);

      // Store interval ID so we can clear it on cancel
      (controller as any).pingInterval = pingInterval;
    },
    cancel(controller) {
      // Client disconnected, clean up
      const pingInterval = (controller as any).pingInterval;
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      removeClient(controller);
      console.log("Campaign SSE client disconnected");
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
