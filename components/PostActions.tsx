"use client";

import { useEffect, useState } from "react";
import { PostLikeButton } from "./PostLikeButton";
import { CommentForm } from "./CommentForm";
import { getComments } from "@/app/actions/founderFeed";
import { MessageCircle, Share2 } from "lucide-react";

type Comment = {
  id: string;
  text: string;
  createdAt: Date;
  author?: { name?: string; image?: string };
};

type PostActionsProps = {
  postId: string;
  likes: { id: string; userId: string }[];
  commentCount: number;
};

export function PostActions({ postId, likes, commentCount }: PostActionsProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [count, setCount] = useState(commentCount);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (showComments && !loaded) {
      getComments(postId).then((c) => {
        setComments(c);
        setLoaded(true);
      });
    }
  }, [showComments, loaded, postId]);

  function handleCommentAdded(c: Comment) {
    setComments((prev) => [...prev, c]);
    setCount((n) => n + 1);
  }

  async function handleShare() {
    const url = `${window.location.origin}${window.location.pathname}#post-${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="mt-4" id={`post-${postId}`}>
      <div className="mb-3 flex items-center justify-between text-xs text-white/60">
        <span>{likes.length} {likes.length === 1 ? "like" : "likes"}</span>
        <span>{count} {count === 1 ? "comment" : "comments"}</span>
      </div>

      <div className="flex items-center justify-between border-y border-white/10 py-1">
        <PostLikeButton postId={postId} likes={likes} />

        <button
          onClick={() => setShowComments((s) => !s)}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/75 transition-all duration-200 hover:bg-white/5 hover:text-white"
          aria-label="Toggle comments"
        >
          <MessageCircle className="h-4 w-4" />
          <span>Comment</span>
        </button>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/75 transition-all duration-200 hover:bg-white/5 hover:text-white"
          aria-label="Share post"
        >
          <Share2 className="h-4 w-4" />
          <span>{copied ? "Copied" : "Share"}</span>
        </button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/85">
              <span className="mr-2 font-semibold text-white">{c.author?.name || "Anonymous"}</span>
              {c.text}
            </div>
          ))}

          <CommentForm
            postId={postId}
            onCommentAdded={handleCommentAdded}
          />
        </div>
      )}
    </div>
  );
}
