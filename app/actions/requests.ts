"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { client } from "@/sanity/lib/client";
import { AUTHOR_BY_CLERK_ID_QUERY, STARTUP_BY_ID_QUERY } from "@/sanity/lib/queries";
import { RelationshipStatus } from "@prisma/client";

export type RequestWithDetails = {
  id: string;
  startupId: string;
  founderId: string;
  investorId: string;
  status: RelationshipStatus;
  createdAt: Date;
  startup?: {
    id: string;
    title: string;
    slug?: { current: string };
  };
  investor?: {
    _id: string;
    clerkId: string;
    name: string;
    username?: string;
    email?: string;
    image?: string;
    bio?: string;
  };
  founder?: {
    _id: string;
    clerkId: string;
    name: string;
    username?: string;
    email?: string;
    image?: string;
    bio?: string;
  };
};

/**
 * Fetch all requests for a user (both received and sent)
 */
export async function getAllRequests(userId: string): Promise<{
  received: RequestWithDetails[];
  sent: RequestWithDetails[];
  archived: RequestWithDetails[];
}> {
  if (!userId) throw new Error("Unauthorized");

  // Fetch received requests (where user is founder)
  const receivedRequests = await prisma.startupRelationship.findMany({
    where: { founderId: userId },
    orderBy: { createdAt: "desc" },
  });

  // Fetch sent requests (where user is investor)
  const sentRequests = await prisma.startupRelationship.findMany({
    where: { investorId: userId },
    orderBy: { createdAt: "desc" },
  });

  // Separate archived requests (status = CLOSED)
  const receivedArchived = receivedRequests.filter((r) => r.status === "CLOSED");
  const sentArchived = sentRequests.filter((r) => r.status === "CLOSED");

  // Active requests (not archived)
  const receivedActive = receivedRequests.filter((r) => r.status !== "CLOSED");
  const sentActive = sentRequests.filter((r) => r.status !== "CLOSED");

  // Enrich requests with startup and user details
  const enrichRequests = async (requests: typeof receivedRequests): Promise<RequestWithDetails[]> => {
    return Promise.all(
      requests.map(async (req) => {
        const [startup, investor, founder] = await Promise.all([
          client.fetch(STARTUP_BY_ID_QUERY, { id: req.startupId }),
          client.fetch(AUTHOR_BY_CLERK_ID_QUERY, { clerkId: req.investorId }),
          client.fetch(AUTHOR_BY_CLERK_ID_QUERY, { clerkId: req.founderId }),
        ]);

        return {
          ...req,
          startup,
          investor,
          founder,
        } as RequestWithDetails;
      })
    );
  };

  const [received, sent, archivedReceived, archivedSent] = await Promise.all([
    enrichRequests(receivedActive),
    enrichRequests(sentActive),
    enrichRequests(receivedArchived),
    enrichRequests(sentArchived),
  ]);

  return {
    received,
    sent,
    archived: [...archivedReceived, ...archivedSent],
  };
}

/**
 * Fetch received requests only (incoming as founder)
 */
export async function getReceivedRequests(userId: string): Promise<RequestWithDetails[]> {
  if (!userId) throw new Error("Unauthorized");

  const requests = await prisma.startupRelationship.findMany({
    where: { founderId: userId },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    requests.map(async (req) => {
      const [startup, investor] = await Promise.all([
        client.fetch(STARTUP_BY_ID_QUERY, { id: req.startupId }),
        client.fetch(AUTHOR_BY_CLERK_ID_QUERY, { clerkId: req.investorId }),
      ]);

      return {
        ...req,
        startup,
        investor,
      } as RequestWithDetails;
    })
  );
}

/**
 * Fetch sent requests only (outgoing as investor)
 */
export async function getSentRequests(userId: string): Promise<RequestWithDetails[]> {
  if (!userId) throw new Error("Unauthorized");

  const requests = await prisma.startupRelationship.findMany({
    where: { investorId: userId },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    requests.map(async (req) => {
      const [startup, founder] = await Promise.all([
        client.fetch(STARTUP_BY_ID_QUERY, { id: req.startupId }),
        client.fetch(AUTHOR_BY_CLERK_ID_QUERY, { clerkId: req.founderId }),
      ]);

      return {
        ...req,
        startup,
        founder,
      } as RequestWithDetails;
    })
  );
}

/**
 * Fetch archived requests
 */
export async function getArchivedRequests(userId: string): Promise<RequestWithDetails[]> {
  if (!userId) throw new Error("Unauthorized");

  const requests = await prisma.startupRelationship.findMany({
    where: {
      OR: [
        { founderId: userId, status: "CLOSED" },
        { investorId: userId, status: "CLOSED" },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    requests.map(async (req) => {
      const [startup, investor, founder] = await Promise.all([
        client.fetch(STARTUP_BY_ID_QUERY, { id: req.startupId }),
        client.fetch(AUTHOR_BY_CLERK_ID_QUERY, { clerkId: req.investorId }),
        client.fetch(AUTHOR_BY_CLERK_ID_QUERY, { clerkId: req.founderId }),
      ]);

      return {
        ...req,
        startup,
        investor,
        founder,
      } as RequestWithDetails;
    })
  );
}

