import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";
import { writeClient } from "@/sanity/lib/write-client";
import {
  AUTHOR_BY_USERNAME_QUERY,
  AUTHOR_BY_CLERK_ID_QUERY,
  STARTUPS_BY_CLERK_ID_QUERY,
} from "@/sanity/lib/queries";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserStartups from "@/components/UserStartups";
import UserPosts from "@/components/UserPosts";
import MonthlyUpdates from "@/components/MonthlyUpdates";
import FundingRounds from "@/components/FundingRounds";
import { StartupCardSkeleton } from "@/components/StartupCard";
import { getAllRequests } from "@/app/actions/requests";
import { RequestsTabs } from "@/components/requests/RequestsTabs";
import { BarChart3, Briefcase, LineChart, TrendingUp } from "lucide-react";

function formatCurrency(amount: number | null | undefined) {
  if (amount == null) return "N/A";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return "N/A";
  return `${value.toFixed(1)}%`;
}

function formatRunway(value: number | null | undefined) {
  if (value == null) return "N/A";
  return `${value.toFixed(1)} mo`;
}

const Page = async ({
  params,
}: {
  params: Promise<{ username: string }>;
}) => {
  const { username } = await params;

  const { userId } = await auth();

  // Determine if this is a Clerk ID (starts with user_) or a username
  const isClerkId = username.startsWith("user_");

  let user;
  if (isClerkId) {
    // Look up by Clerk ID
    user = await client.fetch(AUTHOR_BY_CLERK_ID_QUERY, { clerkId: username });
  } else {
    // Look up by username
    user = await client.fetch(AUTHOR_BY_USERNAME_QUERY, { username });
  }

  // If no author was found, but this is the signed-in user's own profile,
  // create a minimal author document on the fly instead of returning 404.
  if (!user) {
    if (isClerkId && userId && userId === username) {
      const safeUsername = username.replace("user_", "");

      user = await writeClient.create({
        _type: "author",
        clerkId: userId,
        username: safeUsername,
        name: "Anonymous",
        email: "",
        image: "",
        bio: "",
      });
    } else {
      return notFound();
    }
  }

  // ✅ CORRECT ownership check
  const isOwnProfile = user.clerkId === userId;

  const founderStartups = await client.fetch<
    Array<{
      _id: string;
      title?: string | null;
      category?: string | null;
      description?: string | null;
      views?: number | null;
      slug?: { current?: string | null } | null;
    }>
  >(STARTUPS_BY_CLERK_ID_QUERY, {
    clerkId: user.clerkId ?? "",
  });

  const startupMetrics = founderStartups.length
    ? await prisma.startup.findMany({
        where: {
          id: {
            in: founderStartups.map((startup) => startup._id),
          },
        },
        select: {
          id: true,
          currentRevenue: true,
          currentGrowthRate: true,
          currentBurnRate: true,
          currentRunway: true,
          currentValuation: true,
          lastUpdatedAt: true,
          growthStage: true,
        },
      })
    : [];

  const startupMetricsById = new Map(
    startupMetrics.map((startup) => [startup.id, startup]),
  );

  const founderOverview = {
    totalStartups: founderStartups.length,
    totalViews: founderStartups.reduce((sum, startup) => sum + (startup.views ?? 0), 0),
    avgGrowthRate:
      startupMetrics.length > 0
        ? startupMetrics.reduce((sum, startup) => sum + (startup.currentGrowthRate ?? 0), 0) /
          startupMetrics.length
        : null,
    highestValuation:
      startupMetrics.length > 0
        ? Math.max(...startupMetrics.map((startup) => startup.currentValuation ?? 0))
        : null,
  };

  const transformRequests = (
    requests: Awaited<ReturnType<typeof getAllRequests>>["received"]
  ) => {
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
      lastActivityAt: req.createdAt,
    }));
  };

  const requestData = isOwnProfile && userId ? await getAllRequests(userId) : null;
  const transformedReceived = requestData ? transformRequests(requestData.received) : [];
  const transformedSent = requestData ? transformRequests(requestData.sent) : [];
  const transformedArchived = requestData ? transformRequests(requestData.archived) : [];

  return (
    <section className="profile_container">
      <div className="profile_card">
        <div className="profile_title">
          <h3 className="text-24-black uppercase text-center line-clamp-1">
            {user.name}
          </h3>
        </div>

        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? "profile"}
            width={220}
            height={220}
            className="profile_image"
          />
        ) : (
          <div className="profile_image bg-gray-100 rounded-full w-[220px] h-[220px]" />
        )}

        <p className="text-30-extrabold mt-7 text-center">
          @{user.username}
        </p>
      </div>

      <div className="w-full rounded-[28px] border-[4px] border-black bg-[#111111] p-4 shadow-200">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-3 rounded-[22px] border-[3px] border-orange-500 bg-[#1a1a1a] p-2">
            <TabsTrigger
              value="overview"
              className="rounded-full border-2 border-transparent px-5 py-2 text-sm font-semibold text-orange-100 transition-all data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500 data-[state=active]:text-black"
            >
              Overview
            </TabsTrigger>

            {isOwnProfile && (
              <TabsTrigger
                value="posts"
                className="rounded-full border-2 border-transparent px-5 py-2 text-sm font-semibold text-orange-100 transition-all data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500 data-[state=active]:text-black"
              >
                Posts
              </TabsTrigger>
            )}

            {isOwnProfile && (
              <TabsTrigger
                value="funding-rounds"
                className="rounded-full border-2 border-transparent px-5 py-2 text-sm font-semibold text-orange-100 transition-all data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500 data-[state=active]:text-black"
              >
                Funding Rounds
              </TabsTrigger>
            )}

            {isOwnProfile && (
              <TabsTrigger
                value="monthly-updates"
                className="rounded-full border-2 border-transparent px-5 py-2 text-sm font-semibold text-orange-100 transition-all data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500 data-[state=active]:text-black"
              >
                Monthly Updates
              </TabsTrigger>
            )}

            {isOwnProfile && (
              <TabsTrigger
                value="requests"
                className="rounded-full border-2 border-transparent px-5 py-2 text-sm font-semibold text-orange-100 transition-all data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500 data-[state=active]:text-black"
              >
                Requests
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="mt-6 w-full flex-col gap-9">
            <section className="flex flex-col gap-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[22px] border-[3px] border-black bg-[#fff3e0] p-5 shadow-[6px_6px_0_0_#000]">
                  <div className="flex items-center gap-2 text-black">
                    <Briefcase className="h-5 w-5" />
                    <p className="text-sm font-semibold uppercase tracking-[0.18em]">Total Startups</p>
                  </div>
                  <p className="mt-3 text-3xl font-black text-black">{founderOverview.totalStartups}</p>
                </div>

                <div className="rounded-[22px] border-[3px] border-black bg-[#ffe7c2] p-5 shadow-[6px_6px_0_0_#000]">
                  <div className="flex items-center gap-2 text-black">
                    <BarChart3 className="h-5 w-5" />
                    <p className="text-sm font-semibold uppercase tracking-[0.18em]">Portfolio Views</p>
                  </div>
                  <p className="mt-3 text-3xl font-black text-black">{founderOverview.totalViews.toLocaleString()}</p>
                </div>

                <div className="rounded-[22px] border-[3px] border-black bg-[#fff3e0] p-5 shadow-[6px_6px_0_0_#000]">
                  <div className="flex items-center gap-2 text-black">
                    <TrendingUp className="h-5 w-5" />
                    <p className="text-sm font-semibold uppercase tracking-[0.18em]">Average Growth</p>
                  </div>
                  <p className="mt-3 text-3xl font-black text-black">{formatPercent(founderOverview.avgGrowthRate)}</p>
                </div>

                <div className="rounded-[22px] border-[3px] border-black bg-[#ffe7c2] p-5 shadow-[6px_6px_0_0_#000]">
                  <div className="flex items-center gap-2 text-black">
                    <LineChart className="h-5 w-5" />
                    <p className="text-sm font-semibold uppercase tracking-[0.18em]">Top Valuation</p>
                  </div>
                  <p className="mt-3 text-3xl font-black text-black">{formatCurrency(founderOverview.highestValuation)}</p>
                </div>
              </div>

              <div className="rounded-[24px] border-[3px] border-black bg-[#111111] p-6 shadow-200">
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold text-white">Startup Performance</h3>
                    <p className="mt-1 text-sm text-white/65">
                      Growth, revenue, runway, and valuation for the startups this founder is building.
                    </p>
                  </div>

                  {founderStartups.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {founderStartups.map((startup) => {
                        const metrics = startupMetricsById.get(startup._id);

                        return (
                          <div
                            key={startup._id}
                            className="rounded-[22px] border border-orange-500/30 bg-[#1a1a1a] p-5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="text-lg font-bold text-white">{startup.title || "Untitled Startup"}</h4>
                                <p className="text-sm text-white/55">{startup.category || "Category not set"}</p>
                              </div>
                              <div className="rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-200">
                                {metrics?.growthStage || "Building"}
                              </div>
                            </div>

                            <p className="mt-3 line-clamp-3 text-sm text-white/70">
                              {startup.description || "No startup summary has been added yet."}
                            </p>

                            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                                <p className="text-xs uppercase tracking-wide text-white/45">Growth Rate</p>
                                <p className="mt-1 font-semibold text-orange-300">{formatPercent(metrics?.currentGrowthRate)}</p>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                                <p className="text-xs uppercase tracking-wide text-white/45">Revenue</p>
                                <p className="mt-1 font-semibold text-white">{formatCurrency(metrics?.currentRevenue)}</p>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                                <p className="text-xs uppercase tracking-wide text-white/45">Burn Rate</p>
                                <p className="mt-1 font-semibold text-white">{formatCurrency(metrics?.currentBurnRate)}</p>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                                <p className="text-xs uppercase tracking-wide text-white/45">Runway</p>
                                <p className="mt-1 font-semibold text-white">{formatRunway(metrics?.currentRunway)}</p>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                                <p className="text-xs uppercase tracking-wide text-white/45">Valuation</p>
                                <p className="mt-1 font-semibold text-white">{formatCurrency(metrics?.currentValuation)}</p>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                                <p className="text-xs uppercase tracking-wide text-white/45">Last Updated</p>
                                <p className="mt-1 font-semibold text-white">
                                  {metrics?.lastUpdatedAt
                                    ? new Date(metrics.lastUpdatedAt).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      })
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-orange-500/30 bg-black/25 px-6 py-10 text-center text-sm text-white/60">
                      No startups added yet.
                    </div>
                  )}
              </div>

              <div>
                <div className="mb-4">
                  <h3 className="text-2xl font-bold text-white">Founder Startup Cards</h3>
                  <p className="mt-1 text-sm text-white/65">
                    Explore every startup this founder is building in full card view.
                  </p>
                </div>
                <ul className="card_grid-sm">
                  <Suspense fallback={<StartupCardSkeleton />}>
                    <UserStartups id={user.clerkId ?? ""} />
                  </Suspense>
                </ul>
              </div>
            </section>
          </TabsContent>

          {isOwnProfile && (
            <TabsContent value="posts" className="mt-6 w-full flex-col gap-9">
              <section className="flex flex-col lg:flex-row gap-8">
                <UserPosts userId={user.clerkId ?? ""} />
              </section>
            </TabsContent>
          )}

          {isOwnProfile && (
            <TabsContent value="funding-rounds" className="mt-6 w-full flex-col gap-9">
              <section className="flex flex-col lg:flex-row gap-8 w-full">
                <FundingRounds />
              </section>
            </TabsContent>
          )}

          {isOwnProfile && (
            <TabsContent value="monthly-updates" className="mt-6 w-full flex-col gap-9">
              <section className="flex flex-col lg:flex-row gap-8 w-full">
                <MonthlyUpdates />
              </section>
            </TabsContent>
          )}

          {isOwnProfile && (
            <TabsContent value="requests" className="mt-6 w-full flex-col gap-9">
              <section className="flex w-full flex-col gap-8">
                <div className="rounded-[26px] border-[3px] border-black bg-[#111111] p-5 shadow-200">
                  <div className="mb-5">
                    <h3 className="text-2xl font-bold text-white">Requests</h3>
                    <p className="mt-1 text-sm text-white/65">
                      Review both incoming investor interest and the requests you have sent.
                    </p>
                  </div>

                  <RequestsTabs
                    receivedRequests={transformedReceived}
                    sentRequests={transformedSent}
                    archivedRequests={transformedArchived}
                    initialIsSignedIn={Boolean(userId)}
                  />
                </div>
              </section>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </section>
  );
};

export default Page;

