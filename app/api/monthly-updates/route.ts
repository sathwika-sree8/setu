import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  calculateBurnRate,
  calculateCurrentValuation,
  calculateGrowthPercentage,
  calculateRunway,
} from "@/lib/finance";
import { ensureStartupRecord } from "@/lib/startup-sync";

export const runtime = "nodejs";

async function resolveFounderDbId(clerkId: string) {
  const user = await prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: {
      clerkId,
      role: "FOUNDER",
    },
    select: { id: true },
  });

  return user.id;
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
      revenue,
      expenses,
      cashInBank,
      users,
      newCustomers,
      achievements,
      challenges,
    } = body;

    if (!startupId) {
      return Response.json({ error: "startupId is required" }, { status: 400 });
    }

    if (
      typeof revenue !== "number" ||
      typeof expenses !== "number" ||
      typeof cashInBank !== "number"
    ) {
      return Response.json(
        { error: "revenue, expenses and cashInBank must be numbers" },
        { status: 400 },
      );
    }

    const founderId = await resolveFounderDbId(userId);
    const startup = await ensureStartupRecord(startupId);

    const previousUpdate = await prisma.monthlyUpdate.findFirst({
      where: { startupId },
      orderBy: { createdAt: "desc" },
      select: { revenue: true },
    });

    const latestFundingRound = await prisma.fundingRound.findFirst({
      where: { startupId },
      orderBy: { date: "desc" },
      select: { valuation: true },
    });

    const now = new Date();
    const month = now.toLocaleDateString("en-US", { month: "long" });
    const year = now.getFullYear();

    const burnRate = calculateBurnRate(expenses);
    const runway = calculateRunway(cashInBank, burnRate);
    const growthRate = calculateGrowthPercentage(revenue, previousUpdate?.revenue);
    const valuation = calculateCurrentValuation({
      monthlyRevenue: revenue,
      valuationSource: startup.valuationSource,
      revenueType: startup.revenueType,
      manualValuation: startup.manualValuation,
      latestFundingRoundValuation: latestFundingRound?.valuation,
    });

    const created = await prisma.monthlyUpdate.create({
      data: {
        startupId,
        founderId,
        month,
        year,
        revenue,
        expenses,
        cashInBank,
        users: typeof users === "number" ? users : 0,
        newCustomers: typeof newCustomers === "number" ? newCustomers : 0,
        burnRate,
        runway,
        growthRate,
        valuation,
        achievements: achievements ?? "",
        challenges: challenges ?? "",
      },
      include: {
        startup: {
          select: { id: true, name: true },
        },
      },
    });

    await prisma.startup.update({
      where: { id: startupId },
      data: {
        currentRevenue: revenue,
        currentGrowthRate: growthRate,
        currentBurnRate: burnRate,
        currentRunway: runway,
        currentValuation: valuation,
        lastUpdatedAt: created.createdAt,
      },
    });

    return Response.json(
      {
        ...created,
        startupName: created.startup.name,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[MONTHLY_UPDATES_POST]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const updates = await prisma.monthlyUpdate.findMany({
      where: { startupId },
      include: {
        startup: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const payload = updates.map((u) => ({
      id: u.id,
      startupId: u.startupId,
      startupName: u.startup.name,
      month: u.month,
      year: u.year,
      revenue: u.revenue,
      expenses: u.expenses,
      cashInBank: u.cashInBank,
      users: u.users,
      newCustomers: u.newCustomers,
      burnRate: u.burnRate,
      runway: u.runway,
      growthRate: u.growthRate,
      valuation: u.valuation,
      achievements: u.achievements,
      challenges: u.challenges,
      createdAt: u.createdAt,
    }));

    return Response.json(payload, { status: 200 });
  } catch (error) {
    console.error("[MONTHLY_UPDATES_GET]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
