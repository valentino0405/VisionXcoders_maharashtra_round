"use client";

import { useEffect, useState } from "react";
import { Activity, Crosshair, Play, Radio, ShieldCheck, Square } from "lucide-react";

type Run = {
  simulationRunId: string;
  status: string;
  metrics: {
    completedVirtualUsers: number;
    totalVirtualUsers: number;
    totalRequests: number;
    requestsPerSecond: number;
    responses: { throttled429: number };
    latency: { p95Ms: number };
    allocation: { successful: number };
    execution?: {
      configuredRequestRate: number;
      elapsedMs: number;
      peakInFlightRequests: number;
      timedOutVirtualUsers: number;
      cancelledVirtualUsers: number;
      failedVirtualUsers: number;
      lateScheduleCount: number;
    };
  };
};

const scenarios = ["NORMAL_TRAFFIC", "REQUEST_FLOOD", "BOT_SWARM", "DUPLICATE_ATTEMPTS", "TOKEN_REPLAY", "QUEUE_MANIPULATION", "MIXED_ATTACK"];

export default function SimulatorPage() {
  const [users, setUsers] = useState(100);
  const [duration, setDuration] = useState(60);
  const [concurrency, setConcurrency] = useState(100);
  const [requestRate, setRequestRate] = useState(250);
  const [seed, setSeed] = useState(12345);
  const [scenario, setScenario] = useState("MIXED_ATTACK");
  const [distribution, setDistribution] = useState("");
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = run?.status === "STARTING" || run?.status === "RUNNING" || run?.status === "STOPPING";
  const runId = run?.simulationRunId;
  const progress = run && run.metrics.totalVirtualUsers > 0 ? Math.min(100, run.metrics.completedVirtualUsers / run.metrics.totalVirtualUsers * 100) : 0;

  useEffect(() => {
    if (!runId || !running) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/admin/simulator/${runId}`, { cache: "no-store" });
      if (response.ok) setRun((await response.json()).run);
    }, 2_000);
    return () => window.clearInterval(timer);
  }, [runId, running]);

  async function start() {
    setError(null);
    let attackDistribution: Record<string, number> | undefined;
    if (distribution.trim()) {
      try { attackDistribution = JSON.parse(distribution) as Record<string, number>; } catch { setError("Attack distribution must be valid JSON."); return; }
    }
    const response = await fetch("/api/admin/simulator/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ virtualUsers: users, durationSeconds: duration, maxConcurrency: concurrency, requestRate, scenario, seed, attackDistribution }),
    });
    const result = await response.json();
    if (!response.ok) { setError(result.detail ?? result.error); return; }
    setRun({
      ...result,
      metrics: {
        completedVirtualUsers: 0,
        totalVirtualUsers: users,
        totalRequests: 0,
        requestsPerSecond: 0,
        responses: { throttled429: 0 },
        latency: { p95Ms: 0 },
        allocation: { successful: 0 },
        execution: { configuredRequestRate: requestRate, elapsedMs: 0, peakInFlightRequests: 0, timedOutVirtualUsers: 0, cancelledVirtualUsers: 0, failedVirtualUsers: 0, lateScheduleCount: 0 },
      },
    });
  }

  async function stop() { if (run) await fetch(`/api/admin/simulator/${run.simulationRunId}/stop`, { method: "POST" }); }

  return <div className="mx-auto w-full max-w-6xl space-y-7 p-5 sm:p-7 lg:p-10">
    <div className="flex flex-col justify-between gap-4 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-end"><div><div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"><span>Testing &amp; data</span><span className="text-slate-700">/</span><span className="text-cyan-200">Simulator</span></div><h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"><span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06]"><Crosshair className="h-5 w-5 text-cyan-200" /></span>Adversarial simulator</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Configure bounded virtual-user workloads in the isolated simulator environment.</p></div><Badge>Demo workspace · isolated runner</Badge></div>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.35fr)] lg:gap-6">
      <section className="rounded-2xl border border-white/[0.08] bg-[#07101f]/80 p-5 shadow-[0_20px_70px_rgba(2,8,23,0.25)] backdrop-blur-xl sm:p-6"><div className="mb-5 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4"><div><div className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300/70">Workload setup</div><h2 className="mt-1 font-semibold text-white">Run parameters</h2></div><span className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">Bounded</span></div><div className="space-y-4"><NumberInput label="Virtual users" value={users} min={1} max={50_000} onChange={setUsers} /><div className="grid grid-cols-2 gap-3"><NumberInput label="Duration (sec)" value={duration} min={1} max={300} onChange={setDuration} /><NumberInput label="Concurrency" value={concurrency} min={1} max={500} onChange={setConcurrency} /></div><div className="grid grid-cols-2 gap-3"><NumberInput label="Request rate (req/s)" value={requestRate} min={1} max={2_000} onChange={setRequestRate} /><NumberInput label="Seed" value={seed} min={0} max={2_147_483_647} onChange={setSeed} /></div><label className="block text-xs font-medium text-slate-400">Scenario<select className={fieldClass} value={scenario} onChange={(event) => setScenario(event.target.value)}>{scenarios.map((value) => <option key={value}>{value}</option>)}</select></label><label className="block text-xs font-medium text-slate-400">Mixed attack distribution <span className="font-normal text-slate-600">· optional JSON</span><textarea className={`${fieldClass} resize-y font-mono text-xs leading-5`} rows={3} placeholder='{"NORMAL_TRAFFIC":65,"REQUEST_FLOOD":10,...}' value={distribution} onChange={(event) => setDistribution(event.target.value)} /></label><div className="flex items-start gap-2 rounded-xl border border-cyan-200/[0.08] bg-cyan-300/[0.025] p-3 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300/70" />Isolated virtual-user workloads only; no Clerk accounts or demo-drop data are created.</div><button onClick={running ? stop : start} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 text-sm font-semibold text-[#04101e] shadow-[0_8px_30px_rgba(34,211,238,0.16)] transition hover:brightness-110">{running ? <><Square className="h-4 w-4" /> Stop simulation</> : <><Play className="h-4 w-4" /> Start simulation</>}</button>{error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}</div></section>
      <section className="rounded-2xl border border-white/[0.08] bg-[#07101f]/80 p-5 shadow-[0_20px_70px_rgba(2,8,23,0.25)] backdrop-blur-xl sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><div className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300/70">Execution telemetry</div><h2 className="mt-1 text-lg font-semibold text-white">Run status</h2></div>{run ? <StatusPill active={running}>{run.status.replaceAll("_", " ")}</StatusPill> : <Badge>Awaiting run</Badge>}</div>{run ? <><div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Metric label="Progress" value={`${run.metrics.completedVirtualUsers} / ${run.metrics.totalVirtualUsers}`} /><Metric label="Requests" value={String(run.metrics.totalRequests)} /><Metric label="Target req / sec" value={String(run.metrics.execution?.configuredRequestRate ?? requestRate)} /><Metric label="Actual req / sec" value={run.metrics.requestsPerSecond.toFixed(1)} /><Metric label="P95 latency" value={formatMilliseconds(run.metrics.latency.p95Ms)} /><Metric label="429 responses" value={String(run.metrics.responses.throttled429)} /><Metric label="Allocations" value={String(run.metrics.allocation.successful)} /><Metric label="Timed out users" value={String(run.metrics.execution?.timedOutVirtualUsers ?? 0)} /><Metric label="Peak in-flight" value={String(run.metrics.execution?.peakInFlightRequests ?? 0)} /><Metric label="Cancelled users" value={String(run.metrics.execution?.cancelledVirtualUsers ?? 0)} /><Metric label="Failed workflows" value={String(run.metrics.execution?.failedVirtualUsers ?? 0)} /><Metric label="Late schedules" value={String(run.metrics.execution?.lateScheduleCount ?? 0)} /></div><div className="mt-5"><div className="mb-2 flex justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500"><span>Virtual user completion</span><span>{progress.toFixed(0)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all" style={{ width: `${progress}%` }} /></div></div><p className="mt-5 text-xs leading-5 text-slate-500">Actual requests/sec is measured from completed simulator actions. A run can end at its configured duration before every virtual-user workflow finishes.</p></> : <div className="rounded-xl border border-dashed border-white/[0.1] bg-white/[0.015] p-8 text-center"><Radio className="mx-auto h-5 w-5 text-slate-600" /><p className="mt-3 text-sm font-medium text-slate-300">No simulation selected</p><p className="mt-1 text-xs text-slate-500">Configure a bounded virtual-user run to begin.</p></div>}</section>
    </div><div className="flex items-center gap-2 px-1 text-xs text-slate-600"><Activity className="h-3.5 w-3.5" />Values shown here come from the selected simulator run.</div>
  </div>;
}

const fieldClass = "mt-2 w-full rounded-xl border border-white/[0.09] bg-[#050b16] px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-700 focus:border-cyan-300/35 focus:ring-2 focus:ring-cyan-300/[0.08]";
function NumberInput({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) { return <label className="block text-xs font-medium text-slate-400">{label}<input className={`${fieldClass} font-mono`} type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/[0.06] bg-[#050b16]/65 p-3"><div className="text-[9px] uppercase leading-4 tracking-[0.12em] text-slate-500">{label}</div><div className="mt-2 break-words font-mono text-sm text-white">{value}</div></div>; }
function Badge({ children }: { children: React.ReactNode }) { return <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.055] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-cyan-100"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />{children}</span>; }
function StatusPill({ children, active }: { children: React.ReactNode; active: boolean }) { return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] ${active ? "border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-100" : "border-white/[0.07] bg-white/[0.03] text-slate-400"}`}><span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-cyan-300" : "bg-slate-500"}`} />{children}</span>; }
function formatMilliseconds(value: number): string { return `${Number.isFinite(value) ? value.toFixed(1) : "0.0"} ms`; }
