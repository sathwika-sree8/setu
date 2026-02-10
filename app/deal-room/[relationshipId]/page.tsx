import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ChatRoom from "@/components/ChatRoom";

export default async function DealRoomPage({
  params,
}: {
  params: Promise<{ relationshipId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { relationshipId } = await params;

  const relationship = await prisma.startupRelationship.findUnique({
    where: { id: relationshipId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!relationship) redirect("/user/me");

  // Chat not unlocked yet
  if (!["IN_DISCUSSION", "DEAL_ACCEPTED"].includes(relationship.status)) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold mb-2">Deal Room Not Accessible</h1>
        <p className="text-gray-500">
          Please wait for the founder to accept your request.
        </p>
      </div>
    );
  }

  // Access control
  const isFounder = relationship.founderId === userId;
  const isInvestor = relationship.investorId === userId;

  if (!isFounder && !isInvestor) {
    redirect("/user/me");
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-2">Deal Room</h1>
      <p className="text-gray-500 mb-4">
        {isFounder ? "Chat with the investor" : "Chat with the founder"}
      </p>
      <ChatRoom relationship={relationship} currentUserId={userId} />
    </div>
  );
}
