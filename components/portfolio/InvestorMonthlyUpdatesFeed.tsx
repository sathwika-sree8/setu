"use client";

import { useEffect, useState } from "react";
import { MessageCircle, TrendingUp, Users, Flame, Zap, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StartupSummary {
  id: string;
  name: string;
}

interface MonthlyUpdate {
  id: string;
  startupId: string;
  startupName?: string;
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
  createdAt: string | Date;
}

interface Props {
  startups: StartupSummary[];
}

export function InvestorMonthlyUpdatesFeed({ startups }: Props) {
  const [updates, setUpdates] = useState<MonthlyUpdate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUpdates = async () => {
      if (!startups.length) {
        setUpdates([]);
        return;
      }

      setLoading(true);
      try {
        const all: MonthlyUpdate[] = [];
        for (const s of startups) {
          const res = await fetch(`/api/monthly-updates?startupId=${s.id}`);
          if (!res.ok) continue;
          const data: MonthlyUpdate[] = await res.json();
          const withNames = data.map((u) => ({
            ...u,
            startupName: u.startupName || s.name,
          }));
          all.push(...withNames);
        }

        all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setUpdates(all);
      } finally {
        setLoading(false);
      }
    };

    void loadUpdates();
  }, [startups]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toFixed(0);
  };

  return (
    <Card className="border border-white/15 bg-[#121416] text-white shadow-[0_12px_30px_rgba(0,0,0,0.22)] transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <TrendingUp className="h-5 w-5 text-orange-300" />
          Monthly Updates
        </CardTitle>
        <CardDescription className="text-white/65">
          Metrics and key updates from your portfolio companies.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin">
              <Zap className="h-8 w-8 text-orange-300" />
            </div>
            <p className="mt-4 text-white/65">Loading updates...</p>
          </div>
        ) : updates.length === 0 ? (
          <div className="py-16 text-center">
            <MessageCircle className="mx-auto mb-4 h-10 w-10 text-white/45" />
            <p className="font-medium text-white">No monthly updates yet</p>
            <p className="mt-1 text-sm text-white/65">Updates will appear here as you receive them from companies.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map((update) => (
              <article
                key={update.id}
                className="group relative overflow-hidden rounded-2xl border border-white/15 bg-[#131518] shadow-[0_12px_30px_rgba(0,0,0,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-400/35 hover:shadow-[0_16px_36px_rgba(0,0,0,0.30)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-400/5 to-orange-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <CardContent className="relative pb-4 pt-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-orange-300">
                          {update.startupName || "Startup"}
                        </p>
                        <p className="text-sm text-white/55">
                          {update.month} {update.year}
                        </p>
                      </div>
                      <Badge className="border border-orange-400/30 bg-orange-500/10 text-xs text-orange-200">
                        Monthly Report
                      </Badge>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4 md:grid-cols-6">
                      <div className="space-y-1">
                        <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-white/55">
                          <Flame className="h-3 w-3 text-orange-500" />
                          Revenue
                        </p>
                        <p className="text-lg font-bold text-white">
                          ${formatNumber(update.revenue)}
                        </p>
                        {update.growthRate > 0 && (
                          <p className="flex items-center gap-1 text-xs text-orange-300">
                            <ArrowUpRight className="h-2.5 w-2.5" />
                            +{update.growthRate.toFixed(1)}%
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-white/55">Burn Rate</p>
                        <p className="text-lg font-bold text-white">
                          ${formatNumber(update.burnRate)}
                        </p>
                        <p className="text-xs text-white/50">/ month</p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-white/55">Runway</p>
                        <p className="text-lg font-bold text-white">
                          {update.runway > 12 ? `${(update.runway / 12).toFixed(1)}y` : `${update.runway}m`}
                        </p>
                        <p className="text-xs text-white/50">remaining</p>
                      </div>

                      <div className="space-y-1">
                        <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-white/55">
                          <Users className="h-3 w-3 text-orange-300" />
                          Total Users
                        </p>
                        <p className="text-lg font-bold text-white">
                          {formatNumber(update.users)}
                        </p>
                        {update.newCustomers > 0 && (
                          <p className="text-xs text-orange-300">
                            +{formatNumber(update.newCustomers)} new
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-white/55">Growth Rate</p>
                        <p className="text-lg font-bold text-orange-300">
                          {update.growthRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-white/50">MoM</p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-white/55">Valuation</p>
                        <p className="text-lg font-bold text-white">
                          ${formatNumber(update.valuation || 0)}
                        </p>
                        <p className="text-xs text-white/50">current</p>
                      </div>
                    </div>

                    {/* Achievements & Challenges */}
                    {(update.achievements || update.challenges) && (
                      <div className="grid gap-4 border-t border-white/10 pt-4 md:grid-cols-2">
                        {update.achievements && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-orange-300">Achievements</p>
                            <p className="text-sm leading-relaxed text-white/85">{update.achievements}</p>
                          </div>
                        )}
                        {update.challenges && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-orange-300">Challenges</p>
                            <p className="text-sm leading-relaxed text-white/85">{update.challenges}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="border-t border-white/10 pt-2">
                      <div className="mb-3 flex items-center justify-between text-xs text-white/60">
                        <span>Monthly performance snapshot</span>
                        <span>
                          {new Date(update.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="rounded-lg px-3 py-2 text-sm font-medium text-white/75 transition-all duration-200 hover:bg-white/5 hover:text-white">
                          Like
                        </span>
                        <span className="rounded-lg px-3 py-2 text-sm font-medium text-white/75 transition-all duration-200 hover:bg-white/5 hover:text-white">
                          Comment
                        </span>
                        <span className="rounded-lg px-3 py-2 text-sm font-medium text-white/75 transition-all duration-200 hover:bg-white/5 hover:text-white">
                          Share
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default InvestorMonthlyUpdatesFeed;
