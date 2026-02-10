"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export default function AuthSync() {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (!isSignedIn || !user) return;

    fetch("/api/sync-author", {
      method: "POST",
      body: JSON.stringify({
        userId: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        image: user.imageUrl,
      }),
    }).catch((error) => {
      // Silently handle fetch errors to prevent TypeError crashes
      console.warn("Auth sync failed:", error);
    });
  }, [isSignedIn, user]);

  return null;
}
