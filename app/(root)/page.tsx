import { auth } from "@clerk/nextjs/server";
import LandingPageClient from "@/components/LandingPageClient";
import { StartupTypeCard } from "@/components/StartupCard";
import AuthenticatedHomePage from "@/components/AuthenticatedHomePage";
import { client, isSanityReady } from "@/sanity/lib/client";
import { STARTUPS_QUERY } from "@/sanity/lib/queries";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ query?: string }>;
}) {
  const { userId } = await auth();

  // 🚫 NOT LOGGED IN → CARTA STYLE LANDING
  if (!userId) {
    return <LandingPageClient />;
  }

  const search = searchParams ? await searchParams : undefined;
  const query = search?.query?.trim() || "";

  if (!isSanityReady()) {
    return (
      <main className="section_container">
        <h1 className="heading">All Startups</h1>
        <p className="no-result mt-6">Sanity is not configured. Please check environment variables.</p>
      </main>
    );
  }

  const posts = await client.fetch(STARTUPS_QUERY, {
    search: query ? `*${query}*` : "",
  });

  return <AuthenticatedHomePage query={query} posts={posts as StartupTypeCard[]} />;
}