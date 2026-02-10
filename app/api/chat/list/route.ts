import { getMyChats } from "@/app/actions/chat";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { chats, totalUnread } = await getMyChats();
    return NextResponse.json({ chats, totalUnread });
  } catch (error) {
    console.error("Error fetching chat list:", error);
    return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 });
  }
}

