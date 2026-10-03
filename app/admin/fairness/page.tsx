"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Scale } from "lucide-react";

type Dashboard = { hasData: boolean; active: boolean; fairness: { normalizedQueuePosition: number | null; allocationRateByBehavior: Record<string, number | null>; normalVsAttackDifference: number | string | null; participationRate: number | null; queueEntryRate: number | null; retryResilience: number | null; throttleRate: number | null; blockRate: number | null } };

export default function FairnessPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { let stopped = false; let timer: number | undefined; const refresh = async () => { const response = await fetch("/api/admin/dashboard", { cache: "no-store" }); if (stopped) return; if (!response.ok) { setError(true); return; } const next = (await response.json()).dashboard as Dashboard; setDashboard(next); if (next.active) timer = window.setTimeout(refresh, 2_000); }; void refresh(); return () => { stopped = true; if (timer) window.clearTimeout(timer); }; }, []);
  if (error) return <div className="p-8"><h1 className="text-xl font-bold text-white">Unable to load fairness data</h1><p className="text-red-300 mt-2">Try again.</p></div>;
  if (!dashboard) return <div className="p-8 text-gray-400">Loading fairness metrics…</div>;
  if (!dashboard.hasData) return <div className="p-6 md:p-8 max-w-3xl mx-auto"><section className="glass-card rounded-xl border border-white/10 p-10 text-center"><h1 className="text-2xl font-bold text-white">No fairness data yet</h1><p className="text-gray-400 mt-2">Run an experiment to generate measured allocation and queue fairness metrics.</p><Link href="/admin/experiments" className="inline-block mt-5 px-4 py-2 rounded-lg bg-violet-600 text-white">Open experiments</Link></section></div>;
  const f = dashboard.fairness;
  return <div className="p-6 md:p-8 max-w-6xl mx-auto"><div className="mb-8"><h1 className="text-3xl font-bold text-white flex gap-3 items-center"><Scale className="h-8 w-8 text-violet-500" /> Fairness Analysis</h1><p className="text-gray-400 mt-2">Observed aggregate fairness metrics from the latest run.</p></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><Metric label="Normalized queue position" value={number(f.normalizedQueuePosition)} /><Metric label="Participation rate" value={percent(f.participationRate)} /><Metric label="Queue entry rate" value={percent(f.queueEntryRate)} /><Metric label="Retry resilience" value={percent(f.retryResilience)} /><Metric label="Throttle rate" value={percent(f.throttleRate)} /><Metric label="Block rate" value={percent(f.blockRate)} /><Metric label="Normal / attack difference" value={number(f.normalVsAttackDifference)} /></div><section className="glass-card rounded-xl border border-white/10 p-6 mt-6"><h2 className="font-bold text-white mb-4">Allocation rate by behavior</h2><div className="grid md:grid-cols-3 gap-3">{Object.entries(f.allocationRateByBehavior).map(([key, value]) => <Metric key={key} label={key} value={percent(value)} />)}{Object.keys(f.allocationRateByBehavior).length === 0 ? <p className="text-gray-500">No behavior-group data recorded.</p> : null}</div></section></div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="glass-card p-4 rounded-xl border border-white/5"><div className="text-xs text-gray-500 uppercase">{label}</div><div className="text-xl text-white font-mono mt-2">{value}</div></div>; }
function percent(value: number | null) { return value === null ? "—" : `${(value * 100).toFixed(2)}%`; }
function number(value: number | string | null) { return typeof value === "number" ? value.toFixed(3) : value === null || value === "NOT_APPLICABLE" ? "—" : value; }
