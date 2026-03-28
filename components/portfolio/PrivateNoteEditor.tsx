"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { savePrivateNote, deletePrivateNote } from "@/app/actions/portfolio";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Edit2, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
        title: "✓ Note saved",
        description: "Your private note has been updated.",
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
    if (!confirm("Are you sure you want to delete this note? This action cannot be undone.")) return;

    setIsDeleting(true);
    try {
      await deletePrivateNote(startupId);
      toast({
        title: "✓ Note deleted",
        description: "Your private note has been removed.",
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
    <Card className="group relative border-[3px] border-black bg-white hover:border-primary transition-all duration-300 overflow-hidden shadow-100 hover:shadow-200">
      {/* Gradient accent on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardContent className="relative pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-black text-lg">{startupTitle}</h4>
              <p className="text-xs text-black-300 uppercase tracking-wide mt-1">Private Notes</p>
            </div>
            <div className="flex gap-2">
              {content.trim() && !isEditing && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-primary hover:bg-primary/10 transition-all"
                    title="Edit note"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete()}
                    disabled={isDeleting}
                    className="text-red-500/80 hover:text-red-600 hover:bg-red-500/10 transition-all"
                    title="Delete note"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Display Mode */}
          {!isEditing ? (
            <div
              onClick={() => setIsEditing(true)}
              className="group/editor min-h-[100px] bg-primary-100/40 border-2 border-black/20 rounded-lg p-4 text-sm text-black-100 cursor-text hover:border-primary hover:bg-primary-100/60 transition-all duration-300"
            >
              {content.trim() ? (
                <div className="whitespace-pre-wrap leading-relaxed text-black">{content}</div>
              ) : (
                <div className="text-black-300 italic flex items-center gap-2">
                  <Edit2 className="h-4 w-4 opacity-50" />
                  Click to add private notes about this investment...
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Edit Mode */}
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Add private notes about this investment..."
                rows={5}
                autoFocus
                className="resize-none bg-white border-2 border-black text-black placeholder:text-black-300 focus:border-primary/50 focus:ring-primary/20 rounded-lg transition-all"
              />
              
              {/* Edit Controls */}
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setContent(initialContent);
                  }}
                  disabled={isSaving}
                  className="border-black/20 text-black-300 hover:bg-primary-100 hover:border-primary transition-all"
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave} 
                  disabled={isSaving || !content.trim()}
                  className="bg-primary hover:bg-primary/90 text-white font-semibold transition-all"
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  {isSaving ? "Saving..." : "Save Note"}
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default PrivateNoteEditor;

