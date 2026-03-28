"use client";

import { useState } from "react";
import { createPost } from "@/app/actions/founderFeed";
import { useUser } from "@clerk/nextjs";

export default function CreateGlobalPost() {
  const { user, isSignedIn, isLoaded } = useUser();
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);

  async function handleImageUpload(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setImage(data.url);
  }

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-white/15 bg-[#121416] shadow-[0_12px_30px_rgba(0,0,0,0.22)] transition-all duration-300">
      <div className="border-b border-white/10 bg-gradient-to-r from-orange-500/12 to-transparent px-4 py-3 text-sm font-semibold text-orange-200">
        Share an update with your network
      </div>

      <div className="p-4">
        <textarea
          placeholder="What’s new with your startup?"
          className="w-full resize-none rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none transition-all duration-200 placeholder:text-white/45 focus:border-orange-400/55 focus:ring-1 focus:ring-orange-400/40"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {image && (
          <img
            src={image}
            alt="upload"
            className="mt-3 max-h-64 w-full rounded-lg border border-white/10 object-cover"
          />
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <label className="cursor-pointer text-xs font-medium text-white/70">
            <span className="rounded-full border border-orange-400/35 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-200 transition-colors duration-200 hover:bg-orange-500/20">
              + Add image
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                e.target.files && handleImageUpload(e.target.files[0])
              }
            />
          </label>

          <button
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!user?.id || !text.trim()}
            onClick={async () => {
              if (!user?.id || !text.trim()) return;
              await createPost(null, user.id, text, image || undefined);
              setText("");
              setImage(null);
            }}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}
