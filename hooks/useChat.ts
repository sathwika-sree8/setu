"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@clerk/nextjs";
import {
  ChatListItem,
  Message,
  RealtimeRelationship,
  RealtimeSessionResponse,
} from "@/lib/types/chat";

const POLLING_INTERVAL = 30000;
const TYPING_IDLE_MS = 1200;

interface UseChatOptions {
  autoRefresh?: boolean;
  pollingInterval?: number;
}

interface UseChatReturn {
  chats: ChatListItem[];
  activeChatId: string | null;
  messages: Message[];
  totalUnread: number;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  isRealtimeConnected: boolean;
  activeParticipantOnline: boolean;
  activeParticipantTyping: boolean;
  refreshChats: () => Promise<void>;
  selectChat: (relationshipId: string) => Promise<void>;
  sendMessage: (relationshipId: string, content: string) => Promise<void>;
  markAsRead: (relationshipId: string) => Promise<void>;
  setTyping: (relationshipId: string, isTyping: boolean) => void;
  isParticipantOnline: (relationshipId: string) => boolean;
  isChatTyping: (relationshipId: string) => boolean;
  closeChat: () => void;
  clearError: () => void;
}

function normalizeMessage(message: Message): Message {
  return {
    ...message,
    createdAt: new Date(message.createdAt),
  };
}

