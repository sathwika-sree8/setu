"use client";

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useChat } from "@/hooks/useChat";
import { ChatList } from "./ChatList";
import { ChatWindow } from "./ChatWindow";

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  openChatId?: string | null;
  onOpenChatHandled?: () => void;
}

export function ChatPanel({ isOpen, onClose, openChatId, onOpenChatHandled }: ChatPanelProps) {
  const { user, isSignedIn } = useUser();
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
  } = useChat();

  // Find the active chat details
  const activeChat = chats.find((chat) => chat.relationshipId === activeChatId);

  // Refresh chats when panel opens
  useEffect(() => {
    if (isOpen && isSignedIn) {
      refreshChats();
    }
  }, [isOpen, isSignedIn, refreshChats]);

  // Open a specific chat when requested
  useEffect(() => {
    if (!isOpen || !openChatId) return;

    if (openChatId !== activeChatId) {
      selectChat(openChatId).finally(() => {
        onOpenChatHandled?.();
      });
    } else {
      onOpenChatHandled?.();
    }
  }, [isOpen, openChatId, activeChatId, selectChat, onOpenChatHandled]);

  // Handle chat selection
  const handleSelectChat = useCallback(
    async (relationshipId: string) => {
      await selectChat(relationshipId);
    },
    [selectChat]
  );

  // Handle back button
  const handleBack = useCallback(() => {
    closeChat();
  }, [closeChat]);

  // Handle close
  const handleClose = useCallback(() => {
    closeChat();
    onClose();
  }, [closeChat, onClose]);

  // Don't render if not authenticated or not open
  if (!isSignedIn || !isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col animate-in slide-in-from-bottom-5 duration-300">
      {/* Panel Container */}
      <div className="w-80 h-[32rem] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white shrink-0">
          <h2 className="font-semibold">
            {activeChatId ? "Chat" : "Messages"}
          </h2>
          <div className="flex items-center gap-2">
            {activeChatId && (
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                {chats.length} {chats.length === 1 ? "chat" : "chats"}
              </span>
            )}
            <button
              onClick={handleClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close chat panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-100">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeChatId && activeChat ? (
            <ChatWindow
              relationshipId={activeChat.relationshipId}
              participantName={activeChat.participantName}
              participantImage={activeChat.participantImage}
              startupName={activeChat.startupName}
              messages={messages}
              currentUserId={user?.id || ""}
              isParticipantOnline={activeParticipantOnline}
              isParticipantTyping={activeParticipantTyping}
              onBack={handleBack}
              onSendMessage={sendMessage}
              onTypingChange={setTyping}
              isSending={isSending}
            />
          ) : (
            <ChatList
              chats={chats}
              activeChatId={activeChatId}
              onSelectChat={handleSelectChat}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;

