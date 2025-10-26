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
  const { videoId, prompt, duration, aspectRatio } =
    payload as GenerateVideoPayload;

  console.log(`🎬 Generating video: ${videoId}`);
  console.log(
    `   📋 Payload: prompt="${prompt.slice(0, 50)}...", duration=${duration}, aspect=${aspectRatio}`,
  );
  helpers.logger.info(`Starting video generation for ${videoId}`);

  try {
    // Update status to generating
    console.log(`   💾 Updating DB status to 'generating'...`);
    await db
      .update(videos)
      .set({
        status: "generating",
        updatedAt: new Date(),
      })
      .where(eq(videos.id, videoId));
    console.log(`   ✓ DB updated successfully`);

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

      console.log(`✅ Mock video generated: ${videoId}`);
      return;
    }

    // Initialize Luma AI client
    const luma = new LumaAI({ authToken: env.LUMA_API_KEY });

    // Create generation
    console.log(`📡 Calling Luma AI for ${videoId}...`);
    console.log(`   🔧 Settings: model=ray-2, resolution=720p, duration=5s, aspect=${aspectRatio === "landscape" ? "16:9" : "9:16"}`);

    const generation = await luma.generations.create({
      prompt,
      model: "ray-2",
      aspect_ratio: aspectRatio === "landscape" ? "16:9" : "9:16",
      resolution: "720p", // Options: 540p, 720p, 1080p, 4k
      duration: "5s", // Options: 5s ($0.25), 9s ($0.45), 10s ($0.50)
    });

    console.log(`   ✓ Luma API responded successfully`);
    console.log(`📝 Luma generation created: ${generation.id}`);

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
      console.log(`🔄 Luma status (attempt ${attempts + 1}): ${status.state}`);

      if (status.state === "completed") {
        completed = true;

        // Get video URL from Luma
        const videoUrl = status.assets?.video;

        if (!videoUrl) {
          throw new Error("No video URL in completed generation");
        }

        console.log(`📥 Downloading video: ${videoUrl}`);

        // Download video file
        console.log(`   ⬇️  Fetching video from Luma CDN...`);
        const videoResponse = await fetch(videoUrl);
        console.log(`   ✓ Fetch complete, status: ${videoResponse.status}`);

        const videoBuffer = await videoResponse.arrayBuffer();
        console.log(`   ✓ Buffer size: ${(videoBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`);

        // Save to public/videos
        const videoFileName = `${videoId}.mp4`;
        const videoPath = path.join(
          process.cwd(),
          "public",
          "videos",
          videoFileName,
        );

        console.log(`   💾 Writing to: ${videoPath}`);
        await fs.writeFile(videoPath, Buffer.from(videoBuffer));

        console.log(`   ✓ Video file saved successfully`);
        console.log(`💾 Video saved: ${videoPath}`);

        // Generate thumbnail from video
        console.log("📸 Generating thumbnail...");
        const thumbnailFileName = `${videoId}.jpg`;
        const thumbnailPath = path.join(
          process.cwd(),
          "public",
          "videos",
          "thumbnails",
          thumbnailFileName,
        );

        console.log(`   📁 Ensuring thumbnails dir exists...`);
        await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });

        console.log(`   🎞️  Extracting frame with FFmpeg...`);
        const thumbnailGenerated = await generateThumbnail(
          videoPath,
          thumbnailPath,
        );

        if (thumbnailGenerated) {
          console.log(`   ✓ Thumbnail saved to: ${thumbnailPath}`);
        } else {
          console.log(`   ⚠️  FFmpeg failed, using placeholder`);
        }

        const thumbnailUrl = thumbnailGenerated
          ? `/videos/thumbnails/${thumbnailFileName}`
          : `https://placehold.co/640x360/1f1f1f/808080?text=Video+Thumbnail`;

        // Update database
        console.log(`   💾 Updating DB to 'ready' status...`);
        await db
          .update(videos)
          .set({
            status: "ready",
            url: `/videos/${videoFileName}`,
            thumbnailUrl,
            updatedAt: new Date(),
          })
          .where(eq(videos.id, videoId));

        console.log(`   ✓ DB updated - Video is ready!`);
        console.log(`✅ Video generation complete: ${videoId}`);
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
    console.error(`❌ Video generation failed for ${videoId}`);
    console.error(`   🔴 Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`   🔴 Error message: ${error instanceof Error ? error.message : String(error)}`);

    if (error instanceof Error && error.stack) {
      console.error(`   🔴 Stack trace:`);
      console.error(error.stack);
    }

    helpers.logger.error(`Video ${videoId} generation failed`, { error });

    // Update status to failed
    console.log(`   💾 Updating DB to 'failed' status...`);
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
