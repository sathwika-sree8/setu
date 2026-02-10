import { prisma } from "@/lib/prisma";

export async function assertAccess({
  userId,
  startupId,
  visibility,
}: {
  userId: string;
  startupId?: string;
  visibility?: "PUBLIC" | "INVESTORS_ONLY";
}) {
  if (visibility === "PUBLIC") return;

  const rel = await prisma.startupRelationship.findFirst({
    where: {
      startupId,
      investorId: userId,
      status: "DEAL_ACCEPTED",
    },
  });

  if (!rel) {
    throw new Error("ACCESS_DENIED");
  }
}
