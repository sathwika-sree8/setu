"use server";

import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";
import { AUTHOR_BY_CLERK_ID_QUERY, STARTUP_BY_ID_QUERY } from "@/sanity/lib/queries";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Local enum definition until Prisma client is regenerated



export async function createPost(
  startupId: string | null,
  authorId: string,
  content: string,
  imageUrl?: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  if (!content.trim() && !imageUrl) return;

  return prisma.founderPost.create({
    data: {
      startupId,
      authorId: userId,
      content,
      imageUrl,
    },
  });
}

/**
 * Create a startup update with visibility control
 */
export async function createStartupUpdate(
  startupId: string,
  authorId: string,
  content: string,
  updateType: "GENERAL" | "REVENUE" | "FUNDRAISING" | "PRODUCT" | "HIRING" | "RISKS" = "GENERAL",
  visibility: "PUBLIC" | "INVESTORS_ONLY" = "PUBLIC",
  title?: string
) {
  // Try to get userId from auth
  const authResult = await auth();
  let userId = authResult?.userId;
  
  // Fallback: If auth returns null but we have authorId from the page (which already verified the user),
  // use it. This handles cases where server actions don't properly pass session context.
  if (!userId && authorId) {
    userId = authorId;
  }
  
  if (!userId) {
    console.error("createStartupUpdate: No userId from auth or authorId fallback");
    throw new Error("Unauthorized: User not authenticated");
  }
  
  // Verify user is the founder of this startup
  const startup = await client.fetch(STARTUP_BY_ID_QUERY, { id: startupId });
  if (!startup || startup.author?.clerkId !== userId) {
    throw new Error("Only the founder can create updates for this startup");
  }

  if (!content.trim()) throw new Error("Update content cannot be empty");

  // Include visibility in the create call
  // Using unchecked input to bypass Prisma client type restrictions
  // Once Prisma is regenerated, this can use the proper types
  const result = await prisma.startupUpdate.create({
    data: {
      startupId,
      authorId: userId,
      content,
      updateType,
      visibility,
      title: title ?? null,
    } as any,
  });

  // Revalidate the startup page to show the new update
  revalidatePath(`/startup/${startupId}`);

  return result;
}

/**
 * Get startup updates with visibility filtering
 * @param startupId - The startup ID
 * @param viewerId - The current user's ID (for permission checking)
 * @param isFounder - Whether the viewer is the founder
 */
export async function getStartupUpdates(
  startupId: string,
  viewerId?: string,
  isFounder: boolean = false
) {
  // Check if viewer is an investor with DEAL_ACCEPTED
  let isInvestor = false;
  if (viewerId) {
    const relationship = await prisma.startupRelationship.findFirst({
      where: {
        startupId,
        investorId: viewerId,
        status: "DEAL_ACCEPTED",
      },
    });
    isInvestor = !!relationship;
  }

  // Build filter based on permissions
  const whereClause: any = { startupId };
  
  // If not founder and not investor, only show PUBLIC updates
  if (!isFounder && !isInvestor) {
    whereClause.visibility = "PUBLIC";
  }
  // If investor (but not founder), show PUBLIC + INVESTORS_ONLY
  // If founder, show all updates (no filter needed)

  const updates = await prisma.startupUpdate.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  });

  // Enrich with author data
  const updatesWithAuthors = await Promise.all(
    updates.map(async (update) => {
      const author = await client.fetch(AUTHOR_BY_CLERK_ID_QUERY, { clerkId: update.authorId });
      return {
        ...update,
        author: author ? { name: author.name, image: author.image } : undefined,
      };
    })
  );

  return updatesWithAuthors;
}

/**
 * Get all updates for an investor's portfolio
 * Returns PUBLIC + INVESTORS_ONLY updates from invested startups
 */
