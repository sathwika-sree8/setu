import { sendMessage } from "@/app/actions/chat";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { relationshipId, content } = body;

    if (!relationshipId || !content) {
      return NextResponse.json(
        { error: "Relationship ID and content are required" },
        { status: 400 }
      );
    }

    const result = await sendMessage(relationshipId, content);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

