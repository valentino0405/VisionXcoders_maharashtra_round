"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Activity, Key, Users, Radio, Sparkles } from "lucide-react";
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
    <main className="relative isolate flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#030611] px-4 py-12 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-18rem] h-[38rem] w-[58rem] -translate-x-1/2 rounded-full bg-blue-600/[0.12] blur-[140px]" />
        <div className="absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-cyan-500/[0.08] blur-[120px]" />
        <div className="absolute -right-40 bottom-[-8rem] h-96 w-96 rounded-full bg-indigo-500/[0.1] blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.025)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
      </div>

      <div className="w-full max-w-3xl">
        <div className="mb-7 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.19em] text-cyan-200 sm:text-xs">
            <Radio className="h-3.5 w-3.5" /> FairDrop / live queue
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
            Your place in line<span className="text-cyan-300">.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
            Your server-assigned sequence stays stable. Refreshing will not improve your position.
          </p>
        </div>

        <section className="relative overflow-hidden rounded-[1.75rem] border border-cyan-200/[0.12] bg-gradient-to-br from-[#0b1629]/95 via-[#071225]/95 to-[#060b16]/95 p-5 shadow-[0_28px_100px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-9">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.08] blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-blue-500/[0.1] blur-[90px]" />
          <motion.div
            aria-hidden="true"
            animate={{ scale: [1, 1.22, 1], opacity: [0.18, 0.04, 0.18] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute left-1/2 top-[8.5rem] h-48 w-48 -translate-x-1/2 rounded-full border border-cyan-300/30 sm:h-64 sm:w-64"
          />

          <div className="relative z-10 text-center">
            <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              <Users className="h-3.5 w-3.5 text-cyan-300" /> Queue position
            </div>
            <div className="flex min-h-20 items-center justify-center font-mono text-6xl font-black tracking-tight text-white drop-shadow-[0_0_32px_rgba(34,211,238,0.28)] sm:min-h-24 sm:text-8xl">
              {queue ? queue.position.toLocaleString() : <Loader2 className="h-12 w-12 animate-spin text-cyan-300" aria-label="Loading queue position" />}
            </div>
            <div className="mt-3 text-xs text-slate-500 sm:text-sm">
              Sequence <span className="ml-1 font-mono text-cyan-100">{queue?.sequence ?? "—"}</span>
            </div>
          </div>

          <div className="relative z-10 mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {[
              { icon: ShieldCheck, label: "Session", value: queue ? "Account-bound" : "Pending" },
              { icon: Activity, label: "Queue status", value: queue?.status ?? (canEnterQueue ? "Ready to enter" : "Awaiting state") },
              { icon: Key, label: "Queue token", value: queue ? "Signed" : "Pending" },
              { icon: Sparkles, label: "Ordering", value: "FIFO" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/[0.07] bg-black/20 p-3.5 sm:p-4">
                <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[10px]">
                  <item.icon className="h-3.5 w-3.5 text-cyan-300/80" /> {item.label}
                </div>
                <div className="mt-2 break-words text-xs font-semibold text-slate-100 sm:text-sm">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="relative z-10 mt-5 rounded-2xl border border-blue-300/10 bg-blue-400/[0.045] p-4 text-xs leading-5 text-slate-400 sm:text-sm sm:leading-6">
            <span className="font-semibold text-cyan-200">Fair access note</span>
            <span className="mx-2 text-slate-700">/</span>
            Repeated requests do not increase allocation priority. Keep this page open or return later to recover your server-side state.
          </div>

          {error ? <p role="alert" className="relative z-10 mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-4 py-3 text-sm leading-5 text-amber-100/90">{error}</p> : null}
          {canEnterQueue ? (
            <button
              type="button"
              onClick={enterQueue}
              disabled={isEnteringQueue}
              className="relative z-10 mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-6 py-3.5 text-sm font-bold text-white shadow-[0_0_24px_rgba(37,99,235,0.35)] transition hover:shadow-[0_0_32px_rgba(6,182,212,0.5)] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
              {isEnteringQueue ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
              {isEnteringQueue ? "Entering queue…" : "Enter queue"}
            </button>
          ) : null}
        </section>
      </div>
    </main>
  );
}
