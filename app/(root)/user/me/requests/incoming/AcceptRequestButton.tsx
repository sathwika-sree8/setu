"use client";

import { acceptForDiscussion } from "@/app/actions/dealRoom";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AcceptRequestButtonProps {
  relationshipId: string;
}

export function AcceptRequestButton({ relationshipId }: AcceptRequestButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleAccept(formData: FormData) {
    setIsLoading(true);
    try {
      await acceptForDiscussion(formData);
      router.refresh();

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("setu:open-chat", { detail: { relationshipId } })
        );
      }
    } catch (error) {
      console.error("Failed to accept request:", error);
      alert("Failed to accept request. Please try again.");
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

