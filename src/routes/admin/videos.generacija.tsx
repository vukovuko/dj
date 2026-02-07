import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GenerationChat } from "~/components/videos/generation-chat";
import {
  durationToSeconds,
  type LumaModel,
  type VideoDuration,
} from "~/config/luma-models";
import { authClient } from "~/lib/auth-client";
import {
  generateVideo,
  getUserChatHistory,
  getVideoById,
  saveChatMessage,
} from "~/queries/videos.server";

// ========== ROUTE ==========

export const Route = createFileRoute("/admin/videos/generacija")({
  component: GeneracijaPage,
});

// ========== TYPES ==========

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  videoId?: string;
}

// ========== COMPONENT ==========

function GeneracijaPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingVideoId, setPendingVideoId] = useState<string | null>(null);

  // Load chat history on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!session?.user?.id) return;

      try {
        const chatHistory = await getUserChatHistory({
          data: { userId: session.user.id },
        });
        setMessages((chatHistory.messages as ChatMessage[]) || []);
      } catch (error) {
        console.error("Failed to load chat history:", error);
        toast.error("Greška pri učitavanju istorije razgovora");
      } finally {
        setIsLoading(false);
      }
    };

    loadChatHistory();
  }, [session?.user?.id]);

  // Poll for video completion if there's a pending video
  useEffect(() => {
    if (!pendingVideoId) return;

    const pollInterval = setInterval(async () => {
      try {
        const video = await getVideoById({ data: { id: pendingVideoId } });

        if (video.status === "ready") {
          // Video is ready! Update the last message
          const successMessage: ChatMessage = {
            role: "assistant",
            content: "Video je uspešno generisan! 🎥",
            timestamp: new Date().toISOString(),
            videoId: video.id,
          };

          // Update the last assistant message
          setMessages((prev) => {
            const newMessages = [...prev];
            // Find the last assistant message and update it
            for (let i = newMessages.length - 1; i >= 0; i--) {
              if (newMessages[i].role === "assistant") {
                newMessages[i] = successMessage;
                break;
              }
            }
            return newMessages;
          });

          await saveChatMessage({
            data: { userId: session!.user!.id, message: successMessage },
          });

          toast.success("Video je spreman!");
          setPendingVideoId(null);
          router.invalidate();
        } else if (video.status === "failed") {
          // Video failed
          toast.error("Video generisanje nije uspelo");
          setPendingVideoId(null);
        }
      } catch (error) {
        console.error("Failed to poll video status:", error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [pendingVideoId, session, router]);

  const handleSendMessage = async (
    content: string,
    model: LumaModel,
    duration: VideoDuration,
  ) => {
    if (!session?.user?.id) {
      toast.error("Niste prijavljeni");
      return;
    }

    const userId = session.user.id;

    // 1. Create and save user message
    const userMessage: ChatMessage = {
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      await saveChatMessage({
        data: { userId, message: userMessage },
      });
    } catch (error) {
      console.error("Failed to save user message:", error);
      toast.error("Greška pri čuvanju poruke");
      return;
    }

    // 2. Start video generation
    setIsGenerating(true);

    try {
      // Call generateVideo API
      const video = await generateVideo({
        data: {
          userId,
          prompt: content,
          duration: durationToSeconds(duration),
          aspectRatio: "landscape", // Default aspect ratio
          model, // Pass selected model
        },
      });

      // 3. Show confirmation message
      const confirmationMessage: ChatMessage = {
        role: "assistant",
        content:
          "Video je dodat u red za generisanje! Biće spreman za 30-60 sekundi. Pogledajte stranicu Video da vidite napredak.",
        timestamp: new Date().toISOString(),
        videoId: video.id,
      };

      setMessages((prev) => [...prev, confirmationMessage]);

      await saveChatMessage({
        data: { userId, message: confirmationMessage },
      });

      // Start polling for completion
      setPendingVideoId(video.id);

      // Invalidate to refresh video library
      router.invalidate();

      toast.info("Video se generiše u pozadini...");
    } catch (error) {
      console.error("Failed to generate video:", error);

      // Remove loading message if exists
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (
          lastMessage?.role === "assistant" &&
          lastMessage.content.includes("Generisanje")
        ) {
          return prev.slice(0, -1);
        }
        return prev;
      });

      // Add error message
      const errorMessage: ChatMessage = {
        role: "assistant",
        content:
          "Došlo je do greške pri generisanju videa. Molimo pokušajte ponovo.",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);

      await saveChatMessage({
        data: { userId, message: errorMessage },
      }).catch(console.error);

      toast.error("Greška pri generisanju videa");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Učitavanje...</div>
      </div>
    );
  }

  return (
    <GenerationChat
      messages={messages}
      isGenerating={isGenerating}
      onSendMessage={handleSendMessage}
    />
  );
}
