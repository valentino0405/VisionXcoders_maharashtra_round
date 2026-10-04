"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Key,
  Loader2,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type QueueState = {
  queueEntryId: string;
  sequence: number;
  position: number;
  status: "WAITING" | "ACTIVE";
  totalQueued: number;
};

/**
 * What the page shows the user right now.
 * Keeping state as a discriminated union prevents impossible combinations
 * (e.g., showing the queue position and a "join drop" prompt simultaneously).
 */
type PageStep =
  | { kind: "loading" }
  | { kind: "needs-sign-in" }
  | { kind: "needs-drop-join" }
  | { kind: "needs-queue-join" }
  | { kind: "queued"; queue: QueueState }
  | { kind: "error"; message: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Map an HTTP status + body error code from /api/queue/join to a user-facing
 * message that tells the user what to do, not just what went wrong.
 */
function queueJoinMessage(status: number, code: string | undefined): string {
  if (status === 401) return "Please sign in to enter the queue.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status === 403) return "Access is temporarily restricted. Please try again later.";
  if (code === "NOT_A_PARTICIPANT")
    return "You need to join the drop before entering the queue.";
  if (code === "DROP_NOT_FOUND")
    return "The drop was not found. Please refresh the page.";
  if (code === "DROP_NOT_ACTIVE")
    return "This drop is not currently active.";
  if (status === 503 || code === "QUEUE_UNAVAILABLE")
    return "The queue service is temporarily unavailable. Please try again shortly.";
  return "We couldn't enter you into the queue. Please try again.";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QueuePage() {
  const [step, setStep] = useState<PageStep>({ kind: "loading" });
  const [isEnteringQueue, setIsEnteringQueue] = useState(false);

  // ── Session recovery on mount ──
  useEffect(() => {
    let cancelled = false;

    async function recoverQueue() {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        if (cancelled) return;

        if (!response.ok) {
          const errorStep: PageStep =
            response.status === 401
              ? { kind: "needs-sign-in" }
              : {
                  kind: "error",
                  message:
                    response.status === 429
                      ? "Too many requests. Please wait and refresh the page."
                      : response.status === 403
                        ? "Access is temporarily restricted. Please try again later."
                        : "Your queue state is temporarily unavailable. Please refresh.",
                };
          setStep(errorStep);
          return;
        }

        const result = await response.json();

        if (result.state?.queue) {
          // User already has a queue position — show it.
          setStep({ kind: "queued", queue: { ...result.state.queue, totalQueued: 0 } });
          return;
        }

        if (result.state?.participation) {
          // User has joined the drop but not yet queued — show the "Enter queue" button.
          setStep({ kind: "needs-queue-join" });
          return;
        }

        // No participation record yet — send them to the drop page.
        setStep({ kind: "needs-drop-join" });
      } catch {
        if (!cancelled) {
          setStep({
            kind: "error",
            message: "Could not connect to the queue service. Please refresh.",
          });
        }
      }
    }

    void recoverQueue();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Queue join action ──
  async function enterQueue() {
    if (isEnteringQueue) return;
    setIsEnteringQueue(true);

    try {
      const response = await fetch("/api/queue/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dropId: "fairdrop-demo" }),
      });

      let body: { error?: string; queue?: QueueState; alreadyQueued?: boolean } = {};
      try {
        body = await response.json();
      } catch {
        // ignore parse errors
      }

      if (!response.ok) {
        const code = body.error;
        const message = queueJoinMessage(response.status, code);

        // If the server says the user isn't a participant, redirect them to the
        // drop page rather than showing an unhelpful error.
        if (code === "NOT_A_PARTICIPANT") {
          setStep({ kind: "needs-drop-join" });
        } else {
          setStep({ kind: "error", message });
        }
        return;
      }

      if (body.queue) {
        setStep({
          kind: "queued",
          queue: { ...body.queue, totalQueued: body.queue.totalQueued ?? 0 },
        });
      }
    } catch {
      setStep({
        kind: "error",
        message: "Could not reach the queue service. Please check your connection and try again.",
      });
    } finally {
      setIsEnteringQueue(false);
    }
  }

  // ─── Layout ─────────────────────────────────────────────────────────────────
  return (
    <main className="relative isolate flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#030611] px-4 py-12 text-white sm:px-6">
      {/* Background atmosphere */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-18rem] h-[38rem] w-[58rem] -translate-x-1/2 rounded-full bg-blue-600/[0.12] blur-[140px]" />
        <div className="absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-cyan-500/[0.08] blur-[120px]" />
        <div className="absolute -right-40 bottom-[-8rem] h-96 w-96 rounded-full bg-indigo-500/[0.1] blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.025)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
      </div>

      <div className="w-full max-w-3xl">
        {/* Header */}
        <header className="mb-7 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.19em] text-cyan-200 sm:text-xs">
            <Radio className="h-3.5 w-3.5" /> FairDrop / live queue
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
            Your place in line<span className="text-cyan-300">.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
            Your server-assigned sequence stays stable. Refreshing will not improve your position.
          </p>
        </header>

        {/* Main panel */}
        <section className="relative overflow-hidden rounded-[1.75rem] border border-cyan-200/[0.12] bg-gradient-to-br from-[#0b1629]/95 via-[#071225]/95 to-[#060b16]/95 p-5 shadow-[0_28px_100px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.08] blur-[90px]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-blue-500/[0.1] blur-[90px]" />

          {/* Pulsing ring when queued */}
          {step.kind === "queued" ? (
            <motion.div
              aria-hidden="true"
              animate={{ scale: [1, 1.22, 1], opacity: [0.18, 0.04, 0.18] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute left-1/2 top-[8.5rem] h-48 w-48 -translate-x-1/2 rounded-full border border-cyan-300/30 sm:h-64 sm:w-64"
            />
          ) : null}

          {/* ── Loading ── */}
          {step.kind === "loading" ? (
            <div className="relative z-10 flex flex-col items-center gap-6 py-10 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-cyan-300" aria-label="Loading queue state" />
              <p className="text-sm text-slate-400">Recovering your queue state…</p>
            </div>
          ) : null}

          {/* ── Needs sign-in ── */}
          {step.kind === "needs-sign-in" ? (
            <div className="relative z-10 flex flex-col items-center gap-5 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.08] text-cyan-200">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-white">Sign in to enter the queue</h2>
              <p className="max-w-sm text-sm text-slate-400">
                Your queue position is tied to your authenticated account. Please sign in to continue.
              </p>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-6 py-3.5 text-sm font-bold text-white shadow-[0_0_24px_rgba(37,99,235,0.35)] transition hover:shadow-[0_0_32px_rgba(6,182,212,0.5)]"
              >
                Sign in
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : null}

          {/* ── Needs drop join ── */}
          {step.kind === "needs-drop-join" ? (
            <div className="relative z-10 flex flex-col items-center gap-5 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-200/20 bg-blue-300/[0.08] text-blue-200">
                <Users className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-white">Join the drop first</h2>
              <p className="max-w-sm text-sm text-slate-400">
                You need to claim your spot in the drop before you can enter the queue. Your queue position will be assigned server-side — you cannot improve it by refreshing.
              </p>
              <Link
                href="/drop"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-6 py-3.5 text-sm font-bold text-white shadow-[0_0_24px_rgba(37,99,235,0.35)] transition hover:shadow-[0_0_32px_rgba(6,182,212,0.5)]"
              >
                Go to drop page
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : null}

          {/* ── Needs queue join ── */}
          {step.kind === "needs-queue-join" ? (
            <div className="relative z-10 flex flex-col items-center gap-6 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.08] text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.12)]">
                <Radio className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">You&apos;re in the drop</h2>
                <p className="mt-2 max-w-sm text-sm text-slate-400">
                  Your participation is confirmed. Click below to claim your queue position. Your sequence number is assigned server-side and cannot be improved by clicking multiple times.
                </p>
              </div>
              <StatusGrid queue={null} canEnterQueue />
              <button
                type="button"
                onClick={enterQueue}
                disabled={isEnteringQueue}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-8 py-3.5 text-sm font-bold text-white shadow-[0_0_24px_rgba(37,99,235,0.35)] transition hover:shadow-[0_0_32px_rgba(6,182,212,0.5)] disabled:cursor-wait disabled:opacity-60"
              >
                {isEnteringQueue ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                {isEnteringQueue ? "Entering queue…" : "Enter queue"}
              </button>
            </div>
          ) : null}

          {/* ── Queued — show position ── */}
          {step.kind === "queued" ? (
            <>
              <div className="relative z-10 text-center">
                <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  <Users className="h-3.5 w-3.5 text-cyan-300" /> Queue position
                </div>
                <div className="flex min-h-20 items-center justify-center font-mono text-6xl font-black tracking-tight text-white drop-shadow-[0_0_32px_rgba(34,211,238,0.28)] sm:min-h-24 sm:text-8xl">
                  {step.queue.position.toLocaleString()}
                </div>
                <div className="mt-3 text-xs text-slate-500 sm:text-sm">
                  Sequence{" "}
                  <span className="ml-1 font-mono text-cyan-100">{step.queue.sequence}</span>
                </div>
              </div>
              <div className="relative z-10 mt-8">
                <StatusGrid queue={step.queue} canEnterQueue={false} />
              </div>
              <div className="relative z-10 mt-5 rounded-2xl border border-blue-300/10 bg-blue-400/[0.045] p-4 text-xs leading-5 text-slate-400 sm:text-sm sm:leading-6">
                <span className="font-semibold text-cyan-200">Fair access note</span>
                <span className="mx-2 text-slate-700">/</span>
                Repeated requests do not increase allocation priority. Keep this page open or return later — your position is durable.
              </div>
            </>
          ) : null}

          {/* ── Error ── */}
          {step.kind === "error" ? (
            <div className="relative z-10 flex flex-col items-center gap-5 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200/20 bg-amber-300/[0.07] text-amber-200">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Something went wrong</h2>
                <p className="mt-2 max-w-sm text-sm text-slate-400">{step.message}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => { setStep({ kind: "loading" }); window.location.reload(); }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.07]"
                >
                  Try again
                </button>
                <Link
                  href="/drop"
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-5 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-300/[0.1]"
                >
                  Back to drop page
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusGrid({
  queue,
  canEnterQueue,
}: {
  queue: QueueState | null;
  canEnterQueue: boolean;
}) {
  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {[
        {
          icon: ShieldCheck,
          label: "Session",
          value: queue ? "Account-bound" : canEnterQueue ? "Verified" : "Pending",
        },
        {
          icon: Activity,
          label: "Queue status",
          value: queue ? queue.status : canEnterQueue ? "Ready to enter" : "Awaiting state",
        },
        {
          icon: Key,
          label: "Queue token",
          value: queue ? "Signed" : "Pending",
        },
        {
          icon: Sparkles,
          label: "Ordering",
          value: "FIFO",
        },
      ].map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-white/[0.07] bg-black/20 p-3.5 sm:p-4"
        >
          <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[10px]">
            <item.icon className="h-3.5 w-3.5 text-cyan-300/80" /> {item.label}
          </div>
          <div className="mt-2 break-words text-xs font-semibold text-slate-100 sm:text-sm">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
