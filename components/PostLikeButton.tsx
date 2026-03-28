"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { likePost } from "@/app/actions/founderFeed";
import { useUser } from "@clerk/nextjs";
import { Heart } from "lucide-react";

function subscribe() {
  return () => {};
}

export function PostLikeButton({
  postId,
  likes,
}: {
  postId: string;
  likes: { id: string; userId: string }[];
}) {
  const { user, isSignedIn, isLoaded } = useUser();

  const [localLikes, setLocalLikes] = useState(likes);
  const isHydrated = useSyncExternalStore(subscribe, () => true, () => false);

  const userId = isHydrated && isLoaded && isSignedIn ? user?.id : undefined;

  const isLiked = useMemo(
    () => (userId ? localLikes.some((l) => l.userId === userId) : false),
    [localLikes, userId]
  );

  const isInteractive = isHydrated && isLoaded;

  const handleLike = async () => {
    if (!userId) {
      alert("Please login to like posts");
      return;
    }

    // optimistic update
    setLocalLikes((prev) =>
      isLiked
        ? prev.filter((l) => l.userId !== userId)
        : [...prev, { id: "temp", userId }]
    );

    const formData = new FormData();
    formData.set("postId", postId);

    try {
      await likePost(formData);
    } catch {
      // rollback if server fails
      setLocalLikes(likes);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={!isInteractive}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
        isLiked
          ? "bg-orange-500/15 text-orange-300"
          : "text-white/75 hover:bg-white/5 hover:text-white"
      } ${!isInteractive ? "cursor-default opacity-50" : "cursor-pointer"}`}
      aria-label="Like post"
    >
      <Heart className={`h-4 w-4 ${isLiked ? "fill-orange-400 text-orange-400" : "text-white/70"}`} />
      <span>{localLikes.length}</span>
    </button>
  );
}
