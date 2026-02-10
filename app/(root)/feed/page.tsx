import CreateGlobalPost from "@/components/CreateGlobalPost";
import GlobalFeed from "@/components/GlobalFeed";

const Page = async () => {
  return (
    <section className="section_container">
      <h1 className="text-30-bold mb-6">Founder Feed</h1>

      <CreateGlobalPost />
      <GlobalFeed />
    </section>
  );
};

export default Page;
