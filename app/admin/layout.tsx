"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  ChevronRight,
  Crosshair,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { useIsAdmin } from "@/lib/hooks/use-is-admin";

const items = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, group: "Control room" },
  { href: "/admin/traffic", label: "Traffic", icon: Activity, group: "Monitoring" },
  { href: "/admin/fairness", label: "Fairness", icon: BarChart3, group: "Monitoring" },
  { href: "/admin/threats", label: "Threats", icon: ShieldAlert, group: "Monitoring" },
  { href: "/admin/simulator", label: "Simulator", icon: Crosshair, group: "Testing & data" },
  { href: "/admin/experiments", label: "Experiments", icon: FlaskConical, group: "Testing & data" },
  { href: "/admin/reports", label: "Reports", icon: FileText, group: "Testing & data" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();

  // Loading state
  if (isAdmin === null) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#030611] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="text-sm text-slate-400">Verifying access…</p>
        </div>
      </div>
    );
  }

  // Access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#030611] text-white">
        <div className="relative mx-4 max-w-md overflow-hidden rounded-3xl border border-red-500/20 bg-[#071328]/80 p-8 text-center shadow-[0_24px_100px_rgba(239,68,68,0.12)] backdrop-blur-xl sm:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-72 w-72 rounded-full border border-red-500/[0.08]">
            <div className="absolute inset-10 rounded-full border border-dashed border-red-400/[0.12]" />
          </div>
          <div className="relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/[0.08]">
              <ShieldX className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight">Access Denied</h1>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              The Operations console is restricted to FairDrop administrators. If you believe you should have access, contact your workspace owner.
            </p>
            <Link
              href="/"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-5 py-3 text-sm font-semibold text-[#04101e] shadow-[0_8px_30px_rgba(34,211,238,0.18)] transition hover:brightness-110"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const nav = (mobile = false) => (
    <nav aria-label="Operations pages" className={mobile ? "flex min-w-max gap-2 px-4 py-3" : "space-y-1 px-3 py-5"}>
      {items.map((item, index) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        const showGroup = index === 0 || items[index - 1].group !== item.group;
        return (
          <div key={item.href}>
            {!mobile && showGroup ? <div className={`px-3 ${index === 0 ? "mb-2" : "mb-2 mt-7"} text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600`}>{item.group}</div> : null}
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${mobile ? "shrink-0" : ""} ${active ? "border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-100 shadow-[inset_0_0_20px_rgba(34,211,238,0.04)]" : "border-transparent text-slate-400 hover:border-white/[0.07] hover:bg-white/[0.035] hover:text-white"}`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-cyan-300" : "text-slate-500 group-hover:text-slate-300"}`} />
              <span>{item.label}</span>
              {active ? <ChevronRight className="ml-auto h-3.5 w-3.5 text-cyan-300/70" /> : null}
            </Link>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="relative isolate flex min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#030611] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-48 top-0 h-[34rem] w-[34rem] rounded-full bg-blue-600/[0.08] blur-[150px]" />
        <div className="absolute right-[-16rem] top-[28rem] h-[30rem] w-[30rem] rounded-full bg-cyan-500/[0.055] blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.018)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
      </div>

      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[17rem] shrink-0 flex-col border-r border-white/[0.07] bg-[#050b18]/75 backdrop-blur-2xl md:flex">
        <div className="border-b border-white/[0.07] px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.08] shadow-[0_0_28px_rgba(34,211,238,0.11)]">
              <ShieldCheck className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide text-white">FairDrop</div>
              <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">Operations console</div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-lg border border-cyan-300/10 bg-cyan-300/[0.035] px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">Workspace</span>
            <span className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.07] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-cyan-200">Demo</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">{nav()}</div>
        <div className="border-t border-white/[0.07] p-3">
          <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 transition hover:bg-white/[0.035] hover:text-slate-200">
            <Settings className="h-4 w-4" /> Workspace settings
          </Link>
          <div className="mt-3 flex items-center gap-2 px-3 pb-1 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-600" /> Metrics update with run data
          </div>
        </div>
      </aside>

      <main className="relative min-w-0 flex-1 overflow-x-hidden">
        <div className="sticky top-16 z-20 border-b border-white/[0.07] bg-[#050b18]/80 backdrop-blur-2xl md:hidden">
          <div className="flex items-center justify-between px-4 pt-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><ShieldCheck className="h-4 w-4 text-cyan-300" /> Operations</div>
            <span className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.07] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-cyan-200">Demo workspace</span>
          </div>
          <div className="overflow-x-auto">{nav(true)}</div>
        </div>
        {children}
      </main>
    </div>
  );
}

