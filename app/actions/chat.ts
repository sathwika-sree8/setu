"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { ChatListItem, Message } from "@/lib/types/chat";
import { client } from "@/sanity/lib/client";
import { AUTHOR_BY_CLERK_ID_QUERY, STARTUP_BY_ID_QUERY } from "@/sanity/lib/queries";
import { revalidatePath } from "next/cache";

/**
 * Fetch all accepted chat relationships for the current user
 * Returns chat list with last message and unread count
 */
export async function getMyChats(): Promise<{
  chats: ChatListItem[];
  totalUnread: number;
}> {
  const { userId } = await auth();
  if (!userId) {
    return { chats: [], totalUnread: 0 };
  }

  try {
    // Fetch all relationships where user is founder or investor and status allows chat
    // Chat is available in: IN_DISCUSSION and DEAL_ACCEPTED states
    const relationships = await prisma.startupRelationship.findMany({
      where: {
        OR: [
          { founderId: userId, status: { in: ["IN_DISCUSSION", "DEAL_ACCEPTED"] } },
          { investorId: userId, status: { in: ["IN_DISCUSSION", "DEAL_ACCEPTED"] } },
        ],
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    // Calculate unread counts and enrich with user/startup data
    const enrichedChats: ChatListItem[] = await Promise.all(
      relationships.map(async (rel) => {
        // Get the other participant's ID
        const isFounder = rel.founderId === userId;
        const otherUserId = isFounder ? rel.investorId : rel.founderId;

        // Fetch participant details from Sanity
        const participant = await client.fetch(AUTHOR_BY_CLERK_ID_QUERY, {
          clerkId: otherUserId,
        });

        // Fetch startup details from Sanity
        const startup = await client.fetch(STARTUP_BY_ID_QUERY, {
          id: rel.startupId,
        });

        // Count unread messages from the other user
        const unreadCount = await prisma.message.count({
          where: {
            relationshipId: rel.id,
            senderId: otherUserId,
            read: false,
          },
        });

        const lastMessage = rel.messages[0] || null;

        return {
          id: rel.id,
          relationshipId: rel.id,
          participantId: otherUserId,
          participantName: participant?.name || "Unknown User",
          participantImage: participant?.image || undefined,
          startupName: startup?.title || "Unknown Startup",
          startupSlug: startup?.slug?.current,
          lastMessage: lastMessage?.content,
          lastMessageAt: lastMessage?.createdAt || rel.createdAt,
          unreadCount,
        };
      })
    );

    // Sort by last message time
    enrichedChats.sort((a, b) => {
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    const totalUnread = enrichedChats.reduce((sum, chat) => sum + chat.unreadCount, 0);

    return { chats: enrichedChats, totalUnread };
  } catch (error) {
    console.error("Error fetching chats:", error);
    return { chats: [], totalUnread: 0 };
  }
}

/**
 * Fetch messages for a specific relationship
 */
   export async function getMessages(relationshipId: string): Promise<{
  messages: Message[];
  relationship: {
    id: string;
    startupId: string;
    founderId: string;
    investorId: string;
    status: string;
  } | null;
}> {
  const { userId } = await auth();
  if (!userId) {
    return { messages: [], relationship: null };
  }

  try {
    const relationship = await prisma.startupRelationship.findUnique({
      where: { id: relationshipId },
    });

    if (!relationship) {
      return { messages: [], relationship: null };
    }

    // Check access permissions
    const isParticipant =
      relationship.founderId === userId || relationship.investorId === userId;

    if (!isParticipant) {
      return { messages: [], relationship: null };
    }

    const messages = await prisma.message.findMany({
      where: { relationshipId },
      orderBy: { createdAt: "asc" },
    });

    // Transform messages to include optional read field
    const transformedMessages: Message[] = messages.map((msg) => ({
      id: msg.id,
      relationshipId: msg.relationshipId,
      senderId: msg.senderId,
      content: msg.content,
      read: (msg as { read?: boolean }).read ?? false,
      createdAt: msg.createdAt,
    }));

    return {
      messages: transformedMessages,
      relationship: {
        id: relationship.id,
        startupId: relationship.startupId,
        founderId: relationship.founderId,
        investorId: relationship.investorId,
        status: relationship.status,
      },
    };
  } catch (error) {
    console.error("Error fetching messages:", error);
    return { messages: [], relationship: null };
  }
}

/**
 * Send a new message
 */
export async function sendMessage(
  relationshipId: string,
  content: string
): Promise<Message | { error: string }> {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  if (!content.trim()) {
    return { error: "Message cannot be empty" };
  }

  try {
    const relationship = await prisma.startupRelationship.findUnique({
      where: { id: relationshipId },
    });

    if (!relationship) {
      return { error: "Relationship not found" };
    }

    // Check if chat is enabled (IN_DISCUSSION or DEAL_ACCEPTED states)
    if (!["IN_DISCUSSION", "DEAL_ACCEPTED"].includes(relationship.status)) {
      return { error: "Chat is not available in current state" };
    }

    // Check access permissions
    const isParticipant =
      relationship.founderId === userId || relationship.investorId === userId;

    if (!isParticipant) {
      return { error: "Not authorized to send messages in this chat" };
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        relationshipId,
        senderId: userId,
        content: content.trim(),
        read: false,
      },
    });

    // Update the relationship's timestamp to reflect new activity
    await prisma.startupRelationship.update({
      where: { id: relationshipId },
      data: { createdAt: new Date() },
    });

    revalidatePath(`/deal-room/${relationshipId}`);
    revalidatePath("/");

    return {
      id: message.id,
      relationshipId: message.relationshipId,
      senderId: message.senderId,
      content: message.content,
      read: false,
      createdAt: message.createdAt,
    };
  } catch (error) {
    console.error("Error sending message:", error);
    return { error: "Failed to send message" };
  }
}

/**
 * Mark all messages in a relationship as read
 */
export async function markMessagesAsRead(relationshipId: string): Promise<{ success: boolean }> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false };
  }

  try {
    const relationship = await prisma.startupRelationship.findUnique({
      where: { id: relationshipId },
    });

    if (!relationship) {
      return { success: false };
    }

    // Check access permissions
    const isParticipant =
      relationship.founderId === userId || relationship.investorId === userId;

    if (!isParticipant) {
      return { success: false };
    }

    // Mark unread messages from the other user as read
    await prisma.message.updateMany({
      where: {
        relationshipId,
        senderId: { not: userId },
        read: false,
      },
      data: { read: true },
    });

    revalidatePath(`/deal-room/${relationshipId}`);
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return { success: false };
  }
}

