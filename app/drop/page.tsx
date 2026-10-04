import {
  Activity,
  ArrowRight,
  Check,
  Clock3,
  Cpu,
  Fingerprint,
  LockKeyhole,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import DropJoinButton from "@/components/drop/DropJoinButton";

const guarantees = [
  { icon: Users, title: "One entry", detail: "Per account, per drop" },
  { icon: Activity, title: "Stable sequence", detail: "Retries keep your place" },
  { icon: LockKeyhole, title: "Signed status", detail: "HMAC token, 24-hour expiry" },
];

const flow = [
  {
    number: "01",
    icon: Fingerprint,
    title: "Verify your account",
    detail: "Drop entry is tied to your authenticated account.",
  },
  {
    number: "02",
    icon: Zap,
    title: "Join once",
    detail: "Your participation is saved durably for this drop.",
  },
  {
    number: "03",
    icon: Radio,
    title: "Get your place",
    detail: "The queue assigns a server-side sequence that retries preserve.",
  },
];

function QueueGlobe() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[34rem] animate-float-gentle">
      <div className="absolute inset-[8%] rounded-full bg-blue-500/10 blur-3xl animate-pulse-glow" />
      <div className="absolute inset-[7%] rounded-full border border-cyan-300/10" />
      <div className="absolute inset-[13%] rounded-full border border-blue-300/15" />
      <div className="absolute inset-[19%] rounded-full border border-dashed border-cyan-300/20 animate-spin-slow" />

      <svg
        viewBox="0 0 520 520"
        className="absolute inset-0 h-full w-full drop-shadow-[0_0_45px_rgba(37,99,235,0.3)]"
        role="img"
        aria-label="Decorative digital globe showing a network of queue participants"
      >
        <defs>
          <radialGradient id="drop-planet" cx="34%" cy="28%" r="78%">
            <stop offset="0%" stopColor="#15335b" />
            <stop offset="54%" stopColor="#07152b" />
            <stop offset="100%" stopColor="#030712" />
          </radialGradient>
          <linearGradient id="drop-rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6ee7f9" />
            <stop offset="48%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>
          <pattern id="drop-dots" width="13" height="13" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.25" fill="#4cc9f0" />
          </pattern>
          <clipPath id="drop-globe-clip">
            <circle cx="260" cy="260" r="167" />
          </clipPath>
          <filter id="drop-glow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="260" cy="260" r="174" fill="#061124" stroke="url(#drop-rim)" strokeWidth="2" />
        <circle cx="260" cy="260" r="167" fill="url(#drop-planet)" />
        <g clipPath="url(#drop-globe-clip)" opacity="0.7">
          <rect x="90" y="90" width="340" height="340" fill="url(#drop-dots)" />
          <path d="M211 122l32 13 8 25 25 7 16 23-13 19 16 18-10 22 20 19-5 27-26 6-8 32-19 17-8-28-22-7-4-33-20-15-7-29-23-15-1-26 17-20-7-30 18-12z" fill="#0b3b70" opacity="0.62" />
          <path d="M302 290l31 4 13 20-9 24-20 13-8 28-22 13-19-12 11-22-4-22 15-18z" fill="#0b3b70" opacity="0.54" />
          <ellipse cx="260" cy="260" rx="75" ry="167" fill="none" stroke="#65d7f4" strokeOpacity="0.19" />
          <ellipse cx="260" cy="260" rx="132" ry="167" fill="none" stroke="#65d7f4" strokeOpacity="0.13" />
          <path d="M98 260h324M117 197h286M117 323h286" stroke="#65d7f4" strokeOpacity="0.15" />
        </g>
        <circle cx="260" cy="260" r="174" fill="none" stroke="url(#drop-rim)" strokeWidth="2.5" filter="url(#drop-glow)" />

        <g fill="none" stroke="#38bdf8" strokeOpacity="0.52">
          <ellipse cx="260" cy="260" rx="226" ry="74" transform="rotate(-24 260 260)" strokeDasharray="3 9" />
          <ellipse cx="260" cy="260" rx="214" ry="104" transform="rotate(28 260 260)" strokeOpacity="0.28" />
          <path d="M71 315c54-52 98-66 156-54 78 16 100 88 185 74" strokeDasharray="5 8" />
        </g>
        <g filter="url(#drop-glow)">
          <circle cx="80" cy="310" r="5" fill="#67e8f9" />
          <circle cx="80" cy="310" r="12" fill="#38bdf8" fillOpacity="0.14" />
          <circle cx="433" cy="222" r="5" fill="#67e8f9" />
          <circle cx="433" cy="222" r="12" fill="#38bdf8" fillOpacity="0.14" />
          <circle cx="357" cy="404" r="4" fill="#818cf8" />
        </g>
      </svg>

      <div className="absolute left-[4%] top-[25%] hidden rounded-2xl border border-cyan-300/15 bg-[#061124]/85 p-4 shadow-[0_16px_70px_rgba(2,8,23,0.8)] backdrop-blur-xl sm:block">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          <Cpu className="h-3.5 w-3.5 text-cyan-300" /> Queue engine
        </div>
        <div className="font-mono text-sm text-white">SEQUENCE_LOCKED</div>
        <div className="mt-1 text-[11px] text-slate-500">Retries cannot move you forward</div>
      </div>

      <div className="absolute bottom-[14%] right-[2%] hidden rounded-2xl border border-blue-300/15 bg-[#061124]/85 p-4 shadow-[0_16px_70px_rgba(2,8,23,0.8)] backdrop-blur-xl sm:block">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Integrity check
        </div>
        <div className="mt-2 flex items-center gap-2 font-mono text-sm text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
          HMAC / 24H
        </div>
      </div>

      <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-cyan-200/30 bg-[#07162c]/80 shadow-[0_0_55px_rgba(34,211,238,0.28)] backdrop-blur-xl">
        <Sparkles className="h-7 w-7 text-cyan-200" />
      </div>
    </div>
  );
}

