import { useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "~/components/ui/shadcn-io/ai/conversation";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "~/components/ui/shadcn-io/ai/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputSubmit,
} from "~/components/ui/shadcn-io/ai/prompt-input";
import { Button } from "~/components/ui/button";
import { Video, Eye } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  videoId?: string;
}

interface GenerationChatProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  onSendMessage: (message: string) => Promise<void>;
}

export function GenerationChat({
  messages,
  isGenerating,
  onSendMessage,
}: GenerationChatProps) {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isGenerating) return;

    const message = inputValue.trim();
    setInputValue("");
    await onSendMessage(message);
  };

  return (
    <div className="flex flex-col h-full pb-6">
      <Conversation className="flex-1 w-full">
        <ConversationContent>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Video className="h-12 w-12" />
                  </EmptyMedia>
                  <EmptyTitle>Započnite konverzaciju</EmptyTitle>
                  <EmptyDescription>
                    Opišite video koji želite da kreirate. Možete biti
                    specifični ili pitati AI za predloge.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <Message
                  key={index}
                  from={msg.role === "user" ? "user" : "assistant"}
                >
                  <MessageAvatar
                    src=""
                    name={msg.role === "user" ? "Korisnik" : "AI"}
                  />
                  <MessageContent>
                    {msg.content}

                    {/* If AI message has video, show thumbnail */}
                    {msg.role === "assistant" && msg.videoId && (
                      <div className="mt-2 inline-flex items-center gap-3 p-3 border rounded-lg bg-background">
                        <img
                          src="https://placehold.co/160x90/1f1f1f/808080?text=Video"
                          alt="Generated video thumbnail"
                          className="w-20 h-12 bg-muted rounded overflow-hidden object-cover shrink-0"
                        />
                        <div className="flex flex-col gap-1">
                          <p className="text-xs text-muted-foreground">
                            Video je generisan
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => navigate({ to: "/admin/videos" })}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Prikaži
                          </Button>
                        </div>
                      </div>
                    )}
                  </MessageContent>
                </Message>
              ))}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="max-w-4xl mx-auto w-full px-4 mt-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            placeholder="Opišite video koji želite da kreirate..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isGenerating}
          />
          <PromptInputToolbar>
            <PromptInputTools>
              <div className="text-xs text-muted-foreground">
                Enter za slanje, Shift+Enter za novi red
              </div>
            </PromptInputTools>
            <PromptInputSubmit
              disabled={isGenerating || !inputValue.trim()}
              status={isGenerating ? "submitted" : "ready"}
            />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
}
