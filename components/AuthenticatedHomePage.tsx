"use client";

import { motion, type Variants } from "framer-motion";
import SearchForm from "@/components/SearchForm";
import StartupCard, { StartupTypeCard } from "@/components/StartupCard";

type AuthenticatedHomePageProps = {
  query: string;
  posts: StartupTypeCard[];
};

const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
};

const gridReveal: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
};

export default function AuthenticatedHomePage({ query, posts }: AuthenticatedHomePageProps) {
  return (
    <>
      <motion.section
        className="pink_container"
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
      >
        <h1 className="heading">Pitch, Vote, and Grow</h1>
        <p className="sub-heading !max-w-3xl">
          Discover innovative startups, connect with founders, and explore opportunities.
        </p>
        <SearchForm query={query} />
      </motion.section>

      <motion.section
        className="section_container"
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.08 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mb-7 rounded-2xl border border-white/10 bg-[#121416] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.22)] md:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Discover</p>
            {query ? (
              <span className="rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-300">
                Filtered
              </span>
            ) : null}
          </div>

          <h2 className="mt-2 text-30-semibold leading-tight !text-white">
            {query ? (
              <>
                <span className="text-white">Search results for </span>
                <span className="text-orange-400">&quot;{query}&quot;</span>
              </>
            ) : (
              <span className="text-white">All Startups</span>
            )}
          </h2>

          <p className="mt-2 text-sm text-white/60">
            {posts.length} {posts.length === 1 ? "startup" : "startups"} available
          </p>
        </motion.div>

        {posts?.length ? (
          <motion.ul className="mt-7 card_grid" variants={gridReveal} initial="hidden" animate="visible">
            {posts.map((post) => (
              <StartupCard key={post._id} post={post} />
            ))}
          </motion.ul>
        ) : (
          <motion.p
            className="no-result mt-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            No startups found.
          </motion.p>
        )}
      </motion.section>
    </>
  );
}
