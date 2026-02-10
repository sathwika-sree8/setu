"use client";

import { useEffect, useState } from "react";
import { PostLikeButton } from "./PostLikeButton";
import { CommentForm } from "./CommentForm";
import { getComments } from "@/app/actions/founderFeed";

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

  useEffect(() => {
    if (showComments && !loaded) {
      getComments(postId).then((c) => {
        setComments(c);
        setLoaded(true);
      });
    }
  }, [showComments, loaded, postId]);

  function handleCommentAdded(c: Comment) {
    setComments((prev) => [...prev, c]);   // ✅ show comment
    setCount((n) => n + 1);                 // ✅ increment count
  }

  return (
    <div className="mt-3">
      <PostLikeButton postId={postId} likes={likes} />

      <button
        onClick={() => setShowComments((s) => !s)}
        className="ml-4 border p-2 rounded bg-gray-100 hover:bg-gray-200"
      >
        💬 {count}
      </button>

      {showComments && (
        <div className="mt-3 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="text-sm">
              <span className="font-semibold mr-2">
                {c.author?.name}
              </span>
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
