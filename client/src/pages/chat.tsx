import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatView } from "@/components/chat-view";
import { EmptyState } from "@/components/empty-state";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

function ChatContent() {
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const sidebar = useSidebar();

  const newChatMutation = useMutation({
    mutationFn: async (characterId: number) => {
      const res = await apiRequest("POST", "/api/conversations", { characterId });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setActiveConversationId(data.id);
      if (isMobile) {
        sidebar.setOpenMobile(false);
      }
    },
  });

  const handleSelectConversation = useCallback(
    (id: number) => {
      setActiveConversationId(id);
      if (isMobile) {
        sidebar.setOpenMobile(false);
      }
    },
    [isMobile, sidebar]
  );

  const handleNewChat = useCallback(
    (characterId: number) => {
      newChatMutation.mutate(characterId);
    },
    [newChatMutation]
  );

  return (
    <div className="flex h-screen w-full">
      <ChatSidebar
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
      />
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        {activeConversationId ? (
          <ChatView conversationId={activeConversationId} />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

export default function ChatPage() {
  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <ChatContent />
    </SidebarProvider>
  );
}
