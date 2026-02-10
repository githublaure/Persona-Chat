import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Character, Conversation } from "@shared/schema";
import { CharacterAvatar } from "@/components/character-avatar";
import { NewCharacterDialog } from "@/components/new-character-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface ChatSidebarProps {
  activeConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onNewChat: (characterId: number) => void;
}

export function ChatSidebar({
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: ChatSidebarProps) {
  const [showNewCharacter, setShowNewCharacter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: characters, isLoading: charsLoading } = useQuery<Character[]>({
    queryKey: ["/api/characters"],
  });

  const { data: conversations, isLoading: convsLoading } = useQuery<
    (Conversation & { character?: Character })[]
  >({
    queryKey: ["/api/conversations"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete conversation.", variant: "destructive" });
    },
  });

  const filteredConversations = conversations?.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.character?.name.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <Sidebar>
        <SidebarHeader className="p-3 gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="h-5 w-5 text-primary shrink-0" />
              <h1 className="font-semibold text-base truncate" data-testid="text-app-title">
                CharacterChat
              </h1>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <ThemeToggle />
              <SidebarTrigger data-testid="button-sidebar-toggle" />
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
              type="search"
              data-testid="input-search-chats"
            />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between gap-2 pr-2">
              <span>Characters</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowNewCharacter(true)}
                data-testid="button-new-character"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {charsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <SidebarMenuItem key={i}>
                      <div className="flex items-center gap-2 px-2 py-1.5">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </SidebarMenuItem>
                  ))
                ) : characters?.length === 0 ? (
                  <div className="px-3 py-6 text-center">
                    <p className="text-sm text-muted-foreground mb-2">No characters yet</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowNewCharacter(true)}
                      data-testid="button-create-first-character"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Create one
                    </Button>
                  </div>
                ) : (
                  characters?.map((char) => (
                    <SidebarMenuItem key={char.id}>
                      <SidebarMenuButton
                        onClick={() => onNewChat(char.id)}
                        data-testid={`button-character-${char.id}`}
                      >
                        <CharacterAvatar name={char.name} color={char.avatarColor} size="sm" />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-sm font-medium">{char.name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {char.description.slice(0, 40)}
                          </span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {convsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <SidebarMenuItem key={i}>
                      <div className="flex items-center gap-2 px-2 py-1.5">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3.5 w-28" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    </SidebarMenuItem>
                  ))
                ) : filteredConversations?.length === 0 ? (
                  <div className="px-3 py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? "No matching chats" : "No chats yet"}
                    </p>
                    {!searchQuery && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Pick a character above to start chatting
                      </p>
                    )}
                  </div>
                ) : (
                  filteredConversations?.map((conv) => (
                    <SidebarMenuItem key={conv.id}>
                      <SidebarMenuButton
                        isActive={activeConversationId === conv.id}
                        onClick={() => onSelectConversation(conv.id)}
                        className="group"
                        data-testid={`button-conversation-${conv.id}`}
                      >
                        {conv.character && (
                          <CharacterAvatar
                            name={conv.character.name}
                            color={conv.character.avatarColor}
                            size="sm"
                          />
                        )}
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate text-sm font-medium">{conv.title}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                          </span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0 invisible group-hover:visible"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(conv.id);
                          }}
                          data-testid={`button-delete-conversation-${conv.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-3">
          <p className="text-xs text-muted-foreground text-center">
            Powered by AI
          </p>
        </SidebarFooter>
      </Sidebar>

      <NewCharacterDialog open={showNewCharacter} onOpenChange={setShowNewCharacter} />
    </>
  );
}