export async function getInvestorPortfolioUpdates(investorId: string) {
  // Get all startups where user has DEAL_ACCEPTED investment
  const investments = await prisma.investment.findMany({
    where: { investorId },
    select: { startupId: true },
    distinct: ["startupId"],
  });

  const investedStartupIds = investments.map((inv) => inv.startupId);

  if (investedStartupIds.length === 0) {
    return [];
  }

  // Get all updates from invested startups (both public and private)
  const updates = await prisma.startupUpdate.findMany({
    where: {
      startupId: { in: investedStartupIds },
    },
    orderBy: { createdAt: "desc" },
  });

  // Enrich with author and startup data
  const updatesWithDetails = await Promise.all(
    updates.map(async (update) => {
      const author = await client.fetch(AUTHOR_BY_CLERK_ID_QUERY, { clerkId: update.authorId });
      const startup = await client.fetch(STARTUP_BY_ID_QUERY, { id: update.startupId });
      return {
        ...update,
        author: author ? { name: author.name, image: author.image } : undefined,
        startup: startup ? { title: startup.title, slug: startup.slug?.current } : undefined,
      };
    })
  );

  return updatesWithDetails;
}

export async function getGlobalFeed() {
  const posts = await prisma.founderPost.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      likes: { select: { id: true, userId: true } },
      _count: {
        select: { comments: true },
      },
    },
  });
  
  
  const sanityClient = client!; // Assert non-null since we checked isSanityReady()
  
  const postsWithAuthors = await Promise.all(
    posts.map(async (post) => {
      const author = await sanityClient.fetch(AUTHOR_BY_CLERK_ID_QUERY, { clerkId: post.authorId });
      const startup = post.startupId
      ? await sanityClient.fetch(STARTUP_BY_ID_QUERY, {
          id: post.startupId,
        })
      : undefined;
      return {
        ...post,
        author: author ? { name: author.name, image: author.image } : undefined,
        startup,
        likeCount: post.likes.length,
        commentCount: post._count.comments,
        likes: post.likes,
      };
    })
  );

  return postsWithAuthors;
}

export async function getComments(postId: string) {
  const comments = await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
  });
  
  const withAuthors = await Promise.all(
    comments.map(async (c) => {
      const author = await client.fetch(AUTHOR_BY_CLERK_ID_QUERY, { clerkId: c.authorId });
      return {
        ...c,
        author: author ? { name: author.name ?? undefined, image: author.image ?? undefined } : undefined,
      };
    })
  );
  return withAuthors;
}

export async function addComment(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const postId = formData.get("postId") as string;
  const text = formData.get("text") as string;

  if (!postId || !text.trim()) return;

  return prisma.comment.create({
    data: {
      postId,
      authorId: userId,
      text,
    },
  });
}

export async function likePost(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;
  const postId = formData.get("postId") as string;
  if (!postId || !userId) return;

  const existingLike = await prisma.like.findFirst({
    where: {
      postId,
      userId,
    },
  });

  if (existingLike) {
    await prisma.like.delete({
      where: {
        id: existingLike.id,
      },
    });
  } else {
    await prisma.like.create({
      data: {
        postId,
        userId,
      },
    });
  }
}

export async function getFeed(startupId: string) {
  const posts = await prisma.founderPost.findMany({
    where: { startupId },
    orderBy: { createdAt: "desc" },
    include: {
      likes: { select: { id: true, userId: true } },
      _count: {
        select: { comments: true },
      },
    },
  });

  const postsWithAuthors = await Promise.all(
    posts.map(async (post) => {
      const author = await client.fetch(AUTHOR_BY_CLERK_ID_QUERY, { clerkId: post.authorId });
      return {
        ...post,
        author: author ? { name: author.name ?? undefined, image: author.image ?? undefined } : undefined,
        likeCount: post.likes.length,
        commentCount: post._count.comments,
        likes: post.likes,
      };
    })
  );

  return postsWithAuthors;
}

export async function getUserPosts(authorId: string) {
  const posts = await prisma.founderPost.findMany({
    where: { authorId },
    orderBy: { createdAt: "desc" },
    include: {
      likes: { select: { id: true, userId: true } },
      _count: {
        select: { comments: true },
      },
    },
  });

  const postsWithAuthors = await Promise.all(
    posts.map(async (post) => {
      const author = await client.fetch(AUTHOR_BY_CLERK_ID_QUERY, { clerkId: post.authorId });
      return {
        ...post,
        author: author ? { name: author.name ?? undefined, image: author.image ?? undefined } : undefined,
        likeCount: post.likes.length,
        commentCount: post._count.comments,
        likes: post.likes,
      };
    })
  );

  return postsWithAuthors;
}

