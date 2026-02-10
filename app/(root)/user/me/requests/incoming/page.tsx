import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";
import { STARTUP_BY_ID_QUERY } from "@/sanity/lib/queries";
import { AcceptRequestButton } from "./AcceptRequestButton";

export default async function IncomingRequestsPage() {
  const { userId } = await auth();
  if (!userId) return <p>Not authenticated</p>;

  const requests = await prisma.startupRelationship.findMany({
    where: {
      founderId: userId, // ✅ Clerk ID
      status: "PENDING",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (requests.length === 0) {
    return <p>No incoming requests.</p>;
  }

  // Fetch startup details from Sanity for each request
  const enrichedRequests = await Promise.all(
    requests.map(async (req) => {
      const startup = await client.fetch(STARTUP_BY_ID_QUERY, { id: req.startupId });
      return { ...req, startup };
    })
  );

  return (
    <ul className="space-y-4">
      {enrichedRequests.map((req) => (
        <li key={req.id} className="border p-4 rounded">
          <h3 className="font-semibold">{req.startup?.title || "Unknown Startup"}</h3>
          <p>Investor ID: {req.investorId}</p>

          <AcceptRequestButton relationshipId={req.id} />
        </li>
      ))}
    </ul>
  );
}
