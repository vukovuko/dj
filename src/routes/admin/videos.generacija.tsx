import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { GenerationChat } from '~/components/videos/generation-chat'
import { toast } from 'sonner'
import {
  getUserChatHistory,
  saveChatMessage,
  generateVideo,
  getVideoById,
} from '~/queries/videos.server'
import { authClient } from '~/lib/auth-client'

// ========== ROUTE ==========

export const Route = createFileRoute('/admin/videos/generacija')({
  component: GeneracijaPage,
})

// ========== TYPES ==========

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  videoId?: string
}

// ========== COMPONENT ==========

function GeneracijaPage() {
  const router = useRouter()
  const { data: session } = authClient.useSession()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load chat history on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!session?.user?.id) return

      try {
        const chatHistory = await getUserChatHistory({
          data: { userId: session.user.id }
        })
        setMessages((chatHistory.messages as ChatMessage[]) || [])
      } catch (error) {
        console.error('Failed to load chat history:', error)
        toast.error('Greška pri učitavanju istorije razgovora')
      } finally {
        setIsLoading(false)
      }
    }

    loadChatHistory()
  }, [session?.user?.id])

  const handleSendMessage = async (content: string) => {
    if (!session?.user?.id) {
      toast.error('Niste prijavljeni')
      return
    }

    const userId = session.user.id

    // 1. Create and save user message
    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])

    try {
      await saveChatMessage({
        data: { userId, message: userMessage }
      })
    } catch (error) {
      console.error('Failed to save user message:', error)
      toast.error('Greška pri čuvanju poruke')
      return
    }

    // 2. Start video generation
    setIsGenerating(true)

    try {
      // Call generateVideo API
      const video = await generateVideo({
        data: {
          userId,
          prompt: content,
          duration: 30, // Default duration
          aspectRatio: 'landscape', // Default aspect ratio
        }
      })

      // 3. Show loading message
      const loadingMessage: ChatMessage = {
        role: 'assistant',
        content: 'Generisanje videa u toku...',
        timestamp: new Date().toISOString(),
      }

      setMessages(prev => [...prev, loadingMessage])

      // 4. Poll for video completion (mock: wait 3.5 seconds)
      // In production, this would use WebSocket or polling
      await new Promise(resolve => setTimeout(resolve, 3500))

      // 5. Fetch the completed video
      const completedVideo = await getVideoById({ data: { id: video.id } })

      // 6. Replace loading message with success
      const successMessage: ChatMessage = {
        role: 'assistant',
        content: completedVideo.status === 'ready'
          ? 'Video je uspešno generisan! 🎥'
          : 'Video je u obradi...',
        timestamp: new Date().toISOString(),
        videoId: video.id,
      }

      setMessages(prev => [
        ...prev.slice(0, -1), // Remove loading message
        successMessage
      ])

      await saveChatMessage({
        data: { userId, message: successMessage }
      })

      // Invalidate to refresh video library
      router.invalidate()

      if (completedVideo.status === 'ready') {
        toast.success('Video je spreman!')
      }

    } catch (error) {
      console.error('Failed to generate video:', error)

      // Remove loading message if exists
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1]
        if (lastMessage?.role === 'assistant' && lastMessage.content.includes('Generisanje')) {
          return prev.slice(0, -1)
        }
        return prev
      })

      // Add error message
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Došlo je do greške pri generisanju videa. Molimo pokušajte ponovo.',
        timestamp: new Date().toISOString(),
      }

      setMessages(prev => [...prev, errorMessage])

      await saveChatMessage({
        data: { userId, message: errorMessage }
      }).catch(console.error)

      toast.error('Greška pri generisanju videa')
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Učitavanje...</div>
      </div>
    )
  }

  return (
    <GenerationChat
      messages={messages}
      isGenerating={isGenerating}
      onSendMessage={handleSendMessage}
    />
  )
}
