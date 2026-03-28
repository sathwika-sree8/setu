"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (content: string) => Promise<void>;
  onTypingChange?: (isTyping: boolean) => void;
  isSending?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  onSend,
  onTypingChange,
  isSending = false,
  placeholder = "Type a message...",
  disabled = false,
}: ChatInputProps) {
  const [content, setContent] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Focus input on mount and when chat opens
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedContent = content.trim();
      if (!trimmedContent || isSending || disabled) return;

      // Clear input immediately for optimistic UI
      setContent("");
      onTypingChange?.(false);
      inputRef.current?.focus();

      // Send message
      await onSend(trimmedContent);
    },
    [content, isSending, disabled, onSend, onTypingChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Submit on Enter (without Shift)
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        formRef.current?.dispatchEvent(
          new Event("submit", { cancelable: true, bubbles: true })
        );
      }
    },
    []
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = e.target.value;
      setContent(nextValue);
      onTypingChange?.(nextValue.trim().length > 0);
    },
    [onTypingChange]
  );

  const isEmpty = content.trim().length === 0;
  const showSendButton = !isEmpty && !isSending;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex items-center gap-2 p-3 border-t bg-white"
    >
      <Input
        ref={inputRef}
        type="text"
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isSending}
        className="flex-1 h-10 px-4 rounded-full border-gray-200 focus:border-blue-500 focus:ring-blue-500"
        aria-label="Message input"
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || isSending || isEmpty}
        className={cn(
          "h-10 w-10 rounded-full transition-all duration-200",
          showSendButton
            ? "bg-blue-500 hover:bg-blue-600 text-white"
            : "bg-gray-100 text-gray-400"
        )}
        aria-label="Send message"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}

export default ChatInput;

