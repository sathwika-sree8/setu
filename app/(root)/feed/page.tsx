import CreateGlobalPost from "@/components/CreateGlobalPost";
import GlobalFeed from "@/components/GlobalFeed";

const Page = async () => {
  return (
    <main className="min-h-[calc(100vh-72px)] bg-transparent py-8 px-4">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:flex-row">
        {/* Center column: composer + feed */}
        <div className="w-full md:max-w-2xl md:flex-[2]">
          <CreateGlobalPost />
          <GlobalFeed />
        </div>

        {/* Right rail: simple suggestions/summary like LinkedIn */}
        <aside className="mt-4 hidden md:block md:flex-1">
          <div className="rounded-2xl border-[4px] border-black dark:border-white/10 bg-white dark:bg-black-200 p-4 shadow-200 dark:shadow-none">
            <h2 className="text-16-medium mb-2">Why founders post here</h2>
            <ul className="space-y-1 text-sm text-black-100 dark:text-white/60">
              <li>Share monthly updates with existing investors.</li>
              <li>Get discovered by new angels and funds.</li>
              <li>Keep your fundraising narrative in one place.</li>
            </ul>
          </div>

          <div className="mt-4 rounded-2xl border-[4px] border-black dark:border-white/10 bg-primary-100 dark:bg-black-200 p-4 shadow-200 dark:shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black dark:text-white mb-2">
              Tip
            </p>
            <p className="text-sm text-black-200 dark:text-white/70">
              Short, specific traction updates perform best – think new partners,
              revenue milestones, or product launches.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
};

export default Page;
