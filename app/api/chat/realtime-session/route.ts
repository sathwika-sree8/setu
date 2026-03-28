import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";

type RealtimeRelationship = {
  id: string;
  founderId: string;
  investorId: string;
};

function signRealtimeSession(payload: { userId: string; exp: number; relationships: RealtimeRelationship[] }) {
  const secret = process.env.CHAT_REALTIME_SECRET;

  if (!secret) {
    throw new Error("CHAT_REALTIME_SECRET is not configured");
  }

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const relationships = await prisma.startupRelationship.findMany({
      where: {
        OR: [
          { founderId: userId, status: { in: ["IN_DISCUSSION", "DEAL_ACCEPTED"] } },
          { investorId: userId, status: { in: ["IN_DISCUSSION", "DEAL_ACCEPTED"] } },
        ],
      },
      select: {
        id: true,
        founderId: true,
        investorId: true,
      },
    });

    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 10;
    const token = signRealtimeSession({
      userId,
      exp: expiresAt,
      relationships,
    });

    return NextResponse.json({
      token,
      userId,
      expiresAt,
      relationships,
      socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || null,
      supabaseRealtimeEnabled: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    });
  } catch (error) {
    console.error("Error creating realtime session:", error);
    return NextResponse.json(
      { error: "Failed to create realtime session" },
      { status: 500 }
    );
  }
}
