import { formatDistanceToNow } from "date-fns";

type Comment = {
  id: string;
  text: string;
  createdAt: Date;
  author: { name?: string; image?: string };
};

type CommentListProps = {
  comments: Comment[];
};

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return <p className="text-gray-500 mt-2">No comments yet.</p>;
  }

  return (
    <div className="mt-3 space-y-2">
      {comments.map((comment) => (
        <div key={comment.id} className="border-l-2 border-gray-200 pl-3">
          <div className="flex items-center gap-2">
            {comment.author.image && (
              <img
                src={comment.author.image}
                alt={comment.author.name || "User"}
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="font-medium text-sm">
              {comment.author.name || "Anonymous"}
            </span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm mt-1">{comment.text}</p>
        </div>
      ))}
    </div>
  );
}
