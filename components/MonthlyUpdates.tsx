"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, CalendarRange, TrendingUp, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Startup {
  id: string;
  name: string;
}

interface MonthlyUpdateCard {
  id: string;
  startupId: string;
  startupName: string;
  month: string;
  year: number;
  revenue: number;
  burnRate: number;
  runway: number;
  growthRate: number;
  users: number;
  newCustomers: number;
  valuation?: number;
  achievements: string;
  challenges: string;
}

type ApiErrorResponse = {
  error?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function MonthlyUpdates() {
  const { toast } = useToast();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [selectedStartupId, setSelectedStartupId] = useState<string>("");
  const [updates, setUpdates] = useState<MonthlyUpdateCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [revenue, setRevenue] = useState("");
  const [expenses, setExpenses] = useState("");
  const [cashInBank, setCashInBank] = useState("");
  const [usersCount, setUsersCount] = useState("");
  const [newCustomers, setNewCustomers] = useState("");
  const [achievements, setAchievements] = useState("");
  const [challenges, setChallenges] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchUpdates = useCallback(async (startupId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/monthly-updates?startupId=${startupId}`);
      if (!res.ok) {
        console.error("Failed to load updates", res.status, await res.text());
        setUpdates([]);
        return;
      }
      const data: MonthlyUpdateCard[] = await res.json();
      setUpdates(data);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Could not load monthly updates.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const fetchStartups = async () => {
      try {
        const res = await fetch("/api/founder/startups");
        if (!res.ok) {
          console.error("Failed to load startups", res.status, await res.text());
          setStartups([]);
          return;
        }

        const data: Startup[] = await res.json();
        setStartups(data);
        if (data.length > 0) {
          const firstId = data[0].id;
          setSelectedStartupId(firstId);
          void fetchUpdates(firstId);
        }
      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "Could not load startups.",
          variant: "destructive",
        });
      }
    };

    fetchStartups();
  }, [fetchUpdates, toast]);

  const handleCreateUpdate = async () => {
    if (!selectedStartupId) {
      toast({
        title: "Select a startup",
        description: "Please select a startup before creating an update.",
        variant: "destructive",
      });
      return;
    }

    const revenueNum = Number(revenue);
    const expensesNum = Number(expenses);
    const cashNum = Number(cashInBank);

    if (!revenueNum || !expensesNum || !cashNum) {
      toast({
        title: "Invalid input",
        description: "Revenue, expenses and cash in bank must be valid numbers.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/monthly-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startupId: selectedStartupId,
          revenue: revenueNum,
          expenses: expensesNum,
          cashInBank: cashNum,
          users: usersCount ? Number(usersCount) : 0,
          newCustomers: newCustomers ? Number(newCustomers) : 0,
          achievements,
          challenges,
        }),
      });

      if (!res.ok) {
        const error: ApiErrorResponse = await res.json().catch(() => ({}));
        console.error("Failed to create monthly update", res.status, error);
        toast({
          title: "Error",
          description: error.error || "Failed to create update.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Update created",
        description: "Your monthly update has been saved.",
      });

      setIsModalOpen(false);
      setRevenue("");
      setExpenses("");
      setCashInBank("");
      setUsersCount("");
      setNewCustomers("");
      setAchievements("");
      setChallenges("");

      await fetchUpdates(selectedStartupId);
    } catch (error: unknown) {
      console.error(error);
      const description =
        error instanceof Error
          ? error.message
          : "Something went wrong while creating the update.";
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedStartup = startups.find((startup) => startup.id === selectedStartupId);

  return (
    <div className="w-full space-y-6 rounded-[28px] border-[3px] border-black bg-[#111111] p-5 shadow-200">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/60 bg-orange-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
            <BarChart3 className="h-3.5 w-3.5" />
            Investor Reporting
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Monthly Updates</h2>
            <p className="text-sm text-white/65">
              Share structured monthly updates with your investors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {startups.length > 0 && (
            <select
              value={selectedStartupId}
              onChange={(event) => {
                const id = event.target.value;
                setSelectedStartupId(id);
                void fetchUpdates(id);
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
          <Button
            onClick={() => setIsModalOpen(true)}
            disabled={!startups.length}
            className="rounded-full border-[3px] border-black bg-orange-500 px-5 py-2.5 font-semibold text-black shadow-[4px_4px_0_0_#000] transition hover:bg-orange-400"
          >
            + Create Update
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-orange-500/30 bg-black/20 px-6 py-10 text-center text-sm text-white/60">
          Loading updates...
        </div>
      ) : !updates.length ? (
        <div className="rounded-2xl border border-dashed border-orange-500/30 bg-black/20 px-6 py-10 text-center text-sm text-white/60">
          No monthly updates yet.
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((update) => (
            <div
              key={update.id}
              className="rounded-[24px] border-[3px] border-black bg-[#fff3e0] p-5 shadow-[6px_6px_0_0_#000]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-black bg-orange-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black">
                    <CalendarRange className="h-3.5 w-3.5" />
                    {update.month} {update.year}
                  </div>
                  <h3 className="text-lg font-semibold text-black">
                    {update.startupName || selectedStartup?.name || "Startup"}
                  </h3>
                  <p className="text-sm text-black/60">Performance snapshot for investors.</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                <div className="rounded-2xl border-2 border-black bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Revenue</p>
                  <p className="mt-2 text-lg font-bold text-black">{formatCurrency(update.revenue)}</p>
                </div>
                <div className="rounded-2xl border-2 border-black bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Valuation</p>
                  <p className="mt-2 text-lg font-bold text-black">{formatCurrency(update.valuation || 0)}</p>
                </div>
                <div className="rounded-2xl border-2 border-black bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Burn Rate</p>
                  <p className="mt-2 text-lg font-bold text-black">{formatCurrency(update.burnRate)}</p>
                </div>
                <div className="rounded-2xl border-2 border-black bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Runway</p>
                  <p className="mt-2 text-lg font-bold text-black">{update.runway.toFixed(1)} mo</p>
                </div>
                <div className="rounded-2xl border-2 border-black bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Users</p>
                  <p className="mt-2 text-lg font-bold text-black">{update.users.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border-2 border-black bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">New Customers</p>
                  <p className="mt-2 text-lg font-bold text-black">{update.newCustomers.toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-black px-3 py-1.5 text-xs font-semibold text-orange-300">
                <TrendingUp className="h-3.5 w-3.5" />
                Growth Rate: {typeof update.growthRate === "number" ? `${update.growthRate.toFixed(1)}%` : "N/A"}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border-2 border-black bg-white p-4 text-sm">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-black/50">
                    Key Achievements
                  </p>
                  <p className="whitespace-pre-wrap text-black/80">{update.achievements}</p>
                </div>

                <div className="rounded-2xl border-2 border-black bg-white p-4 text-sm">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-black/50">
                    Challenges
                  </p>
                  <p className="whitespace-pre-wrap text-black/80">{update.challenges}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[28px] border-[3px] border-black bg-[#fff3e0] shadow-2xl">
            <div className="flex items-center justify-between border-b-[3px] border-black bg-black p-6 text-orange-300">
              <div>
                <h2 className="text-lg font-semibold">Create Monthly Update</h2>
                {selectedStartup && (
                  <p className="text-sm text-orange-100/70">{selectedStartup.name}</p>
                )}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-orange-500/40 p-2 text-orange-100 transition hover:bg-orange-500 hover:text-black"
                aria-label="Close create monthly update modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {startups.length > 0 && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-black">Startup</label>
                  <select
                    value={selectedStartupId}
                    onChange={(event) => setSelectedStartupId(event.target.value)}
                    className="w-full rounded-2xl border-[2px] border-black bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-orange-500"
                  >
                    {startups.map((startup) => (
                      <option key={startup.id} value={startup.id}>
                        {startup.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-black">Revenue</label>
                  <Input
                    type="number"
                    value={revenue}
                    onChange={(event) => setRevenue(event.target.value)}
                    placeholder="e.g. 120000"
                    className="mt-2 rounded-2xl border-[2px] border-black bg-white px-4 py-3 focus-visible:ring-0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-black">Expenses</label>
                  <Input
                    type="number"
                    value={expenses}
                    onChange={(event) => setExpenses(event.target.value)}
                    placeholder="e.g. 40000"
                    className="mt-2 rounded-2xl border-[2px] border-black bg-white px-4 py-3 focus-visible:ring-0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-black">Cash in Bank</label>
                  <Input
                    type="number"
                    value={cashInBank}
                    onChange={(event) => setCashInBank(event.target.value)}
                    placeholder="e.g. 240000"
                    className="mt-2 rounded-2xl border-[2px] border-black bg-white px-4 py-3 focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-black">Users</label>
                  <Input
                    type="number"
                    value={usersCount}
                    onChange={(event) => setUsersCount(event.target.value)}
                    placeholder="e.g. 12300"
                    className="mt-2 rounded-2xl border-[2px] border-black bg-white px-4 py-3 focus-visible:ring-0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-black">New Customers</label>
                  <Input
                    type="number"
                    value={newCustomers}
                    onChange={(event) => setNewCustomers(event.target.value)}
                    placeholder="e.g. 120"
                    className="mt-2 rounded-2xl border-[2px] border-black bg-white px-4 py-3 focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Key Achievements</label>
                <Textarea
                  value={achievements}
                  onChange={(event) => setAchievements(event.target.value)}
                  placeholder="Highlight key wins this month"
                  rows={3}
                  className="rounded-2xl border-[2px] border-black bg-white px-4 py-3 focus-visible:ring-0"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Challenges</label>
                <Textarea
                  value={challenges}
                  onChange={(event) => setChallenges(event.target.value)}
                  placeholder="Share major challenges or risks"
                  rows={3}
                  className="rounded-2xl border-[2px] border-black bg-white px-4 py-3 focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 rounded-b-[28px] border-t-[3px] border-black bg-[#ffe7c2] p-6">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
                className="rounded-full border-[2px] border-black bg-white px-5 text-black hover:bg-white/90"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateUpdate}
                disabled={submitting}
                className="rounded-full border-[3px] border-black bg-orange-500 px-5 font-semibold text-black hover:bg-orange-400"
              >
                {submitting ? "Saving..." : "Save Update"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
