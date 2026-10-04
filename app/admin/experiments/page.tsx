"use client";

import { useEffect, useState } from "react";
import { FlaskConical, Play, Radio, Square } from "lucide-react";

type Value = number | "NOT_APPLICABLE";
type Compared = { baseline: Value; fairDrop: Value; difference: Value };
type Metrics = { completedVirtualUsers: number; totalVirtualUsers: number; totalRequests: number; requestsPerSecond: number; latency: { p95Ms: number; p99Ms: number }; errors: { timeouts: number; connection: number; unexpected: number }; allocation: { successful: number } };
type Experiment = { experimentId: string; status: string; baselineMetrics: Metrics | null; fairDropMetrics: Metrics | null; comparison: null | { traffic: { totalRequests: Compared }; latency: { p95Ms: Compared; p99Ms: Compared }; responses: { throttled429: Compared }; abuse: { blocked: Compared }; allocation: { successful: Compared; normalAllocationRate: Compared; attackAllocationRate: Compared }; integrity: { duplicateParticipantAllocations: Compared; overselling: Compared }; queue: { normalizedPositionMean: Compared } } };
const activeStatuses = new Set(["CREATED", "RUNNING_BASELINE", "RUNNING_FAIRDROP", "COMPARING"]);
const scenarios = ["NORMAL_TRAFFIC", "REQUEST_FLOOD", "BOT_SWARM", "DUPLICATE_ATTEMPTS", "TOKEN_REPLAY", "QUEUE_MANIPULATION", "MIXED_ATTACK"];

