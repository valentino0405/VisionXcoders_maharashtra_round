import { CheckCircle2, QrCode } from "lucide-react";
import Link from "next/link";

export default function TicketPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 w-full">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-green-500/20 rounded-full mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-400" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">ALLOCATION CONFIRMED</h1>
        <p className="text-gray-400">Your allocation was successfully secured.</p>
      </div>

      {/* Ticket Card */}
      <div className="relative w-full max-w-md mx-auto">
        {/* Glow behind ticket */}
        <div className="absolute -inset-1 bg-gradient-to-b from-violet-600 to-cyan-600 rounded-[2rem] blur-xl opacity-30" />
        
        <div className="relative bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
          {/* Top section */}
          <div className="p-8 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Event</div>
                <div className="text-xl font-bold text-white">Global Launch Drop</div>
              </div>
              <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-xs font-bold tracking-wide">
                CONFIRMED
              </div>
            </div>
            
            <div className="flex justify-between items-end">
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Seat</div>
                <div className="text-5xl font-black font-mono text-white glow-text">A-184</div>
              </div>
            </div>
          </div>
          
          {/* Middle cutout effect */}
          <div className="relative h-8 flex items-center justify-between -my-4 z-10 px-0">
            <div className="h-8 w-4 bg-background rounded-r-full border-r border-y border-white/10"></div>
            <div className="flex-1 border-t-2 border-dashed border-white/10 mx-2"></div>
            <div className="h-8 w-4 bg-background rounded-l-full border-l border-y border-white/10"></div>
          </div>
          
          {/* Bottom section */}
          <div className="p-8 flex items-center justify-between">
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Allocation ID</div>
                <div className="text-sm font-mono text-gray-300">FD-82A91-X</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Timestamp</div>
                <div className="text-sm font-mono text-gray-300">2026-10-03 18:45:12</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Session Status</div>
                <div className="text-sm text-green-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Verified</div>
              </div>
            </div>
            
            <div className="p-2 bg-white rounded-xl">
              <QrCode className="h-24 w-24 text-black" />
            </div>
          </div>
        </div>
      </div>
      
      <Link href="/account" className="mt-12 text-gray-400 hover:text-white transition-colors">
        View in My Account
      </Link>
    </div>
  );
}
