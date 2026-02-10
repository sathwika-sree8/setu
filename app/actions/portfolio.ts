"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * ===========================================
 * PORTFOLIO DATA ACTIONS
 * ===========================================
 */

/**
 * Get complete portfolio data for investor
 */
export async function getPortfolioData(investorId?: string) {
  const { userId } = await auth();
  const targetId = investorId || userId;

  if (!targetId) throw new Error("Unauthorized");

  const investments = await prisma.investment.findMany({
    where: { investorId: targetId },
    orderBy: { createdAt: "desc" },
  });

  const [relationships, ratings, updates] = await Promise.all([
    prisma.startupRelationship.findMany({ where: { investorId: targetId } }),
    prisma.rating.findMany({ where: { raterId: targetId, ratedRole: "FOUNDER" } }),
    prisma.startupUpdate.findMany({
      where: { startupId: { in: investments.map((i) => i.startupId) } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { investments, relationships, ratings, updates };
}

/**
 * Get investor portfolio summary stats
 * 
 * Calculations:
 * - Total Invested = SUM(Investment.amount) WHERE investorId = currentUser
 * - Active Investments = COUNT(Investment) WHERE investorId = currentUser AND relationship.status = DEAL_ACCEPTED
 */
export async function getInvestorPortfolioStats(investorId?: string) {
  const { userId } = await auth();
  const targetId = investorId || userId;

  if (!targetId) throw new Error("Unauthorized");

  const [investments, founderRatings] = await Promise.all([
    prisma.investment.findMany({
      where: { investorId: targetId },
    }),
    prisma.rating.findMany({
      where: {
        raterId: targetId,
        ratedRole: "FOUNDER",
      },
    }),
  ]);

  // Get all accepted relationships to filter investments
  const acceptedRelationships = await prisma.startupRelationship.findMany({
    where: {
      investorId: targetId,
      status: "DEAL_ACCEPTED",
    },
    select: { startupId: true },
  });

  const acceptedStartupIds = new Set(acceptedRelationships.map((r) => r.startupId));
  
  // Active Investments = investments where startup has DEAL_ACCEPTED relationship
  const activeInvestments = investments.filter((inv) => 
    acceptedStartupIds.has(inv.startupId)
  ).length;

  const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const avgFounderRating =
    founderRatings.length > 0
      ? founderRatings.reduce((sum, r) => sum + r.score, 0) / founderRatings.length
      : null;

  return {
    totalInvested,
    activeInvestments,
    averageFounderRating: avgFounderRating,
    investmentCount: investments.length,
    ratingsCount: founderRatings.length,
    // Additional data for detailed views
    investments,
    acceptedStartupIds: Array.from(acceptedStartupIds),
  };
}

/**
 * ===========================================
 * FOUNDER METRICS (for when user acts as founder)
 * ===========================================
 */

/**
 * Get founder performance metrics
 * 
 * Metrics:
 * - Investors Onboarded: COUNT(DISTINCT Investment.investorId) WHERE startup.founderId = userId
 * - Avg Investor Rating: AVG(Rating.score) WHERE ratedUserId = founderId AND ratedRole = "FOUNDER"
 * - Update Frequency: COUNT(StartupUpdate) GROUPED BY month
 * - Deal Conversion Rate: (DEAL_ACCEPTED relationships / Total requests) * 100
 * - Responsiveness: Avg time between investor message → founder reply (hours)
 */
export async function getFounderMetrics(founderId?: string) {
  const { userId } = await auth();
  const targetId = founderId || userId;

  if (!targetId) throw new Error("Unauthorized");

  const acceptedDeals = await prisma.startupRelationship.findMany({
    where: { founderId: targetId, status: "DEAL_ACCEPTED" },
  });

  const allRequests = await prisma.startupRelationship.findMany({
    where: { founderId: targetId },
  });

  const investorRatings = await prisma.rating.findMany({
    where: { ratedUserId: targetId, ratedRole: "FOUNDER" },
  });

  const updates = await prisma.startupUpdate.findMany({
    where: { authorId: targetId },
    orderBy: { createdAt: "desc" },
  });

  const messages = await prisma.message.findMany({
    where: { relationship: { founderId: targetId } },
    orderBy: { createdAt: "asc" },
  });

  // METRIC 1: Investors Onboarded (unique investors with accepted deals)
  const investorsOnboarded = new Set(acceptedDeals.map((deal) => deal.investorId)).size;

  // METRIC 2: Average Investor Rating (all ratings given to this founder)
  const avgInvestorRating =
    investorRatings.length > 0
      ? investorRatings.reduce((sum, r) => sum + r.score, 0) / investorRatings.length
      : null;

  // METRIC 3: Update Frequency
  const now = new Date();
  const daysSinceLastUpdate = updates.length
    ? Math.floor((now.getTime() - updates[0].createdAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Calculate updates per month based on actual date range
  let updateFrequency = "No updates yet";
  if (updates.length > 1) {
    const firstUpdate = updates[updates.length - 1].createdAt;
    const lastUpdate = updates[0].createdAt;
    const daysDiff = (now.getTime() - firstUpdate.getTime()) / (1000 * 60 * 60 * 24);
    const monthsDiff = Math.max(1, daysDiff / 30);
    const updatesPerMonth = updates.length / monthsDiff;
    updateFrequency = `${updatesPerMonth.toFixed(1)} updates / month`;
  } else if (updates.length === 1) {
    updateFrequency = "1 update (no trend yet)";
  }

  const updateStatus =
    daysSinceLastUpdate !== null && daysSinceLastUpdate > 45
      ? `Inactive (no updates in ${daysSinceLastUpdate} days)`
      : updateFrequency;

  // METRIC 4: Deal Conversion Rate
  const dealRate =
    allRequests.length > 0 ? Math.round((acceptedDeals.length / allRequests.length) * 100) : 0;

  // METRIC 5: Responsiveness (avg time between investor message → founder reply)
  let avgResponseTimeHours: number | null = null;
  const responseTimes: number[] = [];
  
  // Group messages by relationship
  const messagesByRelationship = new Map<string, typeof messages>();
  for (const msg of messages) {
    const existing = messagesByRelationship.get(msg.relationshipId) || [];
    messagesByRelationship.set(msg.relationshipId, [...existing, msg]);
  }

  // Calculate response times for each relationship
  for (const [, relMessages] of messagesByRelationship) {
    let lastInvestorMessage: Date | null = null;
    
    for (const msg of relMessages) {
      const isFromInvestor = acceptedDeals.some(
        (deal) => deal.investorId === msg.senderId && deal.id === msg.relationshipId
      );
      
      if (isFromInvestor) {
        lastInvestorMessage = msg.createdAt;
      } else if (lastInvestorMessage && msg.senderId === targetId) {
        // Founder replied to investor
        const responseTime = (msg.createdAt.getTime() - lastInvestorMessage.getTime()) / (1000 * 60 * 60);
        if (responseTime >= 0) {
          responseTimes.push(responseTime);
        }
        lastInvestorMessage = null;
      }
    }
  }

  if (responseTimes.length > 0) {
    avgResponseTimeHours = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  }

  return {
    investorsOnboarded,
    avgInvestorRating,
    updateStatus,
    dealRate,
    totalRequests: allRequests.length,
    acceptedDeals: acceptedDeals.length,
    latestUpdateDate: updates[0]?.createdAt || null,
    avgResponseTimeHours,
    totalUpdates: updates.length,
    // Rating breakdown
    ratingCount: investorRatings.length,
  };
}

/**
 * ===========================================
 * PRIVATE NOTES
 * ===========================================
 */

/**
 * Upsert private note
 */
export async function savePrivateNote(startupId: string, content: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!content.trim()) throw new Error("Note content cannot be empty");

  const result = await prisma.privateNote.upsert({
    where: {
      investorId_startupId: {
        investorId: userId,
        startupId,
      },
    },
    update: { content, updatedAt: new Date() },
    create: {
      investorId: userId,
      startupId,
      content,
    },
  });

  revalidatePath("/user/me/portfolio");
  return result;
}

/**
 * Delete private note
 */
export async function deletePrivateNote(startupId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await prisma.privateNote.delete({
    where: {
      investorId_startupId: {
        investorId: userId,
        startupId,
      },
    },
  });

  revalidatePath("/user/me/portfolio");
}

/**
 * Get private note for startup
 */
export async function getPrivateNote(startupId: string) {
  const { userId } = await auth();
  if (!userId) return null;

  return prisma.privateNote.findUnique({
    where: {
      investorId_startupId: {
        investorId: userId,
        startupId,
      },
    },
  });
}

/**
 * Get all private notes for investor
 */
export async function getPrivateNotes(investorId?: string) {
  const { userId } = await auth();
  const targetId = investorId || userId;

  if (!targetId) throw new Error("Unauthorized");

  return prisma.privateNote.findMany({
    where: { investorId: targetId },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * ===========================================
 * CHART DATA GENERATION
 * ===========================================
 */

/**
 * Portfolio Growth Data Point
 * 
 * X-axis: date (YYYY-MM-DD)
 * Y-axis: cumulative value
 * 
 * A new data point is added when:
 * - The investor makes an investment
 * - A startup they invested in posts a REVENUE update
 */
export type PortfolioGrowthDataPoint = {
  date: string;     // YYYY-MM-DD format
  value: number;    // Cumulative value (investments + revenue)
};

/**
 * Investment Distribution Data Point
 * 
 * Shows how the investor's money is split across startups
 */
export type InvestmentDistributionDataPoint = {
  name: string;     // Startup name
  value: number;    // Total amount invested
};

/**
 * Get chart data for investor portfolio performance
 * 
 * CHART 1: Portfolio Growth
 * - Tracks cumulative value over time (investments + revenue updates)
 * - Data points added on: investment made, revenue update posted
 * - Flat/step lines are OK - this is honest representation
 * 
 * CHART 2: Investment Distribution
 * - Groups investments by startup
 * - Value = total amount invested in that startup
 * 
 * @param investorId - Optional investor ID (defaults to authenticated user)
 * @returns Chart-ready JSON for Recharts/Chart.js
 */
export async function getPortfolioChartData(investorId?: string) {
  const { userId } = await auth();
  const targetId = investorId || userId;

  if (!targetId) throw new Error("Unauthorized");

  // =========================================
  // CHART 1: Portfolio Growth
  // =========================================
  
  // Fetch all investments by this investor
  const investments = await prisma.investment.findMany({
    where: { investorId: targetId },
    orderBy: { createdAt: "asc" },
  });

  // Get unique startup IDs from investments
  const investedStartupIds = investments.map((inv) => inv.startupId);

  // Fetch all REVENUE updates for startups they invested in
  const revenueUpdates = await prisma.startupUpdate.findMany({
    where: {
      startupId: { in: investedStartupIds },
      updateType: "REVENUE" as const,
    },
    orderBy: { createdAt: "asc" },
  });

  // Create timeline events from investments and revenue updates
  type TimelineEvent = {
    date: Date;
    type: "investment" | "revenue";
    amount: number;
  };

  const timelineEvents: TimelineEvent[] = [];

  // Add investment events
  for (const inv of investments) {
    timelineEvents.push({
      date: inv.createdAt,
      type: "investment",
      amount: inv.amount,
    });
  }

  // Add revenue update events
  for (const update of revenueUpdates) {
    // Parse revenue amount from content (e.g., "$10K", "$50,000", "1M")
    let revenueAmount = 0;
    const revenueMatch = update.content.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(K|M|KR|MR|B|BN)?/i);
    
    if (revenueMatch) {
      const num = parseFloat(revenueMatch[1].replace(/,/g, ""));
      const suffix = (revenueMatch[2] || "").toUpperCase();
      
      switch (suffix) {
        case "K":
        case "KR":
          revenueAmount = num * 1000;
          break;
        case "M":
        case "MR":
          revenueAmount = num * 1000000;
          break;
        case "B":
        case "BN":
          revenueAmount = num * 1000000000;
          break;
        default:
          revenueAmount = num;
      }
    }

    timelineEvents.push({
      date: update.createdAt,
      type: "revenue",
      amount: revenueAmount,
    });
  }

  // Sort all events by date
  timelineEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Build the time series with cumulative value
  const portfolioGrowth: PortfolioGrowthDataPoint[] = [];
  let cumulativeValue = 0;

  for (const event of timelineEvents) {
    // Add to cumulative value (investments add capital, revenue adds traction)
    cumulativeValue += event.amount;

    portfolioGrowth.push({
      date: event.date.toISOString().split("T")[0], // YYYY-MM-DD
      value: Math.round(cumulativeValue),
    });
  }

  // =========================================
  // CHART 2: Investment Distribution
  // =========================================

  // Group investments by startup and sum amounts
  const investmentMap = new Map<string, number>();
  
  for (const inv of investments) {
    const current = investmentMap.get(inv.startupId) || 0;
    investmentMap.set(inv.startupId, current + inv.amount);
  }

  // Build distribution array
  const investmentDistribution: InvestmentDistributionDataPoint[] = [];
  
  for (const [startupId, amount] of investmentMap) {
    investmentDistribution.push({
      name: startupId, // Will be enriched with startup name in the page component
      value: Math.round(amount),
    });
  }

  // Sort by amount descending (largest investments first)
  investmentDistribution.sort((a, b) => b.value - a.value);

  // =========================================
  // Return chart-ready JSON
  // =========================================
  return {
    portfolioGrowth,
    investmentDistribution,
  };
}