export default function ExperimentsPage() {
  const [name, setName] = useState("FairDrop comparison");
  const [users, setUsers] = useState(100);
  const [duration, setDuration] = useState(60);
  const [concurrency, setConcurrency] = useState(100);
  const [requestRate, setRequestRate] = useState(250);
  const [seed, setSeed] = useState(12345);
  const [scenario, setScenario] = useState("MIXED_ATTACK");
  const [distribution, setDistribution] = useState("");
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialState, setInitialState] = useState<"loading" | "empty" | "error" | "ready">("loading");
  const active = experiment ? activeStatuses.has(experiment.status) : false;

  useEffect(() => {
    void fetch("/api/admin/experiments", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) { setInitialState("error"); return; }
      const latest = (await response.json()).experiments?.[0] as Experiment | undefined;
      if (latest) { setExperiment(latest); setInitialState("ready"); } else setInitialState("empty");
    }).catch(() => setInitialState("error"));
  }, []);

  useEffect(() => {
    if (!experiment?.experimentId || !active) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/admin/experiments/${experiment.experimentId}`, { cache: "no-store" });
      if (response.ok) setExperiment((await response.json()).experiment);
    }, 2_000);
    return () => window.clearInterval(timer);
  }, [experiment?.experimentId, active]);

  async function start() {
    setError(null);
    let attackDistribution: Record<string, number> | undefined;
    try { attackDistribution = distribution.trim() ? JSON.parse(distribution) : undefined; } catch { setError("Attack distribution must be valid JSON."); return; }
    const response = await fetch("/api/admin/experiments/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, virtualUsers: users, durationSeconds: duration, maxConcurrency: concurrency, requestRate, seed, scenario, attackDistribution }) });
    const result = await response.json();
    if (!response.ok) { setError(result.detail ?? result.error); return; }
    setExperiment({ ...result, baselineMetrics: null, fairDropMetrics: null, comparison: null });
  }
  async function stop() { if (experiment) await fetch(`/api/admin/experiments/${experiment.experimentId}/stop`, { method: "POST" }); }
  const current = experiment?.status === "RUNNING_BASELINE" ? experiment.baselineMetrics : experiment?.fairDropMetrics;
  const progress = current && current.totalVirtualUsers > 0 ? Math.min(100, current.completedVirtualUsers / current.totalVirtualUsers * 100) : 0;

  return <div className="mx-auto w-full max-w-7xl space-y-7 p-5 sm:p-7 lg:p-10">
    <div className="flex flex-col justify-between gap-4 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-end"><div><div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"><span>Testing &amp; data</span><span className="text-slate-700">/</span><span className="text-cyan-200">Experiments</span></div><h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"><span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06]"><FlaskConical className="h-5 w-5 text-cyan-200" /></span>Experiments &amp; comparisons</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Replay a bounded workload against the isolated baseline and FairDrop implementation.</p></div><Badge>Demo workspace · controlled runs</Badge></div>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(17rem,0.78fr)_minmax(0,1.5fr)] lg:gap-6">
      <section className="rounded-2xl border border-white/[0.08] bg-[#07101f]/80 p-5 shadow-[0_20px_70px_rgba(2,8,23,0.25)] backdrop-blur-xl sm:p-6"><div className="mb-5 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4"><div><div className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300/70">Configuration</div><h2 className="mt-1 font-semibold text-white">Run parameters</h2></div><span className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">Bounded</span></div><div className="space-y-4"><TextInput label="Experiment name" value={name} onChange={setName} /><NumberInput label="Virtual users" value={users} min={1} max={50_000} onChange={setUsers} /><div className="grid grid-cols-2 gap-3"><NumberInput label="Duration (sec)" value={duration} min={1} max={300} onChange={setDuration} /><NumberInput label="Concurrency" value={concurrency} min={1} max={500} onChange={setConcurrency} /></div><div className="grid grid-cols-2 gap-3"><NumberInput label="Request rate" value={requestRate} min={1} max={2_000} onChange={setRequestRate} /><NumberInput label="Seed" value={seed} min={0} max={2_147_483_647} onChange={setSeed} /></div><label className="block text-xs font-medium text-slate-400">Scenario<select className={fieldClass} value={scenario} onChange={(event) => setScenario(event.target.value)}>{scenarios.map((value) => <option key={value}>{value}</option>)}</select></label><label className="block text-xs font-medium text-slate-400">Mixed distribution <span className="font-normal text-slate-600">· optional JSON</span><textarea className={`${fieldClass} resize-y font-mono text-xs leading-5`} rows={3} value={distribution} onChange={(event) => setDistribution(event.target.value)} /></label><div className="rounded-xl border border-cyan-200/[0.08] bg-cyan-300/[0.025] p-3 text-xs leading-5 text-slate-500">Experiment inputs configure the existing isolated workload runner. No participant accounts are created.</div><button onClick={active ? stop : start} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 text-sm font-semibold text-[#04101e] shadow-[0_8px_30px_rgba(34,211,238,0.16)] transition hover:brightness-110">{active ? <><Square className="h-4 w-4" /> Stop experiment</> : <><Play className="h-4 w-4" /> Start experiment</>}</button>{error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}</div></section>
      <section className="space-y-5">
        <div className="rounded-2xl border border-white/[0.08] bg-[#07101f]/80 p-5 shadow-[0_20px_70px_rgba(2,8,23,0.25)] backdrop-blur-xl sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><div className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300/70">Execution telemetry</div><h2 className="mt-1 text-lg font-semibold text-white">Run status</h2></div>{experiment ? <StatusPill active={active}>{experiment.status.replaceAll("_", " ")}</StatusPill> : <Badge>Demo data</Badge>}</div>{experiment ? <><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"><Metric label="Progress" value={current ? `${current.completedVirtualUsers}/${current.totalVirtualUsers}` : "0"} /><Metric label="Requests" value={format(current?.totalRequests)} /><Metric label="Requests / sec" value={format(current?.requestsPerSecond)} /><Metric label="P95 / P99 latency" value={current ? `${current.latency.p95Ms.toFixed(1)} / ${current.latency.p99Ms.toFixed(1)} ms` : "—"} /><Metric label="Errors" value={current ? String(current.errors.timeouts + current.errors.connection + current.errors.unexpected) : "—"} /><Metric label="Allocations" value={format(current?.allocation.successful)} /></div><div className="mt-5"><div className="mb-2 flex justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500"><span>Virtual user completion</span><span>{progress.toFixed(0)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all" style={{ width: `${progress}%` }} /></div></div></> : initialState === "loading" ? <p className="text-sm text-slate-400">Loading experiment data…</p> : initialState === "error" ? <p className="text-sm text-rose-300">Unable to load experiments. Try again.</p> : <div className="rounded-xl border border-dashed border-white/[0.1] bg-white/[0.015] p-6 text-center"><Radio className="mx-auto h-5 w-5 text-slate-600" /><p className="mt-3 text-sm font-medium text-slate-300">No experiment data yet</p><p className="mt-1 text-xs text-slate-500">Configure a controlled run to create a comparison.</p></div>}</div>
        {experiment?.comparison ? <ComparisonTable comparison={experiment.comparison} /> : null}
        <div className="px-1 text-xs leading-5 text-slate-600">Run values are returned by the configured simulator and experiment services.</div>
      </section>
    </div>
  </div>;
}

function ComparisonTable({ comparison }: { comparison: NonNullable<Experiment["comparison"]> }) {
  const rows: [string, Compared][] = [["Requests", comparison.traffic.totalRequests], ["P95 latency", comparison.latency.p95Ms], ["P99 latency", comparison.latency.p99Ms], ["429s", comparison.responses.throttled429], ["Blocked", comparison.abuse.blocked], ["Allocations", comparison.allocation.successful], ["Duplicate allocations", comparison.integrity.duplicateParticipantAllocations], ["Overselling", comparison.integrity.overselling], ["Normal allocation rate", comparison.allocation.normalAllocationRate], ["Attack allocation rate", comparison.allocation.attackAllocationRate], ["Normalized queue position", comparison.queue.normalizedPositionMean]];
  return <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#07101f]/80 p-5 shadow-[0_20px_70px_rgba(2,8,23,0.2)] backdrop-blur-xl sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><div><div className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300/70">Run comparison</div><h2 className="mt-1 font-semibold text-white">Baseline vs FairDrop</h2></div><span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">Measured</span></div><table className="w-full min-w-[34rem] text-sm"><thead className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500"><tr><th className="py-3 text-left font-medium">Metric</th><th className="text-center font-medium">Baseline</th><th className="text-center font-medium">FairDrop</th><th className="text-center font-medium">Difference</th></tr></thead><tbody>{rows.map(([label, item]) => <tr key={label} className="border-t border-white/[0.055]"><td className="py-3 text-slate-300">{label}</td><td className="text-center font-mono text-slate-400">{display(item.baseline)}</td><td className="text-center font-mono text-cyan-100">{display(item.fairDrop)}</td><td className="text-center font-mono text-slate-300">{display(item.difference)}</td></tr>)}</tbody></table></div>;
}
function display(value: Value) { return value === "NOT_APPLICABLE" ? "N/A" : Number.isFinite(value) ? value.toFixed(3) : "—"; }
function format(value?: number) { return value === undefined ? "—" : value.toFixed(1); }
const fieldClass = "mt-2 w-full rounded-xl border border-white/[0.09] bg-[#050b16] px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-700 focus:border-cyan-300/35 focus:ring-2 focus:ring-cyan-300/[0.08]";
function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-xs font-medium text-slate-400">{label}<input className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function NumberInput({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) { return <label className="block text-xs font-medium text-slate-400">{label}<input className={`${fieldClass} font-mono`} type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/[0.06] bg-[#050b16]/65 p-3"><div className="text-[9px] uppercase leading-4 tracking-[0.12em] text-slate-500">{label}</div><div className="mt-2 break-words font-mono text-sm text-white">{value}</div></div>; }
function Badge({ children }: { children: React.ReactNode }) { return <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.055] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-cyan-100"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />{children}</span>; }
function StatusPill({ children, active }: { children: React.ReactNode; active: boolean }) { return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] ${active ? "border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-100" : "border-white/[0.07] bg-white/[0.03] text-slate-400"}`}><span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-cyan-300" : "bg-slate-500"}`} />{children}</span>; }
