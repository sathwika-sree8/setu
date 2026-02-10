import { getGlobalFeed } from "@/app/actions/founderFeed";
import { PostActions } from "./PostActions";
import { formatRelativeTime } from "@/lib/utils";

export default async function GlobalFeed() {
  let posts: any[] = [];

  try {
    posts = await getGlobalFeed();
  } catch (error) {
    console.error("GlobalFeed error:", error);
  }

  if (!posts || posts.length === 0) {
    return <p className="text-gray-500">No posts yet</p>;
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div key={post.id} className="border rounded-xl p-4 bg-white">
          {post.author && (
            <div className="flex items-center mb-2">
              <img
                src={post.author.image}
                alt={post.author.name}
                className="w-8 h-8 rounded-full mr-2"
              />
              <div>
                <span className="font-semibold">{post.author.name}</span>
                <span className="text-xs text-gray-500 block">{formatRelativeTime(post.createdAt)}</span>
              </div>
            </div>
          )}
          {post.startup && (
  <p className="text-sm text-gray-500 mb-2">
    Posted about{" "}
    <span className="font-medium text-gray-700">
      {post.startup.title}
    </span>
  </p>
)}


          <p className="text-16-medium">{post.content}</p>

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
  );
}
