"use client";

import { useState } from "react";
import { Loader2, MoreHorizontal, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface FounderBackgroundEditorProps {
  authorId: string;
  initialContent: string;
  isEditable?: boolean;
}

export default function FounderBackgroundEditor({
  authorId,
  initialContent,
  isEditable = false,
}: FounderBackgroundEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [draft, setDraft] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleCancel = () => {
    setDraft(content);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/founder-background", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authorId,
          bio: draft,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to save founder description");
      }

      setContent(draft);
      setIsEditing(false);

      toast({
        title: "Description saved",
        description: "Your founder description has been updated.",
      });
    } catch (error) {
      console.error("[FOUNDER_DESCRIPTION_SAVE_ERROR]", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save founder description.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 text-black">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold">Founder Description</h3>
        </div>

        {isEditable ? (
          <button
            type="button"
            onClick={() => setIsEditing((value) => !value)}
            className="rounded-full border-2 border-black bg-white p-2 text-black transition hover:bg-black hover:text-white"
            aria-label="Edit founder description"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {isEditing ? (
        <div className="mt-4 space-y-4">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a short founder description. Share your background, experience, story, and what makes you the right person to build this startup."
            className="min-h-[220px] border-[3px] border-black bg-white text-black shadow-[4px_4px_0_0_#000] focus-visible:ring-0"
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-full border-[3px] border-black bg-orange-500 px-5 font-semibold text-black hover:bg-orange-400"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="rounded-full border-[3px] border-black bg-white px-5 font-semibold text-black hover:bg-[#ffe7c2]"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      ) : content.trim() ? (
        <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-black/80">
          {content}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-7 text-black/80">
          No founder description has been added yet. Add your story, experience, sector expertise, and what makes you the right person to build these startups.
        </p>
      )}
    </div>
  );
}