export default function DropPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#030611] px-4 pb-24 pt-8 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[30rem] w-[58rem] -translate-x-1/2 rounded-full bg-blue-600/[0.09] blur-[140px]" />
        <div className="absolute -left-40 top-[38rem] h-[26rem] w-[26rem] rounded-full bg-cyan-500/[0.06] blur-[120px]" />
        <div className="absolute -right-40 top-[58rem] h-[30rem] w-[30rem] rounded-full bg-indigo-500/[0.08] blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.025)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-5">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500 sm:text-xs">
            <span className="text-cyan-300">FAIRDROP</span>
            <span className="text-slate-700">/</span>
            <span>DROP WINDOW</span>
            <span className="text-slate-700">/</span>
            <span className="text-slate-300">FAIRDROP-DEMO</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200 sm:text-[11px]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
            </span>
            Demo drop interface
          </div>
        </div>

        <section className="grid items-center gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-0">
          <div className="relative z-10 max-w-2xl py-8 lg:py-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-300/15 bg-blue-400/[0.06] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.19em] text-cyan-200 sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.95)]" />
              <span>High-demand access protocol</span>
              <span className="hidden text-blue-200/40 sm:inline">—</span>
              <span className="hidden font-mono text-blue-100/60 sm:inline">V1.0</span>
            </div>

            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl lg:text-[4.6rem]">
              The crowd can rush.
              <span className="mt-2 block bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 bg-clip-text text-transparent">
                Your place stays fair.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
              Enter the FairDrop demo window. Your participation is tied to your account, and your queue sequence is assigned server-side—not by who can refresh fastest.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="w-full max-w-[21rem]">
                <DropJoinButton />
              </div>
              <a
                href="#how-it-works"
                className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-5 py-3.5 text-sm font-medium text-slate-300 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.06] hover:text-white"
              >
                How the queue works
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-cyan-300" /> One participation per account</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-cyan-300" /> Stable queue retries</span>
            </div>
          </div>

          <div className="relative -mx-3 mt-1 sm:mx-0 lg:-mr-8">
            <QueueGlobe />
          </div>
        </section>

        <section aria-label="Demo drop properties" className="relative z-10 -mt-2 rounded-[1.75rem] border border-white/[0.08] bg-[#07101e]/85 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-6 lg:mt-0">
          <div className="grid gap-5 sm:grid-cols-[1.15fr_repeat(3,1fr)] sm:items-center sm:gap-0">
            <div className="flex items-center gap-3 sm:border-r sm:border-white/[0.08] sm:pr-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-gradient-to-br from-blue-500/30 to-cyan-300/10 text-cyan-200 shadow-[0_0_26px_rgba(34,211,238,0.12)]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">FairDrop protocol</div>
                <div className="mt-1 text-xs text-slate-500">Server-managed entry and queue state</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:col-span-3 sm:gap-0">
              {[
                { value: "500", label: "Demo capacity", icon: Users },
                { value: "1×", label: "Participation / user", icon: Fingerprint },
                { value: "24h", label: "Queue token lifetime", icon: Clock3 },
              ].map((item) => (
                <div key={item.label} className="border-l border-white/[0.08] pl-3 sm:px-6">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <item.icon className="h-3.5 w-3.5 text-cyan-300/80" />
                    <span className="text-[9px] font-semibold uppercase tracking-[0.12em] sm:text-[10px]">{item.label}</span>
                  </div>
                  <div className="mt-2 font-mono text-xl font-bold tracking-tight text-white sm:text-2xl">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="relative z-10 scroll-mt-28 py-24 sm:py-32">
          <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-300/15 bg-blue-400/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
              <Activity className="h-3.5 w-3.5" /> From entry to queue
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              A calmer way through
              <span className="block bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-transparent">the flash crowd.</span>
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-400 sm:text-base">
              Three server-backed steps keep participation and queue placement consistent when requests arrive together.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {flow.map((step, index) => (
              <article
                key={step.number}
                className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0b1629]/95 to-[#060b16]/95 p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-200/25 hover:shadow-[0_18px_55px_rgba(8,145,178,0.09)] sm:p-7"
              >
                <div className="absolute -right-8 -top-12 h-36 w-36 rounded-full bg-blue-500/[0.06] blur-3xl transition group-hover:bg-cyan-400/[0.1]" />
                <div className="relative flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.06] text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-3xl font-black tracking-tight text-blue-300/20">{step.number}</span>
                </div>
                <h3 className="relative mt-7 text-lg font-bold text-white">{step.title}</h3>
                <p className="relative mt-2 text-sm leading-6 text-slate-400">{step.detail}</p>
                {index < flow.length - 1 ? (
                  <ArrowRight className="absolute bottom-7 right-6 hidden h-4 w-4 text-cyan-300/35 md:block" />
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="relative z-10 overflow-hidden rounded-[2rem] border border-blue-300/15 bg-gradient-to-br from-[#0b1930] via-[#071225] to-[#080b18] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.4)] sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-blue-500/10 blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-36 left-1/4 h-64 w-64 rounded-full bg-cyan-400/[0.07] blur-[90px]" />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                <LockKeyhole className="h-4 w-4" /> Built for consistency
              </div>
              <h2 className="max-w-xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Refresh the page.
                <span className="block text-cyan-300">Keep your place.</span>
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
                Repeated join requests resolve to the same participant and queue entry. Your sequence is generated on the server, and the queue status token is signed and time-limited.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                {guarantees.map((item) => (
                  <div key={item.title} className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3">
                    <item.icon className="h-4 w-4 shrink-0 text-cyan-300" />
                    <div>
                      <div className="text-xs font-semibold text-white">{item.title}</div>
                      <div className="mt-0.5 text-[10px] text-slate-500">{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative rounded-2xl border border-cyan-200/10 bg-[#030914]/75 p-5 font-mono shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6">
              <div className="mb-5 flex items-center justify-between border-b border-white/[0.07] pb-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-slate-500">
                  <Radio className="h-3.5 w-3.5 text-cyan-300" /> Request lifecycle
                </div>
                <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-2.5 py-1 text-[9px] text-emerald-200">IDEMPOTENT</span>
              </div>
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="flex items-start gap-3">
                  <span className="text-cyan-300">01</span>
                  <span className="text-slate-300">account <span className="text-slate-600">→</span> participation record</span>
                </div>
                <div className="ml-1 h-4 border-l border-dashed border-cyan-300/20" />
                <div className="flex items-start gap-3">
                  <span className="text-cyan-300">02</span>
                  <span className="text-slate-300">participant <span className="text-slate-600">→</span> atomic sequence</span>
                </div>
                <div className="ml-1 h-4 border-l border-dashed border-cyan-300/20" />
                <div className="flex items-start gap-3">
                  <span className="text-cyan-300">03</span>
                  <span className="text-slate-300">queue entry <span className="text-slate-600">→</span> signed status token</span>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2 border-t border-white/[0.07] pt-4 text-[10px] text-slate-500">
                <Check className="h-3.5 w-3.5 text-emerald-300" /> Stable on retry · no client-supplied position
              </div>
            </div>
          </div>
        </section>

        <footer className="relative z-10 mt-10 flex flex-col gap-2 border-t border-white/[0.07] pt-6 text-[11px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2 font-mono uppercase tracking-[0.16em]">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/70" /> FairDrop demo protocol
          </span>
          <span>Eligible queued participants can claim a deterministic seat through the allocation flow.</span>
        </footer>
      </div>
    </main>
  );
}
