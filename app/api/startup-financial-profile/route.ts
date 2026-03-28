import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ensureStartupRecord } from "@/lib/startup-sync";
import { calculateCurrentValuation } from "@/lib/finance";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const startupId = url.searchParams.get("startupId");

    if (!startupId) {
      return Response.json({ error: "startupId is required" }, { status: 400 });
    }

    const startup = await ensureStartupRecord(startupId);
    return Response.json(startup);
  } catch (error) {
    console.error("[STARTUP_FINANCIAL_PROFILE_GET]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const {
      startupId,
      totalShares,
      revenueType,
      growthStage,
      valuationSource,
      manualValuation,
    } = body;

    if (!startupId) {
      return Response.json({ error: "startupId is required" }, { status: 400 });
    }

    const startup = await ensureStartupRecord(startupId);

    const latestFundingRound = await prisma.fundingRound.findFirst({
      where: { startupId },
      orderBy: { date: "desc" },
      select: { valuation: true },
    });

    const nextRevenueType = revenueType ?? startup.revenueType;
    const nextValuationSource = valuationSource ?? startup.valuationSource;
    const nextManualValuation =
      typeof manualValuation === "number" ? manualValuation : startup.manualValuation;
    const nextCurrentValuation = calculateCurrentValuation({
      monthlyRevenue: startup.currentRevenue ?? 0,
      valuationSource: nextValuationSource,
      revenueType: nextRevenueType,
      manualValuation: nextManualValuation,
      latestFundingRoundValuation: latestFundingRound?.valuation,
    });

    const updated = await prisma.startup.update({
      where: { id: startupId },
      data: {
        totalShares: typeof totalShares === "number" ? totalShares : undefined,
        revenueType: nextRevenueType ?? undefined,
        growthStage: growthStage ?? undefined,
        valuationSource: nextValuationSource ?? undefined,
        manualValuation: nextManualValuation ?? undefined,
        currentValuation: nextCurrentValuation,
      },
    });

    return Response.json(updated);
  } catch (error) {
    console.error("[STARTUP_FINANCIAL_PROFILE_PATCH]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
