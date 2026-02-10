import { getFeed, likePost } from "@/app/actions/founderFeed";
import { PostActions } from "./PostActions";
import { formatRelativeTime } from "@/lib/utils";
export default async function FounderFeed({
  startupId,
}: {
  startupId: string;
}) {
  const posts = await getFeed(startupId);

  if (!posts.length) {
    return <p className="text-black-300">No updates yet.</p>;
  }

  return (
    <div className="space-y-4 mt-6">
      {posts.map((post) => (
        <div
          key={post.id}
          className="border rounded-xl p-4 bg-white"
        >
          <p className="text-16-medium">{post.content}</p>
          <p className="text-xs text-gray-500">{formatRelativeTime(post.createdAt)}</p>

          <div className="flex gap-6 mt-3 text-14-medium text-black-300">
            <PostActions
              postId={post.id}
              likes={post.likes}
              commentCount={post.commentCount}
            />

            <span>💬 {post.commentCount}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
