import { FlaskConical, Download, FileText } from "lucide-react";

export default function ExperimentsReportsPage() {
  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-12">
      {/* Experiments Section */}
      <section>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FlaskConical className="h-8 w-8 text-violet-500" />
            Experiments & Comparisons
          </h1>
          <p className="text-gray-400">A/B Testing: Traditional Allocation vs FairDrop Engine</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Traditional */}
          <div className="glass-card p-6 rounded-xl border border-white/5 bg-red-900/5">
            <h3 className="font-bold text-gray-300 mb-6 text-center text-lg">TRADITIONAL ALLOCATION</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-gray-400">Duplicate Allocation</span>
                <span className="text-red-400 font-mono font-bold">14.2%</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-gray-400">Overselling</span>
                <span className="text-red-400 font-mono font-bold">2.1%</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-gray-400">Bot Allocation</span>
                <span className="text-red-400 font-mono font-bold">48.5%</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-gray-400">Fairness Score</span>
                <span className="text-red-400 font-mono font-bold">12.4%</span>
              </div>
            </div>
          </div>

          {/* FairDrop */}
          <div className="glass-card p-6 rounded-xl border border-violet-500/30 bg-violet-900/10 shadow-[0_0_30px_rgba(139,92,246,0.1)]">
            <h3 className="font-bold text-white mb-6 text-center text-lg glow-text">FAIRDROP ENGINE</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-gray-300">Duplicate Allocation</span>
                <span className="text-green-400 font-mono font-bold">0.0%</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-gray-300">Overselling</span>
                <span className="text-green-400 font-mono font-bold">0.0%</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-gray-300">Bot Allocation</span>
                <span className="text-green-400 font-mono font-bold">&lt; 3.1%</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-gray-300">Fairness Score</span>
                <span className="text-violet-400 font-mono font-bold glow-text">94.8%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Reports Section */}
      <section>
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <FileText className="h-6 w-6 text-blue-500" />
              Drop Summary Report
            </h2>
            <p className="text-gray-400">Final statistics for the latest allocation event.</p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors">
            <Download className="h-4 w-4" /> EXPORT REPORT
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-lg border border-white/5">
            <div className="text-xs text-gray-500 mb-1">Total Participants</div>
            <div className="text-xl text-white font-mono">50,000+</div>
          </div>
          <div className="glass-card p-4 rounded-lg border border-white/5">
            <div className="text-xs text-gray-500 mb-1">Total Requests</div>
            <div className="text-xl text-white font-mono">1.2M</div>
          </div>
          <div className="glass-card p-4 rounded-lg border border-white/5">
            <div className="text-xs text-gray-500 mb-1">Seats Allocated</div>
            <div className="text-xl text-white font-mono">500 / 500</div>
          </div>
          <div className="glass-card p-4 rounded-lg border border-white/5">
            <div className="text-xs text-gray-500 mb-1">System Uptime</div>
            <div className="text-xl text-white font-mono">100%</div>
          </div>
        </div>
      </section>
    </div>
  );
}