/**
 * Get total unread message count across all chats
 */
export async function getUnreadCount(): Promise<number> {
  const { userId } = await auth();
  if (!userId) {
    return 0;
  }

  try {
    // Find all relationships where user is a participant with chat enabled
    const relationships = await prisma.startupRelationship.findMany({
      where: {
        OR: [
          { founderId: userId, status: { in: ["IN_DISCUSSION", "DEAL_ACCEPTED"] } },
          { investorId: userId, status: { in: ["IN_DISCUSSION", "DEAL_ACCEPTED"] } },
        ],
      },
      select: { id: true },
    });

    const relationshipIds = relationships.map((r) => r.id);

    if (relationshipIds.length === 0) {
      return 0;
    }

    // Count unread messages from other users
    const unreadCount = await prisma.message.count({
      where: {
        relationshipId: { in: relationshipIds },
        senderId: { not: userId },
        read: false,
      },
    });

    return unreadCount;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
}

/**
 * Check if user has any active chats
 */
export async function hasActiveChats(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) {
    return false;
  }

  try {
    const count = await prisma.startupRelationship.count({
      where: {
        OR: [
          { founderId: userId, status: { in: ["IN_DISCUSSION", "DEAL_ACCEPTED"] } },
          { investorId: userId, status: { in: ["IN_DISCUSSION", "DEAL_ACCEPTED"] } },
        ],
      },
    });

    return count > 0;
  } catch (error) {
    console.error("Error checking active chats:", error);
    return false;
  }
}

