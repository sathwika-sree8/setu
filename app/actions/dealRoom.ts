"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

/**
 * ===========================================
 * REQUEST LIFECYCLE STATE MACHINE
 * ===========================================
 * PENDING         → request sent, waiting for founder response
 * IN_DISCUSSION   → founder accepted request, chat enabled
 * DEAL_ACCEPTED   → investment confirmed, investor added to startup
 * DEAL_REJECTED   → founder explicitly rejected deal
 * CLOSED          → archived, no further action needed
 * ===========================================
 */

/**
 * STEP 1: INVESTOR REQUESTS DEAL ROOM
 * Creates a new request in PENDING state
 */
export async function requestDealRoom(startupId: string, founderId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized: Please sign in to invest");

  if (!startupId || !founderId) {
    throw new Error("Missing startup information. Please try again.");
  }

  // Prevent founder from investing in own startup
  if (founderId === userId) {
    throw new Error("Founders cannot invest in their own startup");
  }

  // Prevent duplicate requests
  const existing = await prisma.startupRelationship.findUnique({
    where: {
      startupId_investorId: {
        startupId,
        investorId: userId,
      },
    },
  });

  if (existing) {
    revalidatePath("/");
    revalidatePath(`/startup/${startupId}`);
    
    // If already has a relationship, return info
    if (existing.status === "PENDING") {
      return { ...existing, alreadyExists: true, message: "Investment request already sent" };
    }
    if (existing.status === "IN_DISCUSSION") {
      return { ...existing, alreadyExists: true, message: "Already connected with this startup" };
    }
    if (existing.status === "DEAL_ACCEPTED") {
      return { ...existing, alreadyExists: true, message: "Already an investor in this startup" };
    }
    return { ...existing, alreadyExists: true };
  }

  const result = await prisma.startupRelationship.create({
    data: {
      startupId,
      founderId,
      investorId: userId,
      status: "PENDING",
    },
  });

  revalidatePath("/");
  revalidatePath(`/startup/${startupId}`);
  
  return { ...result, created: true };
}

/**
 * STEP 2A: FOUNDER ACCEPTS REQUEST FOR DISCUSSION
 * PENDING → IN_DISCUSSION
 * Enables chat between founder and investor
 */
export async function acceptForDiscussion(formData: FormData) {
  "use server";
  const session = await auth();
  const userId = session.userId;
  if (!userId) throw new Error("Unauthorized");

  const relationshipId = formData.get("relationshipId") as string;
  if (!relationshipId) throw new Error("Missing relationshipId");
  
  const relationship = await prisma.startupRelationship.findUnique({
    where: { id: relationshipId },
  });
  if (!relationship) throw new Error("Relationship not found");

  if (relationship.founderId !== userId) {
    throw new Error("Not authorized to accept this request");
  }

  if (relationship.status !== "PENDING") {
    throw new Error(`Cannot accept request in ${relationship.status} state`);
  }

  // Move to IN_DISCUSSION - chat enabled
  await prisma.startupRelationship.update({
    where: { id: relationshipId },
    data: { status: "IN_DISCUSSION" },
  });

  revalidatePath("/user/me/requests/incoming");
  revalidatePath("/user/me/requests");
  revalidatePath("/");
}

/**
 * STEP 2B: FOUNDER REJECTS REQUEST
 * PENDING → DEAL_REJECTED
 */
export async function rejectRequest(formData: FormData) {
  "use server";
  const session = await auth();
  const userId = session.userId;
  if (!userId) throw new Error("Unauthorized");

  const relationshipId = formData.get("relationshipId") as string;
  if (!relationshipId) throw new Error("Missing relationshipId");
  
  const relationship = await prisma.startupRelationship.findUnique({
    where: { id: relationshipId },
  });
  if (!relationship) throw new Error("Relationship not found");

  if (relationship.founderId !== userId) {
    throw new Error("Not authorized to reject this request");
  }

  if (!["PENDING", "IN_DISCUSSION"].includes(relationship.status)) {
    throw new Error(`Cannot reject deal in ${relationship.status} state`);
  }

  await prisma.startupRelationship.update({
    where: { id: relationshipId },
    data: { status: "DEAL_REJECTED" },
  });

  revalidatePath("/user/me/requests/incoming");
  revalidatePath("/user/me/requests");
  revalidatePath("/");
}

/**
 * STEP 3: FOUNDER ACCEPTS DEAL
 * IN_DISCUSSION → DEAL_ACCEPTED
 * Creates investment record, adds investor to startup
 */
