import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Character, Conversation, Message } from "@shared/schema";
import { MessageBubble } from "@/components/message-bubble";
import { TypingIndicator } from "@/components/typing-indicator";
import { CharacterAvatar } from "@/components/character-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Send, ArrowDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

interface ChatViewProps {
  conversationId: number;
}

interface ConversationData extends Conversation {
  character: Character;
  messages: Message[];
}

export function ChatView({ conversationId }: ChatViewProps) {
  const [inputValue, setInputValue] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<ConversationData>({
    queryKey: ["/api/conversations", conversationId],
  });

  const character = data?.character;
  const messages = data?.messages || [];

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? "smooth" : "instant",
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [conversationId, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0 || isStreaming) {
      scrollToBottom();
    }
  }, [messages.length, streamingContent, isStreaming, scrollToBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      setShowScrollButton(!atBottom);
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  async function handleSend() {
    const content = inputValue.trim();
    if (!content || isStreaming) return;

    setInputValue("");
    setIsStreaming(true);
    setStreamingContent("");

    const optimisticUserMsg: Message = {
      id: Date.now(),
      conversationId,
      role: "user",
      content,
      createdAt: new Date(),
    };

    queryClient.setQueryData<ConversationData>(
      ["/api/conversations", conversationId],
      (old) => {
        if (!old) return old;
        return { ...old, messages: [...old.messages, optimisticUserMsg] };
      }
    );

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to send message");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.content) {
              fullResponse += event.content;
              setStreamingContent(fullResponse);
            }
            if (event.done) {
              setIsStreaming(false);
              setStreamingContent("");
              queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
              queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
            }
            if (event.error) {
              throw new Error(event.error);
            }
          } catch (e) {
            if (!(e instanceof SyntaxError)) throw e;
          }
        }
      }
    } catch (err) {
      setIsStreaming(false);
      setStreamingContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      toast({
        title: "Message failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 px-4 py-3 border-b bg-background sticky top-0 z-10">
        {isMobile && <SidebarTrigger data-testid="button-mobile-sidebar" />}
        {character && (
          <>
            <CharacterAvatar name={character.name} color={character.avatarColor} size="sm" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold truncate" data-testid="text-character-name">
                {character.name}
              </h2>
              <p className="text-xs text-muted-foreground truncate">{character.description}</p>
            </div>
          </>
        )}
      </header>

      <div className="flex-1 relative overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto"
        >
          <div className="flex flex-col gap-3 p-4 pb-2 min-h-full justify-end">
            {character && messages.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <CharacterAvatar name={character.name} color={character.avatarColor} size="lg" />
                <div className="text-center max-w-sm">
                  <h3 className="font-semibold text-base mb-1">{character.name}</h3>
                  <p className="text-sm text-muted-foreground">{character.description}</p>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                content={msg.content}
                role={msg.role as "user" | "assistant"}
                character={character}
                timestamp={new Date(msg.createdAt)}
              />
            ))}

            {isStreaming && streamingContent && (
              <MessageBubble
                content={streamingContent}
                role="assistant"
                character={character}
                isStreaming
              />
            )}

            {isStreaming && !streamingContent && (
              <div className="flex gap-2 mr-auto">
                {character && (
                  <div className="shrink-0 mt-auto mb-1">
                    <CharacterAvatar name={character.name} color={character.avatarColor} size="sm" />
                  </div>
                )}
                <div className="bg-card border border-card-border rounded-2xl rounded-bl-md">
                  <TypingIndicator />
                </div>
              </div>
            )}
          </div>
        </div>

        {showScrollButton && (
          <Button
            size="icon"
            variant="secondary"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full shadow-md"
            onClick={() => scrollToBottom()}
            data-testid="button-scroll-bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="border-t bg-background p-3">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <Textarea
            ref={textareaRef}
            placeholder={`Message ${character?.name || ""}...`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="resize-none max-h-[120px] text-sm"
            rows={1}
            disabled={isStreaming}
            data-testid="input-message"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming}
            className="shrink-0"
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
