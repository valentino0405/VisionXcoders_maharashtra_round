"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, Layers, ShieldCheck, Users } from "lucide-react";

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
  if (error) return <div className="p-8"><h1 className="text-xl font-bold text-white">Unable to load dashboard data</h1><p className="text-red-300 mt-2">Try again.</p></div>;
  if (!dashboard) return <div className="p-8 text-gray-400">Loading aggregate metrics…</div>;
  if (!dashboard.hasData) return <div className="p-6 md:p-8 w-full max-w-3xl mx-auto"><section className="glass-card rounded-xl border border-white/10 p-10 text-center"><h1 className="text-2xl font-bold text-white">No dashboard data yet</h1><p className="text-gray-400 mt-2">Run a simulator or experiment to populate live metrics.</p><div className="mt-6 flex justify-center gap-3"><Link href="/admin/simulator" className="px-4 py-2 rounded-lg bg-violet-600 text-white">Open simulator</Link><Link href="/admin/experiments" className="px-4 py-2 rounded-lg border border-white/10 text-gray-200">Open experiments</Link></div></section></div>;
  const o = dashboard.operations;
  return <div className="p-6 md:p-8 w-full space-y-8">
    <div><h1 className="text-3xl font-bold text-white">Operations Overview</h1><p className="text-gray-400 mt-2">Latest safe aggregate simulator and experiment metrics.</p></div>
    <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      <Card icon={<Users className="h-4 w-4" />} label="Active users" value={o.activeVirtualUsers} />
      <Card icon={<Activity className="h-4 w-4" />} label="Requests/sec" value={o.requestsPerSecond} />
      <Card icon={<Layers className="h-4 w-4" />} label="Queue depth" value={o.queueDepth} />
      <Card label="Seats remaining" value={o.seatsRemaining} />
      <Card icon={<AlertTriangle className="h-4 w-4" />} label="Suspicious traffic" value={percent(o.suspiciousTraffic)} />
      <Card label="Throttled" value={o.throttledRequests} />
      <Card label="Blocked" value={o.blockedRequests} />
      <Card icon={<ShieldCheck className="h-4 w-4" />} label="Allocation rate" value={percent(o.allocationRate)} />
      <Card label="P95 latency" value={`${o.p95LatencyMs.toFixed(1)} ms`} />
      <Card label="P99 latency" value={`${o.p99LatencyMs.toFixed(1)} ms`} />
    </section>
    <section id="fairness" className="glass-card rounded-xl border border-white/10 p-6"><h2 className="font-bold text-white mb-5">Fairness metrics</h2><div className="grid md:grid-cols-4 gap-4"><Card label="Normalized queue position" value={number(dashboard.fairness.normalizedQueuePosition)} /><Card label="Participation rate" value={percentOrDash(dashboard.fairness.participationRate)} /><Card label="Queue entry rate" value={percentOrDash(dashboard.fairness.queueEntryRate)} /><Card label="Retry resilience" value={percentOrDash(dashboard.fairness.retryResilience)} /><Card label="Throttle rate" value={percentOrDash(dashboard.fairness.throttleRate)} /><Card label="Block rate" value={percentOrDash(dashboard.fairness.blockRate)} /><Card label="Normal/attack difference" value={number(dashboard.fairness.normalVsAttackDifference)} /></div><div className="mt-6"><div className="text-sm text-gray-400 mb-3">Allocation rate by behavior</div><div className="grid md:grid-cols-3 gap-3">{Object.entries(dashboard.fairness.allocationRateByBehavior).map(([profile, value]) => <MetricRow key={profile} label={profile} value={percentOrDash(value)} />)}{Object.keys(dashboard.fairness.allocationRateByBehavior).length === 0 ? <p className="text-gray-500">No measured behavior groups.</p> : null}</div></div></section>
    <section className="glass-card rounded-xl border border-white/10 p-6"><h2 className="font-bold text-white mb-4">Latest experiment</h2>{dashboard.latestExperiment ? <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><div className="text-white font-semibold">{dashboard.latestExperiment.name}</div><div className="text-sm text-gray-400">{dashboard.latestExperiment.scenario} · {dashboard.latestExperiment.users} users · {dashboard.latestExperiment.status}</div></div><Link className="text-violet-400 hover:text-violet-300" href="/admin/experiments">View details →</Link></div> : <p className="text-gray-500">No experiment data yet.</p>}</section>
  </div>;
}
function Card({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | number }) { return <div className="glass-card p-4 rounded-xl border border-white/5"><div className="text-xs text-gray-500 uppercase flex items-center gap-2">{icon}{label}</div><div className="text-xl font-mono text-white mt-2">{typeof value === "number" ? value.toFixed(Number.isInteger(value) ? 0 : 1) : value}</div></div>; }
function MetricRow({ label, value }: { label: string; value: string }) { return <div className="flex justify-between border border-white/5 rounded-lg p-3 text-xs"><span className="text-gray-400">{label}</span><span className="font-mono text-white">{value}</span></div>; }
function percent(value: number) { return `${(value * 100).toFixed(2)}%`; }
function percentOrDash(value: number | null) { return value === null ? "—" : percent(value); }
function number(value: number | string | null) { return typeof value === "number" ? value.toFixed(3) : value === "NOT_APPLICABLE" || value === null ? "—" : value; }
