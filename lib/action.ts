"use server";

import { auth } from "@clerk/nextjs/server";
import { parseServerActionResponse } from "./utils";
import slugify from "slugify";
import { writeClient } from "@/sanity/lib/write-client";
import { client } from "@/sanity/lib/client";

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
