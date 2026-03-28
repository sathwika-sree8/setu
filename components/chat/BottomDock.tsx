"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Loader2,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useChat } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

type ActivePanel = "chat" | "messages" | null;

type AiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

export default function BottomDock() {
  const { user, isSignedIn } = useUser();
  const pathname = usePathname();

  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiHistoryLoading, setIsAiHistoryLoading] = useState(false);

  const [messageInput, setMessageInput] = useState("");

  const aiEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    chats,
    activeChatId,
    messages,
    isLoading,
    isSending,
    error,
    activeParticipantOnline,
    activeParticipantTyping,
    refreshChats,
    selectChat,
    sendMessage,
    setTyping,
    closeChat,
    clearError,
  } = useChat();

  const activeChat = useMemo(
    () => chats.find((chat) => chat.relationshipId === activeChatId),
    [chats, activeChatId]
  );

  useEffect(() => {
    if (activePanel === "messages" && isSignedIn) {
      refreshChats();
    }
  }, [activePanel, isSignedIn, refreshChats]);

  useEffect(() => {
    if (activePanel === "chat") {
      aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activePanel, aiMessages, isAiLoading]);

  useEffect(() => {
    const loadAiHistory = async () => {
      if (!isSignedIn || activePanel !== "chat") {
        return;
      }

      let startupId: string | undefined;
      if (pathname && pathname.startsWith("/startup/")) {
        const parts = pathname.split("/").filter(Boolean);
        if (parts.length >= 2) startupId = parts[1];
      }

      setIsAiHistoryLoading(true);
      try {
        const query = startupId ? `?startupId=${encodeURIComponent(startupId)}` : "";
        const response = await fetch(`/api/ai/chat${query}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch AI history");
        }

        const data = await response.json();
        setAiMessages(data.messages || []);
      } catch (historyError) {
        console.error("Failed to load AI chat history:", historyError);
      } finally {
        setIsAiHistoryLoading(false);
      }
    };

    void loadAiHistory();
  }, [activePanel, isSignedIn, pathname]);

  useEffect(() => {
    if (activePanel === "messages") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activePanel, messages]);

  useEffect(() => {
    const handleOpenChat = async (event: Event) => {
      const detail = (event as CustomEvent<{ relationshipId?: string }>).detail;

      clearError();
      setActivePanel("messages");

      if (detail?.relationshipId) {
        await selectChat(detail.relationshipId);
      }
    };

    window.addEventListener("setu:open-chat", handleOpenChat as EventListener);

    return () => {
      window.removeEventListener("setu:open-chat", handleOpenChat as EventListener);
    };
  }, [clearError, selectChat]);

  const togglePanel = (panel: Exclude<ActivePanel, null>) => {
    setActivePanel((prev) => {
      if (prev === panel) {
        if (panel === "messages") {
          closeChat();
          clearError();
        }
        return null;
      }

      if (panel === "messages") {
        clearError();
      }

      return panel;
    });
  };

  const handleClosePanel = () => {
    if (activePanel === "messages") {
      closeChat();
      clearError();
    }
    setActivePanel(null);
  };

  const handleSendAiMessage = async () => {
    const content = aiInput.trim();
    if (!content || isAiLoading) return;

    let startupId: string | undefined;
    if (pathname && pathname.startsWith("/startup/")) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length >= 2) startupId = parts[1];
    }

    const userMessage: AiMessage = {
      id: `${Date.now()}`,
      role: "user",
      content,
    };

    setAiMessages((prev) => [...prev, userMessage]);
    setAiInput("");
    setIsAiLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: content, startupId }),
      });

      const data = await response.json();
      const answer = data.answer || data.error || "Unable to get a response right now.";

      setAiMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: answer,
        },
      ]);
    } catch {
      setAiMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant-error`,
          role: "assistant",
          content: "Network error. Please try again.",
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSendChatMessage = async () => {
    const content = messageInput.trim();
    if (!content || !activeChatId || isSending) return;

    setTyping(activeChatId, false);
    await sendMessage(activeChatId, content);
    setMessageInput("");
  };

  const panelOpen = activePanel !== null;

  if (!isSignedIn) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex items-center justify-end">
          <div className="flex items-center justify-center gap-3 rounded-full border-[3px] border-orange-500 bg-[#111111] p-2 shadow-200">
          <button
            type="button"
            onClick={() => togglePanel("messages")}
            className={cn(
              "flex min-w-[140px] items-center justify-center gap-2 rounded-full border-2 px-4 py-2.5 text-sm font-semibold transition-all duration-200",
              activePanel === "messages"
                ? "border-orange-500 bg-orange-500 text-black shadow-[0_6px_0_0_#7c2d12]"
                : "border-[#2d2d2d] bg-transparent text-orange-100 hover:border-orange-400 hover:bg-[#1b1b1b] hover:text-orange-400"
            )}
            aria-pressed={activePanel === "messages"}
            aria-label="Chat"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Chat</span>
          </button>

          <button
            type="button"
            onClick={() => togglePanel("chat")}
            className={cn(
              "flex min-w-[140px] items-center justify-center gap-2 rounded-full border-2 px-4 py-2.5 text-sm font-semibold transition-all duration-200",
              activePanel === "chat"
                ? "border-orange-500 bg-orange-500 text-black shadow-[0_6px_0_0_#7c2d12]"
                : "border-[#2d2d2d] bg-transparent text-orange-100 hover:border-orange-400 hover:bg-[#1b1b1b] hover:text-orange-400"
            )}
            aria-pressed={activePanel === "chat"}
            aria-label="Chatbot"
          >
            <Bot className="h-4 w-4" />
            <span>Chatbot</span>
          </button>
        </div>
        </div>
      </div>

      <div
        className={cn(
          "fixed bottom-[88px] right-4 z-50 h-[500px] w-[calc(100vw-2rem)] max-w-[380px] rounded-[28px] border-[3px] border-black bg-[#fff8ef] shadow-200 transition-all duration-200",
          panelOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        )}
      >
        {activePanel && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b-[3px] border-black bg-black px-4 py-3 text-orange-400">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {activePanel === "chat" ? <Bot className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                <div className="flex flex-col">
                  <span>{activePanel === "chat" ? "Chatbot" : activeChat ? activeChat.participantName : "Chat"}</span>
                  {activePanel === "messages" && activeChatId && (
                    <span className="text-[11px] font-medium text-orange-100/75">
                      {activeParticipantTyping
                        ? "Typing..."
                        : activeParticipantOnline
                          ? "Online"
                          : "Offline"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activePanel === "messages" && activeChatId && (
                  <button
                    type="button"
                    className="rounded-full border border-orange-500/40 p-1.5 text-orange-200 transition-colors hover:bg-orange-500 hover:text-black"
                    onClick={() => closeChat()}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-full border border-orange-500/40 p-1.5 text-orange-200 transition-colors hover:bg-orange-500 hover:text-black"
                  onClick={handleClosePanel}
                  aria-label="Close panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {activePanel === "chat" ? (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                  {aiMessages.length === 0 ? (
                    isAiHistoryLoading ? (
                      <div className="flex h-full items-center justify-center text-center text-sm text-black/60">
                        Loading conversation...
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center text-center text-sm text-black/60">
                        Ask anything about your startup and portfolio.
                      </div>
                    )
                  ) : (
                    aiMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl border-2 px-3 py-2 text-sm",
                            msg.role === "user"
                              ? "border-orange-500 bg-orange-500 text-black"
                              : "border-black bg-white text-black"
                          )}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}

                  {isAiLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 rounded-2xl border-2 border-black bg-white px-3 py-2 text-sm text-black">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Thinking...
                      </div>
                    </div>
                  )}
                  <div ref={aiEndRef} />
                </div>

                <div className="border-t-[3px] border-black bg-[#fff1dc] p-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendAiMessage();
                        }
                      }}
                      placeholder="Ask the chatbot"
                      className="h-11 flex-1 rounded-full border-[2px] border-black bg-white px-4 text-sm text-black placeholder:text-black/45 outline-none transition-colors focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={handleSendAiMessage}
                      disabled={!aiInput.trim() || isAiLoading}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border-[2px] border-black bg-orange-500 text-black transition-all hover:scale-[1.03] hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Send AI message"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {error && (
                  <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto">
                  {!activeChatId ? (
                    <div className="space-y-1 px-2 py-2">
                      {isLoading ? (
                        <div className="px-2 py-6 text-center text-sm text-black/60">Loading conversations...</div>
                      ) : chats.length === 0 ? (
                        <div className="px-2 py-6 text-center text-sm text-black/60">No conversations yet.</div>
                      ) : (
                        chats.map((chat) => (
                          <button
                            key={chat.relationshipId}
                            type="button"
                            onClick={() => selectChat(chat.relationshipId)}
                            className="flex w-full items-start justify-between rounded-2xl border-2 border-transparent px-3 py-3 text-left transition-colors hover:border-orange-300 hover:bg-orange-100/50"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-black">{chat.participantName}</div>
                              <div className="truncate text-xs text-black/60">{chat.lastMessage || `Chat about ${chat.startupName}`}</div>
                            </div>
                            <div className="ml-3 text-right">
                              <div className="text-[11px] text-black/50">
                                {chat.lastMessageAt
                                  ? formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: true })
                                  : ""}
                              </div>
                              {chat.unreadCount > 0 && (
                                <span className="mt-1 inline-flex min-w-[18px] items-center justify-center rounded-full border border-black bg-orange-500 px-1.5 text-[10px] font-semibold text-black">
                                  {chat.unreadCount}
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 px-4 py-3">
                      {messages.length === 0 ? (
                        <div className="py-6 text-center text-sm text-black/60">No messages yet.</div>
                      ) : (
                        messages.map((msg) => {
                          const isUser = msg.senderId === user?.id || msg.senderId === "currentUser";
                          return (
                            <div key={msg.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                              <div
                                className={cn(
                                  "max-w-[80%] rounded-2xl border-2 px-3 py-2 text-sm",
                                  isUser
                                    ? "border-orange-500 bg-orange-500 text-black"
                                    : "border-black bg-white text-black"
                                )}
                              >
                                {msg.content}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className="border-t-[3px] border-black bg-[#fff1dc] p-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={messageInput}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setMessageInput(nextValue);
                        if (activeChatId) {
                          setTyping(activeChatId, nextValue.trim().length > 0);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendChatMessage();
                        }
                      }}
                      disabled={!activeChatId || isSending}
                      placeholder={activeChatId ? "Type a message" : "Select a conversation to reply"}
                      className="h-11 flex-1 rounded-full border-[2px] border-black bg-white px-4 text-sm text-black placeholder:text-black/45 outline-none transition-colors focus:border-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={handleSendChatMessage}
                      disabled={!activeChatId || !messageInput.trim() || isSending}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border-[2px] border-black bg-orange-500 text-black transition-all hover:scale-[1.03] hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Send chat message"
                    >
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
