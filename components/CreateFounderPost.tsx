"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Prisma } from "@prisma/client";
import { UpdateType } from "@prisma/client";
import { createPost } from "@/app/actions/founderFeed";
import { createStartupUpdate } from "@/app/actions/founderFeed";

type UpdateTypeUI =
  | "GENERAL"
  | "REVENUE"
  | "FUNDRAISING"
  | "PRODUCT"
  | "HIRING"
  | "RISKS";

type UpdateVisibilityUI = "PUBLIC" | "INVESTORS_ONLY";
interface CreateFounderPostProps {
  startupId: string;
  authorId: string;
  isStartupUpdate?: boolean;
  updateTypes?: UpdateTypeUI[];
}

export default function CreateFounderPost({
  startupId,
  authorId,
  isStartupUpdate = false,
  updateTypes = [
  UpdateType.GENERAL,
  UpdateType.REVENUE,
  UpdateType.FUNDRAISING,
  UpdateType.PRODUCT,
  UpdateType.HIRING,
  UpdateType.RISKS,
],
}: CreateFounderPostProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [updateType, setUpdateType] = useState<UpdateTypeUI>("GENERAL");
  const [visibility, setVisibility] = useState<UpdateVisibilityUI>("PUBLIC");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    
    setIsSubmitting(true);
    try {
      if (isStartupUpdate) {
        await createStartupUpdate(
          startupId,
          authorId,
          text,
          updateType,
          visibility,
          title || undefined
        );
      } else {
        await createPost(startupId, authorId, text);
      }
      // Reset form
      setText("");
      setTitle("");
      setUpdateType("GENERAL");
      setVisibility("PUBLIC");
      
      // Refresh page to show the new update
      router.refresh();
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isStartupUpdate) {
    return (
      <div className="border rounded-xl p-4 bg-white">
        {/* Title (optional) */}
        <input
          type="text"
          className="w-full resize-none outline-none border-b pb-2 mb-3 placeholder:text-gray-400"
          placeholder="Update title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Content textarea */}
        <textarea
          className="w-full resize-none outline-none"
          placeholder="Share an update with your investors..."
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {/* Update Type Selector */}
        <div className="flex flex-wrap gap-2 mt-3">
          <label className="text-sm text-gray-500">Type:</label>
          {updateTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setUpdateType(type)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                updateType === type
                  ? "bg-blue-100 text-blue-700 border border-blue-300"
                  : "bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200"
              }`}
            >
              {type.charAt(0) + type.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Visibility Selector */}
        <div className="flex flex-wrap gap-4 mt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="visibility"
              value="PUBLIC"
              checked={visibility === "PUBLIC"}
              onChange={() => setVisibility("PUBLIC")}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm flex items-center gap-1">
              🌍 <span className="font-medium">Public</span>
              <span className="text-gray-400 text-xs ml-1">(visible to everyone)</span>
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="visibility"
              value="INVESTORS_ONLY"
              checked={visibility === "INVESTORS_ONLY"}
              onChange={() => setVisibility("INVESTORS_ONLY")}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm flex items-center gap-1">
              🔒 <span className="font-medium">Investors only</span>
              <span className="text-gray-400 text-xs ml-1">(visible only to confirmed investors)</span>
            </span>
          </label>
        </div>

        <div className="flex justify-end mt-4">
          <button
            className="btn-primary disabled:opacity-50"
            onClick={handleSubmit}
            disabled={isSubmitting || !text.trim()}
          >
            {isSubmitting ? "Posting..." : "Post Update"}
          </button>
        </div>
      </div>
    );
  }

  // Original simple post form
  return (
    <div className="border rounded-xl p-4 bg-white">
      <textarea
        className="w-full resize-none outline-none"
        placeholder="Share an update with the community..."
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex justify-end mt-2">
        <button
          className="btn-primary disabled:opacity-50"
          onClick={async () => {
            await createPost(startupId, authorId, text);
            setText("");
          }}
          disabled={!text.trim()}
        >
          Post
        </button>
      </div>
    </div>
  );
}
