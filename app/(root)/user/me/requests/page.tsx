import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAllRequests } from "@/app/actions/requests";
import { RequestsTabs } from "@/components/requests/RequestsTabs";
import { client } from "@/sanity/lib/client";
import { AUTHOR_BY_CLERK_ID_QUERY } from "@/sanity/lib/queries";

export default async function RequestsPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  // Fetch user profile from Sanity
  const user = await client.fetch(AUTHOR_BY_CLERK_ID_QUERY, { clerkId: userId });

  // Fetch all requests
  const { received, sent, archived } = await getAllRequests(userId);

  // Transform data for RequestCard
  // Accept an optional `type` argument for compatibility with callers.
  const transformRequests = (requests: any[], _type?: "received" | "sent" | "archived") => {
    return requests.map((req) => ({
      id: req.id,
      startupId: req.startupId,
      startupName: req.startup?.title || "Unknown Startup",
      startupSlug: req.startup?.slug?.current,
      founderId: req.founderId,
      founderName: req.founder?.name,
      founderImage: req.founder?.image,
      investorId: req.investorId,
      investorName: req.investor?.name,
      investorImage: req.investor?.image,
      status: req.status,
      createdAt: req.createdAt,
      lastActivityAt: req.updatedAt || req.createdAt,
    }));
  };

  const transformedReceived = transformRequests(received);
  const transformedSent = transformRequests(sent);
  const transformedArchived = transformRequests(archived);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Investment Requests</h1>
        <p className="text-gray-500 dark:text-white/60 mt-2">
          Manage your investment requests and track deal progress.
        </p>
      </div>

      <RequestsTabs
        receivedRequests={transformedReceived}
        sentRequests={transformedSent}
        archivedRequests={transformedArchived}
        initialIsSignedIn={Boolean(userId)}
      />
    </div>
  );
}

