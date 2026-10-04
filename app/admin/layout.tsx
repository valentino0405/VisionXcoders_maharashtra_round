"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ShieldAlert, BarChart3, Settings, LayoutDashboard, Crosshair, FlaskConical, FileText } from "lucide-react";

const items = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard }, { href: "/admin/traffic", label: "Traffic", icon: Activity },
  { href: "/admin/fairness", label: "Fairness", icon: BarChart3 }, { href: "/admin/threats", label: "Threats", icon: ShieldAlert },
  { href: "/admin/simulator", label: "Simulator", icon: Crosshair }, { href: "/admin/experiments", label: "Experiments", icon: FlaskConical },
  { href: "/admin/reports", label: "Reports", icon: FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="min-h-screen bg-background flex w-full pt-16"><aside className="w-64 border-r border-white/5 bg-[#030712]/50 backdrop-blur-xl hidden md:flex flex-col h-[calc(100vh-4rem)] sticky top-16"><div className="p-6 border-b border-white/5"><div className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-1">Operations Center</div><div className="text-white font-bold flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-500" /> System ready</div></div><nav className="flex-1 p-4 space-y-1 overflow-y-auto">{items.map((item, index) => { const Icon = item.icon; const active = pathname === item.href; return <div key={item.href}>{index === 1 ? <div className="text-xs font-semibold text-gray-600 tracking-widest uppercase mt-6 mb-2 px-3">Monitoring</div> : null}{index === 4 ? <div className="text-xs font-semibold text-gray-600 tracking-widest uppercase mt-6 mb-2 px-3">Testing & Data</div> : null}<Link href={item.href} className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${active ? "text-white bg-white/10" : "text-gray-400 hover:text-white hover:bg-white/5"}`}><Icon className="h-4 w-4" /> {item.label}</Link></div>; })}</nav><div className="p-4 border-t border-white/5"><Link href="/admin" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-400 hover:text-white hover:bg-white/5"><Settings className="h-4 w-4" /> Settings</Link></div></aside><main className="flex-1 min-h-[calc(100vh-4rem)] bg-[#030712] overflow-x-hidden">{children}</main></div>;
}
