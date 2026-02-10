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
    } catch (error: any) {
      console.error("Failed to accept deal:", error);
      
      let errorMessage = "Failed to accept deal. Please try again.";
      if (error.message) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Accept Deal</h2>
              <p className="text-sm text-gray-500">Finalize the investment terms</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Investment Amount (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                min="100"
                step="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50,000"
                className={`pl-7 ${errors.amount ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.amount}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Minimum investment: $100
            </p>
          </div>

          {/* Equity */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Percent className="h-4 w-4" />
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
                className={errors.equity ? 'border-red-500 focus:ring-red-500' : ''}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
            {errors.equity && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.equity}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Your ownership percentage (if applicable)
            </p>
          </div>

          {/* Deal Stage */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Deal Stage
            </label>
            <select
              value={dealStage}
              onChange={(e) => setDealStage(e.target.value as typeof dealStage)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DEAL_STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>

          {/* Investment Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Investment Type
            </label>
            <select
              value={investmentType}
              onChange={(e) => setInvestmentType(e.target.value as typeof investmentType)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {INVESTMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
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

