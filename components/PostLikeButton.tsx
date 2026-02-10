"use client";

import { useState } from "react";
import { likePost } from "@/app/actions/founderFeed";
import { useUser } from "@clerk/nextjs";

export function PostLikeButton({
  postId,
  likes,
}: {
  postId: string;
  likes: { id: string; userId: string }[];
}) {
  const { user, isSignedIn, isLoaded } = useUser();

  const [localLikes, setLocalLikes] = useState(likes);

  if (!isLoaded) {
    return <span>Loading...</span>;
  }

  const userId = user?.id;

  const isLiked = userId
    ? localLikes.some((l) => l.userId === userId)
    : false;

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
      className={`border p-2 rounded cursor-pointer z-10 ${
        isLiked ? "bg-red-100" : "bg-gray-100"
      }`}
    >
      ❤️ {localLikes.length}
    </button>
  );
}
