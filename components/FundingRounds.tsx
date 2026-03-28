"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Coins, LineChart, Save, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Startup {
  id: string;
  name: string;
}

interface FundingRound {
  id: string;
  name: string;
  date: string;
  investmentAmount: number;
  valuation: number;
  sharesIssued: number;
  leadInvestor?: string | null;
  notes?: string | null;
}

interface StartupFinancialProfile {
  id: string;
  totalShares?: number | null;
  revenueType?: "SAAS" | "MARKETPLACE" | "FINTECH" | "OTHER" | null;
  growthStage?: string | null;
  valuationSource?: "LAST_FUNDING_ROUND" | "AUTO_ESTIMATE" | "MANUAL" | null;
  manualValuation?: number | null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function FundingRounds() {
  const { toast } = useToast();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [selectedStartupId, setSelectedStartupId] = useState("");
  const [rounds, setRounds] = useState<FundingRound[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingRound, setSavingRound] = useState(false);

  const [totalShares, setTotalShares] = useState("");
  const [revenueType, setRevenueType] = useState<StartupFinancialProfile["revenueType"]>("OTHER");
  const [growthStage, setGrowthStage] = useState("");
  const [valuationSource, setValuationSource] = useState<StartupFinancialProfile["valuationSource"]>("AUTO_ESTIMATE");
  const [manualValuation, setManualValuation] = useState("");

  const [roundName, setRoundName] = useState("");
  const [roundDate, setRoundDate] = useState("");
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [valuation, setValuation] = useState("");
  const [sharesIssued, setSharesIssued] = useState("");
  const [leadInvestor, setLeadInvestor] = useState("");
  const [notes, setNotes] = useState("");

  const loadStartupData = useCallback(async (startupId: string) => {
    setLoading(true);
    try {
      const [roundsRes, profileRes] = await Promise.all([
        fetch(`/api/funding-rounds?startupId=${startupId}`),
        fetch(`/api/startup-financial-profile?startupId=${startupId}`),
      ]);

      const roundsData = roundsRes.ok ? ((await roundsRes.json()) as FundingRound[]) : [];
      const profileData = profileRes.ok ? ((await profileRes.json()) as StartupFinancialProfile) : null;

      setRounds(roundsData);
      setTotalShares(profileData?.totalShares?.toString() ?? "");
      setRevenueType(profileData?.revenueType ?? "OTHER");
      setGrowthStage(profileData?.growthStage ?? "");
      setValuationSource(profileData?.valuationSource ?? "AUTO_ESTIMATE");
      setManualValuation(profileData?.manualValuation?.toString() ?? "");
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Could not load funding data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const loadStartups = async () => {
      try {
        const res = await fetch("/api/founder/startups");
        const data = res.ok ? ((await res.json()) as Startup[]) : [];
        setStartups(data);
        if (data[0]?.id) {
          setSelectedStartupId(data[0].id);
          void loadStartupData(data[0].id);
        }
      } catch (error) {
        console.error(error);
      }
    };

    void loadStartups();
  }, [loadStartupData]);

  const saveFinancialProfile = async () => {
    if (!selectedStartupId) return;

    setSavingProfile(true);
    try {
      const res = await fetch("/api/startup-financial-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startupId: selectedStartupId,
          totalShares: totalShares ? Number(totalShares) : undefined,
          revenueType,
          growthStage,
          valuationSource,
          manualValuation: manualValuation ? Number(manualValuation) : undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to save profile");

      await res.json();
      toast({
        title: "Financial profile saved",
        description: "Valuation settings and cap table inputs are updated.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Could not save startup financial profile.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveFundingRound = async () => {
    if (!selectedStartupId) return;

    const parsedInvestmentAmount = Number(investmentAmount);
    const parsedValuation = Number(valuation);
    const parsedSharesIssued = Number(sharesIssued);

    if (
      !roundName.trim() ||
      !roundDate ||
      !Number.isFinite(parsedInvestmentAmount) ||
      !Number.isFinite(parsedValuation) ||
      !Number.isFinite(parsedSharesIssued) ||
      parsedInvestmentAmount <= 0 ||
      parsedValuation <= 0 ||
      parsedSharesIssued <= 0
    ) {
      toast({
        title: "Invalid funding round",
        description: "Enter a round name, valid date, and positive numbers for investment amount, valuation, and shares issued.",
        variant: "destructive",
      });
      return;
    }

    setSavingRound(true);
    try {
      const res = await fetch("/api/funding-rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startupId: selectedStartupId,
          name: roundName.trim(),
          date: roundDate,
          investmentAmount: parsedInvestmentAmount,
          valuation: parsedValuation,
          sharesIssued: parsedSharesIssued,
          leadInvestor: leadInvestor.trim(),
          notes: notes.trim(),
        }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Failed to create funding round");
      }

      setRoundName("");
      setRoundDate("");
      setInvestmentAmount("");
      setValuation("");
      setSharesIssued("");
      setLeadInvestor("");
      setNotes("");
      await loadStartupData(selectedStartupId);

      toast({
        title: "Funding round saved",
        description: "Investor-facing valuation data has been refreshed.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not save funding round.",
        variant: "destructive",
      });
    } finally {
      setSavingRound(false);
    }
  };

  return (
    <div className="w-full space-y-6 rounded-[28px] border-[3px] border-black bg-[#111111] p-5 shadow-200">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/60 bg-orange-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
            <Sparkles className="h-3.5 w-3.5" />
            Valuation Engine
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Funding Rounds</h2>
            <p className="text-sm text-white/65">
              Keep funding events separate from monthly operations and feed investor valuation automatically.
            </p>
          </div>
        </div>

        {startups.length > 0 && (
          <select
            value={selectedStartupId}
            onChange={(event) => {
              const nextId = event.target.value;
              setSelectedStartupId(nextId);
              void loadStartupData(nextId);
            }}
            className="rounded-full border-[2px] border-orange-500/70 bg-[#1b1b1b] px-4 py-2.5 text-sm font-medium text-orange-100 outline-none transition focus:border-orange-400"
          >
            {startups.map((startup) => (
              <option key={startup.id} value={startup.id}>
                {startup.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[24px] border-[3px] border-black bg-[#fff3e0] p-5 shadow-[6px_6px_0_0_#000]"
        >
          <div className="mb-4 flex items-center gap-2 text-black">
            <Coins className="h-5 w-5" />
            <h3 className="text-lg font-bold">Startup Financial Profile</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-black">Total Shares</label>
              <Input value={totalShares} onChange={(e) => setTotalShares(e.target.value)} className="mt-2 rounded-2xl border-[2px] border-black bg-white text-black placeholder:text-black/40" />
            </div>
            <div>
              <label className="text-sm font-medium text-black">Revenue Type</label>
              <select
                value={revenueType ?? "OTHER"}
                onChange={(e) => setRevenueType(e.target.value as StartupFinancialProfile["revenueType"])}
                className="mt-2 w-full rounded-2xl border-[2px] border-black bg-white px-4 py-2.5 text-sm text-black"
              >
                <option value="SAAS">SaaS</option>
                <option value="MARKETPLACE">Marketplace</option>
                <option value="FINTECH">Fintech</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-black">Valuation Source</label>
              <select
                value={valuationSource ?? "AUTO_ESTIMATE"}
                onChange={(e) => setValuationSource(e.target.value as StartupFinancialProfile["valuationSource"])}
                className="mt-2 w-full rounded-2xl border-[2px] border-black bg-white px-4 py-2.5 text-sm text-black"
              >
                <option value="LAST_FUNDING_ROUND">Last Funding Round</option>
                <option value="AUTO_ESTIMATE">Auto Estimate</option>
                <option value="MANUAL">Manual</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-black">Manual Valuation</label>
              <Input value={manualValuation} onChange={(e) => setManualValuation(e.target.value)} className="mt-2 rounded-2xl border-[2px] border-black bg-white text-black placeholder:text-black/40" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-black">Growth Stage</label>
              <Input value={growthStage} onChange={(e) => setGrowthStage(e.target.value)} placeholder="Seed, Series A, Growth..." className="mt-2 rounded-2xl border-[2px] border-black bg-white text-black placeholder:text-black/40" />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              onClick={saveFinancialProfile}
              disabled={savingProfile || loading}
              className="rounded-full border-[3px] border-black bg-orange-500 px-5 font-semibold text-black hover:bg-orange-400"
            >
              <Save className="mr-2 h-4 w-4" />
              {savingProfile ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-[24px] border-[3px] border-black bg-[#ffe7c2] p-5 shadow-[6px_6px_0_0_#000]"
        >
          <div className="mb-4 flex items-center gap-2 text-black">
            <Building2 className="h-5 w-5" />
            <h3 className="text-lg font-bold">Add Funding Round</h3>
          </div>

          <div className="grid gap-4">
            <Input value={roundName} onChange={(e) => setRoundName(e.target.value)} placeholder="Seed, Series A..." className="rounded-2xl border-[2px] border-black bg-white text-black placeholder:text-black/40" />
            <Input type="date" value={roundDate} onChange={(e) => setRoundDate(e.target.value)} className="rounded-2xl border-[2px] border-black bg-white text-black" />
            <Input type="number" min="0" step="0.01" value={investmentAmount} onChange={(e) => setInvestmentAmount(e.target.value)} placeholder="Investment Amount" className="rounded-2xl border-[2px] border-black bg-white text-black placeholder:text-black/40" />
            <Input type="number" min="0" step="0.01" value={valuation} onChange={(e) => setValuation(e.target.value)} placeholder="Valuation" className="rounded-2xl border-[2px] border-black bg-white text-black placeholder:text-black/40" />
            <Input type="number" min="0" step="1" value={sharesIssued} onChange={(e) => setSharesIssued(e.target.value)} placeholder="Shares Issued" className="rounded-2xl border-[2px] border-black bg-white text-black placeholder:text-black/40" />
            <Input value={leadInvestor} onChange={(e) => setLeadInvestor(e.target.value)} placeholder="Lead Investor (optional)" className="rounded-2xl border-[2px] border-black bg-white text-black placeholder:text-black/40" />
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={3} className="rounded-2xl border-[2px] border-black bg-white text-black placeholder:text-black/40" />
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              onClick={saveFundingRound}
              disabled={savingRound || loading}
              className="rounded-full border-[3px] border-black bg-black px-5 font-semibold text-orange-300 hover:bg-[#1a1a1a]"
            >
              {savingRound ? "Saving..." : "Add Funding Round"}
            </Button>
          </div>
        </motion.div>
      </div>

      <div className="rounded-[24px] border-[3px] border-black bg-[#1a1a1a] p-5 shadow-[6px_6px_0_0_#000]">
        <div className="mb-4 flex items-center gap-2 text-orange-300">
          <LineChart className="h-5 w-5" />
          <h3 className="text-lg font-bold">Funding Timeline</h3>
        </div>

        {loading ? (
          <p className="text-sm text-white/60">Loading funding rounds...</p>
        ) : rounds.length === 0 ? (
          <p className="text-sm text-white/60">No funding rounds yet. Add one to power valuation and ownership metrics.</p>
        ) : (
          <div className="space-y-3">
            {rounds.map((round) => (
              <div key={round.id} className="rounded-2xl border border-orange-500/30 bg-black/30 p-4 text-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{round.name}</p>
                    <p className="text-sm text-white/55">{new Date(round.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white/55">Investment</p>
                    <p className="font-semibold text-orange-300">{formatCurrency(round.investmentAmount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white/55">Valuation</p>
                    <p className="font-semibold text-orange-300">{formatCurrency(round.valuation)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white/55">Shares Issued</p>
                    <p className="font-semibold">{round.sharesIssued.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
