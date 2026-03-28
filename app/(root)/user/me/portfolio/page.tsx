import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";
import { STARTUP_BY_ID_QUERY } from "@/sanity/lib/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OpenChatButton } from "@/components/chat/OpenChatButton";
import { RateFounderButton } from "@/components/portfolio/RateFounderButton";
import { InvestorMonthlyUpdatesFeed } from "@/components/portfolio/InvestorMonthlyUpdatesFeed";
import { PrivateNoteEditor } from "@/components/portfolio/PrivateNoteEditor";
import {
  getInvestorPortfolioStats,
  getFounderMetrics,
  getPrivateNotes,
  getPortfolioChartData,
} from "@/app/actions/portfolio";
import { getInvestorPortfolioUpdates } from "@/app/actions/founderFeed";
import {
  TrendingUp,
  DollarSign,
  Users,
  BarChart3,
  Clock,
  Star,
  ArrowUpRight,
  MessageCircle,
  FileText,
  Plus,
  HelpCircle,
  Zap,
  PieChart,
} from "lucide-react";

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date
function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatShareCount(value: number, hasCapTable: boolean): string {
  if (!hasCapTable) {
    return "N/A";
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function formatOperationalCurrency(value: number, hasOperationalMetrics: boolean): string {
  if (!hasOperationalMetrics) {
    return "N/A";
  }

  return formatCurrency(value);
}

function formatOperationalPercent(value: number, hasOperationalMetrics: boolean): string {
  if (!hasOperationalMetrics) {
    return "N/A";
  }

  return `${value.toFixed(1)}%`;
}

function formatOperationalRunway(value: number, hasOperationalMetrics: boolean): string {
  if (!hasOperationalMetrics) {
    return "N/A";
  }

  return `${value.toFixed(1)} mo`;
}

// Star rating component - Pink accent theme
function StarRating({ score, max = 5 }: { score: number; max?: number }) {
  const fullStars = Math.floor(score);
  const hasHalfStar = score % 1 >= 0.5;
  const emptyStars = max - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} className="h-5 w-5 fill-orange-400 text-orange-400 animate-in fade-in slide-in-from-bottom-2 duration-300" />
      ))}
      {hasHalfStar && (
        <div className="relative">
          <Star className="h-5 w-5 text-white/25" />
          <Star
            className="absolute inset-0 h-5 w-5 fill-orange-400 text-orange-400"
            style={{ clipPath: "inset(0 50% 0 0)" }}
          />
        </div>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} className="h-5 w-5 text-white/25" />
      ))}
      <span className="ml-2 text-sm font-bold text-orange-300">{score.toFixed(1)}</span>
    </div>
  );
}

// Tooltip wrapper for N/A states
function NaTooltip({ content }: { content: string }) {
  return (
    <div className="relative group inline-flex items-center cursor-help">
      <span className="font-medium text-white/55">N/A</span>
      <HelpCircle className="ml-1.5 h-4 w-4 text-white/45 transition-colors group-hover:text-orange-300" />
      <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/15 bg-[#0f1115] px-3 py-2 text-xs text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 pointer-events-none">
        {content}
        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#0f1115]" />
      </div>
    </div>
  );
}

// Metric card with tooltip - Premium dark theme
function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tooltip,
  highlight = false,
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: typeof Star;
  tooltip?: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`relative overflow-hidden border transition-all duration-500 ease-out group cursor-default ${
        highlight
          ? "bg-[#171a1f] border-orange-400/35 shadow-[0_12px_30px_rgba(0,0,0,0.24)] hover:shadow-[0_16px_34px_rgba(0,0,0,0.30)]"
          : "bg-[#13161b] border-white/15 shadow-[0_10px_24px_rgba(0,0,0,0.22)] hover:shadow-[0_14px_30px_rgba(0,0,0,0.30)] hover:border-orange-400/30"
      }`}
    >
      {/* Gradient accent */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
        highlight ? "bg-gradient-to-br from-orange-500/15 to-transparent" : "bg-gradient-to-br from-orange-500/10 to-transparent"
      }`} />
      
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className={`text-sm font-semibold flex items-center gap-2 ${
          highlight ? "text-orange-300" : "text-white"
        }`}>
          {title}
          {tooltip && (
            <div className="relative group/tooltip cursor-help">
              <HelpCircle className={`h-3.5 w-3.5 ${highlight ? "text-orange-300/70" : "text-white/45"}`} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#0f1115] border border-white/15 text-white text-xs rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-xl">
                {tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0f1115]" />
              </div>
            </div>
          )}
        </CardTitle>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300 ${
          highlight 
            ? "bg-orange-500/20 group-hover:bg-orange-500/30 group-hover:scale-110" 
            : "bg-white/10 group-hover:bg-orange-500/20 group-hover:scale-110"
        }`}>
          <Icon className={`h-5 w-5 transition-colors ${highlight ? "text-orange-300" : "text-white"}`} />
        </div>
      </CardHeader>
      
      <CardContent className="relative space-y-1">
        <div className={`text-3xl font-bold transition-colors ${
          highlight ? "text-orange-300" : "text-white"
        }`}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-white/60 transition-colors group-hover:text-white/80">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Format response time
