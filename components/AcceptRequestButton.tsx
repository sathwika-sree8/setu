"use client";

import { acceptForDiscussion } from "@/app/actions/dealRoom";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface AcceptRequestButtonProps {
  relationshipId: string;
  onAccepted?: () => void;
}

export function AcceptRequestButton({ relationshipId, onAccepted }: AcceptRequestButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleAccept(formData: FormData) {
    setIsLoading(true);
    try {
      await acceptForDiscussion(formData);
      
      toast({
        title: "Request Accepted!",
        description: "Discussion started. Opening chat.",
        variant: "default",
      });
      
      if (onAccepted) {
        onAccepted();
      }
      
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("setu:open-chat", { detail: { relationshipId } })
        );
      }

      router.refresh();
    } catch (error) {
      console.error("Failed to accept request:", error);
      toast({
        title: "Error",
        description: "Failed to accept request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form action={handleAccept}>
      <input type="hidden" name="relationshipId" value={relationshipId} />
      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary mt-2 disabled:opacity-50"
      >
        {isLoading ? "Accepting..." : "Accept for Discussion"}
      </button>
    </form>
  );
}

