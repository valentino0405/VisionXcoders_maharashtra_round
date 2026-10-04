"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowUpRight, Layers, ShieldCheck, Users, Zap } from "lucide-react";

type Dashboard = {
  hasData: boolean;
  active: boolean;
  operations: { activeVirtualUsers: number; queueDepth: number; requestsPerSecond: number; seatsRemaining: number; suspiciousTraffic: number; throttledRequests: number; blockedRequests: number; allocationRate: number; p95LatencyMs: number; p99LatencyMs: number };
  fairness: { queuePositionDistribution: number[]; normalizedQueuePosition: number | null; allocationRateByBehavior: Record<string, number | null>; normalVsAttackDifference: number | string | null; participationRate: number | null; queueEntryRate: number | null; retryResilience: number | null; throttleRate: number | null; blockRate: number | null };
  latestExperiment: null | { experimentId: string; name: string; scenario: string; users: number; status: string; keyComparison: null | Record<string, { baseline: number | string; fairDrop: number | string; difference: number | string }> };
};

export default function AdminOverview() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const refresh = async () => {
      const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (cancelled) return;
      if (!response.ok) { setError(true); return; }
      const next: Dashboard = (await response.json()).dashboard;
      setDashboard(next); setError(false);
      if (next.active) timer = window.setTimeout(refresh, 2_000);
    };
    void refresh();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, []);

  if (error) return <div className="mx-auto max-w-6xl p-5 sm:p-8"><State title="Dashboard data unavailable" detail="The aggregate dashboard could not be loaded. Try again later." /></div>;
  if (!dashboard) return <div className="mx-auto max-w-6xl p-5 sm:p-8"><State title="Loading operations summary" detail="Reading aggregate run metrics…" /></div>;
  if (!dashboard.hasData) return <div className="mx-auto max-w-6xl p-5 sm:p-8 lg:p-10"><div className="mb-7 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"><span>Control room</span><span className="text-slate-700">/</span><span className="text-cyan-200">Overview</span></div><section className="relative overflow-hidden rounded-3xl border border-cyan-200/10 bg-[#071328]/80 p-6 shadow-[0_24px_100px_rgba(2,8,23,0.36)] backdrop-blur-xl sm:p-9"><div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border border-cyan-300/[0.08] sm:h-96 sm:w-96"><div className="absolute inset-8 rounded-full border border-blue-300/[0.09]" /><div className="absolute inset-16 rounded-full border border-dashed border-cyan-300/[0.1]" /></div><div className="relative max-w-2xl"><Badge>Demo workspace · awaiting run data</Badge><div className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08]"><Activity className="h-6 w-6 text-cyan-200" /></div><h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Your operations overview</h1><p className="mt-3 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">No completed simulator or experiment data is available yet. Start a controlled run to populate aggregate metrics in this demo workspace.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/admin/simulator" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-4 py-3 text-sm font-semibold text-[#04101e] shadow-[0_8px_30px_rgba(34,211,238,0.18)] transition hover:brightness-110">Open simulator <ArrowUpRight className="h-4 w-4" /></Link><Link href="/admin/experiments" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-cyan-200/20 hover:bg-cyan-300/[0.05]">Configure experiment</Link></div></div><div className="relative mt-9 grid gap-3 border-t border-white/[0.07] pt-6 sm:grid-cols-3"><EmptyInfo title="Simulator runs" detail="No completed runs" /><EmptyInfo title="Experiments" detail="No completed comparisons" /><EmptyInfo title="Fairness metrics" detail="Waiting for run data" /></div></section><p className="mt-5 text-xs leading-6 text-slate-600">Metrics on this page summarize configured simulator and experiment runs. The console does not generate synthetic activity.</p></div>;

  const o = dashboard.operations;
  return <div className="mx-auto w-full max-w-[1500px] space-y-7 p-5 sm:p-7 lg:p-10">
    <div className="flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-end"><div><div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"><span>Control room</span><span className="text-slate-700">/</span><span className="text-cyan-200">Overview</span></div><h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Operations overview</h1><p className="mt-2 text-sm text-slate-400">Aggregate metrics from configured simulator and experiment runs.</p></div><Badge>Demo workspace · aggregate data</Badge></div>
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 xl:gap-4">
      <Card icon={<Users />} label="Active users" value={o.activeVirtualUsers} accent="cyan" />
      <Card icon={<Activity />} label="Requests / sec" value={o.requestsPerSecond} accent="blue" />
      <Card icon={<Layers />} label="Queue depth" value={o.queueDepth} />
      <Card icon={<Zap />} label="Seats remaining" value={o.seatsRemaining} />
      <Card icon={<AlertTriangle />} label="Suspicious traffic" value={percent(o.suspiciousTraffic)} accent="amber" />
      <Card label="Throttled" value={o.throttledRequests} />
      <Card label="Blocked" value={o.blockedRequests} accent="rose" />
      <Card icon={<ShieldCheck />} label="Allocation rate" value={percent(o.allocationRate)} accent="cyan" />
      <Card label="P95 latency" value={`${o.p95LatencyMs.toFixed(1)} ms`} />
      <Card label="P99 latency" value={`${o.p99LatencyMs.toFixed(1)} ms`} accent="blue" />
    </section>
    <section id="fairness" className="rounded-2xl border border-white/[0.08] bg-[#07101f]/75 p-5 shadow-[0_20px_70px_rgba(2,8,23,0.22)] backdrop-blur-xl sm:p-6"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><div className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300/70">Distribution quality</div><h2 className="mt-1 text-lg font-semibold text-white">Fairness metrics</h2></div><Link href="/admin/fairness" className="inline-flex items-center gap-1 text-xs font-medium text-cyan-200 hover:text-white">Full analysis <ArrowUpRight className="h-3.5 w-3.5" /></Link></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Metric label="Normalized queue position" value={number(dashboard.fairness.normalizedQueuePosition)} /><Metric label="Participation rate" value={percentOrDash(dashboard.fairness.participationRate)} /><Metric label="Queue entry rate" value={percentOrDash(dashboard.fairness.queueEntryRate)} /><Metric label="Retry resilience" value={percentOrDash(dashboard.fairness.retryResilience)} /><Metric label="Throttle rate" value={percentOrDash(dashboard.fairness.throttleRate)} /><Metric label="Block rate" value={percentOrDash(dashboard.fairness.blockRate)} /><Metric label="Normal / attack difference" value={number(dashboard.fairness.normalVsAttackDifference)} /></div><div className="mt-6 border-t border-white/[0.06] pt-5"><div className="mb-3 text-xs font-medium text-slate-400">Allocation rate by behavior</div><div className="grid gap-2 md:grid-cols-3">{Object.entries(dashboard.fairness.allocationRateByBehavior).map(([profile, value]) => <MetricRow key={profile} label={profile} value={percentOrDash(value)} />)}{Object.keys(dashboard.fairness.allocationRateByBehavior).length === 0 ? <p className="text-sm text-slate-500">No measured behavior groups.</p> : null}</div></div></section>
    <section className="rounded-2xl border border-white/[0.08] bg-[#07101f]/75 p-5 shadow-[0_20px_70px_rgba(2,8,23,0.22)] backdrop-blur-xl sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><div><div className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">Run history</div><h2 className="mt-1 text-lg font-semibold text-white">Latest experiment</h2></div><FlaskLabel /></div>{dashboard.latestExperiment ? <div className="flex flex-col justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center"><div><div className="font-semibold text-white">{dashboard.latestExperiment.name}</div><div className="mt-1 text-sm text-slate-400">{dashboard.latestExperiment.scenario} <span className="text-slate-600">·</span> {dashboard.latestExperiment.users} users <span className="text-slate-600">·</span> {dashboard.latestExperiment.status}</div></div><Link className="inline-flex items-center gap-1 text-sm font-medium text-cyan-200 hover:text-white" href="/admin/experiments">View experiment <ArrowUpRight className="h-4 w-4" /></Link></div> : <p className="text-sm text-slate-500">No experiment data yet.</p>}</section>
  </div>;
}

