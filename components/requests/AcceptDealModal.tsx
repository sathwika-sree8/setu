"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { acceptDeal } from "@/app/actions/dealRoom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, Percent, X, Check, AlertCircle } from "lucide-react";

const DEAL_STAGES = [
  { value: "PRE_SEED", label: "Pre-Seed" },
  { value: "SEED", label: "Seed" },
  { value: "SERIES_A", label: "Series A" },
  { value: "SERIES_B", label: "Series B" },
  { value: "SERIES_C", label: "Series C" },
  { value: "LATE", label: "Late Stage" },
  { value: "IPO", label: "IPO" },
] as const;

const INVESTMENT_TYPES = [
  { value: "SAFE", label: "SAFE" },
  { value: "CONVERTIBLE_NOTE", label: "Convertible Note" },
  { value: "EQUITY", label: "Equity" },
  { value: "DIRECT_INVESTMENT", label: "Direct Investment" },
] as const;

interface AcceptDealModalProps {
  open: boolean;
  relationshipId: string | null;
  onClose: () => void;
  onAccepted?: () => void;
}

export function AcceptDealModal({
  open,
  relationshipId,
  onClose,
  onAccepted,
}: AcceptDealModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [equity, setEquity] = useState("");
  const [dealStage, setDealStage] = useState<(typeof DEAL_STAGES)[number]["value"]>("SEED");
  const [investmentType, setInvestmentType] = useState<(typeof INVESTMENT_TYPES)[number]["value"]>("DIRECT_INVESTMENT");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; equity?: string }>({});

  useEffect(() => {
    if (!open) {
      setAmount("");
      setEquity("");
      setDealStage("SEED");
      setInvestmentType("DIRECT_INVESTMENT");
      setErrors({});
    }
  }, [open]);

  const validateForm = () => {
    const newErrors: { amount?: string; equity?: string } = {};
    const parsedAmount = Number(amount);
    const parsedEquity = equity.trim() === "" ? undefined : Number(equity);

    if (!parsedAmount || parsedAmount <= 0) {
      newErrors.amount = "Please enter a valid investment amount";
    } else if (parsedAmount < 100) {
      newErrors.amount = "Minimum investment is $100";
    }

    if (parsedEquity !== undefined && (parsedEquity < 0 || parsedEquity > 100)) {
      newErrors.equity = "Equity must be between 0 and 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const parsedAmount = Number(amount);
    const parsedEquity = equity.trim() === "" ? undefined : Number(equity);

    setIsSubmitting(true);
    try {
      await acceptDeal(
        relationshipId!,
        parsedAmount,
        parsedEquity,
        undefined,
        dealStage,
        investmentType
      );

      toast({
        title: "Deal Accepted!",
        description: "Investment created and investor added to your startup.",
        variant: "default",
      });

      onAccepted?.();
      onClose();
      router.refresh();
    } catch (error: unknown) {
      console.error("Failed to accept deal:", error);
      
      let errorMessage = "Failed to accept deal. Please try again.";
      if (error instanceof Error && error.message) {
        if (error.message.includes("authorized")) {
          errorMessage = "You are not authorized to accept this deal.";
        } else if (error.message.includes("state")) {
          errorMessage = "This deal cannot be accepted in its current state.";
        } else if (error.message.includes("amount")) {
          errorMessage = "Investment amount is required.";
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

  if (!open || !relationshipId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[calc(100vh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-white/15 bg-[#121416] shadow-2xl sm:max-h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/15 p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-full">
              <Check className="h-5 w-5 text-orange-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white">Accept Deal</h2>
              <p className="text-sm text-white/65">Finalize the investment terms</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-2 transition-colors hover:bg-white/10"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-orange-400" />
              Investment Amount (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/65">$</span>
              <Input
                type="number"
                min="100"
                step="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50,000"
                className={`pl-7 bg-[#171a20] border-white/15 text-white placeholder:text-white/35 focus:border-orange-400/55 ${errors.amount ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.amount}
              </p>
            )}
            <p className="text-xs text-white/55">
              Minimum investment: $100
            </p>
          </div>

          {/* Equity */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white flex items-center gap-2">
              <Percent className="h-4 w-4 text-orange-400" />
              Equity Percentage (Optional)
            </label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={equity}
                onChange={(e) => setEquity(e.target.value)}
                placeholder="e.g., 5"
                className={`bg-[#171a20] border-white/15 text-white placeholder:text-white/35 focus:border-orange-400/55 ${errors.equity ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/65">%</span>
            </div>
            {errors.equity && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.equity}
              </p>
            )}
            <p className="text-xs text-white/55">
              Your ownership percentage (if applicable)
            </p>
          </div>

          {/* Deal Stage */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Deal Stage
            </label>
            <select
              value={dealStage}
              onChange={(e) => setDealStage(e.target.value as typeof dealStage)}
              className="w-full rounded-md border border-white/15 bg-[#171a20] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-400/55 focus:border-orange-400/55"
            >
              {DEAL_STAGES.map((stage) => (
                <option key={stage.value} value={stage.value} className="bg-[#121416] text-white">
                  {stage.label}
                </option>
              ))}
            </select>
          </div>

          {/* Investment Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Investment Type
            </label>
            <select
              value={investmentType}
              onChange={(e) => setInvestmentType(e.target.value as typeof investmentType)}
              className="w-full rounded-md border border-white/15 bg-[#171a20] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-400/55 focus:border-orange-400/55"
            >
              {INVESTMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value} className="bg-[#121416] text-white">
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-white/15 bg-[#171a20] p-4 sm:flex-row sm:justify-end sm:p-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full border-white/15 text-white hover:bg-white/10 sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-orange-500 text-white hover:bg-orange-400 sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Confirm Deal
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AcceptDealModal;

