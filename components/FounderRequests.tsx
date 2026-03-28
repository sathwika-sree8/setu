"use client";

import { useState, useEffect } from "react";
import { getReceivedRequests } from "@/app/actions/requests";
import { client } from "@/sanity/lib/client";
import { STARTUP_BY_ID_QUERY, AUTHOR_BY_CLERK_ID_QUERY } from "@/sanity/lib/queries";
import { RequestCard, RequestStatus } from "@/components/requests/RequestCard";
import { AcceptDealModal } from "@/components/requests/AcceptDealModal";
import { useUser } from "@clerk/nextjs";
import { acceptForDiscussion, rejectRequest } from "@/app/actions/dealRoom";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface EnrichedRequest {
  id: string;
  startupId: string;
  founderId: string;
  investorId: string;
  status: RequestStatus;
  createdAt: Date;
  startup?: {
    id: string;
    title: string;
    slug?: { current: string };
  };
  investor?: {
    _id: string;
    clerkId: string;
    name: string;
    username?: string;
    email?: string;
    image?: string;
    bio?: string;
  };
}

interface FounderRequestsProps {
  founderId: string;
}

export function FounderRequests({ founderId }: FounderRequestsProps) {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [requests, setRequests] = useState<EnrichedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [dealRelationshipId, setDealRelationshipId] = useState<string | null>(null);

  // Fetch requests on mount
  useEffect(() => {
    async function fetchRequests() {
      try {
        const rawRequests = await getReceivedRequests(founderId);

        const enrichedRequests = await Promise.all(
          rawRequests.map(async (r) => {
            const startup = await client.fetch(STARTUP_BY_ID_QUERY, { id: r.startupId });
            const investor = await client.fetch(AUTHOR_BY_CLERK_ID_QUERY, { clerkId: r.investorId });
            return { ...r, startup, investor } as EnrichedRequest;
          })
        );

        setRequests(enrichedRequests);
      } catch (error) {
        console.error("Failed to fetch requests:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRequests();
  }, [founderId]);

  const openChat = (relationshipId: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("setu:open-chat", { detail: { relationshipId } })
      );
    }
  };

  const handleAcceptForDiscussion = async (id: string) => {
    try {
      const formData = new FormData();
      formData.append("relationshipId", id);
      await acceptForDiscussion(formData);

      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "IN_DISCUSSION" } : r))
      );

      toast({
        title: "Request Accepted",
        description: "Discussion started. Opening chat.",
      });

      openChat(id);
      router.refresh();
    } catch (error) {
      console.error("Failed to accept request:", error);
      toast({
        title: "Error",
        description: "Failed to accept request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const formData = new FormData();
      formData.append("relationshipId", id);
      await rejectRequest(formData);

      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "DEAL_REJECTED" } : r))
      );

      toast({
        title: "Request Rejected",
        description: "The investment request has been rejected.",
      });

      router.refresh();
    } catch (error) {
      console.error("Failed to reject request:", error);
      toast({
        title: "Error",
        description: "Failed to reject request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAcceptDeal = async (id: string) => {
    setDealRelationshipId(id);
    setDealModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="mt-6">
        <h3 className="text-xl font-bold text-white">Investment Requests</h3>
        <div className="space-y-4 mt-4">
          {[1, 2].map((i) => (
            <div key={i} className="border border-white/15 p-4 rounded bg-[#131518] animate-pulse">
              <div className="h-4 bg-white/10 rounded w-1/3 mb-2" />
              <div className="h-4 bg-white/10 rounded w-1/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="text-xl font-bold text-white">Investment Requests</h3>

      <div className="space-y-4 mt-4">
        <AcceptDealModal
          open={dealModalOpen}
          relationshipId={dealRelationshipId}
          onClose={() => setDealModalOpen(false)}
          onAccepted={() => {
            if (dealRelationshipId) {
              setRequests((prev) =>
                prev.map((r) =>
                  r.id === dealRelationshipId ? { ...r, status: "DEAL_ACCEPTED" } : r
                )
              );
            }
          }}
        />
        {requests.map((r) => (
          <RequestCard
            key={r.id}
            id={r.id}
            startupId={r.startupId}
            startupName={r.startup?.title || "Unknown Startup"}
            startupSlug={r.startup?.slug?.current}
            investorId={r.investorId}
            investorName={r.investor?.name}
            investorImage={r.investor?.image}
            status={r.status}
            createdAt={r.createdAt}
            isIncoming={true}
            currentUserId={user?.id || ""}
            onAcceptForDiscussion={handleAcceptForDiscussion}
            onReject={handleReject}
            onAcceptDeal={handleAcceptDeal}
            onOpenChat={openChat}
            onViewDeal={(id) => {
              if (r.startup?.slug?.current) {
                router.push(`/startup/${r.startup.slug.current}`);
              }
            }}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}

export default FounderRequests;

