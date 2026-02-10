"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitRating } from "@/app/actions/dealRoom";
import { Star, MessageCircle, X } from "lucide-react";

interface RateFounderButtonProps {
  founderId: string;
  startupId: string;
  hasRated: boolean;
  canRate: boolean;
}

// Star selector component
function StarSelector({ 
  value, 
  onChange, 
  label 
}: { 
  value: number; 
  onChange: (val: number) => void;
  label: string;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="p-1 transition-transform hover:scale-110 focus:outline-none"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
          >
            <Star 
              className={`h-8 w-8 transition-colors ${
                star <= (hover || value)
                  ? "fill-yellow-400 text-yellow-400" 
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-500">
          {value > 0 ? `${value}/5` : "Select"}
        </span>
      </div>
    </div>
  );
}

export function RateFounderButton({ 
  founderId, 
  startupId, 
  hasRated, 
  canRate 
}: RateFounderButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [communication, setCommunication] = useState(5);
  const [transparency, setTransparency] = useState(5);
  const [execution, setExecution] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setCommunication(5);
      setTransparency(5);
      setExecution(5);
      setFeedback("");
    }
  }, [open]);

  const average = Math.round((communication + transparency + execution) / 3);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const detail = `Communication: ${communication}, Transparency: ${transparency}, Execution: ${execution}`;
      const finalFeedback = feedback.trim()
        ? `${detail}\n${feedback.trim()}`
        : detail;

      await submitRating(
        founderId,
        "FOUNDER",
        startupId,
        average,
        finalFeedback
      );

      toast({
        title: "Rating submitted",
        description: "Thanks for rating the founder! Your feedback helps other investors.",
      });

      setOpen(false);
      router.refresh();
    } catch (error: any) {
      console.error("Failed to submit rating:", error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to submit rating. Please try again.";
      if (error.message) {
        if (error.message.includes("invested")) {
          errorMessage = "You can only rate founders you've invested in.";
        } else if (error.message.includes("discussion")) {
          errorMessage = "Please participate in the discussion before rating.";
        } else if (error.message.includes("No accepted deal")) {
          errorMessage = "No accepted deal relationship found.";
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasRated) {
    return (
      <Button variant="outline" size="sm" disabled className="text-green-600">
        <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
        Rated
      </Button>
    );
  }

  if (!canRate) {
    return (
      <Button variant="outline" size="sm" disabled title="Participate in the discussion to rate the founder">
        <MessageCircle className="h-4 w-4 mr-1" />
        Rate Founder
      </Button>
    );
  }

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setOpen(true)}
        className="hover:bg-yellow-50 hover:border-yellow-200"
      >
        <Star className="h-4 w-4 mr-1 text-yellow-500" />
        Rate Founder
      </Button>
      
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Rate Founder</h2>
                  <p className="text-sm text-gray-500">Share your experience</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Rating Scores */}
              <div className="space-y-5">
                <StarSelector
                  value={communication}
                  onChange={setCommunication}
                  label="Communication"
                />
                <StarSelector
                  value={transparency}
                  onChange={setTransparency}
                  label="Transparency"
                />
                <StarSelector
                  value={execution}
                  onChange={setExecution}
                  label="Execution"
                />
              </div>

              {/* Average Score */}
              <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Overall Score</span>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star}
                      className={`h-6 w-6 ${
                        star <= average
                          ? "fill-yellow-400 text-yellow-400" 
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-xl font-bold">{average}.0</span>
                </div>
              </div>

              {/* Feedback */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Feedback (optional)
                </label>
                <Textarea
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share details about your collaboration experience..."
                  className="mt-2 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
              <Button 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-yellow-500 hover:bg-yellow-600"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-1" />
                    Submit Rating
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RateFounderButton;

