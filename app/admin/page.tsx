import { Users, Activity, Layers, AlertTriangle, ShieldCheck, TrendingUp } from "lucide-react";

export default function AdminOverview() {
  return (
    <div className="p-6 md:p-8 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Operations Overview</h1>
          <p className="text-gray-400">Real-time monitoring of the Global Drop allocation event.</p>
        </div>
        <div className="flex gap-2">
          <div className="px-4 py-2 bg-black border border-white/10 rounded-lg text-sm text-gray-400 flex items-center gap-2">
            Status: <span className="text-green-400 font-bold">LIVE</span>
          </div>
          <div className="px-4 py-2 bg-black border border-white/10 rounded-lg text-sm text-gray-400">
            Event: <span className="text-white">Global Drop</span>
          </div>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <div className="glass-card p-5 rounded-xl border border-white/5">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Users className="h-3 w-3" /> Active Users</div>
          <div className="text-2xl font-bold text-white font-mono">49,821</div>
          <div className="text-xs text-green-400 mt-2 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> +12% / min</div>
        </div>
        <div className="glass-card p-5 rounded-xl border border-white/5">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Activity className="h-3 w-3" /> Requests/sec</div>
          <div className="text-2xl font-bold text-blue-400 font-mono">18,420</div>
          <div className="text-xs text-green-400 mt-2 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Peak 22k</div>
        </div>
        <div className="glass-card p-5 rounded-xl border border-white/5">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Layers className="h-3 w-3" /> Queue Depth</div>
          <div className="text-2xl font-bold text-white font-mono">43,812</div>
          <div className="text-xs text-gray-500 mt-2">Avg Wait: 4m 32s</div>
        </div>
        <div className="glass-card p-5 rounded-xl border border-white/5 bg-violet-900/10 border-violet-500/20">
          <div className="text-xs text-violet-400 uppercase tracking-widest mb-1 flex items-center gap-1">Seats Remaining</div>
          <div className="text-2xl font-bold text-white font-mono glow-text">127</div>
          <div className="text-xs text-violet-300/50 mt-2">of 500 total</div>
        </div>
        <div className="glass-card p-5 rounded-xl border border-white/5 bg-red-900/10 border-red-500/20">
          <div className="text-xs text-red-400 uppercase tracking-widest mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Suspicious</div>
          <div className="text-2xl font-bold text-red-400 font-mono">8.4%</div>
          <div className="text-xs text-red-400/50 mt-2">4,184 flagged</div>
        </div>
        <div className="glass-card p-5 rounded-xl border border-white/5 bg-green-900/10 border-green-500/20">
          <div className="text-xs text-green-400 uppercase tracking-widest mb-1 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Alloc Rate</div>
          <div className="text-2xl font-bold text-green-400 font-mono">74.6%</div>
          <div className="text-xs text-green-400/50 mt-2">Efficiency</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 glass-card rounded-xl border border-white/5 p-6 min-h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-white">Live Traffic Distribution</h3>
            <div className="flex gap-4 text-xs font-medium">
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Normal</div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Blocked</div>
            </div>
          </div>
          <div className="flex-1 border-b border-l border-white/10 relative flex items-end pt-4 pr-4">
            {/* Mock Chart */}
            <div className="absolute left-0 bottom-0 w-full h-full flex items-end gap-1 px-1">
              {[...Array(40)].map((_, i) => {
                const heightNormal = Math.max(20, Math.random() * 70);
                const heightBlocked = Math.max(5, Math.random() * 20);
                return (
                  <div key={i} className="flex-1 flex flex-col justify-end group">
                    <div className="w-full bg-red-500/80 rounded-t-sm transition-all group-hover:bg-red-400" style={{ height: `${heightBlocked}%` }} />
                    <div className="w-full bg-blue-500/80 rounded-b-sm transition-all group-hover:bg-blue-400" style={{ height: `${heightNormal}%` }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="glass-card rounded-xl border border-white/5 p-6 flex flex-col gap-6">
          <div>
            <h3 className="font-bold text-white mb-4">System Health</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Queue Processing</span>
                  <span className="text-green-400 font-mono">99.8%</span>
                </div>
                <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[99.8%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Redis Memory</span>
                  <span className="text-blue-400 font-mono">42%</span>
                </div>
                <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[42%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Rate Limiter Load</span>
                  <span className="text-red-400 font-mono">87%</span>
                </div>
                <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 w-[87%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5">
            <h3 className="font-bold text-white mb-4">Recent Allocations</h3>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                    <span className="text-gray-300 font-mono">usr_{Math.random().toString(36).substring(2, 8)}</span>
                  </div>
                  <span className="text-gray-500 font-mono">Seat A-{Math.floor(Math.random() * 500)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
