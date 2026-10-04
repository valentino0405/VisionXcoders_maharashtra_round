import { currentUser } from "@clerk/nextjs/server";
import { UserProfile } from "@clerk/nextjs";
import { Shield, Clock, Ticket, UserRound, Sparkles, Info } from "lucide-react";

export default async function AccountPage() {
  const user = await currentUser();
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}` || user?.emailAddresses[0]?.emailAddress?.[0] || "U";

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#030611] px-4 pb-16 pt-8 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/3 top-[-18rem] h-[38rem] w-[58rem] rounded-full bg-blue-600/[0.1] blur-[140px]" />
        <div className="absolute -left-40 top-[32rem] h-96 w-96 rounded-full bg-cyan-500/[0.07] blur-[120px]" />
        <div className="absolute -right-40 bottom-[-8rem] h-96 w-96 rounded-full bg-indigo-500/[0.09] blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.025)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <header className="mb-8 border-b border-white/[0.07] pb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.19em] text-cyan-200 sm:text-xs">
            <UserRound className="h-3.5 w-3.5" /> FairDrop / participant account
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Your account<span className="text-cyan-300">.</span></h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">Manage your profile and review your FairDrop participation details.</p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[0.85fr_1.45fr] lg:gap-8">
          <aside className="flex min-w-0 flex-col gap-5">
            <section className="relative overflow-hidden rounded-3xl border border-cyan-200/[0.1] bg-gradient-to-br from-[#0b1629]/95 to-[#060b16]/95 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:p-6">
              <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-cyan-400/[0.09] blur-[70px]" />
              <div className="relative mb-5 flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.19em] text-slate-500">Identity</div>
                  <h2 className="mt-1 text-lg font-bold text-white">Profile</h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/15 bg-cyan-300/[0.06] text-cyan-200"><UserRound className="h-5 w-5" /></div>
              </div>

              <div className="relative mb-6 flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/20 bg-gradient-to-br from-blue-500/30 to-cyan-300/10 text-lg font-bold text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.12)]">
                  {initials.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-bold text-white">{[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "FairDrop participant"}</div>
                  <div className="mt-1 break-all text-xs leading-5 text-slate-400">{user?.emailAddresses[0]?.emailAddress ?? "No email on file"}</div>
                </div>
              </div>

              <div className="space-y-3 border-t border-white/[0.07] pt-3">
                <div className="flex items-center justify-between gap-3 py-1">
                  <span className="text-xs text-slate-500">Account status</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-200"><Shield className="h-3.5 w-3.5" /> Verified</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-1">
                  <span className="text-xs text-slate-500">Member since</span>
                  <span className="text-right text-xs text-slate-200">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</span>
                </div>
              </div>
            </section>

            <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#07101e]/85 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-2xl [&_.cl-rootBox]:w-full [&_.cl-card]:border-0 [&_.cl-card]:bg-transparent [&_.cl-card]:shadow-none [&_.cl-headerTitle]:text-white [&_.cl-headerSubtitle]:text-slate-400 [&_.cl-navbar]:bg-transparent [&_.cl-navbarButton]:text-slate-300 [&_.cl-profileSectionTitle]:text-white [&_.cl-profileSectionContent]:text-slate-300">
              <UserProfile routing="hash" />
            </div>
          </aside>

          <section className="min-w-0 rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0b1629]/90 to-[#060b16]/95 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:p-7">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.19em] text-cyan-200"><Ticket className="h-3.5 w-3.5" /> Participant activity</div>
                <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Participation history</h2>
                <p className="mt-1 text-xs text-slate-500">Illustrative records for the FairDrop demo.</p>
              </div>
              <span className="rounded-full border border-amber-300/15 bg-amber-300/[0.05] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-amber-100/80">Preview data</span>
            </div>

            <div className="mb-5 flex gap-3 rounded-2xl border border-blue-300/10 bg-blue-400/[0.045] p-4 text-xs leading-5 text-slate-400">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
              <p>These sample drop outcomes and seat/queue values are previews only. They are not live allocations or records from your account.</p>
            </div>

            <div className="space-y-3">
              <article className="flex flex-col justify-between gap-4 rounded-2xl border border-white/[0.07] bg-black/20 p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="flex min-w-0 items-start gap-3.5">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200/15 bg-cyan-300/[0.06]"><Ticket className="h-5 w-5 text-cyan-200" /></div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-white">Global Launch Drop</h3>
                      <span className="rounded-full border border-amber-300/15 bg-amber-300/[0.05] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.13em] text-amber-100/80">Demo preview</span>
                    </div>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" /> Oct 3, 2026</p>
                  </div>
                </div>
                <div className="pl-[3.35rem] sm:pl-0 sm:text-right">
                  <div className="text-sm font-semibold text-cyan-200">Sample outcome</div>
                  <div className="mt-1 font-mono text-xs text-slate-400">Preview seat A-184</div>
                </div>
              </article>

              <article className="flex flex-col justify-between gap-4 rounded-2xl border border-white/[0.07] bg-black/20 p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="flex min-w-0 items-start gap-3.5">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035]"><Ticket className="h-5 w-5 text-slate-400" /></div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-white">Beta Test Drop</h3>
                      <span className="rounded-full border border-amber-300/15 bg-amber-300/[0.05] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.13em] text-amber-100/80">Demo preview</span>
                    </div>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" /> Sep 15, 2026</p>
                  </div>
                </div>
                <div className="pl-[3.35rem] sm:pl-0 sm:text-right">
                  <div className="text-sm font-semibold text-slate-300">Sample outcome</div>
                  <div className="mt-1 font-mono text-xs text-slate-500">Preview queue #12,401</div>
                </div>
              </article>
            </div>

            <div className="mt-5 flex items-center gap-2 border-t border-white/[0.07] pt-4 text-[10px] text-slate-600">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300/60" /> Live allocation details are shown on your ticket page when available.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
