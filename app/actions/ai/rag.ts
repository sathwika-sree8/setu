import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";
import { calculateMoic, calculateOwnership, calculateStakeValue, deriveStartupStatus, generateStartupAlerts } from "@/lib/finance";

type RagDoc = {
  id: string;
  type: "snapshot" | "monthly" | "update" | "investment" | "risk" | "company" | "portfolio" | "funding";
  startupId?: string;
  startupName?: string | null;
  createdAt?: Date | null;
  content: string;
};

type StartupSnapshot = {
  id: string;
  name: string | null;
  sector: string | null;
  currentRevenue: number | null;
  currentGrowthRate: number | null;
  currentBurnRate: number | null;
  currentRunway: number | null;
  currentValuation: number | null;
  totalShares: number | null;
  lastUpdatedAt: Date | null;
};

type InvestmentWithStartup = {
  id: string;
  startupId: string;
  investorId: string;
  amount: number;
  equity: number | null;
  shares: number | null;
  entryValuation: number | null;
  preMoneyValuation: number | null;
  postMoneyValuation: number | null;
  dealStage: string | null;
  investmentType: string | null;
  notes: string | null;
  createdAt: Date;
  startup: { id: string; name: string | null; currentValuation?: number | null; totalShares?: number | null } | null;
};

type SanityStartupProfile = {
  _id: string;
  title?: string | null;
  description?: string | null;
  pitch?: string | null;
  category?: string | null;
  _createdAt?: string | null;
};

