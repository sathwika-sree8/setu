"use client";

import { useEffect, useRef, useCallback } from "react";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { Message } from "@/lib/types/chat";

interface ChatWindowProps {
  relationshipId: string;
  participantName: string;
  participantImage?: string;
  startupName: string;
  messages: Message[];
  currentUserId: string;
  onBack: () => void;
  onSendMessage: (relationshipId: string, content: string) => Promise<void>;
  isSending?: boolean;
}

export function ChatWindow({
  relationshipId,
  participantName,
  participantImage,
  startupName,
  messages,
  currentUserId,
  onBack,
  onSendMessage,
  isSending = false,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleSendMessage = useCallback(
    async (content: string) => {
      await onSendMessage(relationshipId, content);
    },
    [relationshipId, onSendMessage]
  );

  // Group messages by date for better organization
  const groupedMessages = useCallback(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    
    messages.forEach((message) => {
      const messageDate = new Date(message.createdAt).toLocaleDateString();
      
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ date: messageDate, messages: [message] });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });
    
    return groups;
  }, [messages]);

  // Initial scroll on mount
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [scrollToBottom]);

  const messageGroups = groupedMessages();

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-8 w-8 -ml-2 hover:bg-gray-100"
          aria-label="Back to chat list"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <Avatar className="h-10 w-10">
          <AvatarImage src={participantImage} alt={participantName} />
          <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
            {participantName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">
            {participantName}
          </h3>
          <p className="text-xs text-gray-500 truncate">
            {startupName}
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="More options"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
      >
        {/* Date separators and messages */}
        {messageGroups.map((group, groupIndex) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center justify-center mb-4">
              <span className="px-3 py-1 text-xs text-gray-500 bg-gray-200 rounded-full">
                {group.date}
              </span>
            </div>
            
            {/* Messages */}
            {group.messages.map((message, messageIndex) => {
              const isFirstInGroup = messageIndex === 0;
              const isLastInGroup = messageIndex === group.messages.length - 1;
              const isSent = message.senderId === currentUserId;
              
              return (
                <ChatBubble
                  key={message.id}
                  content={message.content}
                  isSent={isSent}
                  timestamp={new Date(message.createdAt)}
                  isFirst={isFirstInGroup}
                  isLast={isLastInGroup}
                />
              );
            })}
          </div>
        ))}
        
        {/* Invisible element for auto-scroll */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSendMessage}
        isSending={isSending}
        placeholder="Type a message..."
      />
    </div>
  );
}

export default ChatWindow;

