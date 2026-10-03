import { ShieldCheck, Users, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DropPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 w-full">
      <div className="w-full max-w-2xl relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-2xl blur opacity-20" />
        
        <div className="glass-card rounded-2xl border border-white/10 p-8 md:p-12 relative overflow-hidden">
          {/* Status badge */}
          <div className="absolute top-8 right-8 flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-sm font-semibold tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            LIVE
          </div>

          <div className="text-sm font-bold tracking-widest text-violet-400 uppercase mb-2">Event</div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">GLOBAL DROP</h1>
          
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col gap-1">
              <div className="text-gray-400 text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Seats Available</div>
              <div className="text-2xl font-mono font-bold text-white">500</div>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col gap-1">
              <div className="text-gray-400 text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Participants</div>
              <div className="text-2xl font-mono font-bold text-white">50,000+</div>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-4 mb-10">
            <AlertTriangle className="h-6 w-6 text-blue-400 shrink-0" />
            <div>
              <h3 className="text-blue-300 font-semibold mb-1">Fairness Policy Active</h3>
              <p className="text-blue-200/70 text-sm leading-relaxed">
                Your position is determined by the FairDrop allocation system. 
                Repeated requests will not improve your position and may flag your session.
              </p>
            </div>
          </div>

          <Link href="/queue" className="w-full flex items-center justify-center gap-3 h-16 rounded-xl bg-white text-black font-bold text-xl hover:bg-gray-200 transition-all glow-border">
            JOIN THE DROP <ArrowRight className="h-6 w-6" />
          </Link>
          
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" /> Drop ends in 02:45:12
          </div>
        </div>
      </div>
    </div>
  );
}
