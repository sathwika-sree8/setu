import { Suspense } from "react";
import { client, isSanityReady } from "@/sanity/lib/client";
import {
  PLAYLIST_BY_SLUG_QUERY,
  STARTUP_BY_ID_QUERY,
} from "@/sanity/lib/queries";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";

import markdownit from "markdown-it";
import { Skeleton } from "@/components/ui/skeleton";
import View from "@/components/View";
import StartupCard, { StartupTypeCard } from "@/components/StartupCard";
import CreateFounderPost from "@/components/CreateFounderPost";
import FounderFeed from "@/components/FounderFeed";
import StartupUpdatesFeed from "@/components/StartupUpdatesFeed";
import { prisma } from "@/lib/prisma";

const md = markdownit();

const Page = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const { userId } = await auth();

  // Validate id is a string
  if (!id || typeof id !== "string") {
    return notFound();
  }

  // If Sanity is not configured, return notFound early
  if (!isSanityReady()) {
    return notFound();
  }

  const [post, playlist] = await Promise.all([
    client.fetch(STARTUP_BY_ID_QUERY, { id }),
    client.fetch(PLAYLIST_BY_SLUG_QUERY, {
      slug: "editor-picks-new",
    }),
  ]);

  if (!post) return notFound();

  // Check user permissions
  const isFounder = post.author?.clerkId === userId;
  
  let isInvestor = false;
  if (userId && !isFounder) {
    const relationship = await prisma.startupRelationship.findFirst({
      where: {
        startupId: id,
        investorId: userId,
        status: "DEAL_ACCEPTED",
      },
    });
    isInvestor = !!relationship;
  }

  const editorPosts = playlist?.select || [];
  const parsedContent = md.render(post.pitch || "");

  return (
    <>
      {/* Header */}
      <section className="pink_container !min-h-[230px]">
        <p className="tag">{formatDate(post._createdAt)}</p>
        <h1 className="heading">{post.title}</h1>
        <p className="sub-heading !max-w-5xl">{post.description}</p>
      </section>

      {/* Main */}
      <section className="section_container">
        <img
          src={post.image}
          alt="thumbnail"
          className="w-full h-auto rounded-xl"
        />

        <div className="space-y-5 mt-10 max-w-4xl mx-auto">
          <div className="flex-between gap-5">
            {/* SAFE PROFILE LINK */}
            {post.author?.username && (
              <Link
                href={`/user/${post.author.username}`}
                className="flex gap-2 items-center mb-3"
              >
                <Image
                  src={post.author.image}
                  alt="avatar"
                  width={64}
                  height={64}
                  className="rounded-full drop-shadow-lg"
                />

                <div>
                  <p className="text-20-medium">{post.author.name}</p>
                  <p className="text-16-medium !text-black-300">
                    @{post.author.username}
                  </p>
                </div>
              </Link>
            )}

            <p className="category-tag">{post.category}</p>
          </div>

          <h3 className="text-30-bold">Pitch Details</h3>

          {parsedContent ? (
            <article
              className="prose max-w-4xl font-work-sans break-all"
              dangerouslySetInnerHTML={{ __html: parsedContent }}
            />
          ) : (
            <p className="no-result">No details provided</p>
          )}
        </div>

        <hr className="divider" />

        {/* Editor Picks */}
        {editorPosts.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <p className="text-30-semibold">Editor Picks</p>
            <ul className="mt-7 card_grid-sm">
              {editorPosts.map((item: any, index: number) => (
                <StartupCard key={item._id || index} post={item as unknown as StartupTypeCard} />
              ))}
            </ul>
          </div>
        )}

        <Suspense fallback={<Skeleton className="view_skeleton" />}>
          <View id={id} />
        </Suspense>
      </section>

      {/* Founder Updates Section */}
      <section className="section_container mt-10">
        <h2 className="text-30-bold mb-4">Founder Updates</h2>

        {/* Only show create form if user is the founder */}
        {isFounder && (
          <div className="mb-6">
                <CreateFounderPost
                  startupId={id}
                  authorId={userId!}
                  isStartupUpdate={true}
                />
          </div>
        )}

        {/* Updates feed with visibility filtering */}
        <StartupUpdatesFeed
          startupId={id}
          viewerId={userId ?? undefined}
          isFounder={isFounder || isInvestor}
        />
      </section>
    </>
  );
};

export default Page;