function formatResponseTime(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  } else if (hours < 24) {
    return `${Math.round(hours)}h`;
  } else {
    return `${Math.round(hours / 24)}d`;
  }
}

export default async function InvestorPortfolioPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Investor stats + core data
  const investorStats = await getInvestorPortfolioStats(userId);

  const investments = await prisma.investment.findMany({
    where: { investorId: userId },
    orderBy: { createdAt: "desc" },
  });

  const investorRelationships = await prisma.startupRelationship.findMany({
    where: { investorId: userId, status: "DEAL_ACCEPTED" },
  });

  const ratingsGivenByInvestor = await prisma.rating.findMany({
    where: { raterId: userId, ratedRole: "FOUNDER" },
  });

  const acceptedRelationshipIds = investorRelationships.map((rel) => rel.id);

  const discussionMessages = acceptedRelationshipIds.length
    ? await prisma.message.findMany({
        where: {
          senderId: userId,
          relationshipId: {
            in: acceptedRelationshipIds,
          },
        },
        select: { relationshipId: true },
        distinct: ["relationshipId"],
      })
    : [];

  const [investedStartupUpdates, privateNotes, chartData, founderMetrics] =
    await Promise.all([
      getInvestorPortfolioUpdates(userId),
      getPrivateNotes(userId),
      getPortfolioChartData(userId),
      getFounderMetrics(userId),
    ]);

  const relationshipByStartupId = new Map(
    investorRelationships.map((rel) => [rel.startupId, rel])
  );

  const ratedStartupsMap = new Set(
    ratingsGivenByInvestor.map((r) => `${r.startupId}:${r.ratedUserId}`)
  );

  const participatedRelationships = new Set(
    discussionMessages.map((msg) => msg.relationshipId)
  );

  // Enrich investments with startup data
  const enrichedInvestments = await Promise.all(
    investments.map(async (inv) => {
      const startup = await client.fetch(STARTUP_BY_ID_QUERY, { id: inv.startupId });
      const relationship = relationshipByStartupId.get(inv.startupId);
      return { ...inv, startup, relationship };
    })
  );

  const privateNotesByStartupId = new Map(
    privateNotes.map((note) => [note.startupId, note.content])
  );

  const startupInfoById = new Map(
    enrichedInvestments.map((inv) => [
      inv.startupId,
      {
        title: inv.startup?.title ?? "Unknown Startup",
        slug: inv.startup?.slug?.current,
      },
    ])
  );

  const uniquePortfolioStartups = Array.from(
    new Map(
      enrichedInvestments.map((inv) => [inv.startupId, {
        id: inv.startupId,
        name: inv.startup?.title ?? "Unknown Startup",
      }])
    ).values()
  );

  return (
    <div className="min-h-screen bg-[#090b0f] text-white">
      <div className="relative mx-auto max-w-7xl px-4 py-10 lg:px-8">
        {/* Hero header */}
        <div className="relative mb-10 overflow-hidden rounded-[24px] border border-white/15 bg-[#121416] px-6 py-10 shadow-[0_14px_34px_rgba(0,0,0,0.30)] transition-all duration-500 ease-out hover:shadow-[0_20px_42px_rgba(0,0,0,0.35)]">
          {/* Animated gradient background */}
          <div className="absolute inset-0 opacity-70 pointer-events-none">
            <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-orange-500/18 blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-orange-400/10 blur-2xl animate-pulse delay-1000" />
          </div>
          
          <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/35 bg-orange-500/12 px-4 py-2 text-xs font-semibold">
                <Zap className="h-4 w-4 animate-pulse text-orange-300" />
                <span className="text-orange-200">Live Portfolio Dashboard</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
                Investor Portfolio
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-white/70">
                Manage your capital, track investments, and monitor founder performance with real-time insights and beautiful analytics.
              </p>
            </div>
            
            {/* Quick stats cards */}
            <div className="flex flex-col gap-3 md:items-end">
              <div className="flex gap-3">
                <div className="rounded-xl border border-white/15 bg-[#171a20] px-4 py-3 shadow-[0_10px_20px_rgba(0,0,0,0.24)] transition-all duration-300 hover:border-orange-400/35">
                  <p className="text-xs uppercase tracking-wide text-white/55">Total Invested</p>
                  <p className="mt-1 text-2xl font-bold text-white">
                    {formatCurrency(investorStats.totalInvested)}
                  </p>
                </div>
                <div className="rounded-xl border border-orange-400/30 bg-orange-500/10 px-4 py-3 shadow-[0_10px_20px_rgba(0,0,0,0.24)] transition-all duration-300 hover:bg-orange-500/15">
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-200">Active Deals</p>
                  <p className="mt-1 flex items-center gap-1 text-2xl font-bold text-orange-300">
                    <TrendingUp className="h-5 w-5" />
                    {investorStats.activeInvestments}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/55">
                <FileText className="h-4 w-4 text-orange-300" />
                <span>Real-time metrics & insights</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top stats grid - Enhanced with animations */}
        <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            title="Total Startups"
            icon={Users}
            value={investorStats.totalStartups}
            subtitle={`${investorStats.activeInvestments} active positions`}
            tooltip="Unique startups in your portfolio"
            highlight={true}
          />

          <MetricCard
            title="Total Invested"
            icon={DollarSign}
            value={formatCurrency(investorStats.totalInvested)}
            subtitle={`${investorStats.investmentCount} checks deployed`}
            tooltip="Total invested capital across your portfolio"
            highlight={false}
          />

          <MetricCard
            title="Portfolio Value"
            icon={DollarSign}
            value={formatCurrency(investorStats.portfolioValue)}
            subtitle={`Marked against current startup valuations`}
            tooltip="Current marked value of your startup stakes"
            highlight={false}
          />

          <MetricCard
            title="Unrealized Gains"
            icon={TrendingUp}
            value={formatCurrency(investorStats.unrealizedGains ?? 0)}
            subtitle={`Value minus invested capital`}
            tooltip="Estimated paper gains across active positions"
            highlight={false}
          />

          <MetricCard
            title="MOIC"
            icon={TrendingUp}
            value={`${(investorStats.moic ?? 0).toFixed(2)}x`}
            subtitle={`${investorStats.investmentCount} investments`}
            tooltip="Portfolio value divided by total invested"
            highlight={false}
          />

          <MetricCard
            title="IRR"
            icon={BarChart3}
            value={`${((investorStats.irr ?? 0) * 100).toFixed(1)}%`}
            subtitle={
              investorStats.averageFounderRating
                ? `${investorStats.averageFounderRating.toFixed(1)} avg founder rating`
                : "No rating data yet"
            }
            tooltip="Annualized return based on invested cash and current portfolio value"
            highlight={false}
          />
        </div>

        {/* Main tabs - Premium dark theme */}
        <Card className="rounded-[24px] border border-white/15 bg-[#121416] shadow-[0_14px_34px_rgba(0,0,0,0.30)] transition-all duration-500 ease-out hover:shadow-[0_20px_42px_rgba(0,0,0,0.36)]">
          <CardContent className="pt-8 pb-6">
            <Tabs defaultValue="investments" className="space-y-6">
              <div className="flex items-center justify-between overflow-x-auto pb-2">
                <TabsList className="inline-flex rounded-xl border border-white/15 bg-[#171a20] p-1 shadow-[0_8px_20px_rgba(0,0,0,0.20)]">
                  <TabsTrigger value="investments" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=inactive]:text-white/65 transition-all duration-300">
                    <DollarSign className="h-4 w-4 mr-2 inline" />
                    My Investments
                  </TabsTrigger>
                  <TabsTrigger value="updates" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=inactive]:text-white/65 transition-all duration-300">
                    <TrendingUp className="h-4 w-4 mr-2 inline" />
                    Updates
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=inactive]:text-white/65 transition-all duration-300">
                    <BarChart3 className="h-4 w-4 mr-2 inline" />
                    Performance
                  </TabsTrigger>
                  <TabsTrigger value="founder-metrics" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=inactive]:text-white/65 transition-all duration-300">
                    <Star className="h-4 w-4 mr-2 inline" />
                    Metrics
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=inactive]:text-white/65 transition-all duration-300">
                    <FileText className="h-4 w-4 mr-2 inline" />
                    Notes
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* My Investments Tab */}
              <TabsContent value="investments" className="space-y-4 mt-6">
                {investorStats.startupCards?.length ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {investorStats.startupCards.map((startup: any) => (
                      <Card
                        key={`startup-card-${startup.startupId}`}
                        className="border border-white/15 bg-[#13161b] shadow-[0_10px_24px_rgba(0,0,0,0.22)]"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-lg font-bold text-white">{startup.startupName}</p>
                              <p className="text-sm text-white/55">Ownership, returns, dilution, and company health</p>
                            </div>
                            <Badge
                              className={`${
                                startup.status === "Red"
                                  ? "border-red-400/40 bg-red-500/15 text-red-200"
                                  : startup.status === "Yellow"
                                    ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
                                    : "border-orange-400/40 bg-orange-500/15 text-orange-200"
                              }`}
                            >
                              {startup.status}
                            </Badge>
                          </div>

                          <div className="mt-5 grid grid-cols-2 gap-3 text-sm xl:grid-cols-4">
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                              <p className="text-xs uppercase tracking-wide text-white/50">Ownership</p>
                              <p className="mt-1 font-semibold text-white">{(startup.ownership * 100).toFixed(2)}%</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                              <p className="text-xs uppercase tracking-wide text-white/50">Shares Owned</p>
                              <p className="mt-1 font-semibold text-white">
                                {formatShareCount(startup.sharesOwned, startup.hasCapTable)}
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                              <p className="text-xs uppercase tracking-wide text-white/50">Entry Valuation</p>
                              <p className="mt-1 font-semibold text-white">{formatCurrency(startup.entryValuation)}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                              <p className="text-xs uppercase tracking-wide text-white/50">Current Valuation</p>
                              <p className="mt-1 font-semibold text-white">{formatCurrency(startup.currentValuation)}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                              <p className="text-xs uppercase tracking-wide text-white/50">Stake Value</p>
                              <p className="mt-1 font-semibold text-white">{formatCurrency(startup.stakeValue)}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                              <p className="text-xs uppercase tracking-wide text-white/50">Valuation Growth</p>
                              <p className="mt-1 font-semibold text-white">{startup.valuationGrowth.toFixed(1)}%</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                              <p className="text-xs uppercase tracking-wide text-white/50">Revenue</p>
                              <p className="mt-1 font-semibold text-white">
                                {formatOperationalCurrency(startup.revenue, startup.hasOperationalMetrics)}
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                              <p className="text-xs uppercase tracking-wide text-white/50">Growth</p>
                              <p className="mt-1 font-semibold text-white">
                                {formatOperationalPercent(startup.growthRate, startup.hasOperationalMetrics)}
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                              <p className="text-xs uppercase tracking-wide text-white/50">Burn Rate</p>
                              <p className="mt-1 font-semibold text-white">
                                {formatOperationalCurrency(startup.burnRate, startup.hasOperationalMetrics)}
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                              <p className="text-xs uppercase tracking-wide text-white/50">Runway</p>
                              <p className="mt-1 font-semibold text-white">
                                {formatOperationalRunway(startup.runway, startup.hasOperationalMetrics)}
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                              <p className="text-xs uppercase tracking-wide text-white/50">Last Funding Round</p>
                              <p className="mt-1 font-semibold text-white">{startup.latestFundingRound?.name ?? "N/A"}</p>
                              <p className="text-xs text-white/45">
                                {startup.latestFundingRound ? formatCurrency(startup.latestFundingRound.valuation) : "No round yet"}
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                              <p className="text-xs uppercase tracking-wide text-white/50">Investment Date</p>
                              <p className="mt-1 font-semibold text-white">{formatDate(startup.investmentDate)}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                              <p className="text-xs uppercase tracking-wide text-white/50">Current Value</p>
                              <p className="mt-1 font-semibold text-white">{formatCurrency(startup.stakeValue)}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                              <p className="text-xs uppercase tracking-wide text-white/50">Gain / Loss</p>
                              <p className="mt-1 font-semibold text-white">{formatCurrency(startup.unrealizedGain)}</p>
                            </div>
                          </div>

                          {startup.alerts?.length ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {startup.alerts.map((alert: any) => (
                                <Badge key={`${startup.startupId}-${alert.label}`} className="border border-white/10 bg-white/5 text-white/75">
                                  {alert.label}
                                </Badge>
                              ))}
                            </div>
                          ) : null}

                          <div className="mt-5 grid gap-4 xl:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                              <p className="text-sm font-semibold text-orange-300">Funding Rounds</p>
                              <div className="mt-3 space-y-2">
                                {startup.fundingRounds?.length ? startup.fundingRounds.map((round: any) => (
                                  <div key={`${startup.startupId}-${round.name}-${round.date}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                                    <div>
                                      <p className="font-medium text-white">{round.name}</p>
                                      <p className="text-xs text-white/50">{formatDate(round.date)}</p>
                                    </div>
                                    <p className="text-right text-orange-200">
                                      {formatCurrency(round.investmentAmount)} @ {formatCurrency(round.valuation)}
                                    </p>
                                  </div>
                                )) : (
                                  <p className="text-sm text-white/55">No funding rounds recorded yet.</p>
                                )}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                              <p className="text-sm font-semibold text-orange-300">Returns</p>
                              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                  <p className="text-xs uppercase tracking-wide text-white/50">Invested</p>
                                  <p className="mt-1 font-semibold text-white">{formatCurrency(startup.amountInvested)}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                  <p className="text-xs uppercase tracking-wide text-white/50">Current Value</p>
                                  <p className="mt-1 font-semibold text-white">{formatCurrency(startup.stakeValue)}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                  <p className="text-xs uppercase tracking-wide text-white/50">Gain</p>
                                  <p className="mt-1 font-semibold text-white">{formatCurrency(startup.unrealizedGain)}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                  <p className="text-xs uppercase tracking-wide text-white/50">MOIC</p>
                                  <p className="mt-1 font-semibold text-white">{startup.amountInvested > 0 ? `${(startup.stakeValue / startup.amountInvested).toFixed(2)}x` : "0.00x"}</p>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                              <p className="text-sm font-semibold text-orange-300">Dilution</p>
                              <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                                {startup.dilution.isAvailable ? (
                                  <>
                                    <div className="flex items-center justify-between border-b border-white/10 pb-2 text-white/70">
                                      <span>Before Round</span>
                                      <span>After Round</span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between font-semibold text-white">
                                      <span>{(startup.dilution.beforeOwnership * 100).toFixed(2)}%</span>
                                      <span>{(startup.dilution.afterOwnership * 100).toFixed(2)}%</span>
                                    </div>
                                    <p className="mt-2 text-xs text-white/55">
                                      Dilution impact: {startup.dilution.dilutionPercent.toFixed(2)}%
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-white/60">
                                    N/A
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                              <p className="text-sm font-semibold text-orange-300">Cap Table</p>
                              {startup.hasCapTable ? (
                                <div className="mt-3 space-y-2">
                                  {startup.capTable.map((row: any) => (
                                    <div key={`${startup.startupId}-${row.name}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                                      <span className="text-white">{row.name}</span>
                                      <span className="text-white/75">{formatShareCount(row.shares, true)} shares</span>
                                      <span className="font-semibold text-orange-200">{(row.ownership * 100).toFixed(2)}%</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-3 text-sm text-white/60">
                                  N/A. Add total shares in the founder financial profile to unlock cap table and dilution metrics.
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : null}

                {enrichedInvestments.length === 0 ? (
                  <Card className="border-dashed border border-orange-400/30 bg-orange-500/8">
                    <CardContent className="py-16 text-center">
                      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl border border-orange-400/30 bg-orange-500/15">
                        <DollarSign className="h-8 w-8 text-orange-300" />
                      </div>
                      <h3 className="mb-2 text-xl font-semibold text-white">No investments yet</h3>
                      <p className="mx-auto mb-6 max-w-md text-sm text-white/65">
                        Your investments will appear here once you accept deals with founders.
                      </p>
                      <Button className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white transition-all duration-300 hover:bg-orange-400">
                        <Plus className="h-4 w-4" />
                        Browse Startups
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  enrichedInvestments.map((investment: any) => (
                    <Card
                      key={investment.id}
                      className="group relative overflow-hidden border border-white/15 bg-[#13161b] transition-all duration-300 hover:border-orange-400/35 shadow-[0_10px_24px_rgba(0,0,0,0.22)] hover:shadow-[0_16px_34px_rgba(0,0,0,0.30)]"
                    >
                      {/* Hover gradient */}
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-400/8 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <CardContent className="relative p-6">
                        <div className="flex items-start justify-between gap-6">
                          <div className="flex-1">
                            <div className="mb-3 flex items-center gap-3">
                                <h3 className="text-xl font-bold text-white group-hover:text-orange-300 transition-colors">
                                {investment.startup?.title || "Unknown Startup"}
                              </h3>
                              <Badge
                                className={`font-semibold text-xs px-3 py-1 rounded-full transition-all ${
                                  investment.isActive
                                    ? "bg-orange-500/20 text-orange-200 border border-orange-400/40 hover:bg-orange-500/30"
                                    : "bg-white/5 text-white/65 border border-white/20"
                                }`}
                              >
                                {investment.isActive ? "● Active" : "○ Closed"}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              {investment.amount && (
                                <div className="space-y-1">
                                  <span className="text-white/55 flex items-center gap-1 text-xs">
                                    <DollarSign className="h-3.5 w-3.5 text-orange-300" />
                                    Amount
                                  </span>
                                  <p className="text-white font-semibold">{formatCurrency(investment.amount)}</p>
                                </div>
                              )}
                              {investment.equity && (
                                <div className="space-y-1">
                                  <span className="text-white/55 flex items-center gap-1 text-xs">
                                    <Users className="h-3.5 w-3.5 text-orange-300" />
                                    Equity
                                  </span>
                                  <p className="text-white font-semibold">{investment.equity}%</p>
                                </div>
                              )}
                              {investment.round && (
                                <div className="space-y-1">
                                  <span className="text-white/55 flex items-center gap-1 text-xs">
                                    <TrendingUp className="h-3.5 w-3.5 text-orange-300" />
                                    Round
                                  </span>
                                  <p className="text-white font-semibold">{investment.round}</p>
                                </div>
                              )}
                              <div className="space-y-1">
                                <span className="text-white/55 flex items-center gap-1 text-xs">
                                  <Clock className="h-3.5 w-3.5 text-orange-300" />
                                  Date
                                </span>
                                <p className="text-white font-semibold">{formatDate(investment.createdAt)}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 md:flex-row">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="hidden md:inline-flex border-white/20 text-white hover:bg-orange-500/15 hover:border-orange-400/50 transition-all"
                            >
                              <ArrowUpRight className="mr-1.5 h-4 w-4 text-orange-300" />
                              View
                            </Button>
                            {investment.relationship?.id ? (
                              <OpenChatButton
                                relationshipId={investment.relationship.id}
                                variant="outline"
                                size="sm"
                                className="border-white/20 text-white hover:bg-orange-500/15 hover:border-orange-400/50 transition-all"
                              >
                                <MessageCircle className="mr-1.5 h-4 w-4 text-orange-300" />
                                Chat
                              </OpenChatButton>
                            ) : (
                              <Button variant="outline" size="sm" disabled className="border-white/15 text-white/40">
                                <MessageCircle className="mr-1.5 h-4 w-4" />
                                Chat
                              </Button>
                            )}
                            {investment.relationship?.founderId ? (
                              <RateFounderButton
                                founderId={investment.relationship.founderId}
                                startupId={investment.startupId}
                                hasRated={ratedStartupsMap.has(
                                  `${investment.startupId}:${investment.relationship.founderId}`
                                )}
                                canRate={
                                  investment.relationship?.id
                                    ? participatedRelationships.has(investment.relationship.id)
                                    : false
                                }
                              />
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Startup Updates Tab */}
              <TabsContent value="updates" className="space-y-6 mt-6">
                <Tabs defaultValue="feed" className="space-y-4">
                  <TabsList className="rounded-xl border border-white/15 bg-[#171a20] p-1">
                    <TabsTrigger value="feed" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=inactive]:text-white/65 transition-all duration-300">
                      <MessageCircle className="h-4 w-4 mr-2 inline" />
                      Updates Feed
                    </TabsTrigger>
                    <TabsTrigger value="monthly" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=inactive]:text-white/65 transition-all duration-300">
                      <BarChart3 className="h-4 w-4 mr-2 inline" />
                      Monthly Updates
                    </TabsTrigger>
                  </TabsList>

                  {/* Narrative updates feed */}
                  <TabsContent value="feed">
                    <Card className="border-white/10 bg-white/5 backdrop-blur-md">
                      <CardHeader>
                        <CardTitle className="text-white">Updates Feed</CardTitle>
                        <CardDescription className="text-gray-400">
                          Real-time narrative updates from your portfolio companies.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {investedStartupUpdates.length === 0 ? (
                          <div className="py-16 text-center">
                            <MessageCircle className="mx-auto mb-4 h-10 w-10 text-gray-700" />
                            <p className="text-gray-400">Your updates will appear here after making investments.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Private updates */}
                            {investedStartupUpdates.some((u: any) => u.visibility === "INVESTORS_ONLY") && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-4">
                                  <span className="text-primary text-lg">🔒</span>
                                  <h4 className="font-semibold text-primary">Investor-Only Updates</h4>
                                </div>
                                {investedStartupUpdates
                                  .filter((u: any) => u.visibility === "INVESTORS_ONLY")
                                  .map((update: any) => {
                                    const startupInfo = update.startup;
                                    return (
                                      <Card
                                        key={update.id}
                                        className="group border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all duration-300"
                                      >
                                        <CardContent className="p-5">
                                          <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                              <p className="text-xs text-gray-500 uppercase tracking-wide">
                                                {startupInfo?.title ?? "Unknown Startup"}
                                              </p>
                                              <p className="text-lg font-bold text-white">
                                                {update.title || "Update"}
                                              </p>
                                              <p className="text-sm text-gray-300 leading-relaxed">
                                                {update.content}
                                              </p>
                                            </div>
                                            <div className="shrink-0 text-right space-y-2">
                                              <Badge className="bg-primary/30 text-primary border border-primary/50 text-xs">
                                                🔒 Private
                                              </Badge>
                                              <Badge variant="secondary" className="ml-2 bg-white/10 text-gray-200 text-xs">
                                                {update.updateType?.replace("_", " ")}
                                              </Badge>
                                              <p className="text-xs text-gray-500">
                                                {formatDate(update.createdAt)}
                                              </p>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    );
                                  })}
                              </div>
                            )}

                            {/* Public updates */}
                            {investedStartupUpdates.some((u: any) => u.visibility === "PUBLIC") && (
                              <div className="space-y-3">
                                {investedStartupUpdates.some((u: any) => u.visibility === "INVESTORS_ONLY") && (
                                  <div className="flex items-center gap-2 mt-6 mb-4">
                                    <span className="text-gray-400 text-lg">🌍</span>
                                    <h4 className="font-semibold text-gray-300">Public Updates</h4>
                                  </div>
                                )}
                                {investedStartupUpdates
                                  .filter((u: any) => u.visibility === "PUBLIC")
                                  .map((update: any) => {
                                    const startupInfo = update.startup;
                                    return (
                                      <Card
                                        key={update.id}
                                        className="group border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300"
                                      >
                                        <CardContent className="p-5">
                                          <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                              <p className="text-xs text-gray-500 uppercase tracking-wide">
                                                {startupInfo?.title ?? "Unknown Startup"}
                                              </p>
                                              <p className="text-lg font-bold text-white">
                                                {update.title || "Update"}
                                              </p>
                                              <p className="text-sm text-gray-300 leading-relaxed">
                                                {update.content}
                                              </p>
                                            </div>
                                            <div className="shrink-0 text-right space-y-2">
                                              <Badge variant="secondary" className="bg-white/10 text-gray-200 text-xs">
                                                {update.updateType?.replace("_", " ")}
                                              </Badge>
                                              <p className="text-xs text-gray-500">
                                                {formatDate(update.createdAt)}
                                              </p>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Monthly metric updates feed */}
                  <TabsContent value="monthly">
                    <InvestorMonthlyUpdatesFeed startups={uniquePortfolioStartups} />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* Performance Tab */}
              <TabsContent value="performance" className="space-y-6 mt-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Portfolio growth */}
                  <Card className="border border-white/15 bg-[#13161b] shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition-all duration-300 hover:border-orange-400/35 hover:shadow-[0_16px_34px_rgba(0,0,0,0.30)]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <TrendingUp className="h-5 w-5 text-orange-300" />
                        Portfolio Growth
                      </CardTitle>
                      <CardDescription className="text-white/65">
                        Total invested capital over time.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {chartData.portfolioGrowth.length > 0 && chartData.portfolioGrowth.some((p) => p.value > 0) ? (
                        <div className="space-y-4">
                          {chartData.portfolioGrowth.map((point, index) => {
                            const maxValue = chartData.portfolioGrowth[chartData.portfolioGrowth.length - 1]?.value || 1;
                            return (
                              <div key={index} className="flex items-center gap-3">
                                <span className="w-20 text-xs text-white/55 font-semibold">{point.date}</span>
                                <div className="relative flex-1 h-8 rounded-lg overflow-hidden bg-black/40 border border-white/10">
                                  <div
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-orange-300 transition-all duration-500"
                                    style={{
                                      width: `${Math.min(100, (point.value / maxValue) * 100)}%`,
                                    }}
                                  />
                                  <span className="absolute inset-0 flex items-center px-3 text-xs font-bold text-white">
                                    {formatCurrency(point.value)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-black/40 text-center border border-white/10">
                          <BarChart3 className="mb-3 h-10 w-10 text-white/35" />
                          <p className="mb-1 text-sm font-medium text-white/80">No performance data yet</p>
                          <p className="text-xs text-white/55">
                            Make investments to track portfolio performance.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Investment distribution */}
                  <Card className="border border-white/15 bg-[#13161b] shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition-all duration-300 hover:border-orange-400/35 hover:shadow-[0_16px_34px_rgba(0,0,0,0.30)]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <PieChart className="h-5 w-5 text-orange-300" />
                        Investment Distribution
                      </CardTitle>
                      <CardDescription className="text-white/65">
                        Capital allocation across portfolio companies.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {chartData.investmentDistribution.length > 0 &&
                      chartData.investmentDistribution.some((d) => d.value > 0) ? (
                        <div className="space-y-4">
                          {chartData.investmentDistribution.map((item, index) => {
                            const total = chartData.investmentDistribution.reduce(
                              (sum, d) => sum + (d.value || 0),
                              0
                            );
                            const percentage = (item.value / total) * 100;
                            const colors = [
                              "from-orange-500 to-orange-300",
                              "from-orange-400 to-amber-300",
                              "from-[#ff8a3d] to-[#ffb347]",
                              "from-[#ff6b2c] to-[#ff9d3d]",
                            ];
                            const color = colors[index % colors.length];

                            const startupInfo = startupInfoById.get(item.name);
                            const displayName = startupInfo?.title ?? "Unknown Startup";

                            return (
                              <div key={index} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="font-semibold text-white">{displayName}</span>
                                  <span className="text-white/60">
                                    {formatCurrency(item.value)} ({percentage.toFixed(1)}%)
                                  </span>
                                </div>
                                <div className="h-3 rounded-lg overflow-hidden bg-black/40 border border-white/10">
                                  <div
                                    className={`h-full bg-gradient-to-r ${color} transition-all duration-500`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-black/40 text-center border border-white/10">
                          <PieChart className="mb-3 h-10 w-10 text-white/35" />
                          <p className="mb-1 text-sm font-medium text-white/80">No investments yet</p>
                          <p className="text-xs text-white/55">
                            Your portfolio distribution will appear here.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Founder Metrics Tab */}
              <TabsContent value="founder-metrics" className="space-y-6 mt-6">
                <Card className="border border-white/15 bg-[#13161b] shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition-all duration-300 hover:border-orange-400/35 hover:shadow-[0_16px_34px_rgba(0,0,0,0.30)]">
                  <CardHeader>
                    <CardTitle className="text-white">Founder Performance Metrics</CardTitle>
                    <CardDescription className="text-white/65">
                      Your performance when acting as a founder on Setu.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                      {/* Investors Onboarded */}
                      <Card className="relative overflow-hidden border border-white/15 bg-[#171a20] group transition-all duration-300 hover:border-orange-400/35 hover:shadow-[0_12px_24px_rgba(0,0,0,0.24)]">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-400/8 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardContent className="relative pt-6 space-y-2">
                          <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-orange-300" />
                            <p className="text-xs text-white/65 uppercase tracking-wide">Investors Onboarded</p>
                          </div>
                          <p className="text-3xl font-bold text-white">
                            {founderMetrics.investorsOnboarded}
                          </p>
                          <p className="text-xs text-white/55">Unique investors with accepted deals</p>
                        </CardContent>
                      </Card>

                      {/* Avg Investor Rating */}
                      <Card className="relative overflow-hidden border border-white/15 bg-[#171a20] group transition-all duration-300 hover:border-orange-400/35 hover:shadow-[0_12px_24px_rgba(0,0,0,0.24)]">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-400/8 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardContent className="relative pt-6 space-y-3">
                          <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-orange-300" />
                            <p className="text-xs text-white/65 uppercase tracking-wide">Avg Rating</p>
                          </div>
                          <div className="min-h-[32px]">
                            {founderMetrics.avgInvestorRating ? (
                              <StarRating score={founderMetrics.avgInvestorRating} />
                            ) : (
                              <NaTooltip content="You have not been rated by investors yet" />
                            )}
                          </div>
                          <p className="text-xs text-white/55">
                            From {founderMetrics.ratingCount} investor rating
                            {founderMetrics.ratingCount === 1 ? "" : "s"}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Update cadence */}
                      <Card className="relative overflow-hidden border border-white/15 bg-[#171a20] group transition-all duration-300 hover:border-orange-400/35 hover:shadow-[0_12px_24px_rgba(0,0,0,0.24)]">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-400/8 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardContent className="relative pt-6 space-y-2">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-orange-300" />
                            <p className="text-xs text-white/65 uppercase tracking-wide">Update Cadence</p>
                          </div>
                          <p className="text-2xl font-bold text-white">
                            {founderMetrics.updateStatus}
                          </p>
                          <p className="text-xs text-white/55">
                            {founderMetrics.totalUpdates} total updates
                          </p>
                        </CardContent>
                      </Card>

                      {/* Responsiveness */}
                      <Card className="relative overflow-hidden border border-white/15 bg-[#171a20] group transition-all duration-300 hover:border-orange-400/35 hover:shadow-[0_12px_24px_rgba(0,0,0,0.24)]">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-400/8 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardContent className="relative pt-6 space-y-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-orange-300" />
                            <p className="text-xs text-white/65 uppercase tracking-wide">Response Time</p>
                          </div>
                          <p className="text-2xl font-bold text-white">
                            {founderMetrics.avgResponseTimeHours != null ? (
                              formatResponseTime(founderMetrics.avgResponseTimeHours)
                            ) : (
                              <span className="text-base text-white/55">N/A</span>
                            )}
                          </p>
                          <p className="text-xs text-white/55">
                            Average reply time
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Private Notes Tab */}
              <TabsContent value="notes" className="space-y-6 mt-6">
                <Card className="border border-white/15 bg-[#13161b] shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition-all duration-300 hover:border-orange-400/35 hover:shadow-[0_16px_34px_rgba(0,0,0,0.30)]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <FileText className="h-5 w-5 text-orange-300" />
                      Private Notes
                    </CardTitle>
                    <CardDescription className="text-white/65">
                      Confidential thoughts on your portfolio companies — visible only to you.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {enrichedInvestments.length === 0 ? (
                      <div className="py-16 text-center">
                        <FileText className="mx-auto mb-4 h-10 w-10 text-white/35" />
                        <p className="font-medium text-white/80">No portfolio companies yet</p>
                        <p className="mt-1 text-sm text-white/55">
                          Keep private notes on companies as you invest in them.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {uniquePortfolioStartups.map((startup) => (
                          <PrivateNoteEditor
                            key={startup.id}
                            startupId={startup.id}
                            startupTitle={startup.name}
                            initialContent={privateNotesByStartupId.get(startup.id) || ""}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
