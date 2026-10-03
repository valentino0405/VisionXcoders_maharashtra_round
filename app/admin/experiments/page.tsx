"use client";

import { useEffect, useState } from "react";
import { FlaskConical, Play, Square } from "lucide-react";

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
  const active = experiment ? activeStatuses.has(experiment.status) : false;

  useEffect(() => {
    void fetch("/api/admin/experiments", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const latest = (await response.json()).experiments?.[0] as Experiment | undefined;
      if (latest) setExperiment(latest);
    });
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

  return <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6">
    <div><h1 className="text-3xl font-bold text-white flex items-center gap-3"><FlaskConical className="h-8 w-8 text-violet-500" /> Experiments & Comparisons</h1><p className="text-gray-400 mt-2">Replay one deterministic workload against the isolated baseline and FairDrop.</p></div>
    <div className="grid lg:grid-cols-3 gap-6">
      <section className="glass-card rounded-xl border border-white/10 p-6 space-y-4">
        <TextInput label="Name" value={name} onChange={setName} />
        <NumberInput label="Virtual users" value={users} min={1} max={50_000} onChange={setUsers} />
        <NumberInput label="Duration (seconds)" value={duration} min={1} max={300} onChange={setDuration} />
        <NumberInput label="Concurrency" value={concurrency} min={1} max={500} onChange={setConcurrency} />
        <NumberInput label="Request rate" value={requestRate} min={1} max={2_000} onChange={setRequestRate} />
        <NumberInput label="Seed" value={seed} min={0} max={2_147_483_647} onChange={setSeed} />
        <label className="block text-sm text-gray-300">Scenario<select className="control" value={scenario} onChange={(event) => setScenario(event.target.value)}>{scenarios.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="block text-sm text-gray-300">Mixed distribution (optional JSON)<textarea className="control text-xs" rows={3} value={distribution} onChange={(event) => setDistribution(event.target.value)} /></label>
        <button onClick={active ? stop : start} className="w-full h-12 rounded-lg bg-violet-600 text-white font-bold flex items-center justify-center gap-2">{active ? <><Square className="h-4 w-4" /> Stop</> : <><Play className="h-4 w-4" /> Start experiment</>}</button>
        {error ? <p className="text-red-300 text-sm">{error}</p> : null}
      </section>
      <section className="lg:col-span-2 space-y-6">
        <div className="glass-card rounded-xl border border-white/10 p-6"><h2 className="font-bold text-white mb-4">Run status</h2>{experiment ? <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Metric label="Experiment" value={experiment.status} /><Metric label="Progress" value={current ? `${current.completedVirtualUsers}/${current.totalVirtualUsers}` : "0"} /><Metric label="Requests" value={format(current?.totalRequests)} /><Metric label="RPS" value={format(current?.requestsPerSecond)} /><Metric label="P95 / P99" value={current ? `${current.latency.p95Ms.toFixed(1)} / ${current.latency.p99Ms.toFixed(1)} ms` : "—"} /><Metric label="Errors" value={current ? String(current.errors.timeouts + current.errors.connection + current.errors.unexpected) : "—"} /><Metric label="Allocations" value={format(current?.allocation.successful)} /></div> : <p className="text-gray-500">No experiment selected.</p>}</div>
        {experiment?.comparison ? <ComparisonTable comparison={experiment.comparison} /> : null}
      </section>
    </div>
    <style jsx>{`.control{display:block;margin-top:.5rem;width:100%;background:#000;border:1px solid rgba(255,255,255,.1);border-radius:.375rem;padding:.5rem}`}</style>
  </div>;
}

function ComparisonTable({ comparison }: { comparison: NonNullable<Experiment["comparison"]> }) {
  const rows: [string, Compared][] = [["Requests", comparison.traffic.totalRequests], ["P95 latency", comparison.latency.p95Ms], ["P99 latency", comparison.latency.p99Ms], ["429s", comparison.responses.throttled429], ["Blocked", comparison.abuse.blocked], ["Allocations", comparison.allocation.successful], ["Duplicate allocations", comparison.integrity.duplicateParticipantAllocations], ["Overselling", comparison.integrity.overselling], ["Normal allocation rate", comparison.allocation.normalAllocationRate], ["Attack allocation rate", comparison.allocation.attackAllocationRate], ["Normalized queue position", comparison.queue.normalizedPositionMean]];
  return <div className="glass-card rounded-xl border border-white/10 p-6 overflow-x-auto"><h2 className="font-bold text-white mb-4">Comparison</h2><table className="w-full text-sm"><thead className="text-gray-500"><tr><th className="text-left py-2">Metric</th><th>Baseline</th><th>FairDrop</th><th>Difference</th></tr></thead><tbody>{rows.map(([label, item]) => <tr key={label} className="border-t border-white/5"><td className="py-3 text-gray-300">{label}</td><td className="text-center font-mono">{display(item.baseline)}</td><td className="text-center font-mono">{display(item.fairDrop)}</td><td className="text-center font-mono">{display(item.difference)}</td></tr>)}</tbody></table></div>;
}
function display(value: Value) { return value === "NOT_APPLICABLE" ? "N/A" : Number.isFinite(value) ? value.toFixed(3) : "—"; }
function format(value?: number) { return value === undefined ? "—" : value.toFixed(1); }
function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-sm text-gray-300">{label}<input className="control" value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function NumberInput({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) { return <label className="block text-sm text-gray-300">{label}<input className="control" type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-white/5 bg-black/30 p-3"><div className="text-xs uppercase text-gray-500">{label}</div><div className="mt-1 font-mono text-white break-words">{value}</div></div>; }
