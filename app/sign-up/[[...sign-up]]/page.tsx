import { SignUp } from "@clerk/nextjs";
import { ShieldCheck, Sparkles } from "lucide-react";

export default function SignUpPage() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#030611] px-4 py-14 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-15rem] h-[36rem] w-[54rem] -translate-x-1/2 rounded-full bg-blue-600/[0.13] blur-[140px]" />
        <div className="absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-cyan-500/[0.08] blur-[120px]" />
        <div className="absolute -right-40 bottom-[-8rem] h-96 w-96 rounded-full bg-indigo-500/[0.1] blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.025)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.07] text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.12)]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="mb-2 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200"><Sparkles className="h-3.5 w-3.5" /> FairDrop access</div>
          <h1 className="text-3xl font-black tracking-tight text-white">Create your account<span className="text-cyan-300">.</span></h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Join FairDrop with a verified participant profile.</p>
        </div>

        <div className="rounded-[1.75rem] border border-cyan-200/[0.12] bg-gradient-to-br from-[#0b1629]/95 via-[#071225]/95 to-[#060b16]/95 p-2 shadow-[0_28px_100px_rgba(0,0,0,0.52)] backdrop-blur-2xl [&_.cl-rootBox]:mx-auto [&_.cl-rootBox]:w-full [&_.cl-card]:border-0 [&_.cl-card]:bg-transparent [&_.cl-card]:shadow-none [&_.cl-headerTitle]:text-white [&_.cl-headerSubtitle]:text-slate-400 [&_.cl-formFieldLabel]:text-slate-300 [&_.cl-formFieldInput]:border-white/10 [&_.cl-formFieldInput]:bg-[#030914] [&_.cl-formFieldInput]:text-white [&_.cl-formButtonPrimary]:bg-gradient-to-r [&_.cl-formButtonPrimary]:from-blue-600 [&_.cl-formButtonPrimary]:to-cyan-500 [&_.cl-formButtonPrimary]:shadow-[0_0_20px_rgba(37,99,235,0.25)] [&_.cl-footerActionLink]:text-cyan-300 [&_.cl-dividerLine]:bg-white/10 [&_.cl-dividerText]:text-slate-500 [&_.cl-socialButtonsBlockButton]:border-white/10 [&_.cl-socialButtonsBlockButton]:bg-white/[0.04] [&_.cl-socialButtonsBlockButton]:text-slate-100">
          <SignUp />
        </div>
        <p className="mt-5 text-center text-[11px] leading-5 text-slate-600">One account keeps your drop participation and queue state connected.</p>
      </div>
    </main>
  );
}
