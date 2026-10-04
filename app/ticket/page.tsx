import { ArrowRight, QrCode, ShieldCheck, Ticket as TicketIcon, UserRound } from "lucide-react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongodb";
import Allocation from "@/models/Allocation";
import Drop from "@/models/Drop";

interface TicketPageProps {
  searchParams?: Promise<{ allocationId?: string }>;
}

export default async function TicketPage({ searchParams }: TicketPageProps) {
  const { userId } = await auth();
  const params = searchParams ? await searchParams : {};
  const requestedAllocationId = params?.allocationId;

  let allocation = null;
  let drop = null;

  if (userId) {
    try {
      await connectToDatabase();
      if (requestedAllocationId) {
        allocation = await Allocation.findOne({
          allocationId: requestedAllocationId,
          clerkId: userId,
        }).lean();
      }
      if (!allocation) {
        allocation = await Allocation.findOne({ clerkId: userId })
          .sort({ allocatedAt: -1 })
          .lean();
      }
      if (allocation) {
        drop = await Drop.findOne({ dropId: allocation.dropId }).lean();
      }
    } catch (err) {
      console.error("Error loading allocation for ticket page", err);
    }
  }

  const isRealAllocation = Boolean(allocation);
  const eventName = drop?.name ?? (isRealAllocation ? "FairDrop Special Event" : "Global Launch Drop");
  const seatId = allocation?.seatId ?? "A-184";
  const allocationRef = allocation?.allocationId ?? "FD-PREVIEW-82A91";
  const timestamp = allocation?.allocatedAt
    ? new Date(allocation.allocatedAt).toLocaleString()
    : "2026-10-03 18:45:12";

  return (
    <main className="relative isolate flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#030611] px-4 py-12 text-white sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-16rem] h-[36rem] w-[56rem] -translate-x-1/2 rounded-full bg-blue-600/[0.12] blur-[140px]" />
        <div className="absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-cyan-500/[0.08] blur-[120px]" />
        <div className="absolute -right-40 bottom-[-8rem] h-96 w-96 rounded-full bg-indigo-500/[0.1] blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.025)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
      </div>

      <div className="w-full max-w-2xl">
        <header className="mb-8 text-center">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.08] text-cyan-200 shadow-[0_0_32px_rgba(34,211,238,0.14)]">
            <TicketIcon className="h-7 w-7" />
          </div>
          <div className="mb-3 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.19em] text-cyan-200 sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse" />
              ALLOCATION CONFIRMED
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            {isRealAllocation ? "Your FairDrop Ticket Proof" : "Ticket proof preview"}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400 sm:text-base">
            {isRealAllocation
              ? "Cryptographically verified seat allocation tied to your authenticated FairDrop identity."
              : "This sample card demonstrates the ticket design only. Sign in and join a drop to claim your verified seat."}
          </p>
        </header>

        <section aria-label="FairDrop ticket" className="relative mx-auto w-full max-w-xl">
          <div aria-hidden="true" className="absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-cyan-400/30 via-blue-600/20 to-indigo-500/25 blur-2xl" />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-cyan-100/[0.12] bg-gradient-to-br from-[#0b1629]/95 via-[#071225]/95 to-[#060b16]/95 shadow-[0_28px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            <div aria-hidden="true" className="absolute right-[-3rem] top-[-5rem] h-44 w-44 rounded-full bg-cyan-400/[0.08] blur-[70px]" />
            <div className="relative border-b border-white/[0.08] p-5 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {isRealAllocation ? "Verified Event" : "Event · demo preview"}
                  </div>
                  <div className="text-xl font-bold tracking-tight text-white sm:text-2xl">{eventName}</div>
                </div>
                <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${
                  isRealAllocation
                    ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                    : "border border-amber-300/15 bg-amber-300/[0.05] text-amber-100/80"
                }`}>
                  {isRealAllocation ? "CONFIRMED PASS" : "Sample only"}
                </span>
              </div>

              <div className="mt-8">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {isRealAllocation ? "Allocated Seat" : "Example seat"}
                </div>
                <div className="font-mono text-5xl font-black tracking-tight text-white drop-shadow-[0_0_30px_rgba(34,211,238,0.25)] sm:text-6xl">
                  {seatId}
                </div>
              </div>
            </div>

            <div aria-hidden="true" className="relative z-10 -my-3 flex h-6 items-center justify-between">
              <span className="h-6 w-3 rounded-r-full border-y border-r border-white/[0.1] bg-[#081020]" />
              <span className="mx-2 flex-1 border-t border-dashed border-cyan-100/15" />
              <span className="h-6 w-3 rounded-l-full border-y border-l border-white/[0.1] bg-[#081020]" />
            </div>

            <div className="relative grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
              <div className="space-y-5">
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {isRealAllocation ? "Booking Reference" : "Sample reference"}
                  </div>
                  <div className="font-mono text-sm text-slate-200">{allocationRef}</div>
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Allocation timestamp
                  </div>
                  <div className="font-mono text-sm text-slate-300">{timestamp}</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-cyan-300" />
                  {isRealAllocation
                    ? "HMAC Signed · Verified for Entry"
                    : "Preview only · not valid for entry"}
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-cyan-100/70">
                  <QrCode className="h-20 w-20" />
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {isRealAllocation ? "Verified QR Pass" : "Visual placeholder"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link
            href="/account"
            className="group inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/20 hover:text-white"
          >
            <UserRound className="h-4 w-4 text-cyan-300" />
            View in My Profile
            <ArrowRight className="h-4 w-4 text-cyan-300 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/drop"
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.035] px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
          >
            Back to Drops
          </Link>
        </div>
      </div>
    </main>
  );
}
