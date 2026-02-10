"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Message, ChatListItem } from "@/lib/types/chat";

// Simulated polling interval (in production, use WebSockets)
// Reduced to 30 seconds to avoid 404 spam and server overload
const POLLING_INTERVAL = 30000;

interface UseChatOptions {
  autoRefresh?: boolean;
  pollingInterval?: number;
}

interface UseChatReturn {
  // State
  chats: ChatListItem[];
  activeChatId: string | null;
  messages: Message[];
  totalUnread: number;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  
  // Actions
  refreshChats: () => Promise<void>;
  selectChat: (relationshipId: string) => Promise<void>;
  sendMessage: (relationshipId: string, content: string) => Promise<void>;
  markAsRead: (relationshipId: string) => Promise<void>;
  closeChat: () => void;
  clearError: () => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { autoRefresh = true, pollingInterval = POLLING_INTERVAL } = options;

  // State
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for optimistic updates and polling
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const errorRef = useRef<string | null>(null);

  // Keep messages ref in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Fetch all chats
  const refreshChats = useCallback(async () => {
    try {
      const response = await fetch("/api/chat/list");
      if (!response.ok) {
        // Don't throw or set error on any failure - just skip refresh
        // This includes 401 (unauthorized), 403 (forbidden), 404 (not found), etc.
        return;
      }
      
      const data = await response.json();
      setChats(data.chats || []);
      setTotalUnread(data.totalUnread || 0);
    } catch (err) {
      // Silently handle all network errors during polling
      return;
    }
  }, []);

  // Fetch messages for a specific chat
  const selectChat = useCallback(async (relationshipId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/chat/messages?relationshipId=${relationshipId}`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      
      const data = await response.json();
      setMessages(data.messages || []);
      setActiveChatId(relationshipId);
      
      // Mark messages as read when opening chat
      await markAsRead(relationshipId);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch messages");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send a new message
  const sendMessage = useCallback(async (relationshipId: string, content: string) => {
    if (!content.trim() || isSending) return;

    // Optimistic update: add message immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      relationshipId,
      senderId: "currentUser", // Will be replaced by actual user ID
      content: content.trim(),
      read: false,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationshipId, content: content.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      // Replace optimistic message with actual message from server
      const sentMessage = await response.json();
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...sentMessage, createdAt: new Date(sentMessage.createdAt) } : msg
        )
      );

      // Refresh chat list to update last message
      refreshChats();
    } catch (err) {
      // Rollback optimistic update
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  }, [isSending, refreshChats]);

  // Mark messages as read
  const markAsRead = useCallback(async (relationshipId: string) => {
    try {
      await fetch("/api/chat/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationshipId }),
      });

      // Update local state
      setMessages((prev) =>
        prev.map((msg) => ({ ...msg, read: true }))
      );
      
      // Refresh chats to update unread counts
      refreshChats();
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  }, [refreshChats]);

  // Close active chat
  const closeChat = useCallback(() => {
    setActiveChatId(null);
    setMessages([]);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial fetch - only if user appears to be authenticated
  useEffect(() => {
    // Only refresh if we're not in an auth error state
    // Using a ref to track error without adding it to dependencies
    if (!errorRef.current || !errorRef.current.includes("Unauthorized")) {
      refreshChats();
    }
  }, [refreshChats]);

  // Sync error state to ref for initial fetch check
  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  // Polling for updates
  useEffect(() => {
    if (!autoRefresh) return;

    const poll = async () => {
      try {
        await refreshChats();
        
        // If there's an active chat, also refresh its messages
        if (activeChatId) {
          const response = await fetch(`/api/chat/messages?relationshipId=${activeChatId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.messages) {
              setMessages(data.messages);
            }
          }
        }
      } catch {
        // Silently handle polling errors to prevent TypeError
      }
    };

    pollingRef.current = setInterval(poll, pollingInterval);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [autoRefresh, pollingInterval, activeChatId, refreshChats]);

  return {
    chats,
    activeChatId,
    messages,
    totalUnread,
    isLoading,
    isSending,
    error,
    refreshChats,
    selectChat,
    sendMessage,
    markAsRead,
    closeChat,
    clearError,
  };
}

export default useChat;

