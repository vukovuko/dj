import { LumaAI } from "lumaai";
import { db } from "../db/index.ts";
import { videos } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import env from "../../env.ts";
import fs from "fs/promises";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

interface GenerateVideoPayload {
  videoId: string;
  prompt: string;
  duration: number;
  aspectRatio: "landscape" | "portrait";
  model?: string; // Luma AI model: ray-2, ray-flash-2, ray-1-6
}

/**
 * Generate thumbnail from video using FFmpeg
 */
async function generateThumbnail(
  videoPath: string,
  thumbnailPath: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg(videoPath)
      .screenshots({
        count: 1,
        folder: path.dirname(thumbnailPath),
        filename: path.basename(thumbnailPath),
        timestamps: ["00:00:01"], // Take screenshot at 1 second
        size: "640x360",
      })
      .on("end", () => {
        console.log("📸 Thumbnail generated successfully");
        resolve(true);
      })
      .on("error", (err) => {
        console.error("❌ FFmpeg thumbnail generation failed:", err.message);
        resolve(false);
      });
  });
}

/**
 * Background job: Generate video using Luma AI
 *
 * This job:
 * 1. Calls Luma AI API to generate video
 * 2. Polls for completion (every 5 seconds)
 * 3. Downloads the video file to public/videos/
 * 4. Generates thumbnail with FFmpeg (640x360)
 * 5. Updates database with URLs
 *
 * User experience:
 * - Request returns immediately (non-blocking)
 * - User can continue using app
 * - Client polling detects ready status (every 5s)
 */
const task = async (payload: any, helpers: any) => {
  const { videoId, prompt, duration, aspectRatio, model = "ray-2" } =
    payload as GenerateVideoPayload;

  helpers.logger.info(`Starting video generation for ${videoId} with model ${model}`);

  try {
    // Update status to generating
    await db
      .update(videos)
      .set({
        status: "generating",
        updatedAt: new Date(),
      })
      .where(eq(videos.id, videoId));

    // Check if Luma AI key is configured
    if (!env.LUMA_API_KEY) {
      console.warn("⚠️ LUMA_API_KEY not configured, using mock generation");

      // Mock generation (3 second delay)
      await new Promise((resolve) => setTimeout(resolve, 3000));

      await db
        .update(videos)
        .set({
          status: "ready",
          url: `https://placehold.co/1280x720/1f1f1f/808080?text=Generated+Video`,
          thumbnailUrl: `https://placehold.co/640x360/1f1f1f/808080?text=Video+Thumbnail`,
          updatedAt: new Date(),
        })
        .where(eq(videos.id, videoId));

      return;
    }

    // Initialize Luma AI client
    const luma = new LumaAI({ authToken: env.LUMA_API_KEY });

    // Create generation
    const generation = await luma.generations.create({
      prompt,
      model: model as any, // Use selected model (ray-2, ray-flash-2, ray-1-6)
      aspect_ratio: aspectRatio === "landscape" ? "16:9" : "9:16",
      resolution: "720p", // Options: 540p, 720p, 1080p, 4k
      duration: `${duration}s` as any, // Dynamic duration (5s, 9s, 10s)
    });

    // Ensure generation ID exists
    if (!generation.id) {
      throw new Error("Luma generation created without ID");
    }

    // Store Luma AI generation ID for tracking
    await db
      .update(videos)
      .set({
        externalId: generation.id,
        updatedAt: new Date(),
      })
      .where(eq(videos.id, videoId));

    // Poll for completion (max 10 minutes - 10s videos take longer than 5s)
    const maxAttempts = 120; // 120 attempts * 5 seconds = 10 minutes
    let attempts = 0;
    let completed = false;

    while (attempts < maxAttempts && !completed) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

      const status = await luma.generations.get(generation.id);

      if (status.state === "completed") {
        completed = true;

        // Get video URL from Luma
        const videoUrl = status.assets?.video;

        if (!videoUrl) {
          throw new Error("No video URL in completed generation");
        }

        // Download video file
        const videoResponse = await fetch(videoUrl);
        const videoBuffer = await videoResponse.arrayBuffer();

        // Save to public/videos
        const videoFileName = `${videoId}.mp4`;
        const videoPath = path.join(
          process.cwd(),
          "public",
          "videos",
          videoFileName,
        );

        await fs.writeFile(videoPath, Buffer.from(videoBuffer));

        // Generate thumbnail from video
        const thumbnailFileName = `${videoId}.jpg`;
        const thumbnailPath = path.join(
          process.cwd(),
          "public",
          "videos",
          "thumbnails",
          thumbnailFileName,
        );

        await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });

        const thumbnailGenerated = await generateThumbnail(
          videoPath,
          thumbnailPath,
        );

        const thumbnailUrl = thumbnailGenerated
          ? `/videos/thumbnails/${thumbnailFileName}`
          : `https://placehold.co/640x360/1f1f1f/808080?text=Video+Thumbnail`;

        // Update database
        await db
          .update(videos)
          .set({
            status: "ready",
            url: `/videos/${videoFileName}`,
            thumbnailUrl,
            updatedAt: new Date(),
          })
          .where(eq(videos.id, videoId));
        helpers.logger.info(
          `Video ${videoId} generation completed successfully`,
        );

        // Note: Client uses polling (every 5s) to detect ready status
        // Future: Could add WebSocket notification for instant updates
      } else if (status.state === "failed") {
        throw new Error(
          `Luma generation failed: ${status.failure_reason || "Unknown error"}`,
        );
      }

      attempts++;
    }

    if (!completed) {
      throw new Error("Video generation timed out after 5 minutes");
    }
  } catch (error) {
    helpers.logger.error(`Video ${videoId} generation failed`, { error });

    // Update status to failed
    await db
      .update(videos)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        updatedAt: new Date(),
      })
      .where(eq(videos.id, videoId));

    // Rethrow to mark job as failed (Graphile Worker will handle retries)
    throw error;
  }
};

export default task;
