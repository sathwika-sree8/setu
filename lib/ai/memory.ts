"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export type AIStoredChatMessage = {
  id: string;
  userId: string;
  startupId: string | null;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

let memoryTableReady = false;

async function ensureAIChatMessageTable() {
  if (memoryTableReady) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AIChatMessage" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "startupId" TEXT NULL,
      "role" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AIChatMessage_userId_startupId_createdAt_idx"
    ON "AIChatMessage" ("userId", "startupId", "createdAt")
  `);

  memoryTableReady = true;
}

export async function getAIChatHistory(args: {
  userId: string;
  startupId?: string;
  limit?: number;
}) {
  await ensureAIChatMessageTable();

  const limit = Math.max(1, Math.min(args.limit ?? 20, 100));
  const startupId = args.startupId ?? null;

  const rows = await prisma.$queryRaw<AIStoredChatMessage[]>`
    SELECT *
    FROM (
      SELECT
        "id",
        "userId",
        "startupId",
        "role",
        "content",
        "createdAt"
      FROM "AIChatMessage"
      WHERE "userId" = ${args.userId}
        AND (
          (${startupId}::text IS NULL AND "startupId" IS NULL)
          OR "startupId" = ${startupId}
        )
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    ) recent_messages
    ORDER BY "createdAt" ASC
  `;

  return rows.map((row) => ({
    ...row,
    createdAt: new Date(row.createdAt),
  }));
}

export async function appendAIChatMessages(args: {
  userId: string;
  startupId?: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}) {
  await ensureAIChatMessageTable();

  const startupId = args.startupId ?? null;

  for (const message of args.messages) {
    const content = message.content.trim();
    if (!content) {
      continue;
    }

    await prisma.$executeRaw`
      INSERT INTO "AIChatMessage" ("id", "userId", "startupId", "role", "content", "createdAt")
      VALUES (${crypto.randomUUID()}, ${args.userId}, ${startupId}, ${message.role}, ${content}, NOW())
    `;
  }
}