function Card({ icon, label, value, accent = "slate" }: { icon?: React.ReactNode; label: string; value: string | number; accent?: "cyan" | "blue" | "amber" | "rose" | "slate" }) {
  const accents = { cyan: "text-cyan-200 bg-cyan-300/[0.08] border-cyan-200/10", blue: "text-blue-200 bg-blue-300/[0.08] border-blue-200/10", amber: "text-amber-200 bg-amber-300/[0.08] border-amber-200/10", rose: "text-rose-200 bg-rose-300/[0.08] border-rose-200/10", slate: "text-slate-300 bg-white/[0.04] border-white/[0.07]" };
  return <div className="group relative overflow-hidden rounded-2xl border border-white/[0.075] bg-[#07101f]/80 p-4 shadow-[0_14px_44px_rgba(2,8,23,0.2)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-cyan-200/15 sm:p-5"><div className="flex items-start justify-between gap-2"><div className="text-[10px] font-medium uppercase leading-4 tracking-[0.13em] text-slate-500">{label}</div>{icon ? <span className={`rounded-lg border p-2 ${accents[accent]}`}><span className="block [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span></span> : null}</div><div className="mt-4 break-words font-mono text-xl font-medium tracking-tight text-white sm:text-2xl">{typeof value === "number" ? value.toFixed(Number.isInteger(value) ? 0 : 1) : value}</div><div aria-hidden="true" className="mt-4 flex h-5 items-end gap-1 opacity-60">{[35, 58, 42, 74, 49, 86, 62, 96, 55, 70, 46, 82].map((height, index) => <span key={index} className="w-1 flex-1 rounded-t-sm bg-gradient-to-t from-blue-500/10 to-cyan-300/65" style={{ height: `${height}%` }} />)}</div></div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/[0.06] bg-[#050b16]/65 p-3.5"><div className="text-[10px] uppercase leading-4 tracking-[0.1em] text-slate-500">{label}</div><div className="mt-2 break-words font-mono text-sm text-slate-100">{value}</div></div>; }
function MetricRow({ label, value }: { label: string; value: string }) { return <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-xs"><span className="truncate text-slate-400">{label}</span><span className="font-mono text-cyan-100">{value}</span></div>; }
function EmptyInfo({ title, detail }: { title: string; detail: string }) { return <div className="rounded-xl border border-white/[0.07] bg-[#050b16]/55 p-4"><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{title}</div><div className="mt-2 text-sm text-slate-300">{detail}</div></div>; }
function State({ title, detail }: { title: string; detail: string }) { return <section className="rounded-2xl border border-white/[0.08] bg-[#07101f]/80 p-8"><Badge>Demo workspace</Badge><h1 className="mt-5 text-xl font-semibold text-white">{title}</h1><p className="mt-2 text-sm text-slate-400">{detail}</p></section>; }
function Badge({ children }: { children: React.ReactNode }) { return <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.055] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-cyan-100"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />{children}</span>; }
function FlaskLabel() { return <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400">Aggregate</span>; }
function percent(value: number) { return `${(value * 100).toFixed(2)}%`; }
function percentOrDash(value: number | null) { return value === null ? "—" : percent(value); }
function number(value: number | string | null) { return typeof value === "number" ? value.toFixed(3) : value === "NOT_APPLICABLE" || value === null ? "—" : value; }
