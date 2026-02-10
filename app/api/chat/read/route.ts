import { markMessagesAsRead } from "@/app/actions/chat";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { relationshipId } = body;

    if (!relationshipId) {
      return NextResponse.json(
        { error: "Relationship ID is required" },
        { status: 400 }
      );
    }

    const result = await markMessagesAsRead(relationshipId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json(
      { error: "Failed to mark messages as read" },
      { status: 500 }
    );
  }
}

