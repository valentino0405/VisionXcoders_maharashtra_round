"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Activity, Key } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function QueuePage() {
  const [position, setPosition] = useState(12481);
  
  // Simulate queue movement
  useEffect(() => {
    const timer = setInterval(() => {
      setPosition(prev => Math.max(1, prev - Math.floor(Math.random() * 5)));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 w-full">
      <div className="w-full max-w-2xl text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">YOU'RE IN THE QUEUE.</h1>
        <p className="text-gray-400">Please do not refresh this page.</p>
      </div>
      
      <div className="w-full max-w-2xl glass-card rounded-2xl border border-white/10 p-8 md:p-12 relative overflow-hidden flex flex-col items-center">
        {/* Animated background rings */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-64 h-64 border border-violet-500 rounded-full absolute"
          />
          <motion.div 
            animate={{ scale: [1, 2, 1], opacity: [0.1, 0, 0.1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="w-96 h-96 border border-violet-500 rounded-full absolute"
          />
        </div>

        <div className="text-gray-400 text-sm font-semibold tracking-widest uppercase mb-4 z-10">Your Position</div>
        <div className="text-7xl font-black text-white font-mono mb-8 glow-text z-10">
          {position.toLocaleString()}
        </div>
        
        <div className="text-gray-400 text-lg mb-12 z-10">
          Estimated wait: <span className="text-white font-mono">04:32</span>
        </div>

        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 z-10">
          <div className="bg-black/50 border border-white/5 rounded-lg p-3 text-left">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> SESSION</div>
            <div className="text-sm font-medium text-green-400">Verified</div>
          </div>
          <div className="bg-black/50 border border-white/5 rounded-lg p-3 text-left">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Activity className="h-3 w-3" /> ACTIVITY</div>
            <div className="text-sm font-medium text-white">Normal</div>
          </div>
          <div className="bg-black/50 border border-white/5 rounded-lg p-3 text-left">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Key className="h-3 w-3" /> TOKEN</div>
            <div className="text-sm font-medium text-white font-mono">FD-82A91</div>
          </div>
          <div className="bg-black/50 border border-white/5 rounded-lg p-3 text-left">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> FAIRNESS</div>
            <div className="text-sm font-medium text-violet-400">Protected</div>
          </div>
        </div>

        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 w-full z-10 text-left">
          <p className="text-violet-300 text-sm">
            <strong>Note:</strong> Refreshing will not improve your position. Repeated requests do not increase allocation priority.
          </p>
        </div>
        
        {/* Temporary mock link to ticket page for flow */}
        <Link href="/ticket" className="mt-8 text-xs text-gray-600 hover:text-white underline z-10">
          [Mock: Skip to Ticket]
        </Link>
      </div>
    </div>
  );
}
