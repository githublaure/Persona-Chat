import { MessageSquarePlus, Sparkles } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export function EmptyState() {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col h-full">
      {isMobile && (
        <header className="flex items-center gap-3 px-4 py-3 border-b bg-background">
          <SidebarTrigger data-testid="button-mobile-sidebar-empty" />
          <span className="text-sm font-semibold">CharacterChat</span>
        </header>
      )}
      <div className="flex-1 flex flex-col items-center justify-center p-6" data-testid="empty-state">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="relative">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MessageSquarePlus className="h-10 w-10 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Start a Conversation</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pick a character from the sidebar to begin chatting, or create a new character with a unique personality.
            </p>
          </div>

          <div className="flex flex-col gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Chat with historical figures, fictional characters, or custom personas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Each character remembers your conversation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Create as many characters as you like</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
