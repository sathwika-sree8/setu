"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface OpenChatButtonProps {
  relationshipId: string;
  variant?: "default" | "outline" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  children?: ReactNode;
  className?: string;
}

export function OpenChatButton({
  relationshipId,
  variant = "outline",
  size = "sm",
  children = "Chat",
  className,
}: OpenChatButtonProps) {
  const handleClick = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("setu:open-chat", { detail: { relationshipId } })
      );
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleClick} className={className}>
      {children}
    </Button>
  );
}

export default OpenChatButton;
