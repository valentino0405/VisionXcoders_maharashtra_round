"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { 
  ArrowRight, 
  Cpu, 
  ShieldCheck, 
  Activity, 
  Fingerprint, 
  Zap, 
  Lock, 
  Users, 
  CheckCircle2, 
  Sparkles,
  Server,
  Layers,
  Scale,
  Clock
} from "lucide-react";
import { LiquidCursor } from "@/components/landing/LiquidCursor";
import { GlowingOrb } from "@/components/landing/GlowingOrb";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { StatsBar } from "@/components/landing/StatsBar";
import { useState } from "react";

export default function Home() {
  const [simRunning, setSimRunning] = useState(false);
  const [simProgress, setSimProgress] = useState(482);

  const triggerSim = () => {
    if (simRunning) return;
    setSimRunning(true);
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setSimProgress((prev) => Math.min(500, prev + 2));
      if (count > 9) {
        clearInterval(interval);
        setSimRunning(false);
      }
    }, 150);
  };

  return (
    <main className="relative flex flex-col items-center bg-[#030611] text-white w-full overflow-hidden min-h-screen selection:bg-cyan-500/30 selection:text-cyan-200">
      <LiquidCursor />

      {/* ─── Ambient Atmospheric Edge Glows (Electric Blue & Cyan) ─── */}
      <div 
        className="fixed top-0 left-0 w-[420px] h-[700px] pointer-events-none z-0 opacity-40 blur-[130px]"
        style={{
          background: "radial-gradient(ellipse at 0% 45%, rgba(6, 182, 212, 0.28) 0%, rgba(37, 99, 235, 0.15) 50%, transparent 70%)"
        }}
      />
      <div 
        className="fixed top-0 right-0 w-[420px] h-[700px] pointer-events-none z-0 opacity-40 blur-[130px]"
        style={{
          background: "radial-gradient(ellipse at 100% 45%, rgba(37, 99, 235, 0.28) 0%, rgba(6, 182, 212, 0.15) 50%, transparent 70%)"
        }}
      />

      {/* ════════════════════════════════════════════════════════════════════════
          HERO SECTION (Nexora-Inspired Composition, Tailored to FairDrop)
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 md:pt-10 pb-16 flex flex-col items-center text-center z-10">
        
        {/* Top Centered Pill Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#071328] border border-cyan-500/30 text-xs font-medium text-gray-300 shadow-[0_0_15px_rgba(6,182,212,0.2)] mb-4 cursor-default backdrop-blur-md hover:border-cyan-400/50 transition-colors"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
          </span>
          <span className="tracking-wide text-[11px] sm:text-xs text-cyan-200">
            Adversarially-Tested Fair Allocation Engine
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
            500 Seats. 50,000 Users. <br />
            <span className="text-white">One </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 drop-shadow-[0_0_35px_rgba(6,182,212,0.65)]">
              Fair Allocation Drop
            </span>
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mt-4 text-xs sm:text-sm md:text-base text-gray-400 max-w-2xl mx-auto font-normal leading-relaxed"
        >
          FairDrop eliminates bot advantages and race conditions during flash crowds using sub-millisecond atomic Redis transactions, behavioral abuse filtering, and cryptographic queue proofs.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
          className="flex flex-row items-center justify-center gap-3.5 mt-6 mb-2"
        >
          {/* Glowing Electric Blue Pill Button */}
          <Link
            href="/drop"
            className="group relative inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-[0_0_22px_rgba(37,99,235,0.55)] hover:shadow-[0_0_32px_rgba(6,182,212,0.85)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            <span>ENTER THE DROP</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>

          {/* Frosted Dark Outline Button */}
          <Link
            href="#architecture"
            className="inline-flex items-center px-5 py-2.5 rounded-full bg-white/[0.04] border border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs sm:text-sm font-medium transition-all duration-300 backdrop-blur-md"
          >
            Explore Architecture
          </Link>
        </motion.div>

        {/* ─── Hero Centerpiece: Flanking Cards + 3D Glowing Blue Globe ─── */}
        <div className="relative w-full max-w-6xl mt-4 flex flex-col items-center">
          
          {/* Desktop Composition: Flanking cards floating beside the glowing globe */}
          <div className="relative w-full flex items-center justify-center min-h-[440px] md:min-h-[500px]">
            
            {/* Left Flanking Column */}
            <div className="hidden lg:flex absolute left-2 xl:left-8 top-1/2 -translate-y-1/2 flex-col gap-6 xl:gap-8 z-20">
              {/* Card 1: Top Left - Atomic Engine */}
              <FeatureCard
                icon={Cpu}
                title="Atomic Drop Engine"
                description="Guarantees exactly 500 seats with zero overselling via atomic Lua scripts."
                href="/drop"
                glowIntensity="prominent"
                floatDelay={0}
                floatDuration={4.8}
                floatY={5}
              />

              {/* Card 2: Bottom Left - Anti-Bot Defense */}
              <FeatureCard
                icon={ShieldCheck}
                title="Anti-Bot Defense"
                description="Swarm throttling and behavioral telemetry neutralize automated bot swarms."
                href="#shield"
                glowIntensity="subtle"
                floatDelay={1.5}
                floatDuration={5.2}
                floatY={6}
              />
            </div>

            {/* Central Globe & Orbitals in Electric Blue & Cyan */}
            <div className="relative z-10 flex items-center justify-center">
              <GlowingOrb />
            </div>

            {/* Right Flanking Column */}
            <div className="hidden lg:flex absolute right-2 xl:right-8 top-1/2 -translate-y-1/2 flex-col gap-6 xl:gap-8 z-20">
              {/* Card 3: Top Right - Live Telemetry */}
              <FeatureCard
                icon={Activity}
                title="Live Drop Telemetry"
                description="Real-time visibility into queue depth, arrival rate, and drop latency."
                href="/admin"
                glowIntensity="prominent"
                floatDelay={0.8}
                floatDuration={5.0}
                floatY={5}
              />

              {/* Card 4: Bottom Right - Cryptographic Proofs */}
              <FeatureCard
                icon={Fingerprint}
                title="Cryptographic Proofs"
                description="HMAC-signed drop tickets verify seat entitlement with an auditable trail."
                href="/ticket"
                glowIntensity="subtle"
                floatDelay={2.0}
                floatDuration={5.5}
                floatY={6}
              />
            </div>
          </div>

          {/* Mobile & Tablet Fallback Grid for the 4 Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-3 w-full max-w-lg mt-4 px-2 z-20 justify-items-center">
            <FeatureCard
              icon={Cpu}
              title="Atomic Drop Engine"
              description="Guarantees exactly 500 seats with zero overselling via atomic Lua scripts."
              href="/drop"
              glowIntensity="prominent"
              floatDelay={0}
            />
            <FeatureCard
              icon={Activity}
              title="Live Drop Telemetry"
              description="Real-time visibility into queue depth, arrival rate, and drop latency."
              href="/admin"
              glowIntensity="prominent"
              floatDelay={0.5}
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Anti-Bot Defense"
              description="Swarm throttling and behavioral telemetry neutralize automated bot swarms."
              href="#shield"
              glowIntensity="subtle"
              floatDelay={1.0}
            />
            <FeatureCard
              icon={Fingerprint}
              title="Cryptographic Proofs"
              description="HMAC-signed drop tickets verify seat entitlement with an auditable trail."
              href="/ticket"
              glowIntensity="subtle"
              floatDelay={1.5}
            />
          </div>

          {/* Floating Bottom Stats Pill Bar overlapping lower globe */}
          <div className="w-full -mt-8 md:-mt-14 z-30">
            <StatsBar
              stats={[
                { value: "500", label: "Allocated Seats", highlight: true },
                { value: "50,000", label: "Tested Concurrency" },
                { value: "0", label: "Overselling / Dups" },
                { value: "< 2ms", label: "Lua Latency" },
              ]}
            />
          </div>
        </div>

      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          ARCHITECTURE SECTION (The 50,000 -> 500 Allocation Pipeline)
      ════════════════════════════════════════════════════════════════════════ */}
      <section id="architecture" className="w-full max-w-7xl mx-auto px-6 py-24 relative z-10 border-t border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5" /> High-Concurrency Architecture
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            How FairDrop Solves the <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">50,000 Flash Crowd</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            When 50,000 people arrive at the same second, arrival millisecond shouldn't reward bot swarms. Our multi-stage pipeline normalizes entry, filters abuse, and allocates deterministically.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: "01",
              icon: Users,
              title: "Normalized Entry",
              desc: "Participants enter a randomized wait-room window. Microsecond network advantages are equalized to neutralize automated bot priority.",
            },
            {
              step: "02",
              icon: ShieldCheck,
              title: "Abuse Scoring",
              desc: "Adaptive behavioral telemetry inspects IP subnets, request replay cadences, and device fingerprints to challenge suspicious traffic.",
            },
            {
              step: "03",
              icon: Zap,
              title: "Atomic Allocation",
              desc: "A single Lua script checks inventory, deducts seats, and registers user claims atomically in Redis RAM under 2ms.",
            },
            {
              step: "04",
              icon: Lock,
              title: "HMAC Proof",
              desc: "Successful claims receive a cryptographically signed ticket token proving seat assignment with zero chance of duplicate assignment.",
            },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -5, scale: 1.01 }}
              transition={{ duration: 0.25 }}
              className="p-7 rounded-2xl bg-[#091124]/80 backdrop-blur-xl border border-white/[0.08] hover:border-cyan-500/40 hover:shadow-[0_12px_30px_rgba(6,182,212,0.15)] transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="text-3xl font-black font-mono text-cyan-500/30 group-hover:text-cyan-400/60 transition-colors">
                    {item.step}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.22)] group-hover:scale-105 transition-transform">
                    <item.icon className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-100 transition-colors">
                  {item.title}
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed font-light">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          LIVE SIMULATOR / TELEMETRY SECTION
      ════════════════════════════════════════════════════════════════════════ */}
      <section id="telemetry" className="w-full max-w-7xl mx-auto px-6 py-20 relative z-10 border-t border-white/[0.06]">
        <div className="rounded-3xl bg-[#050e20]/90 border border-white/[0.08] p-8 md:p-12 relative overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
          
          <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/50 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wider uppercase mb-4">
                <Activity className="w-3.5 h-3.5" /> Real-time Drop Simulation
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
                500 Seats. 50,000 Swarm. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                  Zero Double-Allocations.
                </span>
              </h2>
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-6 font-light">
                Under high-concurrency conditions, traditional relational databases lock tables or oversell inventory due to race conditions. FairDrop leverages atomic Lua evaluation to guarantee strict inventory invariants.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  "Deterministic Lua single-atomic transaction guarantees",
                  "Automated challenge gating for high-frequency IP subnets",
                  "Verifiable HMAC seat proof delivered upon allocation"
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={triggerSim}
                  disabled={simRunning}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-semibold shadow-[0_0_20px_rgba(6,182,212,0.45)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] transition-all cursor-pointer disabled:opacity-50"
                >
                  {simRunning ? "Simulating Swarm..." : "Trigger 10K Claim Burst"}
                </button>
                <Link
                  href="/admin"
                  className="text-xs font-medium text-cyan-400 hover:text-white transition-colors"
                >
                  Open Operations Center →
                </Link>
              </div>
            </div>

            {/* Interactive Live Monitor Visual in Electric Blue */}
            <div className="rounded-2xl bg-[#030713] border border-white/[0.08] p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono font-medium text-gray-300">REDIS_DROP_CLUSTER (US-EAST)</span>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> ENGINE ACTIVE
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Seats Allocated</span>
                  <span className="font-mono text-white font-semibold">{simProgress} / 500</span>
                </div>
                <div className="h-2.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                    style={{ width: `${(simProgress / 500) * 100}%` }}
                    animate={{ width: `${(simProgress / 500) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Metric Readouts */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="text-[10px] text-gray-500 uppercase font-mono">Throughput</div>
                  <div className="text-base sm:text-lg font-bold text-white font-mono mt-0.5">18.4K <span className="text-[10px] text-cyan-400">req/s</span></div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="text-[10px] text-gray-500 uppercase font-mono">Bots Dropped</div>
                  <div className="text-base sm:text-lg font-bold text-red-400 font-mono mt-0.5">4,912</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="text-[10px] text-gray-500 uppercase font-mono">Lua Latency</div>
                  <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono mt-0.5">1.2ms</div>
                </div>
              </div>

              {/* Terminal log snippet */}
              <div className="p-3 rounded-xl bg-black/60 border border-white/[0.05] font-mono text-[11px] text-gray-400 space-y-1">
                <div className="text-cyan-400">&gt; Redis EVAL SHA256[lua_atomic_drop] completed in 0.8ms</div>
                <div className="text-emerald-400">&gt; 500/500 invariant validated: ZERO DUPLICATES DETECTED</div>
                <div className="text-amber-400">&gt; AbuseEngine throttled 14 IP subnets for replay swarms</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          MULTI-LAYER ANTI-BOT SHIELD SECTION
      ════════════════════════════════════════════════════════════════════════ */}
      <section id="shield" className="w-full max-w-7xl mx-auto px-6 py-24 relative z-10 border-t border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/40 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-widest mb-3">
            <ShieldCheck className="w-3.5 h-3.5" /> Adversarial Mitigation
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
            Neutralize Bots <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Without Affecting Humans</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base">
            Multi-tiered behavioral scoring identifies automated clients without frustrating legitimate participants.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {[
            {
              title: "IP Swarm Throttling",
              desc: "Dynamic sliding-window rate limiters flag localized subnet spikes and scripted request floods.",
              metric: "10,000+ Blocks/Min",
              icon: Zap
            },
            {
              title: "Deterministic Window Gating",
              desc: "All entrants during the drop countdown enter a synchronized randomized wait room, eradicating millisecond bot scripts.",
              metric: "0ms Advantage",
              icon: Clock
            },
            {
              title: "Cryptographic HMAC Proof",
              desc: "Each allocated seat generates an HMAC-signed ticket that cannot be forged, transferred, or double-spent.",
              metric: "100% Verifiable",
              icon: Lock
            }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -5 }}
              className="p-7 rounded-3xl bg-[#071124]/80 border border-white/[0.08] hover:border-cyan-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-cyan-400">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-semibold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                    {item.metric}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed font-light">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          FAIRNESS ENGINE SECTION
      ════════════════════════════════════════════════════════════════════════ */}
      <section id="fairness" className="w-full max-w-7xl mx-auto px-6 py-24 relative z-10 border-t border-white/[0.06]">
        <div className="rounded-3xl bg-[#061026]/90 border border-white/[0.08] p-8 md:p-12 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wider uppercase mb-4">
                <Scale className="w-3.5 h-3.5" /> Mathematical Fairness Engine
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
                Audit Every Allocation with <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                  Statistical Proof
                </span>
              </h2>
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-6 font-light">
                FairDrop calculates real-time Gini coefficients, queue position variance, and adversarial deterrence ratios to prove mathematical fairness to your users and stakeholders.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/admin/fairness"
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-[0_0_20px_rgba(6,182,212,0.45)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] transition-all"
                >
                  View Fairness Reports
                </Link>
                <Link
                  href="/admin/experiments"
                  className="px-6 py-2.5 rounded-full bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs sm:text-sm font-medium transition-all"
                >
                  Run A/B Experiments
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Gini Fairness Index", val: "0.042", sub: "Near-perfect equality", color: "text-emerald-400" },
                { label: "Oversell Invariant", val: "0.00%", sub: "Strict mathematical zero", color: "text-cyan-400" },
                { label: "Bot Advantage", val: "0.00x", sub: "Randomized queue parity", color: "text-emerald-400" },
                { label: "Audit Confidence", val: "99.99%", sub: "HMAC cryptographic log", color: "text-blue-400" },
              ].map((item, i) => (
                <div key={i} className="p-5 rounded-2xl bg-[#040816] border border-white/[0.06] flex flex-col justify-between">
                  <span className="text-xs text-gray-400">{item.label}</span>
                  <div className="my-2">
                    <span className={`text-2xl sm:text-3xl font-bold font-mono ${item.color}`}>
                      {item.val}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 font-light">{item.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          FINAL CALL TO ACTION
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="w-full py-24 relative border-t border-white/[0.06] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <div 
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background: "radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.25) 0%, transparent 70%)"
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto space-y-5">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Ready for your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 drop-shadow-[0_0_30px_rgba(6,182,212,0.6)]">
              Next High-Demand Drop?
            </span>
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm md:text-base font-light max-w-xl mx-auto">
            Test the live drop window, claim a seat under simulated high concurrency, or inspect operations telemetry.
          </p>

          <div className="pt-3 flex flex-row items-center justify-center gap-3.5">
            <Link
              href="/drop"
              className="group inline-flex items-center gap-2 px-7 py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-[0_0_30px_rgba(37,99,235,0.55)] hover:shadow-[0_0_40px_rgba(6,182,212,0.85)] hover:scale-105 transition-all duration-300"
            >
              <span>ENTER THE DROP</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center px-6 py-3 rounded-full bg-white/[0.05] border border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.1] text-gray-300 hover:text-white text-xs sm:text-sm font-medium transition-all"
            >
              Operations Center
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          MINIMAL FOOTER
      ════════════════════════════════════════════════════════════════════════ */}
      <footer className="w-full py-8 border-t border-white/[0.06] bg-[#02050e] text-center text-xs text-gray-500 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-cyan-400 fill-current">
              <path d="M12 2 L13.5 8.5 L20 7 L15.5 12 L20 17 L13.5 15.5 L12 22 L10.5 15.5 L4 17 L8.5 12 L4 7 L10.5 8.5 Z" />
            </svg>
            <span className="font-semibold text-gray-300">FAIRDROP ENGINE</span>
          </div>
          <p>© 2026 FairDrop. Adversarially-tested high-concurrency allocation platform.</p>
          <div className="flex items-center gap-4 text-gray-400">
            <Link href="#architecture" className="hover:text-cyan-400 transition-colors">Architecture</Link>
            <Link href="#shield" className="hover:text-cyan-400 transition-colors">Anti-Bot Shield</Link>
            <Link href="#fairness" className="hover:text-cyan-400 transition-colors">Fairness Engine</Link>
            <Link href="/admin" className="hover:text-cyan-400 transition-colors">Operations</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
