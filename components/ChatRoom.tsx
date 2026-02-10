"use client";

import { sendMessageForm, acceptDealForm, rejectDeal } from "@/app/actions/dealRoom";

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: Date;
}

interface ChatRoomProps {
  relationship: {
    id: string;
    status: string;
    founderId: string;
    messages: Message[];
  };
  currentUserId: string;
}


export default function ChatRoom({ relationship, currentUserId }: ChatRoomProps) {
  const isFounder = relationship.founderId === currentUserId;
  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {relationship.messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          relationship.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === currentUserId
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.senderId === currentUserId
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                <p>{message.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {new Date(message.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ✅ FORM-BASED SERVER ACTION */}
      {relationship.status === "IN_DISCUSSION" && (
        <form
          action={sendMessageForm as any}
          className="p-4 border-t bg-white flex gap-2"
        >
          <input
            type="hidden"
            name="relationshipId"
            value={relationship.id}
          />

          <input
            type="text"
            name="content"
            placeholder="Type a message..."
            required
            className="flex-1 border rounded-lg px-4 py-2"
          />

          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-2 rounded-lg"
          >
            Send
          </button>
        </form>
      )}
           {/* 🧾 DEAL DECISION */}
      {isFounder && relationship.status === "IN_DISCUSSION" && (
        <div className="border-t p-4 bg-gray-50 space-y-3">
          <h3 className="font-semibold text-gray-700">
            Deal Decision
          </h3>

          <form action={acceptDealForm as any}>
            <input type="hidden" name="relationshipId" value={relationship.id} />
            <button className="btn-primary w-full">
              Accept Deal
            </button>
          </form>

          <form action={rejectDeal as any}>
            <input type="hidden" name="relationshipId" value={relationship.id} />
            <button className="btn-secondary w-full">
              Reject Deal
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
