"use client";

import { useState } from "react";
import { addComment } from "@/app/actions/founderFeed";
import { useUser } from "@clerk/nextjs";

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
        className="w-full resize-none outline-none border rounded p-2"
        rows={2}
      />
      <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white px-2 py-1 rounded mt-2 cursor-pointer" aria-label="Post comment">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-4 h-4"
  >
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
</button>

    </form>
  );
}