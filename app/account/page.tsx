import { currentUser } from "@clerk/nextjs/server";
import { UserProfile } from "@clerk/nextjs";
import { ShieldCheck, UserRound, KeyRound } from "lucide-react";
import UserProfileView from "@/components/profile/UserProfileView";

export default async function AccountPage() {
  const user = await currentUser();

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#030611] px-4 pb-20 pt-8 text-white sm:px-6 lg:px-8">
      {/* Dynamic Background Atmosphere */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/3 top-[-18rem] h-[38rem] w-[58rem] rounded-full bg-blue-600/[0.1] blur-[140px]" />
        <div className="absolute -left-40 top-[32rem] h-96 w-96 rounded-full bg-cyan-500/[0.07] blur-[120px]" />
        <div className="absolute -right-40 bottom-[-8rem] h-96 w-96 rounded-full bg-indigo-500/[0.09] blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.025)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8 border-b border-white/[0.07] pb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.19em] text-cyan-200 sm:text-xs">
            <UserRound className="h-3.5 w-3.5" /> FairDrop / Participant Account
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Your Account &amp; Profile<span className="text-cyan-300">.</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                Manage your passenger identity, update ticket preferences, and review your live FairDrop queue entries and booking history.
              </p>
            </div>
            {user && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="h-4 w-4" /> Authenticated
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Complete Dynamic Profile and Live Activity View */}
        <UserProfileView />

        {/* Optional Collapsible Security & Clerk Management */}
        <details className="group mt-12 rounded-3xl border border-white/[0.08] bg-[#07101e]/60 p-5 backdrop-blur-xl transition hover:border-white/15">
          <summary className="flex cursor-pointer items-center justify-between font-medium text-slate-400 group-open:border-b group-open:border-white/[0.08] group-open:pb-4">
            <div className="flex items-center gap-2.5 text-sm text-slate-300">
              <KeyRound className="h-4 w-4 text-cyan-400" />
              <span>Security &amp; Clerk Account Settings</span>
            </div>
            <span className="text-xs text-cyan-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="mt-4 overflow-hidden rounded-2xl [&_.cl-rootBox]:w-full [&_.cl-card]:border-0 [&_.cl-card]:bg-transparent [&_.cl-card]:shadow-none [&_.cl-headerTitle]:text-white [&_.cl-headerSubtitle]:text-slate-400 [&_.cl-navbar]:bg-transparent [&_.cl-navbarButton]:text-slate-300 [&_.cl-profileSectionTitle]:text-white [&_.cl-profileSectionContent]:text-slate-300">
            <UserProfile routing="hash" />
          </div>
        </details>
      </div>
    </main>
  );
}
