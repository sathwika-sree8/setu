import { auth } from "@clerk/nextjs/server";
import { client } from "@/sanity/lib/client";
import { AUTHOR_BY_USERNAME_QUERY, AUTHOR_BY_CLERK_ID_QUERY } from "@/sanity/lib/queries";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserStartups from "@/components/UserStartups";
import UserPosts from "@/components/UserPosts";
import FounderRequests from "@/components/FounderRequests";
import { StartupCardSkeleton } from "@/components/StartupCard";

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

  if (!user) return notFound();

  // ✅ CORRECT ownership check
  const isOwnProfile = user.clerkId === userId;

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
        <p className="mt-1 text-center text-14-normal">{user.bio}</p>
      </div>

      <div className="profile_tabs">
        <Tabs defaultValue="startups" className="w-full">
          <TabsList className="profile_tab-list">
            <TabsTrigger value="startups" className="profile_tab">
              Startups
            </TabsTrigger>

            {isOwnProfile && (
              <TabsTrigger value="posts" className="profile_tab">
                Posts
              </TabsTrigger>
            )}

            {isOwnProfile && (
              <TabsTrigger value="requests" className="profile_tab">
                Requests
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="startups" className="w-full flex flex-col mt-9 gap-9">
            <section className="flex flex-col lg:flex-row gap-8">
              <ul className="card_grid-sm">
                  <Suspense fallback={<StartupCardSkeleton />}>
                  <UserStartups id={user.clerkId ?? ""} />
                </Suspense>
              </ul>
            </section>
          </TabsContent>

          {isOwnProfile && (
            <TabsContent value="posts" className="w-full flex flex-col mt-9 gap-9">
              <section className="flex flex-col lg:flex-row gap-8">
                <UserPosts userId={user.clerkId ?? ""} />
              </section>
            </TabsContent>
          )}

          {isOwnProfile && (
            <TabsContent value="requests" className="w-full flex flex-col mt-9 gap-9">
              <section className="flex flex-col lg:flex-row gap-8">
                <FounderRequests founderId={user.clerkId ?? ""} />
              </section>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </section>
  );
};

export default Page;