function normalizeMoney(value: number | null | undefined): string {
  if (value == null) return "N/A";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function truncateText(value: string | null | undefined, max = 700): string {
  const text = (value ?? "").trim();
  if (!text) return "N/A";
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function estimateInvestmentValue(inv: {
  amount: number;
  equity: number | null;
  shares: number | null;
  startup?: { currentValuation?: number | null; totalShares?: number | null } | null;
  entryValuation: number | null;
  postMoneyValuation: number | null;
  preMoneyValuation: number | null;
}): number {
  const ownership = calculateOwnership({
    investorShares: inv.shares,
    totalShares: inv.startup?.totalShares,
    equityPercent: inv.equity,
  });
  const mark = calculateStakeValue(ownership, inv.startup?.currentValuation);
  if (mark > 0) {
    return mark;
  }

  if (inv.equity && inv.equity > 0) {
    const valuation = inv.postMoneyValuation ?? inv.preMoneyValuation ?? inv.entryValuation;
    if (valuation && valuation > 0) {
      return (inv.equity / 100) * valuation;
    }
  }
  return inv.amount;
}

// Synonym expansion for better keyword matching
const SYNONYMS: Record<string, string[]> = {
  revenue: ["revenue", "sales", "income", "arr", "mrr", "booking", "earnings"],
  growth: ["growth", "grow", "growing", "expansion", "increase", "momentum", "yoy", "mom"],
  burn: ["burn", "burning", "expense", "expenses", "cost", "costs", "spending", "runway"],
  profit: ["profit", "profitability", "gain", "gains", "earnings", "income", "margin"],
  investment: ["investment", "invested", "investing", "invest", "deal", "funded", "funding"],
  risk: ["risk", "risky", "risked", "danger", "warning", "concern", "downside"],
  startup: ["startup", "startups", "company", "companies", "founder", "founders", "venture"],
  equity: ["equity", "stake", "ownership", "shares", "shareholding"],
  roi: ["roi", "return", "returns", "yield", "performance"],
  customer: ["customer", "customers", "user", "users", "client", "clients"],
};

function expandWithSynonyms(query: string): string[] {
  const words = query.toLowerCase().split(/\s+/);
  const expanded = new Set<string>();
  
  for (const word of words) {
    expanded.add(word);
    // Check if this word is a key we have synonyms for
    for (const [key, syns] of Object.entries(SYNONYMS)) {
      if (syns.includes(word) || key === word) {
        syns.forEach(s => expanded.add(s));
      }
    }
  }
  
  return Array.from(expanded);
}

// Improved scoring with synonym support
function scoreDoc(doc: RagDoc, expandedTokens: string[], rawQuestion: string): number {
  const text = doc.content.toLowerCase();
  let score = 0;

  // Token matching with synonyms
  for (const token of expandedTokens) {
    if (text.includes(token)) {
      score += 3;
    }
  }

  // Semantic boost based on question type
  const q = rawQuestion.toLowerCase();
  
  // Analytics questions
  if (/revenue|arr|mrr|sales|income/.test(q)) {
    if (text.includes("revenue") || text.includes("sales")) score += 6;
  }
  if (/growth|expand|increase|momentum/.test(q)) {
    if (text.includes("growth") || text.includes("users")) score += 6;
  }
  if (/burn|expense|cost|spending/.test(q)) {
    if (text.includes("burn") || text.includes("expense")) score += 6;
  }
  if (/runway|cash|months left/.test(q)) {
    if (text.includes("runway") || text.includes("cash")) score += 6;
  }
  if (/roi|return|return|yield|performance/.test(q)) {
    if (text.includes("roi") || text.includes("return") || text.includes("profit")) score += 7;
  }
  
  // Portfolio questions
  if (/portfolio|investments|total/.test(q)) {
    if (doc.type === "investment" || doc.type === "portfolio") score += 8;
  }
  
  // Company info questions
  if (/what is|about|describe|explain|tell me/.test(q)) {
    if (doc.type === "company" || doc.type === "snapshot") score += 5;
  }

  // Recency boost
  if (doc.createdAt) {
    const ageDays = (Date.now() - new Date(doc.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 30) score += 3;
    else if (ageDays <= 90) score += 2;
    else if (ageDays <= 180) score += 1;
  }

  // Type-based default scores
  const typeScores: Record<string, number> = {
    investment: 2,
    monthly: 3,
    snapshot: 3,
    update: 2,
    company: 1,
  };
  score += typeScores[doc.type] || 0;

  return score;
}

export async function buildRagContext(args: {
  userId: string;
  question: string;
  startupId?: string;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}) {
  const { userId, question, startupId, history = [] } = args;
  const retrievalQuestion = [
    ...history
      .filter((message) => message.role === "user")
      .slice(-3)
      .map((message) => message.content),
    question,
  ].join(" ");

  let investorIds = [userId];
  try {
    const userRecord = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });
    if (userRecord?.id && userRecord.id !== userId) {
      investorIds = [userId, userRecord.id];
    }
  } catch (userLookupErr) {
    console.error("[AI RAG User Alias Lookup Error]", userLookupErr);
  }

  const docs: RagDoc[] = [];

  // Fetch all data sources in parallel for better performance
  let investments: InvestmentWithStartup[] = [];
  let sanityStartups: SanityStartupProfile[] = [];
  
  try {
    investments = await prisma.investment.findMany({
      where: {
        investorId: { in: investorIds },
        ...(startupId ? { startupId } : {}),
      },
      include: { startup: true },
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    console.error("[AI RAG Investments Error]", e);
    investments = [];
  }

  try {
    if (startupId) {
      sanityStartups = [await client.fetch(
        `*[_type == "startup" && _id == $startupId][0]{
          _id, title, description, pitch, category, _createdAt, author->{name, image}
        }`,
        { startupId }
      )].filter(Boolean);
    } else {
      sanityStartups = await client.fetch(
        `*[_type == "startup"]|order(_createdAt desc)[0...50]{
          _id, title, description, pitch, category, _createdAt, author->{name, image}
        }`
      ) || [];
    }
  } catch (e) {
    console.error("[AI RAG Sanity Error]", e);
    sanityStartups = [];
  }

  const investedStartupIds: string[] = Array.from(new Set(investments.map((i) => i.startupId)));

  // Fetch related data for invested startups
  let monthlyUpdates: { id: string; startupId: string; founderId: string; month: string; year: number; revenue: number; expenses: number; cashInBank: number; users: number; newCustomers: number; burnRate: number; runway: number; growthRate: number; achievements: string; challenges: string; createdAt: Date; startup: { id: string; name: string } }[] = [];
  let startupUpdates: { id: string; startupId: string; title: string | null; content: string; updateType: string; visibility: string; createdAt: Date; startup: { id: string; name: string } }[] = [];
  let startupSnapshots: StartupSnapshot[] = [];

  if (investedStartupIds.length > 0) {
    const idsToQuery = startupId ? [startupId] : investedStartupIds;
    
    try {
      monthlyUpdates = await prisma.monthlyUpdate.findMany({
        where: { startupId: { in: idsToQuery } },
        include: { startup: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 60,
      });
    } catch (e) {
      console.error("[AI RAG Monthly Updates Error]", e);
    }

    try {
      startupUpdates = await prisma.startupUpdate.findMany({
        where: {
          startupId: { in: idsToQuery },
          visibility: { in: ["PUBLIC", "INVESTORS_ONLY"] },
        },
        include: { startup: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 60,
      });
    } catch (e) {
      console.error("[AI RAG Startup Updates Error]", e);
    }

    try {
      startupSnapshots = await prisma.startup.findMany({
        where: { id: { in: idsToQuery } },
        select: {
          id: true, name: true, sector: true,
          currentRevenue: true, currentGrowthRate: true, currentBurnRate: true,
          currentRunway: true, currentValuation: true, totalShares: true, lastUpdatedAt: true,
        },
      });
    } catch (e) {
      console.error("[AI RAG Startup Snapshots Error]", e);
    }
  }

  // Add portfolio-level summary (ALWAYS include this)
  let totalInvested = 0;
  let portfolioValue = 0;

  for (const inv of investments) {
    totalInvested += inv.amount;
    const estimatedValue = estimateInvestmentValue(inv);
    portfolioValue += estimatedValue;
  }

  const totalProfit = portfolioValue - totalInvested;
  const portfolioRoi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
  const portfolioMoic = calculateMoic(portfolioValue, totalInvested);

  docs.push({
    id: "portfolio:summary",
    type: "portfolio",
    content: [
      `Portfolio Overview:`,
      `- Total invested: ${normalizeMoney(totalInvested)}`,
      `- Number of investments: ${investments.length}`,
      `- Invested startups: ${investedStartupIds.length}`,
      ...(totalInvested > 0 ? [
        `- Estimated portfolio value: ${normalizeMoney(portfolioValue)}`,
        `- Estimated profit/loss: ${normalizeMoney(totalProfit)}`,
        `- Estimated ROI: ${portfolioRoi.toFixed(2)}%`,
        `- MOIC: ${portfolioMoic.toFixed(2)}x`,
      ] : []),
    ].join("\n"),
  });

  // Add investment details
  for (const inv of investments) {
    const estimatedValue = estimateInvestmentValue(inv);
    const profit = estimatedValue - inv.amount;
    const roi = inv.amount > 0 ? (profit / inv.amount) * 100 : 0;

    docs.push({
      id: `investment:${inv.id}`,
      type: "investment",
      startupId: inv.startupId,
      startupName: inv.startup?.name,
      createdAt: inv.createdAt,
      content: [
        `Investment: ${inv.startup?.name ?? "Unknown Startup"}`,
        `Amount invested: ${normalizeMoney(inv.amount)}`,
        `Equity: ${inv.equity != null ? `${inv.equity}%` : "Not recorded"}`,
        `Shares: ${inv.shares != null ? inv.shares.toLocaleString() : "Not recorded"}`,
        `Valuation: ${normalizeMoney(inv.postMoneyValuation ?? inv.preMoneyValuation)}`,
        `Estimated current value: ${normalizeMoney(estimatedValue)}`,
        `Profit/Loss: ${normalizeMoney(profit)}`,
        `ROI: ${roi.toFixed(2)}%`,
        `Deal stage: ${inv.dealStage ?? "Unknown"}`,
        `Type: ${inv.investmentType ?? "Unknown"}`,
        `Date: ${inv.createdAt ? inv.createdAt.toISOString() : "Unknown"}`,
      ].join("\n"),
    });
  }

  // Add startup snapshots
  for (const s of startupSnapshots) {
    docs.push({
      id: `snapshot:${s.id}`,
      type: "snapshot",
      startupId: s.id,
      startupName: s.name,
      createdAt: s.lastUpdatedAt ?? undefined,
      content: [
        `Startup: ${s.name}`,
        `Sector: ${s.sector ?? "N/A"}`,
        `Current revenue: ${normalizeMoney(s.currentRevenue)}`,
        `Current valuation: ${normalizeMoney(s.currentValuation)}`,
        `Current growth rate: ${s.currentGrowthRate != null ? `${s.currentGrowthRate.toFixed(2)}%` : "N/A"}`,
        `Current burn rate: ${normalizeMoney(s.currentBurnRate)}`,
        `Runway: ${s.currentRunway != null ? `${s.currentRunway.toFixed(1)} months` : "N/A"}`,
        `Last updated: ${s.lastUpdatedAt ? s.lastUpdatedAt.toLocaleDateString() : "Unknown"}`,
      ].join("\n"),
    });

    const alerts = generateStartupAlerts({
      runway: s.currentRunway ?? 0,
      growthRate: s.currentGrowthRate ?? 0,
      lastUpdatedAt: s.lastUpdatedAt,
    });
    if (alerts.length > 0) {
      docs.push({
        id: `risk:snapshot:${s.id}`,
        type: "risk",
        startupId: s.id,
        startupName: s.name,
        createdAt: s.lastUpdatedAt ?? undefined,
        content: `Startup health - ${s.name}: Status ${deriveStartupStatus(alerts)}. Alerts: ${alerts.map((alert) => alert.label).join(", ")}.`,
      });
    }
  }

  for (const inv of investments) {
    const startupName = inv.startup?.name ?? "Unknown Startup";
    const rounds = await prisma.fundingRound.findMany({
      where: { startupId: inv.startupId },
      orderBy: { date: "desc" },
      take: 5,
    }).catch(() => []);

    for (const round of rounds) {
      docs.push({
        id: `funding:${inv.startupId}:${round.id}`,
        type: "funding",
        startupId: inv.startupId,
        startupName,
        createdAt: round.date,
        content: [
          `Funding Round: ${startupName}`,
          `Round: ${round.name}`,
          `Date: ${round.date.toLocaleDateString()}`,
          `Amount raised: ${normalizeMoney(round.investmentAmount)}`,
          `Valuation: ${normalizeMoney(round.valuation)}`,
          `Shares issued: ${round.sharesIssued.toLocaleString()}`,
        ].join("\n"),
      });
    }
  }

  // Add monthly updates
  for (const u of monthlyUpdates) {
    docs.push({
      id: `monthly:${u.id}`,
      type: "monthly",
      startupId: u.startupId,
      startupName: u.startup.name,
      createdAt: u.createdAt,
      content: [
        `Monthly Update: ${u.startup.name} (${u.month} ${u.year})`,
        `Revenue: ${normalizeMoney(u.revenue)}`,
        `Expenses: ${normalizeMoney(u.expenses)}`,
        `Cash in bank: ${normalizeMoney(u.cashInBank)}`,
        `Growth rate: ${u.growthRate.toFixed(2)}%`,
        `Burn rate: ${normalizeMoney(u.burnRate)}`,
        `Runway: ${u.runway.toFixed(1)} months`,
        `Users: ${u.users.toLocaleString()}`,
        `New customers: ${u.newCustomers.toLocaleString()}`,
        `Achievements: ${truncateText(u.achievements, 360)}`,
        `Challenges: ${truncateText(u.challenges, 360)}`,
        `Posted: ${u.createdAt ? u.createdAt.toLocaleDateString() : "Unknown"}`,
      ].join("\n"),
    });

    // Add risk flag if challenges mention concerning terms
    if (/risk|cash|runway|burn|delay|churn|challenge/i.test(u.challenges)) {
      docs.push({
        id: `risk:monthly:${u.id}`,
        type: "risk",
        startupId: u.startupId,
        startupName: u.startup.name,
        createdAt: u.createdAt,
        content: `Risk Alert - ${u.startup.name}: ${u.challenges}. Burn: ${normalizeMoney(u.burnRate)}, Runway: ${u.runway.toFixed(1)} months`,
      });
    }
  }

  // Add startup updates
  for (const u of startupUpdates) {
    docs.push({
      id: `update:${u.id}`,
      type: "update",
      startupId: u.startupId,
      startupName: u.startup.name,
      createdAt: u.createdAt,
      content: [
        `Update from ${u.startup.name}: ${u.title ?? u.updateType}`,
        truncateText(u.content, 500),
        `Visibility: ${u.visibility}`,
        `Posted: ${u.createdAt ? u.createdAt.toLocaleDateString() : "Unknown"}`,
      ].join("\n"),
    });
  }

  // Add Sanity startup profiles (for company info queries)
  const sanityList = Array.isArray(sanityStartups) ? sanityStartups : sanityStartups ? [sanityStartups] : [];
  for (const s of sanityList) {
    if (!s?._id) continue;
    
    docs.push({
      id: `company:${s._id}`,
      type: "company",
      startupId: s._id,
      startupName: s.title,
      createdAt: s._createdAt ? new Date(s._createdAt) : undefined,
      content: [
        `Company: ${s.title ?? "Unknown"}`,
        `Category: ${s.category ?? "N/A"}`,
        `Description: ${truncateText(s.description, 420)}`,
        `Pitch: ${truncateText(s.pitch, 550)}`,
        `Founded: ${s._createdAt ? new Date(s._createdAt).getFullYear() : "Unknown"}`,
      ].join("\n"),
    });
  }

  // Expand query tokens with synonyms for better matching
  const expandedTokens = expandWithSynonyms(retrievalQuestion);
  
  // Score and rank documents
  const ranked = docs
    .map((doc) => ({ doc, score: scoreDoc(doc, expandedTokens, retrievalQuestion) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 15) // Increased from 10
    .map((r) => r.doc);

  // Get recent risks
  const risks = docs
    .filter((d) => d.type === "risk")
    .sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    })
    .slice(0, 5);

  // Build the context block
  const summary = [
    `Portfolio Summary (${investments.length} investments):`,
    `- Total invested: ${normalizeMoney(totalInvested)}`,
    ...(totalInvested > 0 ? [
      `- Portfolio value: ${normalizeMoney(portfolioValue)}`,
      `- Profit/Loss: ${normalizeMoney(totalProfit)}`,
      `- ROI: ${portfolioRoi.toFixed(2)}%`,
      `- MOIC: ${portfolioMoic.toFixed(2)}x`,
    ] : ["- No investments recorded yet."]),
    "",
    `Data availability:`,
    `- Investments: ${investments.length}`,
    `- Monthly updates: ${monthlyUpdates.length}`,
    `- Startup updates: ${startupUpdates.length}`,
    `- Company profiles: ${sanityList.length}`,
  ].join("\n");

  const riskBlock = risks.length
    ? `⚠️ Risk Alerts:\n${risks.map((r, i) => `${i + 1}. ${r.content}`).join("\n")}`
    : "";

  const retrievedBlock = ranked.length
    ? ranked
        .map((d, i) => `[${i + 1}] ${truncateText(d.content, 1200)}`)
        .join("\n\n")
    : "";

  const context = [
    summary,
    riskBlock,
    "---",
    "Relevant Information:",
    retrievedBlock || "No specific documents matched your query.",
  ].filter(Boolean).join("\n\n");

  return {
    hasData: docs.length > 0,
    context,
    debug: {
      investmentCount: investments.length,
      monthlyUpdatesCount: monthlyUpdates.length,
      rankedCount: ranked.length,
    },
  };
}
