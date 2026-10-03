import { LiquidCursor } from "@/components/landing/LiquidCursor";
import { ArrowRight, Activity, ShieldAlert, Cpu, BarChart3, Fingerprint, Lock, Users } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col flex-1 items-center bg-background relative overflow-hidden font-sans w-full">
      <LiquidCursor />

      {/* Hero Section */}
      <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center px-6 pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_50%)] pointer-events-none" />

        <div className="z-10 flex flex-col items-center text-center max-w-4xl gap-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-semibold tracking-widest uppercase mb-4 backdrop-blur-sm">
            <Activity className="h-3 w-3" />
            FairDrop // High-Demand Allocation
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-200 to-gray-500 leading-tight">
            500 SEATS.<br />
            50,000 USERS.<br />
            <span className="glow-text text-white">ONE FAIR DROP.</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl font-light">
            An adversarially-tested allocation platform built for the moment everyone clicks at once.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link href="/drop" className="flex items-center justify-center gap-2 h-14 px-8 rounded-lg bg-white text-black font-semibold text-lg hover:bg-gray-100 transition-all glow-border">
              ENTER THE DROP <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="#system" className="flex items-center justify-center gap-2 h-14 px-8 rounded-lg border border-white/10 bg-black/40 backdrop-blur-md text-white font-medium text-lg hover:bg-white/5 transition-all">
              EXPLORE THE SYSTEM
            </Link>
          </div>
        </div>

        {/* Abstract Data Visual */}
        <div className="w-full max-w-5xl mt-20 h-64 border border-white/5 rounded-2xl bg-black/40 backdrop-blur-xl relative overflow-hidden flex items-center justify-between px-10">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(139,92,246,0.05)_50%,transparent_100%)]" />

          {/* Mock Visual: Users -> Queue -> Allocation */}
          <div className="flex flex-col items-center gap-2 z-10">
            <div className="text-2xl font-bold text-gray-300">50,000</div>
            <div className="text-xs text-gray-500 uppercase tracking-widest">Incoming Requests</div>
          </div>

          <div className="flex-1 flex items-center justify-center relative z-10 px-8">
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-violet-500/50 to-transparent relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-32 border border-violet-500/30 rounded-full flex items-center justify-center bg-background/80 backdrop-blur-md">
                <ShieldAlert className="h-5 w-5 text-violet-400 mr-2" />
                <span className="text-sm font-semibold text-violet-300">VERIFY</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 z-10">
            <div className="text-3xl font-bold text-white glow-text">500</div>
            <div className="text-xs text-violet-400 uppercase tracking-widest">Allocated Seats</div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="w-full max-w-7xl px-6 py-32 border-t border-white/5 relative" id="problem">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">When everyone arrives at once, speed shouldn't decide who gets in.</h2>
          <p className="text-gray-400 text-lg">Traditional systems reward automated scripts and bot swarms. FairDrop evaluates trust, normalizes queue distribution, and guarantees allocation integrity.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { metric: "50,000", label: "Participants", icon: Users, color: "text-blue-400" },
            { metric: "10,000+", label: "Automated Attempts Blocked", icon: ShieldAlert, color: "text-red-400" },
            { metric: "0", label: "Overselling", icon: Lock, color: "text-green-400" }
          ].map((item, i) => (
            <div key={i} className="glass-card p-8 rounded-2xl flex flex-col items-center text-center gap-4 hover:-translate-y-1 transition-transform duration-300">
              <item.icon className={`h-8 w-8 ${item.color} mb-2`} />
              <div className="text-4xl font-bold text-white">{item.metric}</div>
              <div className="text-sm font-medium text-gray-400 uppercase tracking-widest">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works Section */}
      <section className="w-full max-w-7xl px-6 py-32 border-t border-white/5" id="how-it-works">
        <h2 className="text-3xl font-bold tracking-tight mb-16 text-center">How FairDrop Works</h2>

        <div className="grid md:grid-cols-4 gap-8">
          {[
            { step: "01", title: "ENTER", desc: "Users join the drop window. Position is independent of exact arrival millisecond." },
            { step: "02", title: "VERIFY", desc: "Traffic and sessions are evaluated against adversarial patterns." },
            { step: "03", title: "ALLOCATE", desc: "Seats are distributed consistently using verifiable randomization algorithms." },
            { step: "04", title: "PROVE", desc: "Fairness and system behavior are mathematically measured and reported." }
          ].map((item, i) => (
            <div key={i} className="relative group">
              <div className="text-7xl font-black text-white/5 mb-4 group-hover:text-violet-500/10 transition-colors">{item.step}</div>
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" /> {item.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live System Preview */}
      <section className="w-full max-w-7xl px-6 py-32 border-t border-white/5" id="system">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-4">Live System Dashboard</h2>
            <p className="text-gray-400 max-w-xl">Real-time monitoring of queue depth, request rates, and adversarial traffic mitigation.</p>
          </div>
          <Link href="/admin" className="text-violet-400 hover:text-violet-300 font-medium flex items-center gap-2 mt-6 md:mt-0">
            Open Operations Center <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-white/10 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-green-500" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div>
              <div className="text-sm text-gray-400 mb-1">Active Users</div>
              <div className="text-3xl font-mono text-white">49,821</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Requests/sec</div>
              <div className="text-3xl font-mono text-blue-400">18,420</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Suspicious Traffic</div>
              <div className="text-3xl font-mono text-red-400">8.4%</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Allocation Rate</div>
              <div className="text-3xl font-mono text-green-400">74.6%</div>
            </div>
          </div>

          {/* Fake Chart area */}
          <div className="h-48 w-full bg-black/50 rounded-lg border border-white/5 flex items-end px-2 pb-2 gap-1 overflow-hidden relative">
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <BarChart3 className="h-32 w-32 text-violet-500" />
            </div>
            {/* Mock bars */}
            {[...Array(40)].map((_, i) => (
              <div key={i} className="flex-1 bg-violet-500/40 hover:bg-violet-400 transition-colors rounded-t-sm" style={{ height: `${Math.max(10, Math.random() * 100)}%` }} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full py-40 flex flex-col items-center justify-center relative border-t border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.1),transparent_70%)]" />
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8 z-10 text-center">Ready for the drop?</h2>
        <Link href="/drop" className="z-10 h-16 px-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xl flex items-center gap-3 transition-all glow-border">
          ENTER FAIRDROP <ArrowRight className="h-6 w-6" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-white/5 text-center text-sm text-gray-500">
        <p>Built for Bit N Build Hackathon // FairDrop © 2024</p>
      </footer>
    </main>
  );
}
