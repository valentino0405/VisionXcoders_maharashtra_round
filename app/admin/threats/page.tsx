"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

type Dashboard = { hasData: boolean; active: boolean; operations: { suspiciousTraffic: number; throttledRequests: number; blockedRequests: number } };
export default function ThreatsPage() {
  const [data, setData] = useState<Dashboard | null>(null); const [error, setError] = useState(false);
  useEffect(() => { let stopped = false; let timer: number | undefined; const refresh = async () => { const response = await fetch("/api/admin/dashboard", { cache: "no-store" }); if (stopped) return; if (!response.ok) { setError(true); return; } const next = (await response.json()).dashboard as Dashboard; setData(next); if (next.active) timer = window.setTimeout(refresh, 2_000); }; void refresh(); return () => { stopped = true; if (timer) window.clearTimeout(timer); }; }, []);
  if (error) return <State title="Unable to load abuse metrics" detail="Try again." />;
  if (!data) return <State title="Loading abuse metrics…" detail="" />;
  if (!data.hasData) return <State title="No abuse data yet" detail="Run a simulator or experiment to observe real enforcement metrics." href="/admin/simulator" action="Open simulator" />;
  const o = data.operations;
  return <div className="p-6 md:p-8 max-w-6xl mx-auto"><h1 className="text-3xl font-bold text-white flex items-center gap-3"><ShieldAlert className="h-8 w-8 text-violet-500" /> Threats & Abuse</h1><p className="text-gray-400 mt-2 mb-8">Aggregate enforcement outcomes; individual identities and event logs are not exposed.</p><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><Card label="Suspicious traffic" value={`${(o.suspiciousTraffic * 100).toFixed(2)}%`} /><Card label="Throttled requests" value={String(o.throttledRequests)} /><Card label="Blocked requests" value={String(o.blockedRequests)} /></div></div>;
}
function Card({ label, value }: { label: string; value: string }) { return <div className="glass-card rounded-xl border border-white/10 p-6"><div className="text-sm text-gray-400 uppercase">{label}</div><div className="text-4xl text-white font-mono mt-3">{value}</div></div>; }
function State({ title, detail, href, action }: { title: string; detail: string; href?: string; action?: string }) { return <div className="p-6 md:p-8 max-w-3xl mx-auto"><section className="glass-card rounded-xl border border-white/10 p-10 text-center"><h1 className="text-2xl font-bold text-white">{title}</h1>{detail ? <p className="text-gray-400 mt-2">{detail}</p> : null}{href ? <Link href={href} className="inline-block mt-5 px-4 py-2 rounded-lg bg-violet-600 text-white">{action}</Link> : null}</section></div>; }
