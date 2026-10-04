"use client";

import { useUser, SignInButton, SignUpButton, SignOutButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Database, Fingerprint, Loader2, LogIn, LogOut, UserRound } from "lucide-react";

export default function TestUserPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [mongoUser, setMongoUser] = useState<unknown>(null);
  const [mongoStatus, setMongoStatus] = useState<string>("Loading...");

  useEffect(() => {
    let cancelled = false;

    async function syncUser() {
      await Promise.resolve();
      if (cancelled) return;

      if (!isSignedIn) {
        setMongoUser(null);
        setMongoStatus("Not Signed In");
        return;
      }

      setMongoStatus("Fetching...");
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (res.ok) {
          const data: unknown = await res.json();
          if (!cancelled) {
            setMongoUser(data);
            setMongoStatus("Found");
          }
        } else {
          const text = await res.text();
          if (!cancelled) setMongoStatus(`Error: ${res.status} - ${text}`);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setMongoStatus(`Network Error: ${message}`);
        }
      }
    }

    void syncUser();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  if (!isLoaded) {
    return (
      <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#030611] px-4 text-white">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.14),transparent_55%)]" />
        <div className="inline-flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#081326]/80 px-5 py-4 text-sm text-slate-300 shadow-xl backdrop-blur-xl">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-300" /> Loading participant session…
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#030611] px-4 py-10 text-white sm:px-6 sm:py-14">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-18rem] h-[38rem] w-[58rem] -translate-x-1/2 rounded-full bg-blue-600/[0.11] blur-[140px]" />
        <div className="absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-cyan-500/[0.07] blur-[120px]" />
        <div className="absolute -right-40 bottom-[-8rem] h-96 w-96 rounded-full bg-indigo-500/[0.09] blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.025)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
      </div>

      <div className="relative mx-auto max-w-5xl">
        <header className="mb-8 border-b border-white/[0.07] pb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.19em] text-cyan-200 sm:text-xs">
            <Activity className="h-3.5 w-3.5" /> FairDrop / diagnostics
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Participant connection<span className="text-cyan-300">.</span></h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">Inspect Clerk authentication and the linked MongoDB participant record.</p>
        </header>

        <section className="mb-5 flex flex-col justify-between gap-4 rounded-3xl border border-cyan-200/[0.1] bg-gradient-to-br from-[#0b1629]/95 to-[#060b16]/95 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:flex-row sm:items-center sm:p-6">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${isSignedIn ? "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200" : "border-amber-300/15 bg-amber-300/[0.05] text-amber-100"}`}>
              {isSignedIn ? <CheckCircle2 className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Authentication status</div>
              <div className="mt-1 text-base font-bold text-white">{isSignedIn ? "Signed in" : "Signed out"}</div>
            </div>
          </div>

          {!isSignedIn ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <SignInButton mode="modal" forceRedirectUrl="/test-user">
                <button className="inline-flex items-center justify-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.06]">
                  <LogIn className="h-4 w-4 text-cyan-300" /> Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal" forceRedirectUrl="/test-user">
                <button className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(37,99,235,0.25)] transition hover:shadow-[0_0_32px_rgba(6,182,212,0.4)]">
                  <UserRound className="h-4 w-4" /> Create account
                </button>
              </SignUpButton>
            </div>
          ) : null}
        </section>

        {isSignedIn ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0b1629]/90 to-[#060b16]/95 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-6">
              <div className="mb-5 flex items-center gap-3 border-b border-white/[0.07] pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/15 bg-cyan-300/[0.06] text-cyan-200"><Fingerprint className="h-5 w-5" /></div>
                <div>
                  <h2 className="font-bold text-white">Clerk identity</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Authenticated account profile</p>
                </div>
              </div>
              <dl className="space-y-4">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Clerk user ID</dt>
                  <dd className="mt-1 break-all font-mono text-xs leading-5 text-slate-200">{user.id}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Email</dt>
                  <dd className="mt-1 break-all text-sm text-slate-200">{user.primaryEmailAddress?.emailAddress ?? "No primary email"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Name</dt>
                  <dd className="mt-1 text-sm text-slate-200">{user.fullName ?? "Not provided"}</dd>
                </div>
              </dl>
            </section>

            <section className="min-w-0 rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0b1629]/90 to-[#060b16]/95 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200/15 bg-blue-300/[0.06] text-blue-200"><Database className="h-5 w-5" /></div>
                  <div>
                    <h2 className="font-bold text-white">MongoDB record</h2>
                    <p className="mt-0.5 text-xs text-slate-500">Participant lookup via /api/me</p>
                  </div>
                </div>
                <span className={`max-w-[45%] truncate rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.13em] ${mongoStatus === "Found" ? "border-emerald-300/15 bg-emerald-300/[0.05] text-emerald-200" : "border-white/[0.08] bg-white/[0.03] text-slate-400"}`} title={mongoStatus}>{mongoStatus}</span>
              </div>
              {mongoUser ? (
                <pre className="max-h-[24rem] overflow-auto rounded-2xl border border-white/[0.06] bg-[#030914]/80 p-4 font-mono text-[11px] leading-5 text-cyan-100/80">{JSON.stringify(mongoUser, null, 2)}</pre>
              ) : (
                <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-black/10 px-4 text-center text-xs leading-5 text-slate-500">No participant document to display yet.</div>
              )}
            </section>

            <div className="lg:col-span-2">
              <SignOutButton>
                <button className="inline-flex items-center gap-2 rounded-full border border-rose-300/15 bg-rose-300/[0.05] px-5 py-3 text-sm font-semibold text-rose-100/90 transition hover:border-rose-300/30 hover:bg-rose-300/[0.1]">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </SignOutButton>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
