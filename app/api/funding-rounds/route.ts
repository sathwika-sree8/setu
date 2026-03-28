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

    await ensureStartupRecord(startupId);

    const rounds = await prisma.fundingRound.findMany({
      where: { startupId },
      orderBy: { date: "desc" },
    });

    return Response.json(rounds);
  } catch (error) {
    console.error("[FUNDING_ROUNDS_GET]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const {
      startupId,
      name,
      date,
      investmentAmount,
      valuation,
      sharesIssued,
      leadInvestor,
      notes,
    } = body;

    if (!startupId || !name || !date) {
      return Response.json({ error: "startupId, name and date are required" }, { status: 400 });
    }

    if (
      typeof investmentAmount !== "number" ||
      typeof valuation !== "number" ||
      typeof sharesIssued !== "number"
    ) {
      return Response.json(
        { error: "investmentAmount, valuation and sharesIssued must be numbers" },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(investmentAmount) ||
      !Number.isFinite(valuation) ||
      !Number.isFinite(sharesIssued) ||
      investmentAmount <= 0 ||
      valuation <= 0 ||
      sharesIssued <= 0
    ) {
      return Response.json(
        { error: "investmentAmount, valuation and sharesIssued must be positive numbers" },
        { status: 400 },
      );
    }

    if (Number.isNaN(new Date(date).getTime())) {
      return Response.json({ error: "date must be a valid date" }, { status: 400 });
    }

    const startup = await ensureStartupRecord(startupId);

    const round = await prisma.fundingRound.create({
      data: {
        startupId,
        name,
        date: new Date(date),
        investmentAmount,
        valuation,
        sharesIssued,
        leadInvestor: leadInvestor ?? null,
        notes: notes ?? null,
      },
    });

    const nextTotalShares = (startup.totalShares ?? 0) + sharesIssued;
    const nextCurrentValuation = calculateCurrentValuation({
      monthlyRevenue: startup.currentRevenue ?? 0,
      valuationSource: startup.valuationSource,
      revenueType: startup.revenueType,
      manualValuation: startup.manualValuation,
      latestFundingRoundValuation: valuation,
    });

    await prisma.startup.update({
      where: { id: startupId },
      data: {
        currentValuation: nextCurrentValuation,
        totalShares: nextTotalShares,
        growthStage: name,
      },
    });

    return Response.json(round, { status: 201 });
  } catch (error) {
    console.error("[FUNDING_ROUNDS_POST]", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
