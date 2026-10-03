import Link from "next/link";
import { Activity, ShieldAlert, BarChart3, Settings, LayoutDashboard, Crosshair, FlaskConical, FileText } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex w-full pt-16">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#030712]/50 backdrop-blur-xl hidden md:flex flex-col h-[calc(100vh-4rem)] sticky top-16">
        <div className="p-6 border-b border-white/5">
          <div className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-1">Operations Center</div>
          <div className="text-white font-bold flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            System Live
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-white bg-white/10">
            <LayoutDashboard className="h-4 w-4" /> Overview
          </Link>
          <div className="text-xs font-semibold text-gray-600 tracking-widest uppercase mt-6 mb-2 px-3">Monitoring</div>
          <Link href="/admin/traffic" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <Activity className="h-4 w-4" /> Traffic
          </Link>
          <Link href="/admin/fairness" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <BarChart3 className="h-4 w-4" /> Fairness
          </Link>
          <Link href="/admin/threats" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <ShieldAlert className="h-4 w-4" /> Threats
          </Link>
          <div className="text-xs font-semibold text-gray-600 tracking-widest uppercase mt-6 mb-2 px-3">Testing & Data</div>
          <Link href="/admin/simulator" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <Crosshair className="h-4 w-4" /> Simulator
          </Link>
          <Link href="/admin/experiments" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <FlaskConical className="h-4 w-4" /> Experiments
          </Link>
          <Link href="/admin/reports" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <FileText className="h-4 w-4" /> Reports
          </Link>
        </nav>
        
        <div className="p-4 border-t border-white/5">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </div>
      </aside>
      
      {/* Main content */}
      <main className="flex-1 min-h-[calc(100vh-4rem)] bg-[#030712] overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
