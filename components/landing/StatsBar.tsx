"use client";

import { motion } from "framer-motion";

interface StatItem {
  value: string;
  label: string;
  highlight?: boolean;
}

const defaultStats: StatItem[] = [
  { value: "500", label: "Allocated Seats", highlight: true },
  { value: "50,000", label: "Tested Concurrency" },
  { value: "0", label: "Overselling / Dups" },
  { value: "< 2ms", label: "Lua Latency" },
];

export function StatsBar({ stats = defaultStats }: { stats?: StatItem[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4 }}
      className="relative z-30 w-full max-w-3xl mx-auto px-4"
    >
      <div className="relative rounded-2xl md:rounded-full bg-[#050b1a]/90 backdrop-blur-2xl border border-white/[0.08] hover:border-cyan-500/30 transition-all duration-500 px-6 py-3.5 shadow-[0_15px_45px_rgba(0,0,0,0.85)] flex flex-col md:flex-row items-center justify-between gap-5 md:gap-7">

        {/* Subtle Ambient Cyan Glow on hover */}
        <div className="absolute inset-0 rounded-2xl md:rounded-full bg-gradient-to-r from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none" />

        {/* Left: Avatar Stack & Trust Statement for FairDrop */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex -space-x-2 overflow-hidden">
            <div className="inline-block h-7 w-7 rounded-full ring-2 ring-[#050b1a] bg-gradient-to-tr from-blue-700 to-cyan-500 overflow-hidden flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
              FD
            </div>
            <div className="inline-block h-7 w-7 rounded-full ring-2 ring-[#050b1a] bg-gradient-to-tr from-indigo-800 to-blue-600 overflow-hidden flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
              QA
            </div>
            <div className="inline-block h-7 w-7 rounded-full ring-2 ring-[#050b1a] bg-gradient-to-tr from-cyan-900 to-cyan-600 overflow-hidden flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
              50K
            </div>
            <div className="inline-block h-7 w-7 rounded-full ring-2 ring-[#050b1a] bg-gradient-to-tr from-sky-900 to-blue-700 overflow-hidden flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
              500
            </div>
          </div>
          <div className="text-left leading-tight">
            <p className="text-[12px] font-medium text-gray-200">
              Verified with <span className="text-cyan-400 font-semibold">50,000 users</span>
            </p>
            <p className="text-[10px] text-gray-500 font-light">adversarially stress-tested</p>
          </div>
        </div>

        {/* Vertical Divider on Desktop */}
        <div className="hidden md:block h-7 w-[1px] bg-white/[0.08]" />

        {/* Right: Key FairDrop Metrics */}
        <div className="flex items-center justify-between sm:justify-start gap-6 sm:gap-7 w-full md:w-auto text-center md:text-left">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col items-center md:items-start group cursor-default">
              <span
                className={`text-base md:text-lg font-bold tracking-tight font-mono transition-transform duration-300 group-hover:scale-105 ${stat.highlight
                    ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]"
                    : "text-white"
                  }`}
              >
                {stat.value}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
