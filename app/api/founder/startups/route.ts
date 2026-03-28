import { auth } from "@clerk/nextjs/server";
import { client } from "@/sanity/lib/client";
import { STARTUPS_BY_CLERK_ID_QUERY } from "@/sanity/lib/queries";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Use Sanity as the source of truth for which startups a founder owns,
    // mirroring the logic already used in the UserStartups component.
    const startups = await client.fetch(STARTUPS_BY_CLERK_ID_QUERY, {
      clerkId: userId,
    });

    const mapped = (startups || []).map((s: any) => ({
      id: s._id,
      name: s.title as string,
    }));

    return Response.json(mapped, { status: 200 });
  } catch (error) {
    console.error("[FOUNDER_STARTUPS_GET]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
