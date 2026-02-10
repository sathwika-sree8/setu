"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";

interface ChatBubbleProps {
  content: string;
  isSent: boolean;
  timestamp: Date;
  isFirst?: boolean;
  isLast?: boolean;
}

export function ChatBubble({
  content,
  isSent,
  timestamp,
  isFirst = false,
  isLast = true,
}: ChatBubbleProps) {
  const formattedTime = useMemo(() => {
    return formatRelativeTime(timestamp);
  }, [timestamp]);

  return (
    <div
      className={cn(
        "flex w-full",
        isSent ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 animate-in slide-in-from-bottom-1 duration-200",
          isSent
            ? "bg-blue-500 text-white rounded-br-sm"
            : "bg-gray-100 text-gray-900 rounded-bl-sm",
          !isFirst && !isSent && "mt-1",
          !isLast && isSent && "mt-1"
        )}
      >
        <p className="text-sm leading-relaxed break-words">{content}</p>
        <div
          className={cn(
            "text-[10px] mt-1 opacity-70",
            isSent ? "text-blue-100" : "text-gray-500"
          )}
        >
          {formattedTime}
        </div>
      </div>
    </div>
  );
}

export default ChatBubble;

