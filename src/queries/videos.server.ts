// Server-only queries for videos
import { createServerFn } from "@tanstack/react-start"
import { db } from "~/db"
import { videos, videoGenerationChats, user } from "~/db/schema"
import { eq, desc, inArray } from "drizzle-orm"

// Get all videos with creator info
export const getVideos = createServerFn({ method: "GET" })
  .handler(async () => {
    const results = await db
      .select({
        id: videos.id,
        name: videos.name,
        prompt: videos.prompt,
        url: videos.url,
        thumbnailUrl: videos.thumbnailUrl,
        duration: videos.duration,
        aspectRatio: videos.aspectRatio,
        status: videos.status,
        errorMessage: videos.errorMessage,
        createdBy: videos.createdBy,
        createdAt: videos.createdAt,
        creatorName: user.name,
      })
      .from(videos)
      .leftJoin(user, eq(videos.createdBy, user.id))
      .orderBy(desc(videos.createdAt))

    return results
  })

// Get user's chat history
export const getUserChatHistory = createServerFn({ method: "GET" })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const [chatHistory] = await db
      .select()
      .from(videoGenerationChats)
      .where(eq(videoGenerationChats.userId, data.userId))
      .limit(1)

    if (!chatHistory) {
      // Create new chat history for user
      const [newChat] = await db
        .insert(videoGenerationChats)
        .values({
          userId: data.userId,
          messages: [],
        })
        .returning()

      return newChat
    }

    return chatHistory
  })

// Save chat message
export const saveChatMessage = createServerFn({ method: "POST" })
  .inputValidator((data: {
    userId: string
    message: {
      role: "user" | "assistant"
      content: string
      timestamp: string
      videoId?: string
    }
  }) => data)
  .handler(async ({ data }) => {
    // Get existing chat
    const [existingChat] = await db
      .select()
      .from(videoGenerationChats)
      .where(eq(videoGenerationChats.userId, data.userId))
      .limit(1)

    if (!existingChat) {
      // Create new chat with message
      const [newChat] = await db
        .insert(videoGenerationChats)
        .values({
          userId: data.userId,
          messages: [data.message],
        })
        .returning()

      return newChat
    }

    // Append message to existing chat
    const currentMessages = (existingChat.messages as any[]) || []
    const [updated] = await db
      .update(videoGenerationChats)
      .set({
        messages: [...currentMessages, data.message],
        updatedAt: new Date(),
      })
      .where(eq(videoGenerationChats.userId, data.userId))
      .returning()

    return updated
  })

// Generate video - queues background job for async processing
export const generateVideo = createServerFn({ method: "POST" })
  .inputValidator((data: {
    userId: string
    prompt: string
    duration: number
    aspectRatio: "landscape" | "portrait"
    model?: string // Optional for backward compatibility
  }) => data)
  .handler(async ({ data }) => {
    const { getWorkerUtils } = await import('../lib/worker.ts')

    // Create video record with status 'pending'
    const [video] = await db
      .insert(videos)
      .values({
        name: data.prompt.slice(0, 50),
        prompt: data.prompt,
        duration: data.duration,
        aspectRatio: data.aspectRatio,
        status: "pending",
        createdBy: data.userId,
      })
      .returning()

    // Queue background job for video generation
    // This returns immediately - user can continue using app!
    const workerUtils = await getWorkerUtils()
    await workerUtils.addJob('generate-video', {
      videoId: video.id,
      prompt: data.prompt,
      duration: data.duration,
      aspectRatio: data.aspectRatio,
      model: data.model || "ray-2", // Default to ray-2
    }, {
      maxAttempts: 3, // Retry up to 3 times on failure
    })

    // Release worker utils connection
    await workerUtils.release()

    console.log(`✅ Video generation job queued: ${video.id}`)

    return video
  })

// Delete video(s) - deletes from both database and disk
export const deleteVideos = createServerFn({ method: "POST" })
  .inputValidator((data: { ids: string[] }) => data)
  .handler(async ({ data }) => {
    // Get video records first to know which files to delete
    const videosToDelete = await db
      .select()
      .from(videos)
      .where(inArray(videos.id, data.ids))

    // Delete from database
    const deleted = await db
      .delete(videos)
      .where(inArray(videos.id, data.ids))
      .returning()

    // Delete video files from disk
    const fs = await import('fs/promises')
    const path = await import('path')

    for (const video of videosToDelete) {
      try {
        // Delete video file if it exists (not placeholder URL)
        if (video.url && !video.url.startsWith('http')) {
          const videoPath = path.join(process.cwd(), 'public', video.url)
          await fs.unlink(videoPath).catch(() => {
            console.log(`Video file not found: ${videoPath}`)
          })
        }

        // Delete thumbnail file if it exists (not placeholder URL)
        if (video.thumbnailUrl && !video.thumbnailUrl.startsWith('http')) {
          const thumbnailPath = path.join(process.cwd(), 'public', video.thumbnailUrl)
          await fs.unlink(thumbnailPath).catch(() => {
            console.log(`Thumbnail file not found: ${thumbnailPath}`)
          })
        }

        console.log(`🗑️ Deleted video files for: ${video.id}`)
      } catch (error) {
        console.error(`Failed to delete files for video ${video.id}:`, error)
        // Continue with other deletions even if one fails
      }
    }

    return { count: deleted.length }
  })

// Get single video by ID
export const getVideoById = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const [video] = await db
      .select()
      .from(videos)
      .where(eq(videos.id, data.id))
      .limit(1)

    if (!video) {
      throw new Error("Video not found")
    }

    return video
  })

// Play video on TV (WebSocket broadcast - future)
export const playVideoOnTV = createServerFn({ method: "POST" })
  .inputValidator((data: { videoId: string }) => data)
  .handler(async ({ data }) => {
    const [video] = await db
      .select()
      .from(videos)
      .where(eq(videos.id, data.videoId))
      .limit(1)

    if (!video) {
      throw new Error("Video not found")
    }

    if (video.status !== "ready") {
      throw new Error("Video is not ready")
    }

    // TODO: Broadcast via WebSocket
    // wsServer.broadcast('tv', {
    //   type: 'VIDEO_PLAY',
    //   videoUrl: video.url,
    //   duration: video.duration
    // })

    return { success: true, video }
  })
