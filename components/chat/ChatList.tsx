"use client";

import { useMemo } from "react";
import { MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { ChatListItem } from "@/lib/types/chat";

interface ChatListProps {
  chats: ChatListItem[];
  activeChatId?: string | null;
  onSelectChat: (relationshipId: string) => void;
  isLoading?: boolean;
}

export function ChatList({
  chats,
  activeChatId,
  onSelectChat,
  isLoading = false,
}: ChatListProps) {
  // Empty state
  if (!isLoading && chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <MessageCircle className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="font-medium text-gray-900 mb-1">No active chats</h3>
        <p className="text-sm text-gray-500">
          When you accept a deal request, your chat will appear here.
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="h-12 w-12 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-3 w-full bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {chats.map((chat, index) => {
        const isActive = chat.relationshipId === activeChatId;
        const hasUnread = chat.unreadCount > 0;
        const lastMessageTime = chat.lastMessageAt
          ? formatRelativeTime(chat.lastMessageAt)
          : "";

        return (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.relationshipId)}
            className={cn(
              "w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left",
              isActive && "bg-blue-50 hover:bg-blue-50"
            )}
          >
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={chat.participantImage} alt={chat.participantName} />
                <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                  {chat.participantName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator */}
              {chat.isOnline && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900 truncate">
                  {chat.participantName}
                </span>
                {lastMessageTime && (
                  <span className="text-xs text-gray-400 shrink-0">
                    {lastMessageTime}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className="text-xs text-gray-500 truncate">
                  {chat.startupName}
                </span>
                {hasUnread && (
                  <span className="shrink-0 flex items-center gap-1">
                    <span className="h-5 min-w-5 px-1.5 rounded-full bg-blue-500 text-white text-xs font-medium flex items-center justify-center">
                      {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                    </span>
                  </span>
                )}
              </div>
              {/* Last message preview */}
              {chat.lastMessage && (
                <p className="text-sm text-gray-500 truncate mt-1">
                  {hasUnread && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
                  )}
                  {chat.lastMessage}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default ChatList;

