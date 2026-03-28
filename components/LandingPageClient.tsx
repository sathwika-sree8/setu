"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { motion } from "framer-motion";

export default function LandingPageClient() {
  const chartBars = [35, 52, 64, 48, 72, 86, 94];

  return (
    <main className="bg-black text-white">
      <section className="min-h-screen flex items-center justify-between px-10 max-w-7xl mx-auto">
        <div className="max-w-xl space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-6xl font-semibold leading-tight"
          >
            Where capital meets founders
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-lg"
          >
            Setu connects investors and startups with real-time data, insights, and decisions.
          </motion.p>

          <div className="flex gap-4">
            <SignInButton>
              <button className="bg-orange-500 hover:bg-orange-400 transition-colors px-6 py-3 rounded-lg font-medium">
                Login
              </button>
            </SignInButton>

            <SignUpButton>
              <button className="border border-white/20 px-6 py-3 rounded-lg">Create account</button>
            </SignUpButton>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="relative w-[400px] h-[400px] rounded-2xl border border-white/10 bg-black-200 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/25 via-transparent to-orange-500/10" />

            <div className="absolute inset-x-6 top-6 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Portfolio Growth</p>
              <p className="text-xs text-gray-400">Last 7 months</p>
            </div>

            <div className="absolute inset-x-6 bottom-12 top-16">
              <div className="absolute inset-0 rounded-xl border border-white/10 bg-black/20" />

              <div className="absolute inset-4 flex items-end gap-3">
                {chartBars.map((value, idx) => (
                  <div key={idx} className="flex h-full flex-1 items-end">
                    <motion.div
                      initial={{ height: 0, opacity: 0.5 }}
                      animate={{ height: `${value}%`, opacity: 1 }}
                      transition={{ duration: 0.7, delay: idx * 0.1, ease: "easeOut" }}
                      className="w-full rounded-t-md bg-gradient-to-t from-orange-500 to-orange-400"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute inset-x-6 bottom-5 flex items-center justify-between text-[11px] text-gray-400">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 text-center space-y-10">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-5xl font-semibold"
        >
          All together now
        </motion.h2>

        <div className="flex justify-center gap-8 text-gray-400">
          {["Investor", "Founder", "CFO", "Employee"].map((role, i) => (
            <motion.div
              key={role}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="px-6 py-2 border border-white/10 rounded-full"
            >
              {role}
            </motion.div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20 space-y-20">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          className="grid md:grid-cols-2 gap-10 items-center"
        >
          <div>
            <h3 className="text-3xl font-semibold">Track every startup in one place</h3>
            <p className="text-gray-400 mt-4">Monitor revenue, growth, burn rate, and runway in real time.</p>
          </div>
          <div className="bg-[#111118] p-6 rounded-xl border border-white/10">
            <p>Revenue: $120K</p>
            <p>Growth: +18%</p>
            <p>Runway: 12 months</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          className="grid md:grid-cols-2 gap-10 items-center"
        >
          <div className="bg-[#111118] p-6 rounded-xl border border-white/10">
            <p>Monthly Update</p>
            <p className="text-gray-400 mt-2">Launched new AI feature and closed enterprise deal.</p>
          </div>
          <div>
            <h3 className="text-3xl font-semibold">Real-time founder updates</h3>
            <p className="text-gray-400 mt-4">Stay informed without chasing founders.</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <h3 className="text-3xl font-semibold">Ask anything about your portfolio</h3>
          <p className="text-gray-400 mt-4">AI-powered insights to help you make better decisions.</p>
        </motion.div>
      </section>

      <section className="py-32 text-center space-y-6">
        <h2 className="text-4xl font-semibold">Join Setu</h2>

        <div className="flex justify-center gap-4">
          <SignInButton>
            <button className="bg-orange-500 hover:bg-orange-400 transition-colors px-6 py-3 rounded-lg">Login</button>
          </SignInButton>

          <SignUpButton>
            <button className="border border-white/20 px-6 py-3 rounded-lg">Create account</button>
          </SignUpButton>
        </div>
      </section>
    </main>
  );
}
