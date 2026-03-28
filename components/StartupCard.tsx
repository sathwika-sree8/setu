"use client";

import React, { useEffect, useState } from 'react'
import { cn, formatDate } from '@/lib/utils';
import { EyeIcon, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from './ui/button';
import { Author, Startup } from '@/sanity/types';
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@clerk/nextjs";
import { requestDealRoom } from "@/app/actions/dealRoom";
import { useRouter } from "next/navigation";
import { updateStartupBasic, deleteStartup } from "@/lib/action";
import { useToast } from "@/hooks/use-toast";

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
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editValues, setEditValues] = useState({
    title: title || "",
    description: description || "",
    category: category || "",
    image: image || "",
  });

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
    <li className="startup-card group relative">
        <div className="flex-between">
            <p className="startup_card_date">
                {formatDate(_createdAt)}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <EyeIcon className="size-6 text-primary"/>
                <span className="text-16-medium">{views}</span>
              </div>

              {isFounder && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((o) => !o)}
                    className="p-1 rounded-full hover:bg-white/60"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-1 w-40 rounded-md border border-black bg-white text-sm shadow-200 z-20">
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left hover:bg-gray-50"
                        onClick={() => {
                          setMenuOpen(false);
                          setEditOpen(true);
                        }}
                      >
                        Edit startup
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
                        disabled={isDeleting}
                        onClick={async () => {
                          setMenuOpen(false);
                          if (!confirm("Delete this startup? This cannot be undone.")) return;
                          setIsDeleting(true);
                          try {
                            const res = await deleteStartup(_id);
                            if (res?.ok) {
                              toast({
                                title: "Startup deleted",
                                description: "Your startup has been deleted successfully.",
                              });
                              router.refresh();
                            } else {
                              toast({
                                title: "Error",
                                description: "Failed to delete startup. Please try again.",
                                variant: "destructive",
                              });
                            }
                          } catch (e) {
                            console.error("Failed to delete startup", e);
                            toast({
                              title: "Error",
                              description: "Failed to delete startup. Please try again.",
                              variant: "destructive",
                            });
                          } finally {
                            setIsDeleting(false);
                          }
                        }}
                      >
                        {isDeleting ? "Deleting..." : "Delete startup"}
                      </button>
                    </div>
                  )}
                </div>
              )}
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

          {editOpen && (
            <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
              <div className="w-full max-w-lg rounded-2xl border-[3px] border-black bg-white p-5 space-y-4">
                <h2 className="text-lg font-semibold">Edit startup</h2>

                <input
                  className="w-full border px-3 py-2 rounded-md text-sm"
                  value={editValues.title}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, title: e.target.value }))
                  }
                  placeholder="Title"
                />
                <textarea
                  className="w-full border px-3 py-2 rounded-md text-sm"
                  rows={3}
                  value={editValues.description}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, description: e.target.value }))
                  }
                  placeholder="Description"
                />
                <input
                  className="w-full border px-3 py-2 rounded-md text-sm"
                  value={editValues.category}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, category: e.target.value }))
                  }
                  placeholder="Category"
                />
                <input
                  className="w-full border px-3 py-2 rounded-md text-sm"
                  value={editValues.image}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, image: e.target.value }))
                  }
                  placeholder="Image URL"
                />

                <div className="flex justify-end gap-2 text-sm">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50"
                    onClick={() => setEditOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={isSaving}
                    onClick={async () => {
                      setIsSaving(true);
                      try {
                        const res = await updateStartupBasic(_id, {
                          title: editValues.title,
                          description: editValues.description,
                          category: editValues.category,
                          image: editValues.image,
                        });
                        if (res?.ok) {
                          toast({
                            title: "Startup updated",
                            description: "Your startup details have been saved.",
                          });
                          setEditOpen(false);
                          router.refresh();
                        } else {
                          toast({
                            title: "Error",
                            description: "Failed to update startup. Please try again.",
                            variant: "destructive",
                          });
                        }
                      } catch (e) {
                        console.error("Failed to update startup", e);
                        toast({
                          title: "Error",
                          description: "Failed to update startup. Please try again.",
                          variant: "destructive",
                        });
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                  >
                    {isSaving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
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

