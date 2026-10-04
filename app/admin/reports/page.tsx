"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Printer } from "lucide-react";

type Value = number | "NOT_APPLICABLE";
type Compared = { baseline: Value; fairDrop: Value; difference: Value; percentageDifference?: Value };
type Report = { summary: { name: string; scenario: string; virtualUsers: number; durationSeconds: number; requestRate: number; concurrency: number; seed: number; createdAt: string | null; startedAt: string | null; completedAt: string | null; baselineRunId: string; fairDropRunId: string }; performance: { traffic: { totalRequests: Compared; requestsPerSecond: Compared }; responses: Record<string, Compared>; latency: Record<string, Compared>; errors: Record<string, Compared> }; queue: Record<string, Compared>; abuse: Record<string, Compared>; allocation: Record<string, Compared>; integrity: Record<string, Compared>; fairness: { baselineNormalRate: { value: number | null; confidenceInterval95: { lower: number; upper: number } | null }; baselineAttackRate: { value: number | null; confidenceInterval95: { lower: number; upper: number } | null }; fairDropNormalRate: { value: number | null; confidenceInterval95: { lower: number; upper: number } | null }; fairDropAttackRate: { value: number | null; confidenceInterval95: { lower: number; upper: number } | null }; normalVsAttackDifference: Compared }; charts: { latency: Record<string, Compared>; allocation: Record<string, Compared>; integrity: Record<string, Compared>; outcomes: Record<string, Compared> } };
type ExperimentOption = { experimentId: string; name: string; status: string };

