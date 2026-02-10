"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

interface RawRequest {
  id: string;
  startupId: string;
  founderId: string;
  investorId: string;
  status: string;
  createdAt: Date;
}

/**
 * Get founder's investment requests
 */
export async function getFounderRequests(founderId: string): Promise<RawRequest[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  
  // Verify the founderId matches the authenticated user
  if (founderId !== userId) {
    throw new Error("Unauthorized access to requests");
  }

  return prisma.startupRelationship.findMany({
    where: { founderId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
}

