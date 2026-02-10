"use client";

import { useState } from "react";
import { getUserPosts } from "@/app/actions/founderFeed";
import { PostActions } from "./PostActions";
import { formatRelativeTime } from "@/lib/utils";

export default function UserPosts({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPosts, setShowPosts] = useState(false);

  const handleViewPosts = async () => {
    setLoading(true);
    try {
      const fetchedPosts = await getUserPosts(userId);
      setPosts(fetchedPosts);
      setShowPosts(true);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-5">
      <button
        onClick={handleViewPosts}
        className="relative
    px-10 py-4
    font-extrabold uppercase tracking-wide
    text-black
    bg-white
    rounded-2xl
    border-4 border-black
    shadow-[8px_8px_0px_0px_#000]
    hover:translate-x-1 hover:translate-y-1
    hover:shadow-[4px_4px_0px_0px_#000]
    transition-all
    disabled:opacity-50
    disabled:cursor-not-allowed"
        disabled={loading}
      >
        {loading ? "Loading..." : "View Posts"}
      </button>

      {showPosts && (
        <div className="mt-5">
          <h3 className="text-30-bold mb-4">Your Posts</h3>
          {posts.length === 0 ? (
            <p className="text-gray-500">No posts yet</p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="border rounded-xl p-4 bg-white">
                  <p className="text-16-medium">{post.content}</p>
                  <p className="text-xs text-gray-500">{formatRelativeTime(post.createdAt)}</p>
                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt="post"
                      className="rounded-lg mt-3 max-h-80"
                    />
                  )}
                  <PostActions postId={post.id} likes={post.likes} commentCount={post.commentCount} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
