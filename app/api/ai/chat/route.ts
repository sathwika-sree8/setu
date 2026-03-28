import { auth } from "@clerk/nextjs/server";
import { buildRagContext } from "@/app/actions/ai/rag";
import { generateAnswer } from "@/app/actions/ai/llm";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";
import { STARTUP_BY_ID_QUERY, STARTUPS_BY_CLERK_ID_QUERY } from "@/sanity/lib/queries";
import {
  appendAIChatMessages,
  getAIChatHistory,
} from "@/lib/ai/memory";

export const runtime = "nodejs";

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW = 60 * 1000;
const AI_HISTORY_LIMIT = 20;

type CompanyCandidate = {
  _id: string;
  title?: string | null;
  description?: string | null;
  pitch?: string | null;
  category?: string | null;
  _createdAt?: string | null;
};

type StartupTitleOnly = {
  title?: string | null;
};

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(userId);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (record.count < RATE_LIMIT_REQUESTS) {
    record.count++;
    return true;
  }

  return false;
}

function getGreetingResponse(): string {
  return "Hello! I am your startup investment platform assistant. I can help you with information about startups, revenue data, investment updates, and portfolio summaries. How can I assist you today?";
}

function isListInvestedStartupsQuestion(question: string): boolean {
  const q = question.toLowerCase();
  const asksForStartupList =
    /(list|show|what|which)/.test(q) && /(startup|startups|companies|portfolio)/.test(q);
  const asksForStartupCount =
    /(how many|count|number of)/.test(q) && /(startup|startups|companies)/.test(q);
  const referencesInvestments =
    /(invested|investment|my investments|i invested|my startups)/.test(q);
  const metricQuery = /(equity|stake|ownership|roi|return|returns|revenue|growth|burn|runway|how much)/.test(q);

  return (
    (asksForStartupList || asksForStartupCount) &&
    referencesInvestments &&
    !metricQuery
  );
}

function isEquityQuestion(question: string): boolean {
  const q = question.toLowerCase();
  const asksEquity = /(equity|stake|ownership|how much equity)/.test(q);
  const aboutInvestments = /(invested|investment|my startup|startup)/.test(q);
  return asksEquity && aboutInvestments;
}

function isInvestmentTimingQuestion(question: string): boolean {
  const q = question.toLowerCase();
  const timingKeywords = /(when|last|recent|latest|first|most recent|most recent)/.test(q);
  const investmentContext = /(invest|investment|deal)/.test(q);
  return timingKeywords && investmentContext;
}

function isFounderStartupsQuestion(question: string): boolean {
  const q = question.toLowerCase();
  const asksForStartups = /(list|show|what|which|how many|count|number of)/.test(q) && /(startup|startups|companies)/.test(q);
  const founderContext = /(founder|i am the founder|where i am founder|my founded|startups i founded)/.test(q);
  return asksForStartups && founderContext;
}

function isCompanyInfoQuestion(question: string): boolean {
  const q = question.toLowerCase();
  const asksAboutCompany = /(what does|what is|tell me about|about|describe|explain)/.test(q);
  const hasStartupKeyword = /(company|startup|business|product|do)/.test(q);
  return asksAboutCompany && hasStartupKeyword;
}

function extractCompanyName(question: string): string | null {
  const patterns = [
    /what does\s+(.+?)\s+(?:company\s+)?do\??$/i,
    /tell me about\s+(.+?)\s*(?:company|startup)?\??$/i,
    /describe\s+(.+?)\s*(?:company|startup)?\??$/i,
    /about\s+(.+?)\s*(?:company|startup)?\??$/i,
    /what is\s+(.+?)\??$/i,
  ];

  for (const pattern of patterns) {
    const match = question.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/^the\s+/i, "");
    }
  }

  return null;
}

