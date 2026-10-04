"use client";

import { motion } from "framer-motion";
import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  floatDelay?: number;
  floatDuration?: number;
  floatY?: number;
  glowIntensity?: "prominent" | "subtle";
  className?: string;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  href = "/drop",
  floatDelay = 0,
  floatDuration = 5,
  floatY = 5,
  glowIntensity = "prominent",
  className = "",
}: FeatureCardProps) {
  const isProminent = glowIntensity === "prominent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{
        opacity: 1,
        y: [0, -floatY, 0],
      }}
      transition={{
        opacity: { duration: 0.6, delay: floatDelay * 0.15 },
        y: {
          duration: floatDuration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: floatDelay,
        },
      }}
      whileHover={{
        y: -4,
        scale: 1.02,
        transition: { duration: 0.25, ease: "easeOut" },
      }}
      className={`group relative w-[250px] sm:w-[260px] p-5 rounded-[22px] transition-all duration-400 flex flex-col justify-between overflow-hidden cursor-pointer select-none ${className}`}
      style={{
        // Authentic translucent glass: smoky dark base with high blur and saturation
        background: "rgba(10, 16, 32, 0.42)",
        backdropFilter: "blur(20px) saturate(190%)",
        WebkitBackdropFilter: "blur(20px) saturate(190%)",
        // Crisp hairline glass border with top rim highlight
        border: "1px solid rgba(255, 255, 255, 0.09)",
        borderTop: "1px solid rgba(255, 255, 255, 0.22)",
        boxShadow: isProminent
          ? "0 20px 45px -12px rgba(0, 0, 0, 0.75), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2), 0 0 35px -8px rgba(6, 182, 212, 0.15)"
          : "0 20px 45px -12px rgba(0, 0, 0, 0.75), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)",
      }}
    >
      {/* ─── 1. Ambient Colored Top Radiance (Exact Nexora glass glow) ─── */}
      <div
        className={`absolute inset-x-0 top-0 h-28 pointer-events-none rounded-t-[22px] transition-opacity duration-500 ${
          isProminent ? "opacity-90 group-hover:opacity-100" : "opacity-50 group-hover:opacity-80"
        }`}
        style={{
          background: isProminent
            ? "radial-gradient(110% 90% at 50% -10%, rgba(6, 182, 212, 0.32) 0%, rgba(37, 99, 235, 0.16) 45%, transparent 80%)"
            : "radial-gradient(110% 90% at 50% -10%, rgba(6, 182, 212, 0.18) 0%, rgba(37, 99, 235, 0.08) 45%, transparent 80%)",
        }}
      />

      {/* ─── 2. Top Specular Rim Reflection ─── */}
      <div
        className="absolute top-0 inset-x-4 h-[1px] pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.5) 50%, transparent 100%)",
        }}
      />

      {/* ─── 3. Top Row: Rounded Icon Squircle Badge ─── */}
      <div className="relative z-10 mb-3.5">
        <div
          className="w-9 h-9 rounded-[11px] flex items-center justify-center text-cyan-300 transition-all duration-300 group-hover:scale-105"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 0 12px rgba(6, 182, 212, 0.15)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Icon className="w-4 h-4 text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
        </div>
      </div>

      {/* ─── 4. Middle: Typography (Compact, Punchy, High Clarity) ─── */}
      <div className="relative z-10 space-y-1 mb-2">
        <h3 className="text-[14px] sm:text-[15px] font-semibold text-white tracking-tight group-hover:text-cyan-100 transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {title}
        </h3>
        <p className="text-[11.5px] sm:text-[12px] text-zinc-300/80 leading-relaxed font-light drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {description}
        </p>
      </div>

      {/* ─── 5. Bottom Right: Sleek Circular Arrow Button ─── */}
      <div className="relative z-10 flex justify-end pt-1">
        <Link
          href={href}
          aria-label={`Open ${title}`}
          className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-gray-400 transition-all duration-300 group-hover:bg-gradient-to-tr group-hover:from-blue-600 group-hover:to-cyan-500 group-hover:text-white group-hover:border-cyan-400 group-hover:shadow-[0_0_12px_rgba(6,182,212,0.6)] group-hover:scale-105"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(6px)",
          }}
        >
          <ArrowRight className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform duration-300" />
        </Link>
      </div>
    </motion.div>
  );
}
