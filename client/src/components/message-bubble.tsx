import { cn } from "@/lib/utils";
import { CharacterAvatar } from "@/components/character-avatar";
import { Check } from "lucide-react";
import type { Character } from "@shared/schema";

interface MessageBubbleProps {
  content: string;
  role: "user" | "assistant";
  character?: Character;
  isStreaming?: boolean;
  timestamp?: Date;
}

export function MessageBubble({
  content,
  role,
  character,
  isStreaming,
  timestamp,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-2 max-w-[85%] sm:max-w-[75%] md:max-w-[65%]",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
      data-testid={`message-${role}`}
    >
      {!isUser && character && (
        <div className="shrink-0 mt-auto mb-1">
          <CharacterAvatar name={character.name} color={character.avatarColor} size="sm" />
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        <div
          className={cn(
            "px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
            isUser
              ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
              : "bg-card border border-card-border rounded-2xl rounded-bl-md"
          )}
        >
          {content}
          {isStreaming && (
            <span className="inline-block w-1 h-4 ml-0.5 bg-current animate-pulse align-text-bottom" />
          )}
        </div>

        <div
          className={cn(
            "flex items-center gap-1 px-1",
            isUser ? "justify-end" : "justify-start"
          )}
        >
          {timestamp && (
            <span className="text-[10px] text-muted-foreground">
              {timestamp.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
          {isUser && !isStreaming && (
            <Check className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}