export async function acceptDeal(
  relationshipId: string,
  investmentAmount?: number,
  equity?: number,
  termsUrl?: string,
  dealStage?: "PRE_SEED" | "SEED" | "SERIES_A" | "SERIES_B" | "SERIES_C" | "LATE" | "IPO",
  investmentType?: "SAFE" | "CONVERTIBLE_NOTE" | "EQUITY" | "DIRECT_INVESTMENT"
) {
  const session = await auth();
  const userId = session.userId;
  if (!userId) throw new Error("Unauthorized");

  if (!relationshipId) throw new Error("Missing relationshipId");
  
  const relationship = await prisma.startupRelationship.findUnique({
    where: { id: relationshipId },
  });
  if (!relationship) throw new Error("Relationship not found");

  if (relationship.founderId !== userId) {
    throw new Error("Not authorized to accept deal");
  }

  if (relationship.status !== "IN_DISCUSSION") {
    throw new Error(`Cannot accept deal in ${relationship.status} state`);
  }

  if (!investmentAmount || investmentAmount <= 0) {
    throw new Error("Investment amount is required");
  }

  // Update relationship status
  await prisma.startupRelationship.update({
    where: { id: relationshipId },
    data: { status: "DEAL_ACCEPTED" },
  });

  // Create investor startup record
  await prisma.investment.create({
    data: {
      startupId: relationship.startupId,
      investorId: relationship.investorId,
      amount: investmentAmount,
      equity: equity,
      termsUrl: termsUrl,
      // Provide sensible defaults for required enums in the current schema
      dealStage: dealStage ?? "PRE_SEED",
      investmentType: investmentType ?? "DIRECT_INVESTMENT",
      notes: undefined,
    },
  });

  revalidatePath("/user/me/requests/incoming");
  revalidatePath("/user/me/requests");
  revalidatePath("/user/me/portfolio");
  revalidatePath(`/startup/${relationship.startupId}`);
  revalidatePath("/");

  return { success: true, message: "Deal accepted successfully" };
}

/**
 * STEP 4: INVESTOR WITHDRAWS REQUEST
 * PENDING → CLOSED
 */
export async function withdrawRequest(formData: FormData) {
  "use server";
  const session = await auth();
  const userId = session.userId;
  if (!userId) throw new Error("Unauthorized");

  const relationshipId = formData.get("relationshipId") as string;
  if (!relationshipId) throw new Error("Missing relationshipId");
  
  const relationship = await prisma.startupRelationship.findUnique({
    where: { id: relationshipId },
  });
  if (!relationship) throw new Error("Relationship not found");

  if (relationship.investorId !== userId) {
    throw new Error("Not authorized to withdraw this request");
  }

  if (relationship.status !== "PENDING") {
    throw new Error(`Cannot withdraw request in ${relationship.status} state`);
  }

  await prisma.startupRelationship.update({
    where: { id: relationshipId },
    data: { status: "CLOSED" },
  });

  revalidatePath("/user/me/requests/sent");
  revalidatePath("/user/me/requests");
  revalidatePath("/");
}

/**
 * STEP 5: ARCHIVE REQUEST
 * Any state → CLOSED
 * Used to clean up old requests
 */
export async function archiveRequest(formData: FormData) {
  "use server";
  const session = await auth();
  const userId = session.userId;
  if (!userId) throw new Error("Unauthorized");

  const relationshipId = formData.get("relationshipId") as string;
  if (!relationshipId) throw new Error("Missing relationshipId");
  
  const relationship = await prisma.startupRelationship.findUnique({
    where: { id: relationshipId },
  });
  if (!relationship) throw new Error("Relationship not found");

  // Both founder and investor can archive
  const isParticipant = 
    relationship.founderId === userId || 
    relationship.investorId === userId;
  
  if (!isParticipant) {
    throw new Error("Not authorized to archive this request");
  }

  await prisma.startupRelationship.update({
    where: { id: relationshipId },
    data: { status: "CLOSED" },
  });

  revalidatePath("/user/me/requests");
  revalidatePath("/");
}

/**
 * SEND MESSAGE — WORKS IN IN_DISCUSSION AND DEAL_ACCEPTED STATES
 */
export async function sendMessage(
  relationshipId: string,
  content: string
) {
  const session = await auth();
  const userId = session.userId;
  if (!userId) throw new Error("Unauthorized");

  if (!content.trim()) throw new Error("Empty message");

  const relationship = await prisma.startupRelationship.findUnique({
    where: { id: relationshipId },
  });

  if (!relationship) throw new Error("Not found");

  // Chat is available in IN_DISCussion and DEAL_ACCEPTED
  if (!["IN_DISCUSSION", "DEAL_ACCEPTED"].includes(relationship.status)) {
    throw new Error("Chat not available in current state");
  }

  if (
    relationship.founderId !== userId &&
    relationship.investorId !== userId
  ) {
    throw new Error("Not authorized");
  }

  return prisma.message.create({
    data: {
      relationshipId,
      senderId: userId,
      content,
    },
  });
}

/**
 * SEND MESSAGE FORM
 */
export async function sendMessageForm(formData: FormData) {
  const relationshipId = formData.get("relationshipId") as string;
  const content = formData.get("content") as string;
  await sendMessage(relationshipId, content);
}

