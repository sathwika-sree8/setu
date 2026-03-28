"use server";

import { auth } from "@clerk/nextjs/server";
import { parseServerActionResponse } from "./utils";
import slugify from "slugify";
import { writeClient } from "@/sanity/lib/write-client";
import { client } from "@/sanity/lib/client";
import { prisma } from "@/lib/prisma";
import { STARTUP_BY_ID_QUERY } from "@/sanity/lib/queries";
import { revalidatePath } from "next/cache";

export const createPitch = async (
  state: { error: string; status: string },
  form: FormData,
  pitch: string
) => {
  // Clerk auth - must use session pattern in newer versions
  const session = await auth();
  const userId = session.userId;

  if (!userId) {
    return parseServerActionResponse({
      error: "Not signed in",
      status: "ERROR",
    });
  }

  const { title, description, category, link } = Object.fromEntries(
    Array.from(form).filter(([key]) => key !== "pitch")
  );

  const slug = slugify(title as string, { lower: true, strict: true });

  try {
    // Find or create the author and get the Sanity author _id
    let authorDoc = await client.fetch(
      `*[_type == "author" && clerkId == $clerkId][0]`,
      { clerkId: userId }
    );

    // If author doesn't exist, create one
    if (!authorDoc) {
      authorDoc = await writeClient.create({
        _type: "author",
        clerkId: userId,
        id: Math.floor(Math.random() * 1000000),
        name: "New User",
        username: `user_${userId.slice(0, 8)}`,
        email: "",
        image: "",
        bio: "",
      });
    }

    const startup = {
      title,
      description,
      category,
      image: link,
      pitch,
      slug: {
        _type: "slug",
        current: slug,
      },
      author: {
        _type: "reference",
        _ref: authorDoc._id, // Use Sanity author _id, not Clerk userId
      },
    };

    const result = await writeClient.create({
      _type: "startup",
      ...startup,
    });

    // Mirror core startup details into PostgreSQL for relational use.
    // If this fails, roll back the Sanity create so data stays consistent.
    try {
      await prisma.$transaction(async (tx) => {
        await tx.startup.upsert({
          where: { id: result._id },
          update: {
            name: title as string,
            sector: (category as string) || null,
            description: description as string,
            logoUrl: (link as string) || null,
          },
          create: {
            id: result._id,
            name: title as string,
            sector: (category as string) || null,
            description: description as string,
            logoUrl: (link as string) || null,
          },
        });

        // Persist long-form pitch content in Supabase as the initial PRODUCT update.
        await tx.startupUpdate.create({
          data: {
            startupId: result._id,
            authorId: userId,
            title: "Initial Pitch",
            content: pitch,
            updateType: "PRODUCT",
            visibility: "PUBLIC",
          },
        });
      });
    } catch (dbError) {
      try {
        await writeClient.delete(result._id);
      } catch (rollbackError) {
        console.error("createPitch rollback failed", rollbackError);
      }

      throw dbError;
    }

    return parseServerActionResponse({
      ...result,
      error: "",
      status: "SUCCESS",
    });
  } catch (error) {
    console.error(error);
    return parseServerActionResponse({
      error: JSON.stringify(error),
      status: "ERROR",
    });
  }
};

// Basic inline edit of startup details from cards
export async function updateStartupBasic(
  id: string,
  values: { title: string; description: string; category: string; image: string }
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const startup = await client.fetch(STARTUP_BY_ID_QUERY, { id });
  if (!startup) throw new Error("Startup not found");
  if (startup.author?.clerkId !== userId) throw new Error("Forbidden");

  await writeClient
    .patch(id)
    .set({
      title: values.title,
      description: values.description,
      category: values.category,
      image: values.image,
    })
    .commit();

  // Keep Postgres mirror in sync when present
  try {
    await prisma.startup.update({
      where: { id },
      data: {
        name: values.title,
        sector: values.category || null,
        description: values.description,
        logoUrl: values.image || null,
      },
    });
  } catch {
    // Ignore if row is missing, card will still use Sanity data
  }

  revalidatePath("/");
  revalidatePath(`/startup/${id}`);

  return { ok: true };
}

// Delete startup from both Sanity and Postgres
export async function deleteStartup(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const startup = await client.fetch(STARTUP_BY_ID_QUERY, { id });
  if (!startup) throw new Error("Startup not found");
  if (startup.author?.clerkId !== userId) throw new Error("Forbidden");

  // Clean up relational data first to satisfy FKs
  try {
    await prisma.startupUpdate.deleteMany({ where: { startupId: id } });
    await prisma.startupRelationship.deleteMany({ where: { startupId: id } });
    await prisma.investment.deleteMany({ where: { startupId: id } });
    await prisma.privateNote.deleteMany({ where: { startupId: id } });
    await prisma.aIDocument.deleteMany({ where: { startupId: id } });
    await prisma.startup.delete({ where: { id } });
  } catch {
    // If any of these tables are empty or relations changed, ignore
  }

  try {
    await writeClient.delete(id);
  } catch {
    // If already deleted or missing, ignore
  }

  revalidatePath("/");

  return { ok: true };
}
