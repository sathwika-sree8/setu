"use client";

import { useState } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MessageCircle, 
  Archive, 
  CheckCircle, 
  XCircle, 
  Clock
} from "lucide-react";

// Types for request data
export type RequestStatus = "PENDING" | "IN_DISCUSSION" | "DEAL_ACCEPTED" | "DEAL_REJECTED" | "CLOSED";

export interface RequestCardProps {
  id: string;
  startupId: string;
  startupName: string;
  startupSlug?: string;
  founderId?: string;
  founderName?: string;
  founderImage?: string;
  investorId?: string;
  investorName?: string;
  investorImage?: string;
  status: RequestStatus;
  createdAt: Date;
  lastActivityAt?: Date;
  lastMessage?: string;
  unreadCount?: number;
  isIncoming: boolean;
  currentUserId: string;
  onAcceptForDiscussion?: (id: string) => void;
  onReject?: (id: string) => void;
  onAcceptDeal?: (id: string) => void;
  onWithdraw?: (id: string) => void;
  onArchive?: (id: string) => void;
  onOpenChat?: (id: string) => void;
  onViewDeal?: (id: string) => void;
  isLoading?: boolean;
}

// Status badge configuration
const statusConfig: Record<RequestStatus, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: "Pending", color: "bg-orange-500/20 text-orange-300", icon: Clock },
  IN_DISCUSSION: { label: "In Discussion", color: "bg-blue-500/20 text-blue-300", icon: MessageCircle },
  DEAL_ACCEPTED: { label: "Deal Accepted", color: "bg-green-500/20 text-green-300", icon: CheckCircle },
  DEAL_REJECTED: { label: "Rejected", color: "bg-red-500/20 text-red-300", icon: XCircle },
  CLOSED: { label: "Archived", color: "bg-white/5 text-white/55", icon: Archive },
};

export function RequestCard({
  id,
  startupId,
  startupName,
  startupSlug,
  founderId,
  founderName,
  founderImage,
  investorId,
  investorName,
  investorImage,
  status,
  createdAt,
  lastActivityAt,
  lastMessage,
  unreadCount = 0,
  isIncoming,
  currentUserId,
  onAcceptForDiscussion,
  onReject,
  onAcceptDeal,
  onWithdraw,
  onArchive,
  onOpenChat,
  onViewDeal,
  isLoading = false,
}: RequestCardProps) {
  const counterparty = isIncoming
    ? { name: investorName || "Unknown Investor", image: investorImage }
    : { name: startupName, image: undefined };

  const activityTime = lastActivityAt || createdAt;
  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo.icon;

  const getActions = () => {
    const actions: { label: string; variant: "default" | "outline" | "destructive" | "secondary"; onClick: () => void; disabled?: boolean }[] = [];

    if (status === "PENDING" && isIncoming) {
      actions.push({
        label: "Accept for Discussion",
        variant: "default",
        onClick: () => onAcceptForDiscussion?.(id),
        disabled: isLoading,
      });
      actions.push({
        label: "Reject Request",
        variant: "destructive",
        onClick: () => onReject?.(id),
        disabled: isLoading,
      });
    }

    if (status === "IN_DISCUSSION") {
      if (isIncoming) {
        actions.push({
          label: "Accept Deal",
          variant: "default",
          onClick: () => onAcceptDeal?.(id),
          disabled: isLoading,
        });
        actions.push({
          label: "Reject Deal",
          variant: "destructive",
          onClick: () => onReject?.(id),
          disabled: isLoading,
        });
        actions.push({
          label: "Open Chat",
          variant: "outline",
          onClick: () => onOpenChat?.(id),
        });
      } else {
        actions.push({
          label: "Open Chat",
          variant: "outline",
          onClick: () => onOpenChat?.(id),
        });
      }
    }

    if (status === "DEAL_ACCEPTED") {
      actions.push({
        label: "View Investment",
        variant: "outline",
        onClick: () => onViewDeal?.(id),
      });
      actions.push({
        label: "Open Chat",
        variant: "secondary",
        onClick: () => onOpenChat?.(id),
      });
    }

    if (status === "DEAL_REJECTED") {
      actions.push({
        label: "View Details",
        variant: "outline",
        onClick: () => onViewDeal?.(id),
      });
    }

    if (status === "CLOSED") {
      actions.push({
        label: "View Details",
        variant: "outline",
        onClick: () => onViewDeal?.(id),
      });
    }

    if (status === "PENDING" && !isIncoming) {
      actions.push({
        label: "Withdraw",
        variant: "outline",
        onClick: () => onWithdraw?.(id),
      });
    }

    return actions;
  };

  const actions = getActions();

  return (
    <div className="border border-white/15 rounded-lg p-4 bg-[#131518] shadow-[0_12px_30px_rgba(0,0,0,0.22)] hover:shadow-[0_20px_42px_rgba(0,0,0,0.36)] hover:border-orange-400/35 transition-shadow duration-300">
      <div className="flex items-start gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={counterparty.image} alt={counterparty.name} />
          <AvatarFallback className="bg-orange-500/20 text-orange-400 font-medium">
            {counterparty.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-white">
                {isIncoming ? counterparty.name : startupName}
              </p>
              <p className="text-sm text-white/65">
                {isIncoming ? "wants to invest in" : "Investment in"}
              </p>
              <p className="font-medium text-orange-300">
                {isIncoming ? startupName : counterparty.name}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </span>
            </div>
          </div>

          <p className="text-xs text-white/55 mt-2">
            {formatRelativeTime(activityTime)}
          </p>

          {lastMessage && (
            <p className="text-sm text-white/55 mt-2 line-clamp-1">
              {lastMessage}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled || isLoading}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {unreadCount > 0 && (
          <div className="shrink-0">
            <span className="h-5 min-w-5 px-1.5 rounded-full bg-orange-500 text-white text-xs font-medium flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default RequestCard;

