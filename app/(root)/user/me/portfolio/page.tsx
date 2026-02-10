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
  PieChart
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

// Star rating component for display
function StarRating({ score, max = 5 }: { score: number; max?: number }) {
  const fullStars = Math.floor(score);
  const hasHalfStar = score % 1 >= 0.5;
  const emptyStars = max - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      ))}
      {hasHalfStar && (
        <div className="relative">
          <Star className="h-4 w-4 text-gray-300" />
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 absolute inset-0" style={{ clipPath: 'inset(0 50% 0 0)' }} />
        </div>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
      ))}
      <span className="ml-1 text-sm font-medium">{score.toFixed(1)}</span>
    </div>
  );
}

// Tooltip wrapper for N/A states
function NaTooltip({ content }: { content: string }) {
  return (
    <div className="relative group inline-flex items-center cursor-help">
      <span className="text-gray-400">N/A</span>
      <HelpCircle className="h-3 w-3 ml-1 text-gray-400" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}

// Metric card with tooltip
function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tooltip,
  highlight = false
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: typeof Star;
  tooltip?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-blue-200 bg-blue-50/30" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {title}
          {tooltip && (
            <div className="relative group cursor-help">
              <HelpCircle className="h-3 w-3 text-gray-400" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          )}
        </CardTitle>
        <Icon className={`h-4 w-4 ${highlight ? 'text-blue-500' : 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${highlight ? 'text-blue-600' : ''}`}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
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

  // ============================================
  // INVESTOR-SIDE DATA
  // ============================================

  // Portfolio stats (from investments)
  const investorStats = await getInvestorPortfolioStats(userId);

  // Fetch investments
  const investments = await prisma.investment.findMany({
    where: { investorId: userId },
    orderBy: { createdAt: "desc" },
  });

  // Fetch accepted relationships for investments
  const investorRelationships = await prisma.startupRelationship.findMany({
    where: { investorId: userId, status: "DEAL_ACCEPTED" },
  });

  // Fetch ratings given by this investor to founders
  const ratingsGivenByInvestor = await prisma.rating.findMany({
    where: { raterId: userId, ratedRole: "FOUNDER" },
  });

  // Fetch discussion messages to determine who can rate
  const discussionMessages = await prisma.message.findMany({
    where: {
      senderId: userId,
      relationshipId: {
        in: investorRelationships.map((rel) => rel.id),
      },
    },
    select: { relationshipId: true },
    distinct: ["relationshipId"],
  });

  // Enrich investments with startup data and relationship data
  const relationshipByStartupId = new Map(
    investorRelationships.map((rel) => [rel.startupId, rel])
  );

  const ratedStartupsMap = new Set(
    ratingsGivenByInvestor.map((r) => `${r.startupId}:${r.ratedUserId}`)
  );

  const participatedRelationships = new Set(
    discussionMessages.map((msg) => msg.relationshipId)
  );

  // Enrich investments
  const enrichedInvestments = await Promise.all(
    investments.map(async (inv) => {
      const startup = await client.fetch(STARTUP_BY_ID_QUERY, { id: inv.startupId });
      const relationship = relationshipByStartupId.get(inv.startupId);
      return { ...inv, startup, relationship };
    })
  );

  // Fetch startup updates from invested startups
  // Using getInvestorPortfolioUpdates which returns both PUBLIC and INVESTORS_ONLY updates
  const investedStartupUpdates = await getInvestorPortfolioUpdates(userId);

  // Fetch private notes for invested startups
  const privateNotes = await getPrivateNotes(userId);
  const privateNotesByStartupId = new Map(
    privateNotes.map((note) => [note.startupId, note.content])
  );

  // Fetch chart data for Performance tab
  const chartData = await getPortfolioChartData(userId);

  // ============================================
  // FOUNDER-SIDE DATA (if user is also a founder)
  // ============================================

  const founderMetrics = await getFounderMetrics(userId);

  // Fetch founder requests and deals
  const founderRequests = await prisma.startupRelationship.findMany({
    where: { founderId: userId },
  });

  // Build startup info map for display
  const startupInfoById = new Map(
    enrichedInvestments.map((inv) => [
      inv.startupId,
      {
        title: inv.startup?.title ?? "Unknown Startup",
        slug: inv.startup?.slug?.current,
      },
    ])
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Investor Portfolio</h1>
        <p className="text-gray-500 mt-2">
          Track your investments, performance, and founder metrics.
        </p>
      </div>

      {/* Portfolio Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Total Invested"
          icon={DollarSign}
          value={formatCurrency(investorStats.totalInvested)}
          subtitle={`Across ${investorStats.investmentCount} investments`}
          tooltip="Sum of all investment amounts"
        />

        <MetricCard
          title="Active Investments"
          icon={TrendingUp}
          value={investorStats.activeInvestments}
          subtitle={`${Math.max(investorStats.investmentCount - investorStats.activeInvestments, 0)} closed`}
          tooltip="Investments with DEAL_ACCEPTED status"
        />

        <MetricCard
          title="Founder Rating Avg"
          icon={Star}
          value={
            investorStats.averageFounderRating ? (
              <div className="flex items-center gap-2">
                <StarRating score={investorStats.averageFounderRating} />
              </div>
            ) : (
              <NaTooltip content="Rate founders to see your average rating" />
            )
          }
          subtitle={
            investorStats.ratingsCount > 0
              ? `${investorStats.ratingsCount} founders rated`
              : "No ratings yet"
          }
          tooltip="Average rating given to founders"
        />

        <MetricCard
          title="Deal Rate (Founder)"
          icon={BarChart3}
          value={`${founderRequests.length > 0 ? founderMetrics.dealRate : 0}%`}
          subtitle={
            founderRequests.length > 0
              ? `${founderMetrics.acceptedDeals} of ${founderMetrics.totalRequests} accepted`
              : "No requests yet"
          }
          tooltip="Percentage of investor requests that converted to deals"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="investments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="investments">My Investments</TabsTrigger>
          <TabsTrigger value="updates">Updates Feed</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="founder-metrics">Founder Metrics</TabsTrigger>
          <TabsTrigger value="notes">Private Notes</TabsTrigger>
        </TabsList>

        {/* My Investments Tab */}
        <TabsContent value="investments">
          <div className="space-y-4">
            {enrichedInvestments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <DollarSign className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No investments yet</h3>
                  <p className="text-gray-500 max-w-sm mx-auto mb-4">
                    When you accept a deal with a founder, your investments will appear here.
                  </p>
                  <Button>Browse Startups</Button>
                </CardContent>
              </Card>
            ) : (
              enrichedInvestments.map((investment: any) => (
                <Card key={investment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold">
                            {investment.startup?.title || "Unknown Startup"}
                          </h3>
                          <Badge variant={investment.isActive ? "default" : "secondary"}>
                            {investment.isActive ? "Active" : "Closed"}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          {investment.amount && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {formatCurrency(investment.amount)}
                            </span>
                          )}
                          {investment.equity && (
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {investment.equity}% equity
                            </span>
                          )}
                          {investment.round && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-4 w-4" />
                              {investment.round}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Invested {formatDate(investment.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <ArrowUpRight className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {investment.relationship?.id ? (
                          <OpenChatButton relationshipId={investment.relationship.id} variant="outline" size="sm">
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Chat
                          </OpenChatButton>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Chat
                          </Button>
                        )}
                        {investment.relationship?.founderId ? (
                          <RateFounderButton
                            founderId={investment.relationship.founderId}
                            startupId={investment.startupId}
                            hasRated={ratedStartupsMap.has(`${investment.startupId}:${investment.relationship.founderId}`)}
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
          </div>
        </TabsContent>

        {/* Updates Feed Tab */}
        <TabsContent value="updates">
          <Card>
            <CardHeader>
              <CardTitle>Startup Updates</CardTitle>
              <CardDescription>
                Updates from startups you have invested in
              </CardDescription>
            </CardHeader>
            <CardContent>
              {investedStartupUpdates.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>Startup updates will appear here after you make investments.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Private updates section */}
                  {investedStartupUpdates.some((u: any) => u.visibility === "INVESTORS_ONLY") && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-amber-600">🔒</span>
                        <h4 className="font-semibold text-amber-800">Investor-Only Updates</h4>
                      </div>
                      {investedStartupUpdates
                        .filter((u: any) => u.visibility === "INVESTORS_ONLY")
                        .map((update: any) => {
                          const startupInfo = update.startup;
                          return (
                            <div key={update.id} className="border border-amber-200 rounded-lg p-4 bg-white mb-3 last:mb-0">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="text-sm text-gray-500">
                                    {startupInfo?.title ?? "Unknown Startup"}
                                  </p>
                                  <p className="text-lg font-semibold text-gray-900">
                                    {update.title || "Update"}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {update.content}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                                    🔒 Private
                                  </Badge>
                                  <Badge variant="secondary" className="ml-2">
                                    {update.updateType?.replace("_", " ")}
                                  </Badge>
                                  <p className="text-xs text-gray-500 mt-2">
                                    {formatDate(update.createdAt)}
                                  </p>
                                </div>
                              </div>
                              {startupInfo?.slug && (
                                <div className="mt-3">
                                  <Button variant="outline" size="sm" asChild>
                                    <a href={`/startup/${startupInfo.slug}`}>View Startup</a>
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* Public updates section */}
                  {investedStartupUpdates.some((u: any) => u.visibility === "PUBLIC") && (
                    <div>
                      {investedStartupUpdates.some((u: any) => u.visibility === "INVESTORS_ONLY") && (
                        <div className="flex items-center gap-2 mb-3">
                          <span>🌍</span>
                          <h4 className="font-semibold">Public Updates</h4>
                        </div>
                      )}
                      {investedStartupUpdates
                        .filter((u: any) => u.visibility === "PUBLIC")
                        .map((update: any) => {
                          const startupInfo = update.startup;
                          return (
                            <div key={update.id} className="border rounded-lg p-4 bg-white mb-3">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="text-sm text-gray-500">
                                    {startupInfo?.title ?? "Unknown Startup"}
                                  </p>
                                  <p className="text-lg font-semibold text-gray-900">
                                    {update.title || "Update"}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {update.content}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <Badge variant="secondary">
                                    {update.updateType?.replace("_", " ")}
                                  </Badge>
                                  <p className="text-xs text-gray-500 mt-2">
                                    {formatDate(update.createdAt)}
                                  </p>
                                </div>
                              </div>
                              {startupInfo?.slug && (
                                <div className="mt-3">
                                  <Button variant="outline" size="sm" asChild>
                                    <a href={`/startup/${startupInfo.slug}`}>View Startup</a>
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Investment Performance</CardTitle>
              <CardDescription>
                Track your portfolio growth and investment distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Portfolio Growth Chart */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Portfolio Growth
                  </h4>
                  
                  {chartData.portfolioGrowth.length > 0 && 
                   chartData.portfolioGrowth.some(p => p.value > 0) ? (
                    <div className="h-64 bg-gray-50 rounded-lg p-4">
                      {/* Simple bar representation for now - can be replaced with Recharts/Chart.js */}
                      <div className="space-y-2">
                        {chartData.portfolioGrowth.map((point, index) => {
                          const maxValue = chartData.portfolioGrowth[chartData.portfolioGrowth.length - 1]?.value || 1;
                          return (
                            <div 
                              key={index}
                              className="flex items-center gap-3 text-sm"
                            >
                              <span className="text-gray-500 w-24">
                                {point.date}
                              </span>
                              <div className="flex-1 bg-blue-100 h-6 rounded relative overflow-hidden">
                                <div 
                                  className="absolute left-0 top-0 h-full bg-blue-500 transition-all"
                                  style={{
                                    width: `${Math.min(100, (point.value / maxValue) * 100)}%`
                                  }}
                                />
                                <span className="absolute inset-0 flex items-center pl-2 text-xs font-medium">
                                  {formatCurrency(point.value)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mt-4">
                        {chartData.portfolioGrowth.length} data point{chartData.portfolioGrowth.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  ) : (
                    <div className="h-64 bg-gray-50 rounded-lg flex flex-col items-center justify-center text-center p-6">
                      <BarChart3 className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-gray-500 mb-2">No performance data yet</p>
                      <p className="text-sm text-gray-400">
                        Make your first investment to see performance insights.
                      </p>
                    </div>
                  )}
                </div>

                {/* Investment Distribution Chart */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <PieChart className="h-4 w-4" />
                    Investment Distribution
                  </h4>
                  
                  {chartData.investmentDistribution.length > 0 && 
                   chartData.investmentDistribution.some(d => d.value > 0) ? (
                    <div className="h-64 bg-gray-50 rounded-lg p-4">
                      {/* Simple bar representation for now - can be replaced with PieChart */}
                      <div className="space-y-3">
                        {chartData.investmentDistribution.map((item, index) => {
                          const total = chartData.investmentDistribution.reduce((sum, d) => sum + d.value, 0);
                          const percentage = total > 0 ? (item.value / total) * 100 : 0;
                          const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-cyan-500'];
                          const color = colors[index % colors.length];
                          
                          return (
                            <div key={index} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-gray-500">
                                  {formatCurrency(item.value)} ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="bg-gray-200 h-3 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${color} transition-all`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mt-4">
                        {chartData.investmentDistribution.filter(d => d.value > 0).length} startup{chartData.investmentDistribution.filter(d => d.value > 0).length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  ) : (
                    <div className="h-64 bg-gray-50 rounded-lg flex flex-col items-center justify-center text-center p-6">
                      <PieChart className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-gray-500 mb-2">No investments yet</p>
                      <p className="text-sm text-gray-400">
                        Make your first investment to see distribution.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Founder Metrics Tab */}
        <TabsContent value="founder-metrics">
          <Card>
            <CardHeader>
              <CardTitle>Founder Performance Metrics</CardTitle>
              <CardDescription>
                Performance metrics when you act as a founder
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Investors Onboarded */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <p className="text-sm text-gray-500">Investors Onboarded</p>
                  </div>
                  <p className="text-2xl font-bold">{founderMetrics.investorsOnboarded}</p>
                  <p className="text-xs text-gray-600 mt-1">Unique investors with accepted deals</p>
                </div>

                {/* Investor Rating */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <p className="text-sm text-gray-500">Investor Rating</p>
                  </div>
                  {founderMetrics.avgInvestorRating ? (
                    <div className="flex items-center gap-1">
                      <StarRating score={founderMetrics.avgInvestorRating} />
                    </div>
                  ) : (
                    <NaTooltip content="No ratings from investors yet" />
                  )}
                  <p className="text-xs text-gray-600 mt-1">
                    {founderMetrics.ratingCount > 0
                      ? `${founderMetrics.ratingCount} ratings received`
                      : "No ratings yet"}
                  </p>
                </div>

                {/* Update Frequency */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <p className="text-sm text-gray-500">Update Frequency</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {founderMetrics.updateStatus?.includes("Inactive") ? (
                      <span className="text-orange-500">Inactive</span>
                    ) : (
                      "Active"
                    )}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{founderMetrics.updateStatus}</p>
                </div>

                {/* Deal Conversion Rate */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-green-500" />
                    <p className="text-sm text-gray-500">Deal Conversion</p>
                  </div>
                  <p className="text-2xl font-bold">{founderMetrics.dealRate}%</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {founderMetrics.totalRequests} requests → {founderMetrics.acceptedDeals} deals
                  </p>
                </div>
              </div>

              {/* Additional Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {/* Responsiveness */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-purple-500" />
                    <p className="text-sm text-gray-500">Avg Response Time</p>
                  </div>
                  {founderMetrics.avgResponseTimeHours ? (
                    <p className="text-2xl font-bold">
                      {formatResponseTime(founderMetrics.avgResponseTimeHours)}
                    </p>
                  ) : (
                    <NaTooltip content="No messages yet to calculate response time" />
                  )}
                  <p className="text-xs text-gray-600 mt-1">Time to reply to investors</p>
                </div>

                {/* Total Updates */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <p className="text-sm text-gray-500">Total Updates</p>
                  </div>
                  <p className="text-2xl font-bold">{founderMetrics.totalUpdates}</p>
                  <p className="text-xs text-gray-600 mt-1">Updates posted to investors</p>
                </div>

                {/* Total Requests */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Plus className="h-4 w-4 text-gray-500" />
                    <p className="text-sm text-gray-500">Investment Requests</p>
                  </div>
                  <p className="text-2xl font-bold">{founderMetrics.totalRequests}</p>
                  <p className="text-xs text-gray-600 mt-1">Received from investors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Private Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Private Notes & Documents</CardTitle>
              <CardDescription>
                Your private notes for each investment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {enrichedInvestments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No investments to add notes to yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {enrichedInvestments.map((inv: any) => (
                    <PrivateNoteEditor
                      key={inv.id}
                      startupId={inv.startupId}
                      startupTitle={inv.startup?.title || "Unknown Startup"}
                      initialContent={privateNotesByStartupId.get(inv.startupId) || ""}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

