import { prisma } from "@/lib/prisma";

export async function getLatestRevenue(startupId: string) {
  return prisma.startupUpdate.findFirst({
    where: { startupId, updateType: "REVENUE" },
    orderBy: { createdAt: "desc" },
  });
}

export async function getStartupUpdates(startupId: string, isInvestor: boolean) {
  return prisma.startupUpdate.findMany({
    where: {
      startupId,
      ...(isInvestor ? {} : { visibility: "PUBLIC" }),
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}

// Fetch all investments for a user, optionally filtered to a specific startup.
// Includes the related startup so the AI can describe it.
export async function getUserInvestments(investorId: string, startupId?: string) {
  return prisma.investment.findMany({
    where: {
      investorId,
      ...(startupId ? { startupId } : {}),
    },
    include: {
      startup: true,
    },
  });
}

// Summary metrics for an investor's portfolio, used to give the chatbot
// richer, data-backed answers about "my investments".
export async function getInvestorSummary(investorId: string) {
  const investments = await prisma.investment.findMany({
    where: { investorId },
  });

  const totalInvested = investments.reduce(
    (sum, inv) => sum + (inv.amount || 0),
    0
  );

  const activeInvestments = await prisma.startupRelationship.count({
    where: {
      investorId,
      status: "DEAL_ACCEPTED",
    },
  });

  return {
    totalInvested,
    activeInvestments,
    investmentCount: investments.length,
  };
}

export async function getAllStartups() {
  return prisma.startup.findMany({
    orderBy: { createdAt: "desc" },
  });
}

// Fetch a single startup's core details for startup-specific questions.
export async function getStartupById(startupId: string) {
  return prisma.startup.findUnique({
    where: { id: startupId },
  });
}


