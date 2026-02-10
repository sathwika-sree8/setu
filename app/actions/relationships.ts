"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

/* ---------------- INVESTOR: SEND REQUEST ---------------- */
export async function sendRequest(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const startupId = formData.get("startupId") as string;
  const founderId = formData.get("founderId") as string;

  if (!startupId || !founderId) {
    throw new Error("Missing data");
  }

  if (userId === founderId) {
    throw new Error("Founder cannot invest in own startup");
  }

  const existing = await prisma.startupRelationship.findUnique({
    where: {
      startupId_investorId: {
        startupId,
        investorId: userId,
      },
    },
  });

  if (existing) return { alreadyExists: true };

  await prisma.startupRelationship.create({
    data: {
      startupId,
      founderId,
      investorId: userId,
      status: "PENDING",
    },
  });

  return { success: true };
}

/* ---------------- FOUNDER: ACCEPT ---------------- */
export async function acceptRequest(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const id = formData.get("relationshipId") as string;

  const rel = await prisma.startupRelationship.findUnique({
    where: { id },
  });

  if (!rel || rel.founderId !== userId) {
    throw new Error("Not allowed");
  }

  if (rel.status !== "PENDING") {
    throw new Error("Invalid state");
  }

  await prisma.startupRelationship.update({
    where: { id },
    data: { status: "IN_DISCUSSION" },
  });
}

/* ---------------- FOUNDER: REJECT ---------------- */
export async function rejectRequest(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const id = formData.get("relationshipId") as string;

  const rel = await prisma.startupRelationship.findUnique({
    where: { id },
  });

  if (!rel || rel.founderId !== userId) {
    throw new Error("Not allowed");
  }

  await prisma.startupRelationship.update({
    where: { id },
    data: { status: "DEAL_REJECTED" },
  });
}

/* ---------------- FETCH FOR FOUNDER ---------------- */
export async function getFounderRequests() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return prisma.startupRelationship.findMany({
    where: { founderId: userId },
    orderBy: { createdAt: "desc" },
  });
}

/* ---------------- FETCH FOR INVESTOR ---------------- */
export async function getInvestorRequests() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return prisma.startupRelationship.findMany({
    where: { investorId: userId },
    orderBy: { createdAt: "desc" },
  });
}