export default function ReportsPage() {
  const [experiments, setExperiments] = useState<ExperimentOption[]>([]);
  const [selected, setSelected] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [state, setState] = useState<"loading" | "empty" | "ready" | "error">("loading");
  useEffect(() => { void (async () => {
    const response = await fetch("/api/admin/experiments", { cache: "no-store" });
    if (!response.ok) { setState("error"); return; }
    const complete = ((await response.json()).experiments as ExperimentOption[]).filter((item) => item.status === "COMPLETED");
    setExperiments(complete);
    if (!complete.length) setState("empty"); else { setSelected(complete[0].experimentId); setState("loading"); }
  })(); }, []);
  useEffect(() => { if (!selected) return; void (async () => {
    setState("loading");
    const response = await fetch(`/api/admin/reports/${selected}`, { cache: "no-store" });
    if (!response.ok) { setState("error"); return; }
    setReport((await response.json()).report); setState("ready");
  })(); }, [selected]);
  function exportCsv() {
    if (!report) return;
    const rows = [["Metric", "Baseline", "FairDrop", "Difference"], ...reportRows(report).map(([label, value]) => [label, String(value.baseline), String(value.fairDrop), String(value.difference)])];
    const blob = new Blob([rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${report.summary.name.replaceAll(/[^a-z0-9]+/gi, "-")}-report.csv`; anchor.click(); URL.revokeObjectURL(url);
  }
  return <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6 print:p-0">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden"><div><h1 className="text-3xl font-bold text-white flex items-center gap-3"><FileText className="h-8 w-8 text-violet-500" /> Before vs After Reports</h1><p className="text-gray-400 mt-2">Measured baseline and FairDrop experiment results.</p></div>{experiments.length ? <div className="flex gap-2"><select aria-label="Completed experiment" className="bg-black border border-white/10 rounded-lg p-2 text-sm" value={selected} onChange={(event) => setSelected(event.target.value)}>{experiments.map((item) => <option key={item.experimentId} value={item.experimentId}>{item.name}</option>)}</select><button onClick={() => window.print()} className="button"><Printer className="h-4 w-4" /> Print</button><button onClick={exportCsv} className="button"><Download className="h-4 w-4" /> CSV</button></div> : null}</div>
    {state === "loading" ? <State title="Loading report…" detail="Reading aggregate experiment results." /> : null}
    {state === "empty" ? <State title="No completed experiment data yet" detail="Run an experiment to generate a baseline vs FairDrop report." href="/admin/experiments" action="Open experiments" /> : null}
    {state === "error" ? <State title="Unable to load report" detail="Try selecting another completed experiment or retry." /> : null}
    {state === "ready" && report ? <ReportView report={report} /> : null}
    <style jsx>{`.button{display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;border:1px solid rgba(255,255,255,.1);border-radius:.5rem;color:#fff;font-size:.875rem}`}</style>
  </div>;
}

function ReportView({ report }: { report: Report }) {
  const { summary } = report;
  return <><section className="glass-card rounded-xl border border-white/10 p-6"><h2 className="text-xl font-bold text-white">{summary.name}</h2><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 text-sm">{[["Scenario", summary.scenario], ["Virtual users", summary.virtualUsers], ["Duration", `${summary.durationSeconds} sec`], ["Request rate", `${summary.requestRate} req/s`], ["Concurrency", summary.concurrency], ["Seed", summary.seed], ["Baseline run", summary.baselineRunId], ["FairDrop run", summary.fairDropRunId]].map(([label, value]) => <Info key={String(label)} label={String(label)} value={String(value)} />)}</div></section>
    <section className="grid md:grid-cols-2 gap-6"><Chart title="Latency comparison (ms)" values={report.charts.latency} /><Chart title="Allocation rate" values={report.charts.allocation} percentage /><Chart title="Integrity events" values={report.charts.integrity} /><Chart title="Request outcomes" values={report.charts.outcomes} /></section>
    <Metrics title="Performance" rows={[...rowsOf(report.performance.traffic), ...rowsOf(report.performance.latency), ...rowsOf(report.performance.responses), ...rowsOf(report.performance.errors)]} />
    <Metrics title="Queue" rows={rowsOf(report.queue)} /><Metrics title="Abuse & bot defense" rows={rowsOf(report.abuse)} /><Metrics title="Allocation" rows={rowsOf(report.allocation)} /><Metrics title="Integrity" rows={rowsOf(report.integrity)} />
    <section className="glass-card rounded-xl border border-white/10 p-6"><h2 className="font-bold text-white mb-4">Fairness</h2><div className="grid md:grid-cols-2 gap-3 text-sm"><FairRate label="Baseline normal allocation" value={report.fairness.baselineNormalRate} /><FairRate label="Baseline attack allocation" value={report.fairness.baselineAttackRate} /><FairRate label="FairDrop normal allocation" value={report.fairness.fairDropNormalRate} /><FairRate label="FairDrop attack allocation" value={report.fairness.fairDropAttackRate} /><MetricLine label="Normal vs attack difference" value={report.fairness.normalVsAttackDifference} /></div></section>
  </>;
}
function reportRows(report: Report): [string, Compared][] { return [...rowsOf(report.performance.traffic), ...rowsOf(report.performance.latency), ...rowsOf(report.performance.responses), ...rowsOf(report.queue), ...rowsOf(report.abuse), ...rowsOf(report.allocation), ...rowsOf(report.integrity)]; }
function rowsOf(section: Record<string, Compared>): [string, Compared][] { return Object.entries(section).map(([key, value]) => [key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()), value]); }
function Metrics({ title, rows }: { title: string; rows: [string, Compared][] }) { return <section className="glass-card rounded-xl border border-white/10 p-6 overflow-x-auto"><h2 className="font-bold text-white mb-4">{title}</h2><table className="w-full text-sm"><thead className="text-gray-500"><tr><th className="text-left pb-2">Metric</th><th>Baseline</th><th>FairDrop</th><th>Difference</th></tr></thead><tbody>{rows.map(([label, value]) => <tr key={label} className="border-t border-white/5"><td className="py-2 text-gray-300">{label}</td><td className="text-center font-mono">{show(value.baseline)}</td><td className="text-center font-mono">{show(value.fairDrop)}</td><td className="text-center font-mono">{show(value.difference)}</td></tr>)}</tbody></table></section>; }
function Chart({ title, values, percentage = false }: { title: string; values: Record<string, Compared>; percentage?: boolean }) { const maximum = Math.max(1, ...Object.values(values).flatMap((value) => [value.baseline, value.fairDrop]).filter((value): value is number => typeof value === "number")); return <section className="glass-card rounded-xl border border-white/10 p-6"><h2 className="font-bold text-white mb-5">{title}</h2><div className="space-y-4">{Object.entries(values).map(([label, value]) => <div key={label}><div className="flex justify-between text-xs text-gray-400 mb-1"><span>{label}</span><span>{show(value.baseline)} / {show(value.fairDrop)}{percentage ? "" : ""}</span></div><div className="space-y-1"><div className="h-2 bg-black rounded"><div className="h-full bg-gray-500 rounded" style={{ width: `${typeof value.baseline === "number" ? Math.min(100, value.baseline / maximum * 100) : 0}%` }} /></div><div className="h-2 bg-black rounded"><div className="h-full bg-violet-500 rounded" style={{ width: `${typeof value.fairDrop === "number" ? Math.min(100, value.fairDrop / maximum * 100) : 0}%` }} /></div></div></div>)}</div><p className="text-xs text-gray-500 mt-4">Gray: baseline · Purple: FairDrop</p></section>; }
function Info({ label, value }: { label: string; value: string }) { return <div><div className="text-xs text-gray-500 uppercase">{label}</div><div className="text-white font-mono mt-1 break-all">{value}</div></div>; }
function FairRate({ label, value }: { label: string; value: { value: number | null; confidenceInterval95: { lower: number; upper: number } | null } }) { return <div className="border border-white/5 rounded p-3"><div className="text-gray-400">{label}</div><div className="font-mono text-white">{value.value === null ? "N/A" : `${(value.value * 100).toFixed(2)}%`}</div><div className="text-xs text-gray-500">{value.confidenceInterval95 ? `95% CI ${(value.confidenceInterval95.lower * 100).toFixed(1)}–${(value.confidenceInterval95.upper * 100).toFixed(1)}%` : "No confidence interval"}</div></div>; }
function MetricLine({ label, value }: { label: string; value: Compared }) { return <div className="border border-white/5 rounded p-3"><div className="text-gray-400">{label}</div><div className="font-mono text-white">Baseline {show(value.baseline)} · FairDrop {show(value.fairDrop)}</div></div>; }
function State({ title, detail, href, action }: { title: string; detail: string; href?: string; action?: string }) { return <section className="glass-card rounded-xl border border-white/10 p-10 text-center"><h2 className="text-white font-bold text-xl">{title}</h2><p className="text-gray-400 mt-2">{detail}</p>{href ? <a href={href} className="inline-block mt-5 text-violet-400">{action} →</a> : null}</section>; }
function show(value: Value) { return value === "NOT_APPLICABLE" ? "N/A" : Number.isFinite(value) ? value.toFixed(3) : "—"; }
