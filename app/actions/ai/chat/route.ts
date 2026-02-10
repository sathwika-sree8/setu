import { NextResponse } from "next/server";
import groq from "@/lib/ai/groq";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const { question, userId } = await req.json();

    if (!question || !userId) {
      return NextResponse.json(
        { answer: "Invalid request." },
        { status: 400 }
      );
    }

    // 🔒 Rate limiting
    const allowed = rateLimit(userId);
    if (!allowed) {
      return NextResponse.json(
        { answer: "Rate limit exceeded. Please wait a minute." },
        { status: 429 }
      );
    }

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `
You are a startup investment platform assistant.

Rules:
- Answer ONLY using provided context
- Never guess or infer
- Say when data is missing
- Say when data is outdated
- Mention dates explicitly
          `.trim(),
        },
        {
          role: "user",
          content: question,
        },
      ],
      temperature: 0,
      max_tokens: 300,
    });

    const answer =
      response.choices[0]?.message?.content ??
      "No answer could be generated.";

    return NextResponse.json({ answer });
  } catch (error: any) {
    console.error("Groq error:", error);

    // 🛟 Fallback message
    return NextResponse.json({
      answer:
        "The AI service is temporarily unavailable. Please try again shortly.",
    });
  }
}
