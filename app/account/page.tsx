import { currentUser } from "@clerk/nextjs/server";
import { UserProfile } from "@clerk/nextjs";
import { Shield, Ticket } from "lucide-react";
import Link from "next/link";
import { getTicketsForUser } from "@/lib/payment-service";

export default async function AccountPage() {
  const user = await currentUser();
  const tickets = user ? await getTicketsForUser(user.id) : [];
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}` || user?.emailAddresses[0]?.emailAddress?.[0] || "U";
  return <main className="min-h-screen bg-[#030611] px-4 pb-16 pt-24 text-white sm:px-6"><div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[.8fr_1.2fr]">
    <aside className="space-y-5"><section className="rounded-3xl border border-white/10 bg-[#101a2d] p-6"><div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-lg font-black text-violet-100">{initials.toUpperCase()}</div><div><p className="font-bold">{[user?.firstName,user?.lastName].filter(Boolean).join(" ") || "FairDrop participant"}</p><p className="mt-1 text-xs text-slate-400">{user?.emailAddresses[0]?.emailAddress}</p></div></div><p className="mt-5 flex items-center gap-2 text-sm text-emerald-200"><Shield className="h-4 w-4"/>Verified Clerk account</p></section><div className="rounded-3xl border border-white/10 bg-[#101a2d] p-2 [&_.cl-card]:border-0 [&_.cl-card]:bg-transparent [&_.cl-card]:shadow-none"><UserProfile routing="hash"/></div></aside>
    <section className="rounded-3xl border border-white/10 bg-[#101a2d] p-6"><p className="text-xs font-bold uppercase tracking-[.2em] text-violet-300">Account</p><h1 className="mt-2 text-3xl font-black">Verified tickets</h1><p className="mt-2 text-sm text-slate-400">Only server-verified payments create records here.</p>{tickets.length===0?<div className="mt-6 rounded-2xl border border-dashed border-white/15 p-6"><Ticket className="h-7 w-7 text-violet-300"/><p className="mt-3 font-semibold">No verified ticket yet.</p><p className="mt-1 text-sm text-slate-400">Complete the live demo allocation and Razorpay test checkout to receive one.</p><Link href="/live-demo" className="mt-4 inline-block rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold">Open live demo</Link></div>:<div className="mt-6 space-y-3">{tickets.map(ticket=><article key={ticket.ticketId} className="rounded-2xl border border-white/10 bg-black/20 p-5"><p className="text-xs font-bold text-emerald-300">VERIFIED</p><p className="mt-2 text-xl font-black">Seat {ticket.seatId}</p><p className="mt-2 font-mono text-sm text-slate-300">{ticket.ticketCode}</p><p className="mt-2 text-xs text-slate-500">{ticket.dropId} · {ticket.issuedAt.toLocaleString()}</p></article>)}</div>}</section>
  </div></main>;
}
