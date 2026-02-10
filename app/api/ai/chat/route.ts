import { auth } from "@clerk/nextjs/server";
import { detectIntent } from "@/app/actions/ai/intent";
import {
  getUserInvestments,
  getLatestRevenue,
} from "@/app/actions/ai/retrieval";
import { investmentsToContext } from "@/app/actions/ai/context";
import { freshness } from "@/app/actions/ai/freshness";
import { generateAnswer } from "@/app/actions/ai/llm";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// In-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW = 60 * 1000;

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

    const { question, startupId } = await req.json();
    if (!question) {
      return Response.json({ error: "Question is required" }, { status: 400 });
    }

    // Handle greeting immediately
    const lowerQuestion = question.toLowerCase().trim();
    if (
      lowerQuestion === "hello" ||
      lowerQuestion === "hi" ||
      lowerQuestion === "hey" ||
      lowerQuestion === "hi!"
    ) {
      const answer = getGreetingResponse();

      await prisma.aIChatMemory.create({
        data: {
          userId,
          role: "INVESTOR",
          question,
          answer,
        },
      });

      return Response.json({ answer });
    }

    // Get intent and context for the query
    const intent = await detectIntent(question);
    let context = "No relevant data found.";

    if (intent === "MY_INVESTMENTS") {
      const investments = await getUserInvestments(userId);
      context = investmentsToContext(investments);
    }

    if (intent === "REVENUE_QUERY" && startupId) {
      const rev = await getLatestRevenue(startupId);
      await freshness(rev?.createdAt);

      if (rev) {
        const ageDays =
          (Date.now() - new Date(rev.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        const isStale = ageDays > 180;
        context =
          `Revenue data for this startup:\n${rev.content}\nLast updated: ${rev.createdAt.toISOString()}\nData age: ${Math.round(ageDays)} days\nStatus: ${isStale ? "Data may be outdated" : "Data is recent"}`.trim();
} else {
        context = "No revenue data available for this startup.";
      }
    }

    // Fallback: Ensure context is never empty
    if (!context || context.trim().length === 0) {
      context = "There is currently no data available to answer this question.";
    }

    let answer: string;

    try {
      answer = await generateAnswer({ question, context });
    } catch (llmError) {
      console.error("[AI LLM Error]", llmError);
      // Fallback response
      answer =
        "I apologize, but I encountered an issue processing your request. Please try again.";
    }

    // Save to memory
    await prisma.aIChatMemory.create({
      data: {
        userId,
        role: "INVESTOR",
        question,
        answer,
      },
    });

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
