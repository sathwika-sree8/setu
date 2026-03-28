"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { calculateDilution, calculateIrr, calculateMoic, calculateOwnership, calculateStakeValue, calculateValuationGrowth, deriveStartupStatus, generateStartupAlerts } from "@/lib/finance";
import { revalidatePath } from "next/cache";
import { client } from "@/sanity/lib/client";
import { STARTUP_BY_ID_QUERY } from "@/sanity/lib/queries";

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

  const [userRecord, founderRatings] = await Promise.all([
    prisma.user.findUnique({
      where: { clerkId: targetId },
      select: { id: true },
    }),
    prisma.rating.findMany({
      where: {
        raterId: targetId,
        ratedRole: "FOUNDER",
      },
    }),
  ]);

  const investorIds = userRecord?.id && userRecord.id !== targetId ? [targetId, userRecord.id] : [targetId];

  const investments = await prisma.investment.findMany({
    where: { investorId: { in: investorIds } },
    include: {
      startup: {
        include: {
          monthlyUpdates: {
            orderBy: { createdAt: "desc" },
            take: 2,
          },
          fundingRounds: {
            orderBy: { date: "desc" },
          },
          investments: {
            select: {
              investorId: true,
              shares: true,
              amount: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get all accepted relationships to filter investments
  const acceptedRelationships = await prisma.startupRelationship.findMany({
    where: {
      investorId: { in: investorIds },
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
  const today = new Date();
  const startupIdsNeedingNames = Array.from(
    new Set(
      investments
        .filter(
          (investment) =>
            !investment.startup?.name ||
            investment.startup.name === "Unknown Startup" ||
            investment.startup.name === "Untitled Startup",
        )
        .map((investment) => investment.startupId),
    ),
  );

  const sanityStartupNameEntries = await Promise.all(
    startupIdsNeedingNames.map(async (startupId) => {
      const startupDoc = await client.fetch<{
        title?: string | null;
      } | null>(STARTUP_BY_ID_QUERY, { id: startupId });

      return [startupId, startupDoc?.title ?? null] as const;
    }),
  );

  const sanityStartupNames = new Map(sanityStartupNameEntries);

  const investmentsByStartup = new Map<
    string,
    typeof investments
  >();

  for (const investment of investments) {
    const existing = investmentsByStartup.get(investment.startupId) ?? [];
    existing.push(investment);
    investmentsByStartup.set(investment.startupId, existing);
  }

  const startupCards = Array.from(investmentsByStartup.entries()).map(
    ([startupId, startupInvestments]) => {
      const primaryInvestment = startupInvestments[0];
      const startup = primaryInvestment.startup;
      const latestUpdate = startup?.monthlyUpdates?.[0];
      const previousUpdate = startup?.monthlyUpdates?.[1];
      const latestRound = startup?.fundingRounds?.[0];
      const previousRound = startup?.fundingRounds?.[1];
      const totalShares = startup?.totalShares ?? 0;
      const rawSharesOwned = startupInvestments.reduce(
        (sum, investment) => sum + (investment.shares ?? 0),
        0,
      );
      const equityFallback = startupInvestments.reduce(
        (sum, investment) => sum + ((investment.equity ?? 0) / 100),
        0,
      );
      const ownership =
        rawSharesOwned > 0 && totalShares > 0
          ? rawSharesOwned / totalShares
          : equityFallback;
      const estimatedSharesOwned =
        rawSharesOwned > 0
          ? rawSharesOwned
          : ownership > 0 && totalShares > 0
            ? ownership * totalShares
            : 0;
      const entryValuationCandidates = startupInvestments
        .map((investment) => {
          const explicitValuation =
            investment.entryValuation ??
            investment.postMoneyValuation ??
            investment.preMoneyValuation ??
            null;

          if (explicitValuation != null && explicitValuation > 0) {
            return explicitValuation;
          }

          if (investment.equity != null && investment.equity > 0) {
            return investment.amount / (investment.equity / 100);
          }

          return null;
        })
        .filter((value): value is number => value != null && value > 0);
      const blendedEntryValuation =
        entryValuationCandidates.length > 0
          ? entryValuationCandidates.reduce((sum, value) => sum + value, 0) /
            entryValuationCandidates.length
          : 0;
      const valuation =
        startup?.currentValuation ??
        latestUpdate?.valuation ??
        latestRound?.valuation ??
        primaryInvestment.postMoneyValuation ??
        primaryInvestment.preMoneyValuation ??
        primaryInvestment.entryValuation ??
        (blendedEntryValuation > 0 ? blendedEntryValuation : null);
      const stakeValue = calculateStakeValue(ownership, valuation);
      const amountInvested = startupInvestments.reduce(
        (sum, investment) => sum + investment.amount,
        0,
      );
      const unrealizedGain = stakeValue - amountInvested;
      const valuationGrowth = calculateValuationGrowth(
        valuation,
        previousRound?.valuation ?? blendedEntryValuation ?? null,
      );
      const dilution = calculateDilution({
        sharesOwned: estimatedSharesOwned,
        totalShares: startup?.totalShares,
        latestRoundSharesIssued: latestRound?.sharesIssued,
      });
      const hasOperationalMetrics =
        latestUpdate != null ||
        startup?.currentRevenue != null ||
        startup?.currentGrowthRate != null ||
        startup?.currentBurnRate != null ||
        startup?.currentRunway != null;
      const alerts = hasOperationalMetrics
        ? generateStartupAlerts({
            runway: latestUpdate?.runway ?? startup?.currentRunway ?? 0,
            growthRate:
              latestUpdate?.growthRate ??
              previousUpdate?.growthRate ??
              startup?.currentGrowthRate ??
              0,
            lastUpdatedAt: startup?.lastUpdatedAt ?? latestUpdate?.createdAt,
            now: today,
          })
        : [{ label: "Inactive" as const, severity: "yellow" as const }];

      const startupName =
        startup?.name &&
        startup.name !== "Unknown Startup" &&
        startup.name !== "Untitled Startup"
          ? startup.name
          : sanityStartupNames.get(startupId) ?? "Unknown Startup";
      const hasCapTable = totalShares > 0;

      return {
        startupId,
        startupName,
        revenue: latestUpdate?.revenue ?? startup?.currentRevenue ?? 0,
        growthRate:
          latestUpdate?.growthRate ??
          previousUpdate?.growthRate ??
          startup?.currentGrowthRate ??
          0,
        burnRate: latestUpdate?.burnRate ?? startup?.currentBurnRate ?? 0,
        runway: latestUpdate?.runway ?? startup?.currentRunway ?? 0,
        ownership,
        sharesOwned: estimatedSharesOwned,
        stakeValue,
        currentValuation: valuation ?? 0,
        entryValuation: blendedEntryValuation,
        unrealizedGain,
        valuationGrowth,
        dilution,
        hasCapTable,
        hasOperationalMetrics,
        lastUpdate:
          startup?.lastUpdatedAt ??
          latestUpdate?.createdAt ??
          primaryInvestment.createdAt,
        status: deriveStartupStatus(alerts),
        alerts,
        investmentId: primaryInvestment.id,
        amountInvested,
        round: primaryInvestment.round,
        investmentDate: startupInvestments.reduce(
          (earliest, investment) =>
            investment.createdAt < earliest ? investment.createdAt : earliest,
          primaryInvestment.createdAt,
        ),
        latestFundingRound: latestRound
          ? {
              name: latestRound.name,
              date: latestRound.date,
              valuation: latestRound.valuation,
              investmentAmount: latestRound.investmentAmount,
              sharesIssued: latestRound.sharesIssued,
            }
          : null,
        fundingRounds: (startup?.fundingRounds ?? []).map((round) => ({
          name: round.name,
          date: round.date,
          valuation: round.valuation,
          investmentAmount: round.investmentAmount,
          sharesIssued: round.sharesIssued,
        })),
        capTable: (() => {
          const allInvestments = startup?.investments ?? [];
          const knownInvestorShares = allInvestments.reduce(
            (sum, row) => sum + (row.shares ?? 0),
            0,
          );
          const effectiveKnownInvestorShares = Math.max(
            knownInvestorShares,
            estimatedSharesOwned,
          );
          const otherInvestorShares = Math.max(
            0,
            effectiveKnownInvestorShares - estimatedSharesOwned,
          );
          const founderTeamShares = Math.max(0, totalShares - effectiveKnownInvestorShares);

          return [
            {
              name: "Founder / Team",
              shares: founderTeamShares,
              ownership: totalShares > 0 ? founderTeamShares / totalShares : 0,
            },
            {
              name: "You",
              shares: estimatedSharesOwned,
              ownership,
            },
            {
              name: "Others",
              shares: otherInvestorShares,
              ownership: totalShares > 0 ? otherInvestorShares / totalShares : 0,
            },
          ];
        })(),
      };
    },
  );

  const portfolioValue = startupCards.reduce((sum, startup) => sum + startup.stakeValue, 0);
  const unrealizedGains = startupCards.reduce((sum, startup) => sum + startup.unrealizedGain, 0);
  const moic = calculateMoic(portfolioValue, totalInvested);
  const irrCashflows = [
    ...investments.map((investment) => ({
      amount: -investment.amount,
      date: investment.createdAt,
    })),
    ...(portfolioValue > 0
      ? [
          {
            amount: portfolioValue,
            date: today,
          },
        ]
      : []),
  ];
  const irr = calculateIrr(irrCashflows);
  const avgFounderRating =
    founderRatings.length > 0
      ? founderRatings.reduce((sum, r) => sum + r.score, 0) / founderRatings.length
      : null;

  return {
    totalInvested,
    activeInvestments,
    totalStartups: new Set(investments.map((investment) => investment.startupId)).size,
    portfolioValue,
    unrealizedGains,
    moic,
    irr,
    averageFounderRating: avgFounderRating,
    investmentCount: investments.length,
    ratingsCount: founderRatings.length,
    investments,
    acceptedStartupIds: Array.from(acceptedStartupIds),
    startupCards,
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
  
  const investments = await prisma.investment.findMany({
    where: { investorId: targetId },
    include: {
      startup: {
        select: {
          currentValuation: true,
          totalShares: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Create timeline events from investments and revenue updates
  type TimelineEvent = {
    date: Date;
    type: "investment" | "valuation";
    amount: number;
  };

  const timelineEvents: TimelineEvent[] = [];

  for (const inv of investments) {
    timelineEvents.push({
      date: inv.createdAt,
      type: "investment",
      amount: inv.amount,
    });

    const ownership = calculateOwnership({
      investorShares: inv.shares,
      totalShares: inv.startup?.totalShares,
      equityPercent: inv.equity,
    });
    const stakeValue = calculateStakeValue(ownership, inv.startup?.currentValuation);
    if (stakeValue > 0) {
      timelineEvents.push({
        date: new Date(),
        type: "valuation",
        amount: stakeValue,
      });
    }
  }

  // Sort all events by date
  timelineEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Build the time series with cumulative value
  const portfolioGrowth: PortfolioGrowthDataPoint[] = [];
  let cumulativeValue = 0;

  for (const event of timelineEvents) {
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

