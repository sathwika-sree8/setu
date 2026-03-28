import { auth } from "@clerk/nextjs/server";
import { client } from "@/sanity/lib/client";
import { writeClient } from "@/sanity/lib/write-client";
import { AUTHOR_BY_CLERK_ID_QUERY } from "@/sanity/lib/queries";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = (await req.json()) as {
      authorId?: string;
      bio?: string;
    };

    if (!body.authorId) {
      return Response.json({ error: "authorId is required" }, { status: 400 });
    }

    const author = await client.fetch<{
      _id: string;
      clerkId?: string | null;
    } | null>(AUTHOR_BY_CLERK_ID_QUERY, {
      clerkId: userId,
    });

    if (!author?._id || author._id !== body.authorId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await writeClient
      .patch(body.authorId)
      .set({
        bio: body.bio ?? "",
      })
      .commit();

    return Response.json({ ok: true, author: updated });
  } catch (error) {
    console.error("[FOUNDER_BACKGROUND_PATCH_ERROR]", error);
    return Response.json({ error: "Failed to update founder background" }, { status: 500 });
  }
}
