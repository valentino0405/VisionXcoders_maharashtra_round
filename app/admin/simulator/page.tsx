"use client";

import { useEffect, useState } from "react";
import { Crosshair, Play, Square } from "lucide-react";

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
  };
};

const scenarios = [
  "NORMAL_TRAFFIC",
  "REQUEST_FLOOD",
  "BOT_SWARM",
  "DUPLICATE_ATTEMPTS",
  "TOKEN_REPLAY",
  "QUEUE_MANIPULATION",
  "MIXED_ATTACK",
];

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
      try {
        attackDistribution = JSON.parse(distribution) as Record<string, number>;
      } catch {
        setError("Attack distribution must be valid JSON.");
        return;
      }
    }

    const response = await fetch("/api/admin/simulator/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        virtualUsers: users,
        durationSeconds: duration,
        maxConcurrency: concurrency,
        requestRate,
        scenario,
        seed,
        attackDistribution,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.detail ?? result.error);
      return;
    }
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
      },
    });
  }

  async function stop() {
    if (run) await fetch(`/api/admin/simulator/${run.simulationRunId}/stop`, { method: "POST" });
  }

  return <div className="p-6 md:p-8 w-full max-w-5xl mx-auto">
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-white flex items-center gap-3"><Crosshair className="h-8 w-8 text-violet-500" /> Adversarial Simulator</h1>
      <p className="text-gray-400 mt-2">Isolated virtual-user workloads only; no Clerk accounts or demo-drop data are created.</p>
    </div>
    <div className="grid lg:grid-cols-3 gap-6">
      <section className="glass-card rounded-xl border border-white/10 p-6 space-y-5">
        <NumberInput label="Virtual users" value={users} min={1} max={50_000} onChange={setUsers} />
        <NumberInput label="Duration (seconds)" value={duration} min={1} max={300} onChange={setDuration} />
        <NumberInput label="Concurrency" value={concurrency} min={1} max={500} onChange={setConcurrency} />
        <NumberInput label="Request rate (req/s)" value={requestRate} min={1} max={2_000} onChange={setRequestRate} />
        <NumberInput label="Seed" value={seed} min={0} max={2_147_483_647} onChange={setSeed} />
        <label className="block text-sm text-gray-300">Scenario
          <select className="mt-2 w-full bg-black border border-white/10 rounded p-2" value={scenario} onChange={(event) => setScenario(event.target.value)}>
            {scenarios.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="block text-sm text-gray-300">Mixed attack distribution (optional JSON)
          <textarea className="mt-2 w-full bg-black border border-white/10 rounded p-2 text-xs" rows={3} placeholder='{"NORMAL_TRAFFIC":65,"REQUEST_FLOOD":10,...}' value={distribution} onChange={(event) => setDistribution(event.target.value)} />
        </label>
        <button onClick={running ? stop : start} className="w-full flex items-center justify-center gap-2 h-12 rounded-lg bg-violet-600 text-white font-bold">
          {running ? <><Square className="h-4 w-4" /> Stop simulation</> : <><Play className="h-4 w-4" /> Start simulation</>}
        </button>
        {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
      </section>
      <section className="lg:col-span-2 glass-card rounded-xl border border-white/10 p-6">
        <h2 className="text-white font-bold mb-5">Run status</h2>
        {run ? <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <Metric label="Status" value={run.status} />
          <Metric label="Progress" value={`${run.metrics.completedVirtualUsers} / ${run.metrics.totalVirtualUsers}`} />
          <Metric label="Requests" value={String(run.metrics.totalRequests)} />
          <Metric label="Requests/sec" value={run.metrics.requestsPerSecond.toFixed(1)} />
          <Metric label="P95 latency" value={`${run.metrics.latency.p95Ms} ms`} />
          <Metric label="429 responses" value={String(run.metrics.responses.throttled429)} />
          <Metric label="Allocations" value={String(run.metrics.allocation.successful)} />
        </div> : <p className="text-gray-500">No simulation selected. Configure a bounded virtual-user run to begin.</p>}
      </section>
    </div>
  </div>;
}

function NumberInput({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label className="block text-sm text-gray-300">{label}
    <input className="mt-2 w-full bg-black border border-white/10 rounded p-2" type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
  </label>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/5 bg-black/30 p-3"><div className="text-xs uppercase text-gray-500">{label}</div><div className="mt-1 font-mono text-white">{value}</div></div>;
}
