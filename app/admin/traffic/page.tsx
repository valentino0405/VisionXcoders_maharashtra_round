"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";

type Dashboard = { hasData: boolean; active: boolean; operations: { activeVirtualUsers: number; requestsPerSecond: number; p95LatencyMs: number; p99LatencyMs: number; queueDepth: number; throttledRequests: number; blockedRequests: number } };
export default function TrafficPage() {
  const [data, setData] = useState<Dashboard | null>(null); const [error, setError] = useState(false);
  useEffect(() => { let stopped = false; let timer: number | undefined; const refresh = async () => { const response = await fetch("/api/admin/dashboard", { cache: "no-store" }); if (stopped) return; if (!response.ok) { setError(true); return; } const next = (await response.json()).dashboard as Dashboard; setData(next); if (next.active) timer = window.setTimeout(refresh, 2_000); }; void refresh(); return () => { stopped = true; if (timer) window.clearTimeout(timer); }; }, []);
  if (error) return <State title="Unable to load traffic data" detail="Try again." />;
  if (!data) return <State title="Loading traffic metrics…" detail="" />;
  if (!data.hasData) return <State title="No traffic data yet" detail="Run a simulator or experiment to populate traffic metrics." href="/admin/simulator" action="Open simulator" />;
  const o = data.operations;
  return <div className="p-6 md:p-8 max-w-6xl mx-auto"><h1 className="text-3xl font-bold text-white flex items-center gap-3"><Activity className="h-8 w-8 text-violet-500" /> Traffic</h1><p className="text-gray-400 mt-2 mb-8">Actual aggregate traffic from the latest simulator or experiment.</p><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{[["Active users", o.activeVirtualUsers], ["Requests/sec", o.requestsPerSecond.toFixed(1)], ["Queue depth", o.queueDepth], ["P95 latency", `${o.p95LatencyMs.toFixed(1)} ms`], ["P99 latency", `${o.p99LatencyMs.toFixed(1)} ms`], ["Throttled", o.throttledRequests], ["Blocked", o.blockedRequests]].map(([label, value]) => <div key={String(label)} className="glass-card rounded-xl border border-white/5 p-5"><div className="text-xs text-gray-500 uppercase">{label}</div><div className="text-xl font-mono text-white mt-2">{value}</div></div>)}</div></div>;
}
function State({ title, detail, href, action }: { title: string; detail: string; href?: string; action?: string }) { return <div className="p-6 md:p-8 max-w-3xl mx-auto"><section className="glass-card rounded-xl border border-white/10 p-10 text-center"><h1 className="text-2xl font-bold text-white">{title}</h1>{detail ? <p className="text-gray-400 mt-2">{detail}</p> : null}{href ? <Link href={href} className="inline-block mt-5 px-4 py-2 rounded-lg bg-violet-600 text-white">{action}</Link> : null}</section></div>; }
