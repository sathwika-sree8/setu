"use client";

import Image from "next/image";
import { useState } from "react";
import { Newspaper, RefreshCcw } from "lucide-react";
import { getUserPosts } from "@/app/actions/founderFeed";
import { PostActions } from "./PostActions";
import PostMenu from "./PostMenu";
import { formatRelativeTime } from "@/lib/utils";

type UserPost = Awaited<ReturnType<typeof getUserPosts>>[number];

export default function UserPosts({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<UserPost[]>([]);
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
    <div className="mt-5 w-full rounded-[26px] border-[3px] border-black bg-[#111111] p-5 shadow-200">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/60 bg-orange-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
            <Newspaper className="h-3.5 w-3.5" />
            Founder Feed
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">Posts</h3>
            <p className="text-sm text-white/65">
              Review and manage what investors see from your founder updates.
            </p>
          </div>
        </div>

        <button
          onClick={handleViewPosts}
          className="inline-flex items-center justify-center gap-2 rounded-full border-[3px] border-black bg-orange-500 px-5 py-3 text-sm font-semibold text-black shadow-[4px_4px_0_0_#000] transition-all hover:translate-y-[1px] hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading}
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading posts..." : showPosts ? "Refresh Posts" : "Load Posts"}
        </button>
      </div>

      {showPosts && (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-orange-500/30 bg-black/30 px-4 py-3">
            <h4 className="text-base font-semibold text-orange-300">Published Posts</h4>
            <span className="rounded-full border border-orange-500/40 bg-orange-500 px-3 py-1 text-xs font-semibold text-black">
              {posts.length} {posts.length === 1 ? "post" : "posts"}
            </span>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-orange-500/35 bg-black/20 px-6 py-10 text-center text-sm text-white/60">
              No posts yet.
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-[24px] border-[3px] border-black bg-[#fff3e0] p-5 shadow-[6px_6px_0_0_#000]"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <span className="inline-flex rounded-full border border-black bg-orange-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black">
                        {formatRelativeTime(post.createdAt)}
                      </span>
                      <p className="text-sm leading-7 text-black">{post.content}</p>
                    </div>

                    <PostMenu
                      postId={post.id}
                      authorId={post.authorId}
                      initialContent={post.content}
                      initialImageUrl={post.imageUrl}
                    />
                  </div>

                  {post.imageUrl && (
                    <Image
                      src={post.imageUrl}
                      alt="post"
                      width={1200}
                      height={900}
                      className="mt-3 max-h-80 w-full rounded-[20px] border-[3px] border-black object-cover"
                    />
                  )}

                  <PostActions
                    postId={post.id}
                    likes={post.likes}
                    commentCount={post.commentCount}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
