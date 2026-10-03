"use client";

import { useState } from "react";
import { Crosshair, Play, Square, Settings2, Shield, Zap, AlertTriangle } from "lucide-react";

export default function SimulatorPage() {
  const [isRunning, setIsRunning] = useState(false);
  
  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Crosshair className="h-8 w-8 text-violet-500" />
          Adversarial Simulator
        </h1>
        <p className="text-gray-400">Test FairDrop's allocation engine against simulated attack vectors.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Controls Panel */}
        <div className="glass-card rounded-xl border border-white/10 p-6 flex flex-col h-fit">
          <div className="flex items-center gap-2 text-white font-bold mb-6 border-b border-white/5 pb-4">
            <Settings2 className="h-5 w-5" /> Simulation Parameters
          </div>
          
          <div className="space-y-6 flex-1">
            <div>
              <label className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-3 block">Traffic Profile</label>
              <div className="space-y-2">
                {["Mixed Attack (Realistic)", "Request Flood", "Bot Swarm", "Token Replay", "Normal Traffic Only"].map((profile, i) => (
                  <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-black/40 hover:bg-white/5 cursor-pointer transition-colors">
                    <input type="radio" name="profile" className="accent-violet-500" defaultChecked={i === 0} />
                    <span className="text-sm text-gray-300">{profile}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-gray-500 tracking-widest uppercase">Simulated Users</label>
                <span className="text-sm text-violet-400 font-mono">50,000</span>
              </div>
              <input type="range" className="w-full accent-violet-500" min="1000" max="100000" defaultValue="50000" />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-gray-500 tracking-widest uppercase">Attack Intensity</label>
                <span className="text-sm text-red-400 font-mono">85%</span>
              </div>
              <input type="range" className="w-full accent-red-500" min="0" max="100" defaultValue="85" />
            </div>
          </div>
          
          <div className="pt-8 mt-4 border-t border-white/5">
            <button 
              onClick={() => setIsRunning(!isRunning)}
              className={`w-full flex items-center justify-center gap-2 h-14 rounded-xl font-bold text-lg transition-all ${
                isRunning 
                  ? "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20" 
                  : "bg-violet-600 text-white hover:bg-violet-500 glow-border"
              }`}
            >
              {isRunning ? (
                <><Square className="h-5 w-5 fill-current" /> STOP SIMULATION</>
              ) : (
                <><Play className="h-5 w-5 fill-current" /> LAUNCH SIMULATION</>
              )}
            </button>
          </div>
        </div>

        {/* Visualization Panel */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="glass-card rounded-xl border border-white/10 p-1 relative overflow-hidden bg-black/80 h-80 flex items-center justify-center">
            {/* Very abstract mock visualization of the simulation */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.1),transparent_70%)]" />
            
            {!isRunning ? (
              <div className="text-gray-500 flex flex-col items-center gap-4 z-10">
                <Shield className="h-16 w-16 opacity-50" />
                <p>System Ready. Waiting for simulation trigger.</p>
              </div>
            ) : (
              <div className="w-full h-full p-8 flex flex-col justify-between relative z-10">
                <div className="flex justify-between items-center">
                  <div className="text-red-400 font-mono text-xl animate-pulse flex items-center gap-2"><Zap className="h-5 w-5" /> 18,492 req/s</div>
                  <div className="text-green-400 font-mono text-xl flex items-center gap-2"><Shield className="h-5 w-5" /> MITIGATING</div>
                </div>
                
                {/* Visual particles mock using basic CSS */}
                <div className="relative h-32 w-full border-y border-white/10 flex items-center justify-center overflow-hidden">
                   <div className="absolute left-0 w-32 h-full bg-gradient-to-r from-background to-transparent z-10" />
                   <div className="absolute right-0 w-32 h-full bg-gradient-to-l from-background to-transparent z-10" />
                   
                   {/* Just some CSS lines moving to represent traffic */}
                   <div className="w-[200%] h-[2px] bg-red-500/50 absolute top-[30%] left-0 animate-[slide_1s_linear_infinite]" />
                   <div className="w-[200%] h-[2px] bg-blue-500/50 absolute top-[50%] left-0 animate-[slide_2s_linear_infinite]" />
                   <div className="w-[200%] h-[2px] bg-red-500/50 absolute top-[70%] left-0 animate-[slide_1.5s_linear_infinite]" />
                   
                   <div className="w-16 h-16 border-2 border-violet-500 rounded-full flex items-center justify-center bg-black z-20">
                     <Shield className="h-8 w-8 text-violet-400" />
                   </div>
                </div>
                
                <div className="flex justify-center gap-8 text-xs font-mono">
                  <span className="text-red-400">BLOCKED: 48,291</span>
                  <span className="text-blue-400">PASSED: 1,842</span>
                  <span className="text-green-400">ALLOCATED: 312</span>
                </div>
              </div>
            )}
            
            <style jsx>{`
              @keyframes slide {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
            `}</style>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {/* Small live stats */}
             {[
               { label: "Overselling Risk", val: "0.0%", color: "text-green-400" },
               { label: "Bot Penetration", val: "1.2%", color: "text-red-400", icon: AlertTriangle },
               { label: "Avg Latency", val: "42ms", color: "text-blue-400" },
               { label: "CPU Load", val: "38%", color: "text-gray-300" }
             ].map((stat, i) => (
               <div key={i} className="glass-card rounded-lg p-4 border border-white/5">
                 <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 flex items-center gap-1">
                   {stat.icon && <stat.icon className="h-3 w-3" />} {stat.label}
                 </div>
                 <div className={`text-xl font-bold font-mono ${stat.color}`}>{isRunning ? stat.val : "--"}</div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
