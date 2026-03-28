"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { updatePost, deletePost } from "@/app/actions/founderFeed";
import { useToast } from "@/hooks/use-toast";

interface PostMenuProps {
  postId: string;
  authorId: string;
  initialContent: string;
  initialImageUrl?: string | null;
}

export default function PostMenu({
  postId,
  authorId,
  initialContent,
  initialImageUrl,
}: PostMenuProps) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  const [open, setOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [content, setContent] = useState(initialContent);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      window.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const isOwner = mounted && isLoaded && user?.id === authorId;

  // Only render menu for post author
  if (!isOwner) return null;

  async function handleImageChange(file: File) {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      if (data?.url) {
        setImageUrl(data.url as string);
      }
    } catch (error) {
      console.error("Image upload failed", error);
      toast({
        title: "Image upload failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    const trimmed = content.trim();
    if (!trimmed && !imageUrl) {
      toast({
        title: "Post cannot be empty",
        description: "Add some text or an image.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await updatePost(postId, trimmed, imageUrl);
      toast({ title: "Post updated" });
      setShowEdit(false);
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to update post", error);
      toast({
        title: "Failed to update post",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      setDeleting(true);
      await deletePost(postId);
      toast({ title: "Post deleted" });
      setShowDeleteConfirm(false);
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete post", error);
      toast({
        title: "Failed to delete post",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="sr-only">Post options</span>
        <span className="text-xl leading-none">⋯</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg text-sm z-20 animate-in">
          <button
            type="button"
            onClick={() => {
              setShowEdit(true);
              setOpen(false);
            }}
            className="block w-full text-left px-3 py-2 hover:bg-gray-50"
          >
            Edit post
          </button>
          <button
            type="button"
            onClick={() => {
              setShowDeleteConfirm(true);
              setOpen(false);
            }}
            className="block w-full text-left px-3 py-2 text-red-500 hover:bg-red-50"
          >
            Delete post
          </button>
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5 space-y-4">
            <h2 className="text-lg font-semibold">Edit your post</h2>

            <textarea
              className="w-full min-h-[120px] border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Update your post content"
            />

            {imageUrl && (
              <div className="space-y-2">
                <img
                  src={imageUrl}
                  alt="post"
                  className="rounded-md max-h-64 object-contain"
                />
                <button
                  type="button"
                  className="text-xs text-red-500 hover:text-red-700"
                  onClick={() => setImageUrl(null)}
                >
                  Remove image
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <label className="inline-flex items-center gap-2 cursor-pointer text-gray-600">
                  <span className="px-2 py-1 border rounded-md text-xs hover:bg-gray-50">
                    {uploading ? "Uploading..." : "Change image"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleImageChange(file);
                      }
                    }}
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 text-sm">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50"
                  onClick={() => setShowEdit(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-md bg-black text-white hover:bg-gray-900 disabled:opacity-50"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5 space-y-4">
            <h2 className="text-lg font-semibold">Delete this post?</h2>
            <p className="text-sm text-gray-600">
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 text-sm">
              <button
                type="button"
                className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
