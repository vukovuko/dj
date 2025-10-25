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

// Generate video (mock implementation for now)
export const generateVideo = createServerFn({ method: "POST" })
  .inputValidator((data: {
    userId: string
    prompt: string
    duration: number
    aspectRatio: "landscape" | "portrait"
  }) => data)
  .handler(async ({ data }) => {
    // Create video record with status 'generating'
    const [video] = await db
      .insert(videos)
      .values({
        name: data.prompt.slice(0, 50),
        prompt: data.prompt,
        duration: data.duration,
        aspectRatio: data.aspectRatio,
        status: "generating",
        createdBy: data.userId,
      })
      .returning()

    // Mock: Simulate video generation with timeout
    // In production, this would create a Graphile Worker job
    setTimeout(async () => {
      await db
        .update(videos)
        .set({
          status: "ready",
          url: "https://placehold.co/1280x720/1f1f1f/808080?text=Generated+Video",
          thumbnailUrl: "https://placehold.co/640x360/1f1f1f/808080?text=Video+Thumbnail",
          updatedAt: new Date(),
        })
        .where(eq(videos.id, video.id))
    }, 3000)

    return video
  })

// Delete video(s)
export const deleteVideos = createServerFn({ method: "POST" })
  .inputValidator((data: { ids: string[] }) => data)
  .handler(async ({ data }) => {
    const deleted = await db
      .delete(videos)
      .where(inArray(videos.id, data.ids))
      .returning()

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