async function getCompanyInfoAnswer(question: string, startupId?: string): Promise<string | null> {
  try {
    let startup: CompanyCandidate | null = null;

    if (startupId) {
      startup = await client.fetch<CompanyCandidate | null>(STARTUP_BY_ID_QUERY, { id: startupId });
    }

    if (!startup) {
      const companyName = extractCompanyName(question);
      if (!companyName) return null;

      const companyLookupQuery = `*[_type == "startup" && (
          title match $search ||
          slug.current match $search ||
          category match $search
        )][0...5]{
          _id,
          title,
          description,
          pitch,
          category,
          _createdAt
        }`;
      const candidates = await client.fetch<CompanyCandidate[]>(
        companyLookupQuery,
        { search: `*${companyName}*` }
      );

      if (!Array.isArray(candidates) || candidates.length === 0) {
        return null;
      }

      const normalizedTarget = companyName.toLowerCase().replace(/\s+/g, "");
      startup =
        candidates.find((candidate) => (candidate.title || "").toLowerCase().replace(/\s+/g, "") === normalizedTarget) ||
        candidates[0];
    }

    if (!startup?._id) return null;

    const [metrics, latestMonthlyMetrics, latestRoundMetrics] = await Promise.all([
      prisma.startup.findUnique({
        where: { id: startup._id },
        select: {
          currentRevenue: true,
          currentBurnRate: true,
          currentRunway: true,
          sector: true,
        },
      }),
      prisma.$queryRaw<Array<{ growth_rate: number | null; valuation: number | null }>>`
        SELECT "growthRate" AS growth_rate, "valuation"
        FROM "MonthlyUpdate"
        WHERE "startupId" = ${startup._id}
        ORDER BY "createdAt" DESC
        LIMIT 1
      `,
      prisma.$queryRaw<Array<{ valuation: number | null }>>`
        SELECT "valuation"
        FROM "FundingRound"
        WHERE "startupId" = ${startup._id}
        ORDER BY "date" DESC
        LIMIT 1
      `,
    ]);

    const latestGrowthRate = latestMonthlyMetrics[0]?.growth_rate ?? null;
    const latestValuation =
      latestMonthlyMetrics[0]?.valuation ??
      latestRoundMetrics[0]?.valuation ??
      null;

    const lines = [
      `${startup.title ?? "This startup"} builds in ${startup.category ?? metrics?.sector ?? "its sector"}.`,
      startup.description ? `Description: ${startup.description}` : "Description: Not available.",
      startup.pitch ? `Pitch: ${startup.pitch}` : "Pitch: Not available.",
    ];

    if (metrics) {
      lines.push(
        `Revenue: ${metrics.currentRevenue != null ? `$${metrics.currentRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "N/A"}`,
        `Growth: ${latestGrowthRate != null ? `${latestGrowthRate.toFixed(1)}%` : "N/A"}`,
        `Burn rate: ${metrics.currentBurnRate != null ? `$${metrics.currentBurnRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "N/A"}`,
        `Runway: ${metrics.currentRunway != null ? `${metrics.currentRunway.toFixed(1)} months` : "N/A"}`,
        `Valuation: ${latestValuation != null ? `$${latestValuation.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "N/A"}`
      );
    }

    return lines.join("\n");
  } catch (err) {
    console.error("[AI Company Info Lookup Error]", err);
    return null;
  }
}

async function resolveStartupNameFromSanity(id: string): Promise<string | undefined> {
  try {
    const byId = await client.fetch<StartupTitleOnly | null>(STARTUP_BY_ID_QUERY, { id });
    if (byId?.title) {
      return byId.title;
    }
  } catch (err) {
    console.error("[AI Sanity Startup By ID Lookup Error]", err);
  }

  try {
    const byAltKey = await client.fetch<StartupTitleOnly | null>(
      `*[_type=="startup" && (_id in [$id, "drafts." + $id] || slug.current==$id || username==$id || clerkId==$id || id==$id)][0]{title}`,
      { id }
    );
    if (byAltKey?.title) {
      return byAltKey.title;
    }
  } catch (err) {
    console.error("[AI Sanity Startup Alt-Key Lookup Error]", err);
  }

  return undefined;
}

async function getInvestorIdAliases(userId: string): Promise<string[]> {
  try {
    const userRecord = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });
    if (userRecord?.id && userRecord.id !== userId) {
      return [userId, userRecord.id];
    }
  } catch (userLookupErr) {
    console.error("[AI User Alias Lookup Error]", userLookupErr);
  }

  return [userId];
}

async function getEquityAnswer(userId: string, question: string): Promise<string> {
  try {
    const investorIds = await getInvestorIdAliases(userId);
    const investments = await prisma.investment.findMany({
      where: { investorId: { in: investorIds } },
      select: {
        startupId: true,
        amount: true,
        equity: true,
      },
    });

    if (investments.length === 0) {
      return "You have no recorded investments, so there is no equity data yet.";
    }

    const uniqueStartupIds = Array.from(new Set(investments.map((investment) => investment.startupId)));
    const startupNames = new Map<string, string>();

    try {
      const startups = await prisma.startup.findMany({
        where: { id: { in: uniqueStartupIds } },
        select: { id: true, name: true },
      });
      for (const startup of startups) {
        startupNames.set(startup.id, startup.name);
      }

      const unresolved = uniqueStartupIds.filter((id) => !startupNames.has(id));
      if (unresolved.length > 0) {
        const resolved = await Promise.all(
          unresolved.map(async (id) => ({ id, name: await resolveStartupNameFromSanity(id) }))
        );
        for (const row of resolved) {
          if (row.name) startupNames.set(row.id, row.name);
        }

        const stillUnresolved = unresolved.filter((id) => !startupNames.has(id));
        if (stillUnresolved.length > 0) {
          const relationships = await prisma.startupRelationship.findMany({
            where: {
              investorId: { in: investorIds },
              startupId: { in: stillUnresolved },
            },
            select: {
              startupId: true,
              founderId: true,
            },
          });

          for (const relationship of relationships) {
            try {
              const founderStartups = await client.fetch<Array<StartupTitleOnly>>(STARTUPS_BY_CLERK_ID_QUERY, {
                clerkId: relationship.founderId,
              });
              if (Array.isArray(founderStartups) && founderStartups.length === 1) {
                const inferredTitle = founderStartups[0]?.title ?? undefined;
                if (inferredTitle) {
                  startupNames.set(relationship.startupId, inferredTitle);
                }
              }
            } catch (inferErr) {
              console.error("[AI Equity Startup Name Inference Error]", inferErr);
            }
          }
        }
      }
    } catch (nameErr) {
      console.error("[AI Equity Startup Name Lookup Error]", nameErr);
    }

    const q = question.toLowerCase();
    let targetName = "";
    const patterns = [
      /in\s+([a-z0-9\s-]+?)\s+startup/i,
      /in\s+([a-z0-9\s-]+?)\s+which/i,
      /in\s+([a-z0-9\s-]+?)\s+for/i,
      /in\s+([a-z0-9\s-]+?)\s*$/i,
      /\s+([a-z0-9\s-]+?)\s+equity/i,
      /([a-z0-9\s-]+?)\s+(?:equity|investment)/i,
    ];

    for (const pattern of patterns) {
      const match = q.match(pattern);
      if (match?.[1]) {
        targetName = match[1].trim();
        break;
      }
    }

    const enriched = investments.map((investment) => ({
      ...investment,
      startupLabel: startupNames.get(investment.startupId) ?? `Unknown Startup (id: ${investment.startupId})`,
    }));

    const normalizeName = (name: string) => name.toLowerCase().replace(/\s+/g, "").trim();
    const normalizedTarget = normalizeName(targetName);

    const matched = targetName
      ? enriched.filter((investment) => {
          const label = investment.startupLabel.toLowerCase();
          const directMatch = label.includes(targetName) || label.includes(normalizedTarget);
          const reversedMatch =
            targetName.includes(label.replace(/\s+/g, "")) ||
            normalizedTarget.includes(label.replace(/\s+/g, ""));
          return (
            directMatch ||
            reversedMatch ||
            normalizeName(label).includes(normalizedTarget) ||
            normalizeName(label).includes(targetName.replace(/\s+/g, ""))
          );
        })
      : enriched;

    if (matched.length === 0 && targetName) {
      if (enriched.length === 1) {
        const only = enriched[0];
        const equity = only.equity == null ? "Not recorded" : `${only.equity}%`;
        return [
          `Based on your investment in ${only.startupLabel}:`,
          `Your equity: ${equity}`,
          `Amount invested: $${only.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        ].join("\n");
      }

      return [
        `I could not find an invested startup matching "${targetName}".`,
        "Your invested startups:",
        ...Array.from(new Set(enriched.map((item) => item.startupLabel))).map((name, index) => `${index + 1}. ${name}`),
      ].join("\n");
    }

    if (matched.length > 1 && targetName) {
      return [
        `I found multiple matching startups for "${targetName}". Please specify one:`,
        ...Array.from(new Set(matched.map((item) => item.startupLabel))).map((name, index) => `${index + 1}. ${name}`),
      ].join("\n");
    }

    if (matched.length === 1) {
      const investment = matched[0];
      if (investment.equity == null) {
        return [
          `Startup: ${investment.startupLabel}`,
          `Equity: Not recorded`,
          `Amount invested: $${investment.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        ].join("\n");
      }

      return [
        `Startup: ${investment.startupLabel}`,
        `Your equity: ${investment.equity}%`,
        `Amount invested: $${investment.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      ].join("\n");
    }

    return [
      "Here is your equity across invested startups:",
      ...matched.map((investment) => {
        const equity = investment.equity == null ? "Not recorded" : `${investment.equity}%`;
        return `- ${investment.startupLabel}: ${equity}`;
      }),
    ].join("\n");
  } catch (err) {
    console.error("[AI Equity Query Error]", err);
    return "I could not load your equity details right now. Please try again in a moment.";
  }
}

async function getInvestmentTimingAnswer(userId: string, question: string): Promise<string> {
  try {
    const investorIds = await getInvestorIdAliases(userId);

    const investments = await prisma.investment.findMany({
      where: { investorId: { in: investorIds } },
      select: {
        startupId: true,
        amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (investments.length === 0) {
      return "You have not made any investments yet.";
    }

    const uniqueStartupIds = Array.from(new Set(investments.map((investment) => investment.startupId)));
    const startupNames = new Map<string, string>();

    try {
      const startups = await prisma.startup.findMany({
        where: { id: { in: uniqueStartupIds } },
        select: { id: true, name: true },
      });
      for (const startup of startups) {
        startupNames.set(startup.id, startup.name);
      }

      const unresolved = uniqueStartupIds.filter((id) => !startupNames.has(id));
      for (const id of unresolved) {
        const name = await resolveStartupNameFromSanity(id);
        if (name) startupNames.set(id, name);
      }
    } catch (err) {
      console.error("[AI Startup Name Lookup Error]", err);
    }

    const formatDate = (date: Date) =>
      date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    const formatTimeAgo = (date: Date) => {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    };

    const q = question.toLowerCase();
    const isLastInvestment = /(last|latest|most recent|recent)/.test(q);

    if (isLastInvestment || investments.length === 1) {
      const latest = investments[0];
      const startupName = startupNames.get(latest.startupId) ?? "Unknown Startup";
      return [
        `Your most recent investment:`,
        `- Startup: ${startupName}`,
        `- Amount: $${latest.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        `- Date: ${formatDate(latest.createdAt)} (${formatTimeAgo(latest.createdAt)})`,
      ].join("\n");
    }

    return [
      `Your investment history (${investments.length} total):`,
      ...investments.map((investment, index) => {
        const startupName = startupNames.get(investment.startupId) ?? "Unknown Startup";
        return `${index + 1}. ${startupName} - $${investment.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${formatTimeAgo(investment.createdAt)})`;
      }),
    ].join("\n");
  } catch (err) {
    console.error("[AI Investment Timing Error]", err);
    return "I could not load your investment history right now. Please try again in a moment.";
  }
}

async function getFounderStartupsAnswer(userId: string): Promise<string> {
  try {
    const startups = await client.fetch<Array<StartupTitleOnly>>(STARTUPS_BY_CLERK_ID_QUERY, {
      clerkId: userId,
    });
    const list = Array.isArray(startups) ? startups : [];

    if (list.length === 0) {
      return "You are not listed as founder of any startups yet.";
    }

    return [
      `You are the founder of ${list.length} startup${list.length === 1 ? "" : "s"}:`,
      ...list.map((startup: { title?: string | null }, index: number) => `${index + 1}. ${startup?.title ?? "Untitled Startup"}`),
    ].join("\n");
  } catch (err) {
    console.error("[AI Founder Startups Lookup Error]", err);
    return "I could not load your founder startups right now. Please try again in a moment.";
  }
}

async function getInvestedStartupsAnswer(userId: string): Promise<string> {
  try {
    const investorIds = await getInvestorIdAliases(userId);

    const investments = await prisma.investment.findMany({
      where: { investorId: { in: investorIds } },
      select: {
        startupId: true,
        amount: true,
      },
    });

    if (investments.length === 0) {
      return "You have not invested in any startups yet.";
    }

    const uniqueStartupIds = Array.from(new Set(investments.map((investment) => investment.startupId)));
    const totalInvested = investments.reduce((sum, investment) => sum + (investment.amount || 0), 0);

    let startupNames = new Map<string, string>();
    try {
      const startups = await prisma.startup.findMany({
        where: { id: { in: uniqueStartupIds } },
        select: { id: true, name: true },
      });
      startupNames = new Map(startups.map((startup) => [startup.id, startup.name]));

      const unresolvedIds = uniqueStartupIds.filter((id) => !startupNames.has(id));
      if (unresolvedIds.length > 0) {
        const sanityResolved = await Promise.all(
          unresolvedIds.map(async (id) => {
            const name = await resolveStartupNameFromSanity(id);
            return { id, name };
          })
        );

        for (const row of sanityResolved) {
          if (row.name) {
            startupNames.set(row.id, row.name);
          }
        }

        const stillUnresolved = unresolvedIds.filter((id) => !startupNames.has(id));
        if (stillUnresolved.length > 0) {
          const relationships = await prisma.startupRelationship.findMany({
            where: {
              investorId: { in: investorIds },
              startupId: { in: stillUnresolved },
            },
            select: {
              startupId: true,
              founderId: true,
            },
          });

          for (const relationship of relationships) {
            try {
              const founderStartups = await client.fetch<Array<StartupTitleOnly>>(STARTUPS_BY_CLERK_ID_QUERY, {
                clerkId: relationship.founderId,
              });
              if (Array.isArray(founderStartups) && founderStartups.length === 1) {
                const inferredTitle = founderStartups[0]?.title ?? undefined;
                if (inferredTitle) {
                  startupNames.set(relationship.startupId, inferredTitle);
                }
              }
            } catch (inferErr) {
              console.error("[AI Startup Name Inference Error]", inferErr);
            }
          }
        }
      }
    } catch (err) {
      console.error("[AI Startup Name Lookup Error]", err);
    }

    return [
      `You have invested in ${uniqueStartupIds.length} startup${uniqueStartupIds.length === 1 ? "" : "s"}:`,
      ...uniqueStartupIds.map((id, index) => {
        const name = startupNames.get(id) ?? `Unknown Startup (id: ${id})`;
        return `${index + 1}. ${name}`;
      }),
      "",
      `Total invested: $${totalInvested.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      })}`,
    ].join("\n");
  } catch (err) {
    console.error("[AI Investment Listing Error]", err);
    return "I could not load your investment list right now. Please try again in a moment.";
  }
}

function toPromptHistory(
  history: Awaited<ReturnType<typeof getAIChatHistory>>
) {
  return history.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

async function persistConversationTurn(args: {
  userId: string;
  startupId?: string;
  question: string;
  answer: string;
}) {
  try {
    await appendAIChatMessages({
      userId: args.userId,
      startupId: args.startupId,
      messages: [
        { role: "user", content: args.question },
        { role: "assistant", content: args.answer },
      ],
    });
  } catch (err) {
    console.error("[AI Chat Memory Save Error]", err);
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startupId = searchParams.get("startupId") || undefined;
    const history = await getAIChatHistory({
      userId,
      startupId,
      limit: AI_HISTORY_LIMIT,
    });

    return Response.json({
      messages: history.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      })),
    });
  } catch (error) {
    console.error("[AI Chat History Error]", error);
    return Response.json(
      { error: "Failed to fetch chat history", messages: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (!checkRateLimit(userId)) {
      return Response.json(
        {
          error: "Rate limit exceeded",
          answer: "Too many requests. Please wait before trying again.",
        },
        { status: 429 }
      );
    }

    let body: { question?: string; startupId?: string };
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("[AI Chat Body Parse Error]", parseError);
      return Response.json(
        {
          error: "Invalid JSON body",
          answer: "Please send a valid request body with a question.",
        },
        { status: 400 }
      );
    }

    const question = body.question?.trim();
    const startupId = body.startupId;

    if (!question) {
      return Response.json({ error: "Question is required" }, { status: 400 });
    }

    const history = await getAIChatHistory({
      userId,
      startupId,
      limit: AI_HISTORY_LIMIT,
    });
    const promptHistory = toPromptHistory(history);

    const lowerQuestion = question.toLowerCase().trim();
    if (
      lowerQuestion === "hello" ||
      lowerQuestion === "hi" ||
      lowerQuestion === "hey" ||
      lowerQuestion === "hi!"
    ) {
      const answer = getGreetingResponse();
      await persistConversationTurn({ userId, startupId, question, answer });
      return Response.json({ answer });
    }

    if (isFounderStartupsQuestion(question)) {
      const answer = await getFounderStartupsAnswer(userId);
      await persistConversationTurn({ userId, startupId, question, answer });
      return Response.json({ answer });
    }

    if (isCompanyInfoQuestion(question) || startupId) {
      const directCompanyAnswer = await getCompanyInfoAnswer(question, startupId);
      if (directCompanyAnswer) {
        await persistConversationTurn({ userId, startupId, question, answer: directCompanyAnswer });
        return Response.json({ answer: directCompanyAnswer });
      }
    }

    if (isEquityQuestion(question)) {
      const answer = await getEquityAnswer(userId, question);
      await persistConversationTurn({ userId, startupId, question, answer });
      return Response.json({ answer });
    }

    if (isListInvestedStartupsQuestion(question)) {
      const answer = await getInvestedStartupsAnswer(userId);
      await persistConversationTurn({ userId, startupId, question, answer });
      return Response.json({ answer });
    }

    if (isInvestmentTimingQuestion(question)) {
      const answer = await getInvestmentTimingAnswer(userId, question);
      await persistConversationTurn({ userId, startupId, question, answer });
      return Response.json({ answer });
    }

    let context = "No relevant data found.";

    try {
      const rag = await buildRagContext({
        userId,
        question,
        startupId,
        history: promptHistory,
      });
      context = rag.hasData
        ? rag.context
        : "There is currently no startup data available to answer this question.";
    } catch (retrievalError) {
      console.error("[AI Data Retrieval Error]", retrievalError);
      context =
        "There was a problem loading startup knowledge data. No additional context is available right now.";
    }

    if (!context || context.trim().length === 0) {
      context = "There is currently no data available to answer this question.";
    }

    let answer: string;

    try {
      answer = await generateAnswer({
        question,
        context,
        history: promptHistory,
      });
    } catch (llmError) {
      console.error("[AI LLM Error]", llmError);
      answer = [
        "I could not run the language model right now, but I did retrieve startup data.",
        "Here is the available context:",
        context.slice(0, 1800),
      ].join("\n\n");
    }

    await persistConversationTurn({ userId, startupId, question, answer });

    return Response.json({ answer });
  } catch (error) {
    console.error("[AI Chat Error]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      {
        error: errorMessage,
        answer: "An error occurred while processing your request. Please try again.",
      },
      { status: 500 }
    );
  }
}
