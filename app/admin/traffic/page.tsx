"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Clock3,
  Gauge,
  Layers,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";

type Dashboard = {
  hasData: boolean;
  active: boolean;
  operations: {
    activeVirtualUsers: number;
    requestsPerSecond: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    queueDepth: number;
    throttledRequests: number;
    blockedRequests: number;
  };
};

export default function TrafficPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;

    const refresh = async () => {
      const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (stopped) return;
      if (!response.ok) {
        setError(true);
        return;
      }
      const next = (await response.json()).dashboard as Dashboard;
      setData(next);
      if (next.active) timer = window.setTimeout(refresh, 2_000);
    };

    void refresh();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (error) {
    return <TrafficState title="Traffic data unavailable" detail="The aggregate dashboard could not be loaded. Try again later." />;
  }
  if (!data) {
    return <TrafficState title="Loading traffic telemetry" detail="Reading aggregate run metrics…" loading />;
  }
  if (!data.hasData) {
    return (
      <div className="mx-auto max-w-6xl p-5 sm:p-7 lg:p-10">
        <PageEyebrow />
        <section className="relative mt-6 overflow-hidden rounded-3xl border border-cyan-200/10 bg-gradient-to-br from-[#0b1930] via-[#071225] to-[#080b18] p-6 shadow-[0_24px_100px_rgba(2,8,23,0.36)] backdrop-blur-xl sm:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border border-cyan-300/[0.08]">
            <div className="absolute inset-8 rounded-full border border-blue-300/[0.1]" />
            <div className="absolute inset-16 rounded-full border border-dashed border-cyan-300/[0.12]" />
          </div>
          <div className="relative max-w-2xl">
            <Badge><Radio className="h-3 w-3" /> No run data</Badge>
            <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.12)]">
              <Activity className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Traffic telemetry</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
              There are no completed simulator or experiment results to display yet. Start a controlled run to populate this view with measured aggregate traffic data.
            </p>
            <Link
              href="/admin/simulator"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-4 py-3 text-sm font-semibold text-[#04101e] shadow-[0_8px_30px_rgba(34,211,238,0.18)] transition hover:brightness-110"
            >
              Open simulator <ArrowUpRight className="h-4 w-4" />
            </Link>
            <div className="mt-8 grid gap-3 border-t border-white/[0.07] pt-5 sm:grid-cols-3">
              <EmptyStat label="Throughput" detail="Awaiting run" />
              <EmptyStat label="Latency" detail="Awaiting run" />
              <EmptyStat label="Enforcement" detail="Awaiting run" />
            </div>
          </div>
        </section>
      </div>
    );
  }

  const operations = data.operations;
  const metrics = [
    { label: "Active virtual users", value: formatCount(operations.activeVirtualUsers), icon: Users, accent: "cyan" },
    { label: "Queue depth", value: formatCount(operations.queueDepth), icon: Layers, accent: "blue" },
    { label: "P95 latency", value: `${operations.p95LatencyMs.toFixed(1)} ms`, icon: Clock3, accent: "cyan" },
    { label: "P99 latency", value: `${operations.p99LatencyMs.toFixed(1)} ms`, icon: Gauge, accent: "blue" },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-7 p-5 sm:p-7 lg:p-10">
      <PageEyebrow />
      <header className="flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-end">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] shadow-[0_0_24px_rgba(34,211,238,0.08)]">
              <Activity className="h-5 w-5 text-cyan-200" />
            </span>
            Traffic telemetry
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Aggregate request, queue, and latency measurements from the latest simulator or experiment run.
          </p>
        </div>
        <Badge>
          <span className={`h-1.5 w-1.5 rounded-full ${data.active ? "animate-pulse bg-emerald-300" : "bg-slate-500"}`} />
          {data.active ? "Run active · refreshing" : "Demo workspace · run snapshot"}
        </Badge>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <article className="relative isolate overflow-hidden rounded-3xl border border-cyan-200/10 bg-gradient-to-br from-[#0b1930] via-[#071225] to-[#080b18] p-5 shadow-[0_24px_80px_rgba(2,8,23,0.35)] sm:p-7">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 -z-10 h-72 w-72 rounded-full bg-blue-500/[0.12] blur-[90px]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 -z-10 h-56 w-56 rounded-full bg-cyan-400/[0.07] blur-[80px]" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-200/70">
                <Zap className="h-3.5 w-3.5" /> Current throughput
              </div>
              <div className="mt-5 flex items-baseline gap-3">
                <span className="font-mono text-5xl font-semibold tracking-[-0.06em] text-white sm:text-6xl">{operations.requestsPerSecond.toFixed(1)}</span>
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-slate-500">req / sec</span>
              </div>
              <p className="mt-3 max-w-md text-xs leading-5 text-slate-500">
                Measured throughput for the selected run. This screen shows the latest aggregate snapshot, not a fabricated traffic timeline.
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.06] text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.1)]">
              <Radio className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-5">
            <InlineMetric label="Observed active users" value={formatCount(operations.activeVirtualUsers)} />
            <InlineMetric label="Observed queue depth" value={formatCount(operations.queueDepth)} />
          </div>
        </article>

        <article className="rounded-3xl border border-white/[0.08] bg-[#07101f]/80 p-5 shadow-[0_20px_70px_rgba(2,8,23,0.22)] backdrop-blur-xl sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">Policy outcomes</div>
              <h2 className="mt-1 text-lg font-semibold text-white">Request enforcement</h2>
            </div>
            <ShieldCheck className="h-4 w-4 text-cyan-300/70" />
          </div>
          <div className="space-y-3">
            <EnforcementMetric icon={<ShieldAlert className="h-4 w-4" />} label="Throttled requests" value={operations.throttledRequests} tone="amber" />
            <EnforcementMetric icon={<ShieldAlert className="h-4 w-4" />} label="Blocked requests" value={operations.blockedRequests} tone="rose" />
          </div>
          <div className="mt-5 flex items-start gap-2 border-t border-white/[0.06] pt-4 text-[11px] leading-5 text-slate-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300/70" />
            Enforcement totals summarize run data; individual identities and event histories are not shown here.
          </div>
        </article>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">Run measurements</div>
            <h2 className="mt-1 text-lg font-semibold text-white">System snapshot</h2>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-600">{data.active ? "Refreshes every 2 seconds while active" : "Latest available run"}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
          {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-cyan-300/70" /> Run-derived aggregate metrics</span>
        <Link href="/admin/simulator" className="inline-flex items-center gap-1.5 font-medium text-cyan-200 transition hover:text-white">
          Configure a run <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function PageEyebrow() {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
      <span>Monitoring</span><span className="text-slate-700">/</span><span className="text-cyan-200">Traffic</span>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.055] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-cyan-100">{children}</span>;
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-2 font-mono text-lg text-white">{value}</div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: typeof Users; accent: "cyan" | "blue" }) {
  const theme = accent === "cyan"
    ? "border-cyan-200/10 bg-cyan-300/[0.06] text-cyan-200"
    : "border-blue-200/10 bg-blue-300/[0.06] text-blue-200";
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/[0.075] bg-[#07101f]/80 p-4 shadow-[0_14px_44px_rgba(2,8,23,0.2)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-cyan-200/15 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] font-medium uppercase leading-4 tracking-[0.13em] text-slate-500">{label}</div>
        <span className={`rounded-lg border p-2 ${theme}`}><Icon className="h-3.5 w-3.5" /></span>
      </div>
      <div className="mt-4 break-words font-mono text-xl font-medium tracking-tight text-white sm:text-2xl">{value}</div>
      <div aria-hidden="true" className="mt-4 h-px bg-gradient-to-r from-cyan-300/35 via-blue-400/15 to-transparent" />
    </article>
  );
}

