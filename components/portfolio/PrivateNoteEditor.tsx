"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { savePrivateNote, deletePrivateNote } from "@/app/actions/portfolio";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";

interface PrivateNoteEditorProps {
  startupId: string;
  startupTitle: string;
  initialContent?: string;
}

export function PrivateNoteEditor({ startupId, startupTitle, initialContent = "" }: PrivateNoteEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      toast({
        title: "Empty note",
        description: "Note cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await savePrivateNote(startupId, content);
      toast({
        title: "Note saved",
        description: "Your private note has been saved.",
      });
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to save note:", error);
      toast({
        title: "Error",
        description: "Failed to save note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    setIsDeleting(true);
    try {
      await deletePrivateNote(startupId);
      toast({
        title: "Note deleted",
        description: "Your private note has been deleted.",
      });
      setContent("");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete note:", error);
      toast({
        title: "Error",
        description: "Failed to delete note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">{startupTitle}</h4>
        {content.trim() && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete()}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Delete note"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!isEditing ? (
        <div
          onClick={() => setIsEditing(true)}
          className="min-h-[80px] bg-gray-50 rounded p-3 text-sm text-gray-700 cursor-text hover:bg-gray-100 transition-colors"
        >
          {content.trim() ? (
            <div className="whitespace-pre-wrap">{content}</div>
          ) : (
            <div className="text-gray-400">Click to add private notes about this investment...</div>
          )}
        </div>
      ) : (
        <>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add private notes about this investment..."
            rows={4}
            className="resize-none"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditing(false);
                setContent(initialContent);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default PrivateNoteEditor;
