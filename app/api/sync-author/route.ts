import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { writeClient } from "@/sanity/lib/write-client";
import { client } from "@/sanity/lib/client";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure user exists in Prisma database
    await prisma.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: {
        id: userId,
        clerkId: userId,
      },
    });

    const body = await req.json();
    const { email, name, image } = body;

    // Check if author already exists
    const existingAuthor = await client.fetch(
      `*[_type == "author" && clerkId == $clerkId][0]`,
      { clerkId: userId }
    );

    if (existingAuthor) {
      await writeClient
        .patch(existingAuthor._id)
        .set({
          name: name ?? existingAuthor.name,
          email: email ?? existingAuthor.email,
          image: image ?? existingAuthor.image,
        })
        .commit();

      return NextResponse.json({ success: true });
    }

    // ✅ SAFE username generation
    const username = userId.replace("user_", "");

    await writeClient.create({
      _type: "author",
      clerkId: userId,
      username,
      name: name || "Anonymous",
      email: email || "",
      image: image || "",
      bio: "",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sync author error:", error);
    return NextResponse.json(
      { error: "Failed to sync author" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Sync author API endpoint" });
}
