"use client";

import { useState } from "react";
import { addComment } from "@/app/actions/founderFeed";
import { useUser } from "@clerk/nextjs";
import { Send } from "lucide-react";

type CommentFormProps = {
  postId: string;
  onCommentAdded?: (c: {
    id: string;
    text: string;
    createdAt: Date;
    author: { name?: string; image?: string };
  }) => void;
};

export function CommentForm({ postId, onCommentAdded }: CommentFormProps) {
  const { user, isSignedIn, isLoaded } = useUser();
  const [text, setText] = useState("");

  if (!isLoaded) return null;
  if (!isSignedIn || !user?.id) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!text.trim()) return;
    const formData = new FormData();
    formData.set("postId", postId);
    formData.set("text", text.trim());
    const created = await addComment(formData);
    setText("");
    if (created && onCommentAdded) {
      onCommentAdded({
        id: created.id,
        text: created.text,
        createdAt: created.createdAt,
        author: { name: user?.fullName ?? user?.firstName ?? undefined, image: user?.imageUrl ?? undefined },
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3">
      <textarea
        placeholder="Add a comment..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full resize-none rounded-lg border border-white/15 bg-black/30 p-3 text-sm text-white outline-none transition-all duration-200 placeholder:text-white/45 focus:border-orange-400/60"
        rows={2}
      />
      <button
        type="submit"
        className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-400"
        aria-label="Post comment"
      >
        <Send className="h-4 w-4" />
        <span>Post</span>
      </button>

    </form>
  );
}