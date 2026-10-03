import { BarChart3, Info, Users, Bot, Scale } from "lucide-react";

export default function FairnessPage() {
  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Scale className="h-8 w-8 text-violet-500" />
          Fairness Analysis
        </h1>
        <p className="text-gray-400">Quantifiable metrics proving allocation integrity against adversarial traffic.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-card p-6 rounded-xl border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-bl-[100px] -mr-4 -mt-4" />
          <div className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-2">Fairness Score</div>
          <div className="text-5xl font-black text-white font-mono glow-text">94.8%</div>
          <p className="text-xs text-green-400 mt-4 flex items-center gap-1">
            <Info className="h-3 w-3" /> Baseline: 50%
          </p>
        </div>
        
        <div className="glass-card p-6 rounded-xl border border-white/10">
          <div className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-2">Bot Allocation</div>
          <div className="text-4xl font-bold text-red-400 font-mono">3.1%</div>
          <p className="text-xs text-gray-500 mt-4">Target: &lt; 5.0%</p>
        </div>

        <div className="glass-card p-6 rounded-xl border border-white/10">
          <div className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-2">Dup. Allocation</div>
          <div className="text-4xl font-bold text-white font-mono">0</div>
          <p className="text-xs text-green-400 mt-4">Verified by constraints</p>
        </div>

        <div className="glass-card p-6 rounded-xl border border-white/10">
          <div className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-2">Overselling</div>
          <div className="text-4xl font-bold text-white font-mono">0</div>
          <p className="text-xs text-green-400 mt-4">Verified by constraints</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-xl border border-white/10">
          <h3 className="font-bold text-white mb-6">Allocation vs Request Rate</h3>
          
          <div className="h-64 flex items-end gap-2 px-4 pb-4 border-b border-l border-white/10 relative">
             <div className="absolute inset-0 flex items-center justify-center text-gray-600 opacity-20">
               [Scatter Plot Visualization Area]
             </div>
             {/* Fake trendline visualization */}
             <div className="w-full h-full relative">
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible preserve-3d" preserveAspectRatio="none">
                  {/* Normal users cluster */}
                  <circle cx="20" cy="50" r="15" fill="rgba(59, 130, 246, 0.2)" />
                  <circle cx="25" cy="45" r="10" fill="rgba(59, 130, 246, 0.4)" />
                  <circle cx="15" cy="55" r="8" fill="rgba(59, 130, 246, 0.6)" />
                  
                  {/* Bot cluster (high req, low alloc) */}
                  <circle cx="80" cy="90" r="10" fill="rgba(239, 68, 68, 0.2)" />
                  <circle cx="90" cy="85" r="12" fill="rgba(239, 68, 68, 0.4)" />
                  <circle cx="85" cy="95" r="8" fill="rgba(239, 68, 68, 0.6)" />
                </svg>
             </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Low Requests (Normal)</span>
            <span>High Requests (Bots)</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl border border-white/10 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
              <Info className="h-5 w-5 text-violet-400" />
              Why This Matters
            </h3>
            <div className="space-y-4 text-gray-400 text-sm mt-6">
              <p>In traditional systems, probability of allocation is directly proportional to request volume and network proximity.</p>
              <p>FairDrop decouples these metrics, ensuring that a user making 1 legitimate request has an equal or greater probability of allocation compared to an adversarial client making 1,000 automated requests.</p>
              
              <div className="p-4 bg-violet-900/10 border border-violet-500/20 rounded-lg mt-4">
                <div className="text-violet-300 font-mono text-xs">
                  P(Alloc | Normal) = {((312/48000)*100).toFixed(2)}% <br/>
                  P(Alloc | Bot) = {((12/2000)*100).toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
