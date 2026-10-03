import { ShieldAlert, Activity, AlertTriangle, Shield, CheckCircle2 } from "lucide-react";

export default function ThreatsPage() {
  const events = [
    { time: "18:45:12", src: "192.168.1.x", behavior: "Request Flooding", severity: "High", action: "IP Banned", status: "Resolved" },
    { time: "18:45:10", src: "10.0.0.x", behavior: "Token Replay", severity: "Critical", action: "Session Revoked", status: "Resolved" },
    { time: "18:44:59", src: "Multiple", behavior: "Bot Swarm", severity: "High", action: "Rate Limited", status: "Active" },
    { time: "18:44:12", src: "172.16.x.x", behavior: "Duplicate Attempts", severity: "Medium", action: "Queue Position Dropped", status: "Resolved" },
    { time: "18:43:55", src: "192.168.1.x", behavior: "Queue Manipulation", severity: "Critical", action: "Blacklisted", status: "Resolved" },
  ];

  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-red-500" />
            Threats & Abuse
          </h1>
          <p className="text-gray-400">Live monitoring of adversarial traffic and mitigation actions.</p>
        </div>
        <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 font-bold flex items-center gap-2">
          <Shield className="h-4 w-4" /> THREAT LEVEL: NORMAL
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 rounded-xl border border-white/10">
          <div className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-red-400" /> Automated Traffic
          </div>
          <div className="text-4xl font-bold text-white font-mono">10,482</div>
        </div>
        <div className="glass-card p-6 rounded-xl border border-white/10">
          <div className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" /> Rate-Limited
          </div>
          <div className="text-4xl font-bold text-white font-mono">7,294</div>
        </div>
        <div className="glass-card p-6 rounded-xl border border-white/10">
          <div className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-500" /> Blocked Requests
          </div>
          <div className="text-4xl font-bold text-red-400 font-mono">18,231</div>
        </div>
      </div>

      <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10 bg-white/5">
          <h3 className="font-bold text-white">Live Event Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/50 text-gray-400">
              <tr>
                <th className="p-4 font-semibold">Timestamp</th>
                <th className="p-4 font-semibold">Source</th>
                <th className="p-4 font-semibold">Behavior</th>
                <th className="p-4 font-semibold">Severity</th>
                <th className="p-4 font-semibold">Action Taken</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {events.map((evt, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors text-gray-300">
                  <td className="p-4 font-mono">{evt.time}</td>
                  <td className="p-4 font-mono">{evt.src}</td>
                  <td className="p-4">{evt.behavior}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      evt.severity === 'Critical' ? 'bg-red-500/20 text-red-400' :
                      evt.severity === 'High' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {evt.severity}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400">{evt.action}</td>
                  <td className="p-4 flex items-center gap-2">
                    {evt.status === 'Resolved' ? (
                      <><CheckCircle2 className="h-4 w-4 text-green-400" /> <span className="text-green-400">Resolved</span></>
                    ) : (
                      <><Activity className="h-4 w-4 text-orange-400 animate-pulse" /> <span className="text-orange-400">Active</span></>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