/**
 * FORM ACTION: Accept deal via form POST
 * Expects fields: relationshipId, investmentAmount, equity, termsUrl, dealStage, investmentType
 */
export async function acceptDealForm(formData: FormData) {
  const relationshipId = formData.get("relationshipId") as string;
  const investmentAmountRaw = formData.get("investmentAmount");
  const equityRaw = formData.get("equity");
  const termsUrl = (formData.get("termsUrl") as string) || undefined;
  const dealStage = (formData.get("dealStage") as string) || undefined;
  const investmentType = (formData.get("investmentType") as string) || undefined;

  const investmentAmount = investmentAmountRaw ? Number(investmentAmountRaw) : undefined;
  const equity = equityRaw ? Number(equityRaw) : undefined;

  return acceptDeal(
    relationshipId,
    investmentAmount,
    equity,
    termsUrl,
    dealStage as any,
    investmentType as any
  );
}

/**
 * FORM ACTION: Reject a deal in discussion
 * Expects field: relationshipId
 */
export async function rejectDeal(formData: FormData) {
  const relationshipId = formData.get("relationshipId") as string;
  if (!relationshipId) throw new Error("Missing relationshipId");

  const relationship = await prisma.startupRelationship.findUnique({ where: { id: relationshipId } });
  if (!relationship) throw new Error("Relationship not found");

  const session = await auth();
  const userId = session.userId;
  if (!userId) throw new Error("Unauthorized");

  if (relationship.founderId !== userId) {
    throw new Error("Not authorized to reject this deal");
  }

  if (relationship.status !== "IN_DISCUSSION") {
    throw new Error(`Cannot reject deal in ${relationship.status} state`);
  }

  await prisma.startupRelationship.update({ where: { id: relationshipId }, data: { status: "DEAL_REJECTED" } });

  revalidatePath("/user/me/requests/incoming");
  revalidatePath("/user/me/requests");
  revalidatePath("/");

  return { success: true };
}

/**
 * ===========================================
 * DEPRECATED: Use portfolio.ts actions instead
 * ===========================================
 */

/**
 * ===========================================
 * RATING ACTIONS
 * ===========================================
 */

/**
 * Submit a rating after deal completion
 * 
 * RULES:
 * - Investors can ONLY rate founders they've invested in (have Investment record)
 * - Founders can ONLY rate investors who invested (have Investment record)
 * - Rater must participate in discussion before rating
 */
export async function submitRating(
  ratedUserId: string,
  ratedRole: "FOUNDER" | "INVESTOR",
  startupId: string,
  score: number,
  feedback?: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (score < 1 || score > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  // Check if relationship exists and is DEAL_ACCEPTED
  const relationship = await prisma.startupRelationship.findFirst({
    where: {
      OR: [
        { founderId: userId, investorId: ratedUserId },
        { investorId: userId, founderId: ratedUserId },
      ],
      startupId,
      status: "DEAL_ACCEPTED",
    },
  });

  if (!relationship) {
    throw new Error("No accepted deal relationship found");
  }

  const isRaterFounder = relationship.founderId === userId;
  const isRaterInvestor = relationship.investorId === userId;

  if (ratedRole === "FOUNDER" && !isRaterInvestor) {
    throw new Error("Only investors can rate founders");
  }

  if (ratedRole === "INVESTOR" && !isRaterFounder) {
    throw new Error("Only founders can rate investors");
  }

  // ✅ CRITICAL: Verify investment exists
  // Investors can only rate founders they've invested in
  // Founders can only rate investors who invested
  if (ratedRole === "FOUNDER" && isRaterInvestor) {
    const investment = await prisma.investment.findFirst({
      where: {
        investorId: userId,
        startupId: startupId,
      },
    });
    if (!investment) {
      throw new Error("You can only rate founders you've invested in");
    }
  }

  if (ratedRole === "INVESTOR" && isRaterFounder) {
    const investment = await prisma.investment.findFirst({
      where: {
        investorId: ratedUserId,
        startupId: startupId,
      },
    });
    if (!investment) {
      throw new Error("This investor hasn't invested in your startup");
    }
  }

  // Require the rater to have participated in the discussion
  const hasDiscussionMessage = await prisma.message.findFirst({
    where: {
      relationshipId: relationship.id,
      senderId: userId,
    },
    select: { id: true },
  });

  if (!hasDiscussionMessage) {
    throw new Error("Please participate in the discussion before rating");
  }

  return prisma.rating.upsert({
    where: {
      raterId_ratedUserId_startupId: {
        raterId: userId,
        ratedUserId,
        startupId,
      },
    },
    update: {
      score,
      feedback,
      createdAt: new Date(),
    },
    create: {
      raterId: userId,
      ratedUserId,
      ratedRole,
      startupId,
      score,
      feedback,
    },
  });
}

/**
 * ===========================================
 * PRIVATE NOTES (DEPRECATED - use portfolio.ts)
 * ===========================================
 */

