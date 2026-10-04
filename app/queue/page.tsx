"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Activity, Key } from "lucide-react";
import { motion } from "framer-motion";

type QueueState = {
  queueEntryId: string;
  sequence: number;
  position: number;
  status: "WAITING" | "ACTIVE";
  totalQueued: number;
};

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canEnterQueue, setCanEnterQueue] = useState(false);
  const [isEnteringQueue, setIsEnteringQueue] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function recoverQueue() {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) {
          if (!cancelled) {
            setError(
              response.status === 401
                ? "Sign in to enter the queue."
                : response.status === 429
                  ? "Too many requests. Please try again in a few seconds."
                  : response.status === 403
                    ? "Access is temporarily restricted. Please try again later."
                    : "Queue state is temporarily unavailable."
            );
          }
          return;
        }
        if (cancelled) return;
        if (result.state.queue) {
          setQueue({ ...result.state.queue, totalQueued: 0 });
          return;
        }
        setCanEnterQueue(Boolean(result.state.participation));
        setError(
          result.state.participation
            ? "You have joined the drop. Enter the queue when you are ready."
            : "Join the drop before entering the queue."
        );
      } catch {
        if (!cancelled) setError("Queue state is temporarily unavailable.");
      }
    }

    void recoverQueue();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enterQueue() {
    if (isEnteringQueue) return;
    setIsEnteringQueue(true);
    setError(null);
    try {
      const response = await fetch("/api/queue/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dropId: "fairdrop-demo" }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(response.status === 429 ? "Too many requests. Please try again shortly." : "Unable to enter the queue.");
        return;
      }
      setQueue({ ...result.queue, totalQueued: result.queue.totalQueued });
      setCanEnterQueue(false);
    } catch {
      setError("Unable to enter the queue.");
    } finally {
      setIsEnteringQueue(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 w-full">
      <div className="w-full max-w-2xl text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">YOU&apos;RE IN THE QUEUE.</h1>
        <p className="text-gray-400">Refreshing will keep your stable queue position.</p>
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
          {queue ? queue.position.toLocaleString() : <Loader2 className="h-16 w-16 animate-spin" />}
        </div>
        
        <div className="text-gray-400 text-lg mb-12 z-10">
          Queue sequence: <span className="text-white font-mono">{queue?.sequence ?? "--"}</span>
        </div>

        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 z-10">
          <div className="bg-black/50 border border-white/5 rounded-lg p-3 text-left">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> SESSION</div>
            <div className="text-sm font-medium text-green-400">Verified</div>
          </div>
          <div className="bg-black/50 border border-white/5 rounded-lg p-3 text-left">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Activity className="h-3 w-3" /> ACTIVITY</div>
            <div className="text-sm font-medium text-white">{queue?.status ?? "Loading"}</div>
          </div>
          <div className="bg-black/50 border border-white/5 rounded-lg p-3 text-left">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Key className="h-3 w-3" /> TOKEN</div>
            <div className="text-sm font-medium text-white font-mono">{queue ? "SIGNED" : "--"}</div>
          </div>
          <div className="bg-black/50 border border-white/5 rounded-lg p-3 text-left">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> FAIRNESS</div>
            <div className="text-sm font-medium text-violet-400">FIFO</div>
          </div>
        </div>

        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 w-full z-10 text-left">
          <p className="text-violet-300 text-sm">
            <strong>Note:</strong> Refreshing will not improve your position. Repeated requests do not increase allocation priority.
          </p>
        </div>

        {error ? <p role="alert" className="mt-6 text-sm text-red-300 z-10">{error}</p> : null}
        {canEnterQueue ? (
          <button
            type="button"
            onClick={enterQueue}
            disabled={isEnteringQueue}
            className="mt-6 z-10 rounded-lg bg-white px-5 py-3 text-sm font-bold text-black disabled:opacity-60"
          >
            {isEnteringQueue ? "ENTERING QUEUE..." : "ENTER QUEUE"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
