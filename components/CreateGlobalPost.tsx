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
    <div className="border rounded-xl p-4 bg-white mb-6">
      <textarea
        placeholder="What’s new with your startup?"
        className="w-full resize-none outline-none"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {image && (
        <img
          src={image}
          alt="upload"
          className="rounded-lg mt-3 max-h-64"
        />
      )}

      <div className="flex justify-between mt-3">
        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            e.target.files && handleImageUpload(e.target.files[0])
          }
        />

        <button
          className="btn-primary"
          onClick={async () => {
            if (!user?.id) return;
            await createPost(null, user.id, text, image || undefined);
            setText("");
            setImage(null);
          }}
        >
          Post
        </button>
      </div>
    </div>
  );
}
