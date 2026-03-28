import { getFeed } from "@/app/actions/founderFeed";
import { PostActions } from "./PostActions";
import PostMenu from "./PostMenu";
import { formatRelativeTime } from "@/lib/utils";

export default async function FounderFeed({
  startupId,
}: {
  startupId: string;
}) {
  const posts = await getFeed(startupId);

  if (!posts.length) {
    return (
      <div className="rounded-2xl border border-white/15 bg-[#121416] p-8 text-center text-sm text-white/70 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
        No updates yet.
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      {posts.map((post) => (
        <article
          key={post.id}
          className="group rounded-2xl border border-white/15 bg-[#131518] p-5 text-white shadow-[0_12px_30px_rgba(0,0,0,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-400/40 hover:shadow-[0_16px_36px_rgba(0,0,0,0.30)]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {post.author?.image ? (
                <img
                  src={post.author.image}
                  alt={post.author?.name || "Author"}
                  className="h-10 w-10 rounded-full border border-white/20 object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-sm font-semibold text-white/80">
                  {(post.author?.name || "A").charAt(0)}
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-white">{post.author?.name || "Founder"}</p>
                <p className="text-xs text-white/55">{formatRelativeTime(post.createdAt)}</p>
              </div>
            </div>

            <PostMenu
              postId={post.id}
              authorId={post.authorId}
              initialContent={post.content}
              initialImageUrl={post.imageUrl}
            />
          </div>

          <p className="whitespace-pre-line text-[15px] leading-relaxed text-white/90">{post.content}</p>

          {post.imageUrl && (
            <img
              src={post.imageUrl}
              alt="post"
              className="mt-4 max-h-96 w-full rounded-xl border border-white/10 object-cover"
            />
          )}

          <div className="mt-4 border-t border-white/10 pt-2">
            <PostActions
              postId={post.id}
              likes={post.likes}
              commentCount={post.commentCount}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
