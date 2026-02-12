import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatView } from "@/components/chat-view";
import { EmptyState } from "@/components/empty-state";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { AuthPanel } from "@/components/auth-panel";

type CurrentUser = {
  id: number;
  username: string;
};

function ChatContent({ currentUser }: { currentUser: CurrentUser }) {
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

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      setActiveConversationId(null);
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
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
        currentUsername={currentUser.username}
        onLogout={() => logoutMutation.mutate()}
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
  const { data: currentUser, isLoading } = useQuery<CurrentUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn<CurrentUser | null>({ on401: "returnNull" }),
  });

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (!currentUser) {
    return <AuthPanel />;
  }

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <ChatContent currentUser={currentUser} />
    </SidebarProvider>
  );
}
