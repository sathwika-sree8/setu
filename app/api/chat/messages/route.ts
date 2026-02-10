import { getMessages } from "@/app/actions/chat";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const relationshipId = searchParams.get("relationshipId");

    if (!relationshipId) {
      return NextResponse.json(
        { error: "Relationship ID is required" },
        { status: 400 }
      );
    }

    const { messages, relationship } = await getMessages(relationshipId);

    if (!relationship) {
      return NextResponse.json(
        { error: "Chat not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ messages, relationship });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

