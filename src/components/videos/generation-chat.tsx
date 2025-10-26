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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
import {
  LUMA_MODELS,
  DEFAULT_MODEL,
  DEFAULT_DURATION,
  getSupportedDurations,
  type LumaModel,
  type VideoDuration,
} from "~/config/luma-models";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  videoId?: string;
}

interface GenerationChatProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  onSendMessage: (
    message: string,
    model: LumaModel,
    duration: VideoDuration,
  ) => Promise<void>;
}

export function GenerationChat({
  messages,
  isGenerating,
  onSendMessage,
}: GenerationChatProps) {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState<LumaModel>(DEFAULT_MODEL);
  const [selectedDuration, setSelectedDuration] =
    useState<VideoDuration>(DEFAULT_DURATION);

  // Update duration when model changes if current duration not supported
  const handleModelChange = (model: LumaModel) => {
    setSelectedModel(model);
    const supportedDurations = getSupportedDurations(model);
    if (!supportedDurations.includes(selectedDuration)) {
      setSelectedDuration(supportedDurations[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isGenerating) return;

    const message = inputValue.trim();
    setInputValue("");
    await onSendMessage(message, selectedModel, selectedDuration);
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

                    {/* If AI message has video, show link */}
                    {msg.role === "assistant" && msg.videoId && (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => navigate({ to: "/admin/videos" })}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Prikaži u biblioteci
                        </Button>
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
              <Select value={selectedModel} onValueChange={handleModelChange}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue>
                    {LUMA_MODELS.find(m => m.id === selectedModel)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LUMA_MODELS.map((model) => (
                    <SelectItem
                      key={model.id}
                      value={model.id}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{model.name}</span>
                        <span className="text-xs text-muted-foreground">{model.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedDuration}
                onValueChange={(val) =>
                  setSelectedDuration(val as VideoDuration)
                }
              >
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getSupportedDurations(selectedModel).map((duration) => (
                    <SelectItem
                      key={duration}
                      value={duration}
                      className="text-xs"
                    >
                      {duration}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
