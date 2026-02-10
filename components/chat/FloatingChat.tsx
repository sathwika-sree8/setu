"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageCircle, X } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useDraggable } from "@/hooks/useDraggable";
import { useChat } from "@/hooks/useChat";
import { ChatPanel } from "./ChatPanel";
import { cn } from "@/lib/utils";

interface FloatingChatProps {
  className?: string;
}

export function FloatingChat({ className }: FloatingChatProps) {
  const { isSignedIn, user } = useUser();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [pendingChatId, setPendingChatId] = useState<string | null>(null);
  const { totalUnread, refreshChats } = useChat();

  // Draggable hook for the chat button
  const { position, isDragging, handleMouseDown, handleTouchStart, resetPosition } =
    useDraggable({
      storageKey: "floating-chat-position",
    });

  // Refresh unread count periodically
  useEffect(() => {
    if (!isSignedIn) return;

    refreshChats();

    // Poll for new messages every 30 seconds
    const interval = setInterval(refreshChats, 30000);
    return () => clearInterval(interval);
  }, [isSignedIn, refreshChats]);

  // Toggle panel
  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
  }, []);

  // Close panel
  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  // Open panel from external actions (e.g. Requests tab)
  useEffect(() => {
    if (!isSignedIn) return;

    const handleOpenChat = (event: Event) => {
      const detail = (event as CustomEvent<{ relationshipId?: string }>).detail;
      if (detail?.relationshipId) {
        setPendingChatId(detail.relationshipId);
      }
      setIsPanelOpen(true);
    };

    window.addEventListener("setu:open-chat", handleOpenChat as EventListener);
    return () => {
      window.removeEventListener("setu:open-chat", handleOpenChat as EventListener);
    };
  }, [isSignedIn]);

  // Don't render if not signed in
  if (!isSignedIn) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button */}
      <div
        className={cn(
          "fixed z-50 transition-transform duration-200",
          isDragging && "cursor-grabbing",
          className
        )}
        style={{
          left: position.x,
          top: position.y,
          transform: "translate(0, 0)",
        }}
      >
        {/* Chat Panel */}
        <ChatPanel
          isOpen={isPanelOpen}
          onClose={closePanel}
          openChatId={pendingChatId}
          onOpenChatHandled={() => setPendingChatId(null)}
        />

        {/* Chat Button */}
        <button
          onClick={togglePanel}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={cn(
            "relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200",
            isPanelOpen
              ? "bg-gray-100 hover:bg-gray-200"
              : "bg-blue-500 hover:bg-blue-600 text-white",
            "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2",
            isDragging && "scale-105"
          )}
          aria-label={isPanelOpen ? "Close chat" : "Open chat"}
        >
          {isPanelOpen ? (
            <X className="h-6 w-6 text-gray-600" />
          ) : (
            <MessageCircle className="h-6 w-6 text-white" />
          )}

          {/* Unread Badge */}
          {totalUnread > 0 && !isPanelOpen && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[22px] h-[22px] px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-in zoom-in duration-200 border-2 border-white">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}

          {/* Pulse animation for new messages */}
          {totalUnread > 0 && !isPanelOpen && (
            <span className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-25" />
          )}
        </button>
      </div>
    </>
  );
}

export default FloatingChat;