function EnforcementMetric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "amber" | "rose" }) {
  const colors = tone === "amber"
    ? "border-amber-200/10 bg-amber-300/[0.06] text-amber-200"
    : "border-rose-200/10 bg-rose-300/[0.06] text-rose-200";
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#050b16]/65 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`rounded-lg border p-2 ${colors}`}>{icon}</span>
        <span className="truncate text-xs text-slate-400">{label}</span>
      </div>
      <span className="font-mono text-lg text-white">{formatCount(value)}</span>
    </div>
  );
}

function EmptyStat({ label, detail }: { label: string; detail: string }) {
  return <div className="rounded-xl border border-white/[0.07] bg-[#050b16]/55 p-4"><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</div><div className="mt-2 text-sm text-slate-300">{detail}</div></div>;
}

function TrafficState({ title, detail, loading = false }: { title: string; detail: string; loading?: boolean }) {
  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-7 lg:p-10">
      <PageEyebrow />
      <section className="mt-6 rounded-3xl border border-white/[0.08] bg-[#07101f]/80 p-7 shadow-[0_20px_70px_rgba(2,8,23,0.25)] backdrop-blur-xl sm:p-9">
        <Badge><span className={`h-1.5 w-1.5 rounded-full ${loading ? "animate-pulse bg-cyan-300" : "bg-amber-300"}`} /> Demo workspace</Badge>
        <h1 className="mt-5 text-xl font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
      </section>
    </div>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
