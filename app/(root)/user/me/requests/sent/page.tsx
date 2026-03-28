import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";
import { STARTUP_BY_ID_QUERY } from "@/sanity/lib/queries";

export default async function SentRequestsPage() {
  const { userId } = await auth();
  if (!userId) return <p>Not authenticated</p>;

  const requests = await prisma.startupRelationship.findMany({
    where: {
      investorId: userId, // Clerk ID of the investor
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (requests.length === 0) {
    return <p className="text-black dark:text-white">No sent requests.</p>;
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
        <li key={req.id} className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-black-200 p-4">
          <h3 className="font-semibold text-black dark:text-white">{req.startup?.title || "Unknown Startup"}</h3>
          <p className="text-black-200 dark:text-white/70">Status: {req.status}</p>
          <p className="text-black-200 dark:text-white/70">Sent on: {new Date(req.createdAt).toLocaleDateString()}</p>
          
          {(req.status === "IN_DISCUSSION" || req.status === "DEAL_ACCEPTED") && (
            <p className="text-gray-500 dark:text-white/60 mt-2">
              Chat is available in the messages icon.
            </p>
          )}
          
          {req.status === "PENDING" && (
            <p className="text-gray-500 dark:text-white/60 mt-2">Waiting for founder approval...</p>
          )}
        </li>
      ))}
    </ul>
  );
}