function upsertMessage(existingMessages: Message[], nextMessage: Message) {
  const normalizedMessage = normalizeMessage(nextMessage);
  const existingIndex = existingMessages.findIndex((message) => message.id === normalizedMessage.id);

  if (existingIndex === -1) {
    return [...existingMessages, normalizedMessage];
  }

  const updatedMessages = [...existingMessages];
  updatedMessages[existingIndex] = normalizedMessage;
  return updatedMessages;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { autoRefresh = true, pollingInterval = POLLING_INTERVAL } = options;
  const { isSignedIn, userId } = useAuth();

  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [relationships, setRelationships] = useState<Record<string, RealtimeRelationship>>({});
  const [onlineUserIds, setOnlineUserIds] = useState<Record<string, boolean>>({});
  const [typingByRelationship, setTypingByRelationship] = useState<Record<string, Record<string, boolean>>>({});

  const socketRef = useRef<Socket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const errorRef = useRef<string | null>(null);
  const activeChatIdRef = useRef<string | null>(null);
  const onlineUserIdsRef = useRef<Record<string, boolean>>({});
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout | null>>({});
  const pendingMessagesRef = useRef<Map<string, string>>(new Map());

  const applyPresenceToChats = useCallback(
    (nextChats: ChatListItem[]) =>
      nextChats.map((chat) => ({
        ...chat,
        isOnline: chat.participantId ? Boolean(onlineUserIds[chat.participantId]) : false,
      })),
    [onlineUserIds]
  );

  const refreshChats = useCallback(async () => {
    try {
      const response = await fetch("/api/chat/list");
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setChats(
        (data.chats || []).map((chat: ChatListItem) => ({
          ...chat,
          isOnline: chat.participantId ? Boolean(onlineUserIdsRef.current[chat.participantId]) : false,
        }))
      );
      setTotalUnread(data.totalUnread || 0);
    } catch {
      return;
    }
  }, []);

  const updateRelationship = useCallback((relationship: RealtimeRelationship) => {
    setRelationships((current) => ({
      ...current,
      [relationship.id]: relationship,
    }));
  }, []);

  const fetchMessages = useCallback(async (relationshipId: string) => {
    const response = await fetch(`/api/chat/messages?relationshipId=${relationshipId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch messages");
    }

    const data = await response.json();
    const nextMessages = (data.messages || []).map(normalizeMessage);

    setMessages(nextMessages);
    setActiveChatId(relationshipId);
    activeChatIdRef.current = relationshipId;

    if (data.relationship) {
      updateRelationship(data.relationship);
    }
  }, [updateRelationship]);

  const setTypingState = useCallback((relationshipId: string, typingUserId: string, isTyping: boolean) => {
    setTypingByRelationship((current) => {
      const nextForRelationship = {
        ...(current[relationshipId] || {}),
        [typingUserId]: isTyping,
      };

      if (!isTyping) {
        delete nextForRelationship[typingUserId];
      }

      return {
        ...current,
        [relationshipId]: nextForRelationship,
      };
    });
  }, []);

  const markAsRead = useCallback(async (relationshipId: string) => {
    try {
      await fetch("/api/chat/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationshipId }),
      });

      setMessages((current) =>
        current.map((message) =>
          message.senderId === userId ? message : { ...message, read: true }
        )
      );

      socketRef.current?.emit("chat:messages:read", { relationshipId });
      refreshChats();
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  }, [refreshChats, userId]);

  const selectChat = useCallback(async (relationshipId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await fetchMessages(relationshipId);
      await markAsRead(relationshipId);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch messages");
    } finally {
      setIsLoading(false);
    }
  }, [fetchMessages, markAsRead]);

  const sendMessage = useCallback(async (relationshipId: string, content: string) => {
    if (!content.trim() || isSending) {
      return;
    }

    const trimmedContent = content.trim();
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      relationshipId,
      senderId: userId || "currentUser",
      content: trimmedContent,
      read: false,
      createdAt: new Date(),
    };

    setMessages((current) => [...current, optimisticMessage]);
    setIsSending(true);
    setError(null);
    pendingMessagesRef.current.set(tempId, tempId);

    const socket = socketRef.current;

    if (socket?.connected) {
      socket.emit(
        "chat:message:send",
        { relationshipId, content: trimmedContent, clientMessageId: tempId },
        (response: { ok: boolean; error?: string; message?: Message }) => {
          if (!response?.ok || !response.message) {
            pendingMessagesRef.current.delete(tempId);
            setMessages((current) => current.filter((message) => message.id !== tempId));
            setError(response?.error || "Failed to send message");
            setIsSending(false);
            return;
          }

          setMessages((current) =>
            current.map((message) =>
              message.id === tempId ? normalizeMessage(response.message as Message) : message
            )
          );

          pendingMessagesRef.current.delete(tempId);
          setIsSending(false);
          refreshChats();
        }
      );

      return;
    }

    try {
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationshipId, content: trimmedContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      const sentMessage = normalizeMessage(await response.json());
      setMessages((current) =>
        current.map((message) => (message.id === tempId ? sentMessage : message))
      );
      pendingMessagesRef.current.delete(tempId);
      refreshChats();
    } catch (err) {
      pendingMessagesRef.current.delete(tempId);
      setMessages((current) => current.filter((message) => message.id !== tempId));
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  }, [isSending, refreshChats, userId]);

  const setTyping = useCallback((relationshipId: string, isTyping: boolean) => {
    const socket = socketRef.current;
    if (!socket?.connected || !relationshipId) {
      return;
    }

    socket.emit("chat:typing", { relationshipId, isTyping });

    if (typingTimeoutsRef.current[relationshipId]) {
      clearTimeout(typingTimeoutsRef.current[relationshipId] as NodeJS.Timeout);
    }

    if (isTyping) {
      typingTimeoutsRef.current[relationshipId] = setTimeout(() => {
        socket.emit("chat:typing", { relationshipId, isTyping: false });
      }, TYPING_IDLE_MS);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const closeChat = useCallback(() => {
    if (activeChatIdRef.current) {
      setTyping(activeChatIdRef.current, false);
    }

    setActiveChatId(null);
    activeChatIdRef.current = null;
    setMessages([]);
  }, [setTyping]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  useEffect(() => {
    onlineUserIdsRef.current = onlineUserIds;
  }, [onlineUserIds]);

  useEffect(() => {
    if (!isSignedIn) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsRealtimeConnected(false);
      return;
    }

    let cancelled = false;

    const connectRealtime = async () => {
      try {
        const response = await fetch("/api/chat/realtime-session");
        if (!response.ok) {
          return;
        }

        const session = (await response.json()) as RealtimeSessionResponse;
        if (cancelled) {
          return;
        }

        const nextRelationships = Object.fromEntries(
          session.relationships.map((relationship) => [relationship.id, relationship])
        );
        setRelationships(nextRelationships);

        const socket = io(session.socketUrl || undefined, {
          path: "/socket.io",
          transports: ["websocket", "polling"],
          auth: { token: session.token },
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          setIsRealtimeConnected(true);
        });

        socket.on("disconnect", () => {
          setIsRealtimeConnected(false);
        });

        socket.on("chat:list:refresh", () => {
          void refreshChats();
        });

        socket.on(
          "chat:message:new",
          (payload: { relationshipId: string; message: Message; clientMessageId?: string | null }) => {
            const nextMessage = normalizeMessage(payload.message);

            setMessages((current) => {
              const pendingId =
                payload.clientMessageId && pendingMessagesRef.current.has(payload.clientMessageId)
                  ? pendingMessagesRef.current.get(payload.clientMessageId) || null
                  : null;

              if (pendingId) {
                pendingMessagesRef.current.delete(payload.clientMessageId as string);
                return current.map((message) =>
                  message.id === pendingId ? nextMessage : message
                );
              }

              return upsertMessage(current, nextMessage);
            });

            if (activeChatIdRef.current === payload.relationshipId && payload.message.senderId !== userId) {
              void markAsRead(payload.relationshipId);
            }

            void refreshChats();
          }
        );

        socket.on(
          "chat:message:read",
          (payload: { relationshipId: string; userId: string }) => {
            if (payload.relationshipId !== activeChatIdRef.current) {
              return;
            }

            if (payload.userId === userId) {
              return;
            }

            setMessages((current) =>
              current.map((message) =>
                message.senderId === userId ? { ...message, read: true } : message
              )
            );
          }
        );

        socket.on(
          "chat:typing",
          (payload: { relationshipId: string; userId: string; isTyping: boolean }) => {
            if (payload.userId === userId) {
              return;
            }

            setTypingState(payload.relationshipId, payload.userId, payload.isTyping);
          }
        );

        socket.on(
          "chat:presence",
          (payload: { relationshipId: string; userId: string; isOnline: boolean }) => {
            setOnlineUserIds((current) => ({
              ...current,
              [payload.userId]: payload.isOnline,
            }));
          }
        );

        socket.on(
          "chat:presence:snapshot",
          (payload: { relationships: { relationshipId: string; onlineUserIds: string[] }[] }) => {
            setOnlineUserIds((current) => {
              const nextState = { ...current };
              payload.relationships.forEach((relationship) => {
                relationship.onlineUserIds.forEach((participantId) => {
                  nextState[participantId] = true;
                });
              });
              return nextState;
            });
          }
        );
      } catch (connectError) {
        console.error("Failed to connect realtime chat:", connectError);
      }
    };

    void connectRealtime();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [isSignedIn, markAsRead, refreshChats, setTypingState, userId]);

  useEffect(() => {
    if (!errorRef.current || !errorRef.current.includes("Unauthorized")) {
      void refreshChats();
    }
  }, [refreshChats]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const poll = async () => {
      try {
        await refreshChats();
        if (activeChatIdRef.current) {
          await fetchMessages(activeChatIdRef.current);
        }
      } catch {
        return;
      }
    };

    pollingRef.current = setInterval(poll, pollingInterval);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [autoRefresh, fetchMessages, pollingInterval, refreshChats]);

  useEffect(() => {
    setChats((current) => applyPresenceToChats(current));
  }, [applyPresenceToChats]);

  const isParticipantOnline = useCallback((relationshipId: string) => {
    const relationship = relationships[relationshipId];
    if (!relationship || !userId) {
      return false;
    }

    const participantId =
      relationship.founderId === userId ? relationship.investorId : relationship.founderId;

    return Boolean(onlineUserIds[participantId]);
  }, [onlineUserIds, relationships, userId]);

  const isChatTyping = useCallback((relationshipId: string) => {
    const typingState = typingByRelationship[relationshipId];
    if (!typingState || !userId) {
      return false;
    }

    return Object.keys(typingState).some((typingUserId) => typingUserId !== userId);
  }, [typingByRelationship, userId]);

  const activeParticipantOnline = useMemo(
    () => (activeChatId ? isParticipantOnline(activeChatId) : false),
    [activeChatId, isParticipantOnline]
  );

  const activeParticipantTyping = useMemo(
    () => (activeChatId ? isChatTyping(activeChatId) : false),
    [activeChatId, isChatTyping]
  );

  return {
    chats,
    activeChatId,
    messages,
    totalUnread,
    isLoading,
    isSending,
    error,
    isRealtimeConnected,
    activeParticipantOnline,
    activeParticipantTyping,
    refreshChats,
    selectChat,
    sendMessage,
    markAsRead,
    setTyping,
    isParticipantOnline,
    isChatTyping,
    closeChat,
    clearError,
  };
}

export default useChat;
