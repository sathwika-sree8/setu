"use client";

import React, { useEffect, useState } from 'react'
import { cn, formatDate } from '@/lib/utils';
import { EyeIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from './ui/button';
import { Author, Startup } from '@/sanity/types';
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@clerk/nextjs";
import { requestDealRoom } from "@/app/actions/dealRoom"

export type StartupTypeCard = Omit<Startup, "author"> & { author?: Author};

// Define result type for better TypeScript support
interface DealRoomResult {
  id: string;
  startupId: string;
  founderId: string;
  investorId: string;
  status: string;
  createdAt: Date;
  created?: boolean;
  alreadyExists?: boolean;
  message?: string;
}

const StartupCard = ({ post }: { post: StartupTypeCard }) => {
  const {
    _createdAt, views, author, title, category, _id, image, description
  } = post;

  const { user, isLoaded: isUserLoaded } = useUser();
  const [mounted, setMounted] = useState(false);
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);

  // Use useEffect to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate isFounder only after mounted to avoid hydration mismatch
  const isFounder = mounted && user?.id === author?.clerkId;

  async function handleInvest() {
    if (!user?.id) {
      alert("Please login to invest");
      return;
    }
    if (!author?.clerkId || !author.clerkId.startsWith("user_")) {
      console.error("AUTHOR CLERK ID MISSING", author);
      alert("Author information is missing");
      return;
    }

    try {
      setLoading(true);
      // Pass clerkId instead of _id for deal room requests
      const result = await requestDealRoom(_id, author.clerkId) as DealRoomResult;
      
      // Check if request was successful using type guards
      const isCreated = 'created' in result && (result as any).created;
      const isExisting = 'alreadyExists' in result && (result as any).alreadyExists;
      
      if (isCreated || isExisting) {
        setRequested(true);
        // Show info message if already exists
        if (isExisting && (result as any).message) {
          console.log((result as any).message);
        }
      } else {
        throw new Error("Unexpected response from server");
      }
    } catch (error: any) {
      // Log the actual error for debugging
      console.error("Investment request error:", error);
      
      // Show user-friendly error message
      const errorMessage = error?.message || "Failed to send investment request";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <li className="startup-card group">
        <div className="flex-between">
            <p className="startup_card_date">
                {formatDate(_createdAt)}
            </p>
            <div className="flex gap-1.5">
              <EyeIcon className="size-6 text-primary"/>
              <span className="text-16-medium">{views}</span>
            </div>
        </div>
        <div className="flex-between mt-5 gap-5">
          <div className="flex-1">
            <Link href={`/user/${author?.clerkId}`}>
            <p className="text-16-medium line-clamp-1">{author?.name}</p>
            </Link>
            <Link href={`/startup/${_id}`}>
            <p className="text-26-semibold line-clamp-1">{title}</p>
            </Link>
          </div>
          <Link href={`/user/${author?.clerkId}`}>
          <Image src={author?.image || ""} alt={author?.name || ""} width={48} height={48} className="rounded-full"/>
          </Link>

        </div>
        <Link href={`/startup/${_id}`}>
        <p className="startup-card_desc">
          {description}
        </p>
        <img src={image} alt="placeholder" className="startup-card_img"/>
        </Link>
        <div className="flex-between gap-3 mt-5">
          <Link href={`/?query=${category?.toLowerCase()}`}>
          <p className="text-16-medium">{category}</p>
          </Link>
          <Button className="startup-card_btn" asChild>
            <Link href={`/startup/${_id}`}>Details</Link>
          </Button>
        </div>
        <Link href={`/startup/${_id}/feed`}>
          <button className="btn-secondary mt-3 w-full">
            View Founder Feed
          </button>
        </Link>
        {/* Show loading skeleton for auth-dependent button until mounted */}
        {!mounted ? (
          <div className="btn-primary mt-3 w-full opacity-50">
            Loading...
          </div>
        ) : !isFounder && (
        <button
          onClick={handleInvest}
          disabled={requested || loading}
          className="btn-primary mt-3 w-full disabled:opacity-50"
        >
          {requested
            ? "Request Sent"
            : loading
            ? "Sending..."
            : "Invest"}
        </button>
        )}
    </li>
  )
}

export const StartupCardSkeleton = () => (
  <>
    {[0, 1, 2, 3, 4].map((index: number) => (
      <li key={cn("skeleton", index)}>
        <Skeleton className="startup-card_skeleton" />
      </li>
    ))}
  </>
);

export default StartupCard

