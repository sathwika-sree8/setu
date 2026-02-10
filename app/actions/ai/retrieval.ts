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

export async function getUserInvestments(investorId: string) {
  return prisma.investment.findMany({
    where: {
      investorId,
    },
  });
}

