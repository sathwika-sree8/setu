import { getGlobalFeed } from "@/app/actions/founderFeed";
import { PostActions } from "./PostActions";
import PostMenu from "./PostMenu";
import { formatRelativeTime } from "@/lib/utils";

export default async function GlobalFeed() {
  let posts: any[] = [];

  try {
    posts = await getGlobalFeed();
  } catch (error) {
    console.error("GlobalFeed error:", error);
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="rounded-2xl border border-white/15 bg-[#121416] p-8 text-center text-sm text-white/70 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
        No posts yet. Be the first to share an update.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <article
          key={post.id}
          className="group rounded-2xl border border-white/15 bg-[#131518] p-5 text-white shadow-[0_12px_30px_rgba(0,0,0,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-400/40 hover:shadow-[0_16px_36px_rgba(0,0,0,0.30)]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            {post.author && (
              <div className="flex items-center gap-3">
                <img
                  src={post.author.image}
                  alt={post.author.name}
                  className="h-10 w-10 rounded-full border border-white/20 object-cover"
                />
                <div>
                  <span className="block text-sm font-semibold text-white">{post.author.name}</span>
                  <span className="block text-xs text-white/55">
                    {formatRelativeTime(post.createdAt)}
                  </span>
                </div>
              </div>
            )}

            <PostMenu
              postId={post.id}
              authorId={post.authorId}
              initialContent={post.content}
              initialImageUrl={post.imageUrl}
            />
          </div>

          {post.startup && (
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-orange-300">
              Update: {post.startup.title}
            </p>
          )}

          <p className="whitespace-pre-line text-[15px] leading-relaxed text-white/90">
            {post.content}
          </p>

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
