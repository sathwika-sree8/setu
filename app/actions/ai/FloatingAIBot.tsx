"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function FloatingAIBot() {
  const { isSignedIn } = useUser();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!isSignedIn || !isOpen) {
        return;
      }

      let startupId: string | undefined;
      if (pathname && pathname.startsWith("/startup/")) {
        const parts = pathname.split("/").filter(Boolean);
        if (parts.length >= 2) {
          startupId = parts[1];
        }
      }

      setIsHistoryLoading(true);
      try {
        const query = startupId ? `?startupId=${encodeURIComponent(startupId)}` : "";
        const response = await fetch(`/api/ai/chat${query}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load AI history");
        }

        const data = await response.json();
        setMessages(
          (data.messages || []).map(
            (message: { id: string; role: "user" | "assistant"; content: string; createdAt: string }) => ({
              id: message.id,
              role: message.role,
              content: message.content,
              timestamp: new Date(message.createdAt),
            })
          )
        );
      } catch (error) {
        console.error("Failed to load AI history:", error);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    void loadHistory();
  }, [isOpen, isSignedIn, pathname]);

  if (!isSignedIn) {
    return null;
  }

  const sendMessage = async () => {
    if (!input.trim()) return;

    let startupId: string | undefined;
    if (pathname && pathname.startsWith("/startup/")) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        startupId = parts[1];
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: input,
          startupId,
        }),
      });

      const data = await response.json();
      const content = data.answer || data.error || "Unable to get a response. Please try again.";

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "Network error. Please check your connection and try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div className="fixed top-4 right-4 z-60">
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 flex h-96 w-80 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-pink-500 to-pink-600 p-4 text-white">
            <div className="flex items-center gap-2">
              <span className="text-xl">AI</span>
              <span className="font-semibold">AI Assistant</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded p-1 transition-colors hover:bg-pink-700"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4">
            {messages.length === 0 ? (
              isHistoryLoading ? (
                <div className="flex h-full flex-col items-center justify-center text-gray-400">
                  <p className="text-sm">Loading conversation...</p>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-gray-400">
                  <span className="mb-2 text-5xl opacity-20">AI</span>
                  <p className="text-sm">Start chatting with AI Assistant</p>
                </div>
              )
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-xs rounded-lg px-3 py-2 text-sm",
                      msg.role === "user"
                        ? "bg-pink-500 text-white"
                        : "bg-gray-200 text-gray-800"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg bg-gray-200 px-3 py-2 text-gray-800">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2 border-t border-gray-200 bg-white p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isLoading}
              placeholder="Ask AI Assistant..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:bg-gray-100"
            />
            <button
              onClick={() => void sendMessage()}
              disabled={isLoading || !input.trim()}
              className="rounded-lg bg-pink-500 p-2 text-white transition-colors hover:bg-pink-600 disabled:bg-gray-300"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((state) => !state)}
        className={cn(
          "flex h-14 w-14 cursor-pointer items-center justify-center rounded-full text-white shadow-lg transition-all duration-200",
          isOpen ? "bg-pink-600 hover:bg-pink-700" : "bg-pink-500 hover:bg-pink-600"
        )}
        aria-label={isOpen ? "Close AI chat" : "Open AI chat"}
      >
        <span className="text-sm font-bold">AI</span>
      </button>
    </div>
  );
}
