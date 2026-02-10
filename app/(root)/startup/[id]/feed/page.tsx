import CreateFounderPost from "@/components/CreateFounderPost";
import FounderFeed from "@/components/FounderFeed";
import { client } from "@/sanity/lib/client";
import { STARTUP_BY_ID_QUERY } from "@/sanity/lib/queries";
import { notFound } from "next/navigation";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  const post = await client.fetch(STARTUP_BY_ID_QUERY, { id });
  if (!post) return notFound();

  return (
    <section className="section_container">
      <h1 className="text-30-bold mb-2">
        {post.title} — Founder Updates
      </h1>

      <p className="text-black-300 mb-6">
        Follow progress, milestones, and community feedback
      </p>

      <CreateFounderPost
        startupId={id}
        authorId={post.author?._id}
      />

      <FounderFeed startupId={id} />
    </section>
  );
};

export default Page;

