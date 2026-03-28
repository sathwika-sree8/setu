"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestCard, RequestStatus } from "./RequestCard";
import { acceptForDiscussion, rejectRequest, withdrawRequest } from "@/app/actions/dealRoom";
import { Skeleton } from "@/components/ui/skeleton";
import { AcceptDealModal } from "@/components/requests/AcceptDealModal";

// Types
interface EnrichedRequest {
  id: string;
  startupId: string;
  startupName: string;
  startupSlug?: string;
  founderId: string;
  founderName?: string;
  founderImage?: string;
  investorId: string;
  investorName?: string;
  investorImage?: string;
  status: RequestStatus;
  createdAt: Date;
  lastActivityAt?: Date;
  lastMessage?: string;
  unreadCount?: number;
}

interface RequestsTabsProps {
  // Data passed from server
  receivedRequests?: EnrichedRequest[];
  sentRequests?: EnrichedRequest[];
  archivedRequests?: EnrichedRequest[];
  initialIsSignedIn?: boolean;
}

// Loading skeleton for request cards
function RequestSkeleton() {
  return (
    <div className="border border-white/15 rounded-lg p-4 bg-[#131518] shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function RequestsTabs({ 
  receivedRequests = [], 
  sentRequests = [], 
  archivedRequests = [],
  initialIsSignedIn = true,
}: RequestsTabsProps) {
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("received");
  const [isLoading, setIsLoading] = useState(false);
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [dealRelationshipId, setDealRelationshipId] = useState<string | null>(null);
  const [canViewRequests, setCanViewRequests] = useState(initialIsSignedIn);
  const [requests, setRequests] = useState<{
    received: EnrichedRequest[];
    sent: EnrichedRequest[];
    archived: EnrichedRequest[];
  }>({
    received: receivedRequests,
    sent: sentRequests,
    archived: archivedRequests,
  });

  // Keep local state in sync with server data after refresh
  useEffect(() => {
    setRequests({
      received: receivedRequests,
      sent: sentRequests,
      archived: archivedRequests,
    });
  }, [receivedRequests, sentRequests, archivedRequests]);

  // Keep first render deterministic with server auth state, then sync with Clerk client state.
  useEffect(() => {
    if (typeof isSignedIn === "boolean") {
      setCanViewRequests(isSignedIn);
    }
  }, [isSignedIn]);

  // Calculate counts
  const counts = {
    received: requests.received.length,
    sent: requests.sent.length,
    archived: requests.archived.length,
  };

  const openChat = useCallback((relationshipId: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("setu:open-chat", { detail: { relationshipId } })
      );
    }
  }, []);

  // Handle actions
  const handleAcceptForDiscussion = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("relationshipId", id);
      await acceptForDiscussion(formData);
      
      toast({
        title: "Request Accepted",
        description: "Discussion started. Opening chat.",
      });

      openChat(id);
      
      // Refresh data
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
  }, [openChat, router, toast]);

  const handleReject = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("relationshipId", id);
      await rejectRequest(formData);
      
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
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  const handleAcceptDeal = useCallback((id: string) => {
    setDealRelationshipId(id);
    setDealModalOpen(true);
  }, []);

  const handleWithdraw = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("relationshipId", id);
      await withdrawRequest(formData);
      
      toast({
        title: "Request Withdrawn",
        description: "Your investment request has been withdrawn.",
      });
      
      router.refresh();
    } catch (error) {
      console.error("Failed to withdraw request:", error);
      toast({
        title: "Error",
        description: "Failed to withdraw request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  const handleOpenChat = useCallback((id: string) => {
    openChat(id);
  }, [openChat]);

  const handleViewDeal = useCallback((id: string, isIncoming: boolean) => {
    const all = [...requests.received, ...requests.sent, ...requests.archived];
    const request = all.find((r) => r.id === id);
    if (!request) return;

    if (request.status === "DEAL_ACCEPTED") {
      if (isIncoming) {
        if (request.startupSlug) {
          router.push(`/startup/${request.startupSlug}`);
        }
      } else {
        router.push("/user/me/portfolio");
      }
      return;
    }

    if (request.startupSlug) {
      router.push(`/startup/${request.startupSlug}`);
    }
  }, [requests, router]);

  // Empty state component
  const EmptyState = ({ type }: { type: "received" | "sent" | "archived" }) => {
    const messages = {
      received: {
        title: "No incoming requests",
        description: "When investors express interest in your startups, their requests will appear here.",
      },
      sent: {
        title: "No sent requests",
        description: "When you express interest in investing in a startup, your requests will appear here.",
      },
      archived: {
        title: "No archived requests",
        description: "Archived requests will appear here for your reference.",
      },
    };

    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 rounded-full bg-[#171a20] flex items-center justify-center mb-4">
          <svg className="h-8 w-8 text-white/55" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-1">{messages[type].title}</h3>
        <p className="text-white/65 max-w-sm mx-auto">{messages[type].description}</p>
      </div>
    );
  };

  if (!canViewRequests) {
    return (
      <div className="text-center py-12">
        <p className="text-white/65">Please sign in to view your requests.</p>
      </div>
    );
  }

  return (
    <>
      <AcceptDealModal
        open={dealModalOpen}
        relationshipId={dealRelationshipId}
        onClose={() => setDealModalOpen(false)}
      />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6 bg-[#131518] border border-white/15">
        <TabsTrigger value="received" className="relative data-[state=active]:bg-orange-500">
          Received
          {counts.received > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 rounded-full bg-orange-500 text-white text-xs font-medium flex items-center justify-center">
              {counts.received}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="sent" className="relative data-[state=active]:bg-orange-500">
          Sent
          {counts.sent > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 rounded-full bg-orange-500 text-white text-xs font-medium flex items-center justify-center">
              {counts.sent}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="archived" className="relative data-[state=active]:bg-orange-500">
          Archived
          {counts.archived > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 rounded-full bg-orange-500 text-white text-xs font-medium flex items-center justify-center">
              {counts.archived}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      {/* Received Tab */}
      <TabsContent value="received">
        {requests.received.length === 0 ? (
          <EmptyState type="received" />
        ) : (
          <div className="space-y-4">
            {requests.received.map((request) => (
              <RequestCard
                key={request.id}
                {...request}
                isIncoming={true}
                currentUserId={user?.id || ""}
                onAcceptForDiscussion={handleAcceptForDiscussion}
                onReject={handleReject}
                onAcceptDeal={handleAcceptDeal}
                onOpenChat={handleOpenChat}
                onViewDeal={(id) => handleViewDeal(id, true)}
                isLoading={isLoading}
              />
            ))}
          </div>
        )}
      </TabsContent>

      {/* Sent Tab */}
      <TabsContent value="sent">
        {requests.sent.length === 0 ? (
          <EmptyState type="sent" />
        ) : (
          <div className="space-y-4">
            {requests.sent.map((request) => (
              <RequestCard
                key={request.id}
                {...request}
                isIncoming={false}
                currentUserId={user?.id || ""}
                onWithdraw={handleWithdraw}
                onOpenChat={handleOpenChat}
                onViewDeal={(id) => handleViewDeal(id, false)}
                isLoading={isLoading}
              />
            ))}
          </div>
        )}
      </TabsContent>

      {/* Archived Tab */}
      <TabsContent value="archived">
        {requests.archived.length === 0 ? (
          <EmptyState type="archived" />
        ) : (
          <div className="space-y-4">
            {requests.archived.map((request) => (
              <RequestCard
                key={request.id}
                {...request}
                isIncoming={request.investorId === user?.id ? false : true}
                currentUserId={user?.id || ""}
                onViewDeal={(id) =>
                  handleViewDeal(id, request.investorId !== user?.id)
                }
                isLoading={isLoading}
              />
            ))}
          </div>
        )}
      </TabsContent>
      </Tabs>
    </>
  );
}

export default RequestsTabs;

