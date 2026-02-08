/**
 * Background job: Process video campaigns
 *
 * This job runs every 5 seconds and:
 * 1. Finds scheduled campaigns that should start countdown
 * 2. Finds countdown campaigns that should start playing
 * 3. Finds playing campaigns that should complete
 * 4. Sends notifications to TV display via SSE
 *
 * Status flow: scheduled → countdown → playing → completed
 */

import { and, eq, lte, or } from "drizzle-orm";
import { db, pool } from "../db/index.ts";
import { videoCampaigns, videos } from "../db/schema.ts";

// Send campaign notification via PostgreSQL NOTIFY
// This works across processes (worker -> web server)
async function notifyCampaign(
  type: "COUNTDOWN_START" | "VIDEO_PLAY" | "VIDEO_END" | "CANCELLED",
  campaign: {
    id: string;
    videoId: string;
    videoUrl?: string | null;
    videoName?: string | null;
    videoDuration?: number | null;
    countdownSeconds?: number;
  },
) {
  const payload = JSON.stringify({
    type,
    campaign,
    timestamp: new Date().toISOString(),
  });

  // Escape single quotes for PostgreSQL
  const escapedPayload = payload.replace(/'/g, "''");

  try {
    const client = await pool.connect();
    try {
      await client.query(`NOTIFY campaign_update, '${escapedPayload}'`);
      console.log(`📺 Sent NOTIFY: ${type} for campaign ${campaign.id}`);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`❌ Failed to send campaign notification: ${type}`, error);
  }
}

const task = async (payload: any, helpers: any) => {
  const now = new Date();

  try {
    // ========== 0. Check if there's already an active campaign ==========
    // Don't start a new campaign if one is already in countdown or playing
    const [activeCampaign] = await db
      .select({ id: videoCampaigns.id })
      .from(videoCampaigns)
      .where(
        or(
          eq(videoCampaigns.status, "countdown"),
          eq(videoCampaigns.status, "playing"),
        ),
      )
      .limit(1);

    // ========== 1. Start countdown for scheduled campaigns ==========
    // Find campaigns where scheduledAt <= now AND status = "scheduled"
    // Only if no campaign is currently active
    const campaignsToStart = activeCampaign
      ? []
      : await db
          .select({
            id: videoCampaigns.id,
            videoId: videoCampaigns.videoId,
            countdownSeconds: videoCampaigns.countdownSeconds,
            videoUrl: videos.url,
            videoName: videos.name,
            videoDuration: videos.duration,
          })
          .from(videoCampaigns)
          .leftJoin(videos, eq(videoCampaigns.videoId, videos.id))
          .where(
            and(
              eq(videoCampaigns.status, "scheduled"),
              lte(videoCampaigns.scheduledAt, now),
            ),
          )
          .limit(1); // Process one at a time to avoid conflicts

    for (const campaign of campaignsToStart) {
      // If countdown is 0, skip directly to playing
      if (campaign.countdownSeconds === 0) {
        await db
          .update(videoCampaigns)
          .set({
            status: "playing",
            startedAt: now,
            updatedAt: now,
          })
          .where(eq(videoCampaigns.id, campaign.id));

        helpers.logger.info(
          `📺 Campaign ${campaign.id} started playing (no countdown)`,
        );

        await notifyCampaign("VIDEO_PLAY", {
          id: campaign.id,
          videoId: campaign.videoId,
          videoUrl: campaign.videoUrl,
          videoName: campaign.videoName,
          videoDuration: campaign.videoDuration,
        });
      } else {
        // Start countdown
        await db
          .update(videoCampaigns)
          .set({
            status: "countdown",
            startedAt: now,
            updatedAt: now,
          })
          .where(eq(videoCampaigns.id, campaign.id));

        helpers.logger.info(
          `📺 Campaign ${campaign.id} countdown started (${campaign.countdownSeconds}s)`,
        );

        await notifyCampaign("COUNTDOWN_START", {
          id: campaign.id,
          videoId: campaign.videoId,
          videoUrl: campaign.videoUrl,
          videoName: campaign.videoName,
          videoDuration: campaign.videoDuration,
          countdownSeconds: campaign.countdownSeconds,
        });
      }
    }

    // ========== 2. Start video for countdown campaigns that finished countdown ==========
    const countdownCampaigns = await db
      .select({
        id: videoCampaigns.id,
        videoId: videoCampaigns.videoId,
        startedAt: videoCampaigns.startedAt,
        countdownSeconds: videoCampaigns.countdownSeconds,
        videoUrl: videos.url,
        videoName: videos.name,
        videoDuration: videos.duration,
      })
      .from(videoCampaigns)
      .leftJoin(videos, eq(videoCampaigns.videoId, videos.id))
      .where(eq(videoCampaigns.status, "countdown"));

    for (const campaign of countdownCampaigns) {
      if (!campaign.startedAt) continue;

      const countdownEndTime = new Date(
        campaign.startedAt.getTime() + campaign.countdownSeconds * 1000,
      );

      if (now >= countdownEndTime) {
        await db
          .update(videoCampaigns)
          .set({
            status: "playing",
            updatedAt: now,
          })
          .where(eq(videoCampaigns.id, campaign.id));

        helpers.logger.info(`📺 Campaign ${campaign.id} started playing`);

        await notifyCampaign("VIDEO_PLAY", {
          id: campaign.id,
          videoId: campaign.videoId,
          videoUrl: campaign.videoUrl,
          videoName: campaign.videoName,
          videoDuration: campaign.videoDuration,
        });
      }
    }

    // ========== 3. Complete playing campaigns when video ends ==========
    const playingCampaigns = await db
      .select({
        id: videoCampaigns.id,
        videoId: videoCampaigns.videoId,
        startedAt: videoCampaigns.startedAt,
        countdownSeconds: videoCampaigns.countdownSeconds,
        videoDuration: videos.duration,
      })
      .from(videoCampaigns)
      .leftJoin(videos, eq(videoCampaigns.videoId, videos.id))
      .where(eq(videoCampaigns.status, "playing"));

    for (const campaign of playingCampaigns) {
      if (!campaign.startedAt || !campaign.videoDuration) continue;

      // Calculate when video should end (startedAt + countdown + video duration)
      const videoStartTime = new Date(
        campaign.startedAt.getTime() + campaign.countdownSeconds * 1000,
      );
      const videoEndTime = new Date(
        videoStartTime.getTime() + campaign.videoDuration * 1000,
      );

      if (now >= videoEndTime) {
        await db
          .update(videoCampaigns)
          .set({
            status: "completed",
            completedAt: now,
            updatedAt: now,
          })
          .where(eq(videoCampaigns.id, campaign.id));

        helpers.logger.info(`📺 Campaign ${campaign.id} completed`);

        await notifyCampaign("VIDEO_END", {
          id: campaign.id,
          videoId: campaign.videoId,
        });
      }
    }
  } catch (error) {
    helpers.logger.error("📺 Campaign processing failed", { error });
    throw error;
  }
};

export default task;
