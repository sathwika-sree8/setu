import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";
import { STARTUP_BY_ID_QUERY } from "@/sanity/lib/queries";

type SanityStartup = {
  _id: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  image?: string | null;
};

export async function ensureStartupRecord(startupId: string) {
  const existing = await prisma.startup.findUnique({
    where: { id: startupId },
  });

  const startup = await client.fetch<SanityStartup | null>(STARTUP_BY_ID_QUERY, {
    id: startupId,
  });

  const shouldRefreshExisting =
    existing &&
    (!existing.name ||
      existing.name === "Unknown Startup" ||
      existing.name === "Untitled Startup");

  if (existing && !shouldRefreshExisting) {
    return existing;
  }

  return prisma.startup.upsert({
    where: { id: startupId },
    update: {
      name: startup?.title ?? "Untitled Startup",
      sector: startup?.category ?? null,
      description: startup?.description ?? null,
      logoUrl: typeof startup?.image === "string" ? startup.image : null,
    },
    create: {
      id: startupId,
      name: startup?.title ?? "Untitled Startup",
      sector: startup?.category ?? null,
      description: startup?.description ?? null,
      logoUrl: typeof startup?.image === "string" ? startup.image : null,
    },
  });
}
