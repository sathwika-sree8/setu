"use client";

import { rejectRequest } from "@/app/actions/dealRoom";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface RejectRequestButtonProps {
  relationshipId: string;
  variant?: "button" | "icon";
  onRejected?: () => void;
}

export function RejectRequestButton({
  relationshipId,
  variant = "button",
  onRejected,
}: RejectRequestButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleReject(formData: FormData) {
    setIsLoading(true);
    try {
      await rejectRequest(formData);

      toast({
        title: "Request Rejected",
        description: "The investment request has been rejected.",
        variant: "default",
      });

      if (onRejected) {
        onRejected();
      }

      router.refresh();
    } catch (error) {
      console.error("Failed to reject request:", error);
      toast({
        title: "Error",
        description: "Failed to reject request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (variant === "icon") {
    return (
      <form action={handleReject}>
        <input type="hidden" name="relationshipId" value={relationshipId} />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          disabled={isLoading}
          className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
          aria-label="Reject request"
        >
          <X className="h-4 w-4" />
        </Button>
      </form>
    );
  }

  return (
    <form action={handleReject}>
      <input type="hidden" name="relationshipId" value={relationshipId} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={isLoading}
        className="mt-2 border-gray-300 text-gray-700 hover:bg-gray-50"
      >
        {isLoading ? "Rejecting..." : "Reject"}
      </Button>
    </form>
  );
}

