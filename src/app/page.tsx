'use client';

import Link from 'next/link';
import Image from 'next/image';
import Navbar from './components/Navbar';
import { ArrowRight, BarChart3, Sparkles, Users, Clock, PlayCircle, ShieldCheck, Gauge, Scale } from 'lucide-react';
import { motion } from 'framer-motion';

const easeOut = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-[#f4f6f8] text-slate-900">
      <Navbar />

      {/* Navbar is fixed; push content down */}
      <div className="pt-24">
        {/* Background grid + soft blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-[-10%] h-[32rem] w-[32rem] rounded-full bg-emerald-300/25 blur-3xl" />
          <div className="absolute -top-32 right-[-12%] h-[34rem] w-[34rem] rounded-full bg-sky-300/20 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.08) 1px, transparent 0)',
              backgroundSize: '22px 22px',
            }}
          />
        </div>

        {/* HERO */}
        <section className="relative">
          <div className="mx-auto w-[min(1200px,92vw)]">
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.08 } } }}
              className="grid grid-cols-1 gap-10 py-10 md:grid-cols-12 md:py-14"
            >
              {/* Left: Copy */}
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.6, ease: easeOut }}
                className="md:col-span-7"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-white/70 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  Built for the current season
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700">2024/25</span>
                </div>

                <h1 className="mt-5 text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl">
                  A cleaner way to{' '}
                  <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 bg-clip-text text-transparent">
                    simulate
                  </span>{' '}
                  and{' '}
                  <span className="bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                    analyze
                  </span>{' '}
                  your FPL season
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-700 sm:text-lg">
                  Use <span className="font-semibold text-slate-900">Simulator</span> to run gameweek window “what if”
                  scenarios on any 15 player squad. Use <span className="font-semibold text-slate-900">Analysis</span>{' '}
                  to import your Entry ID and review your actual season so far with window scoped comparisons and better
                  option recommendations.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href="/simulator"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
                  >
                    Launch Simulator
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    href="/analyze"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    <BarChart3 className="h-4 w-4 text-slate-700" />
                    Analyze my team
                  </Link>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-4 shadow-sm backdrop-blur">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <ShieldCheck className="h-4 w-4 text-emerald-700" />
                      No login required
                    </div>
                    <p className="mt-1 text-sm text-slate-600">Analysis imports by Entry ID only.</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-4 shadow-sm backdrop-blur">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Gauge className="h-4 w-4 text-sky-700" />
                      Window scoped
                    </div>
                    <p className="mt-1 text-sm text-slate-600">All comparisons respect your selected GW range.</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-4 shadow-sm backdrop-blur">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Scale className="h-4 w-4 text-violet-700" />
                      Fair suggestions
                    </div>
                    <p className="mt-1 text-sm text-slate-600">Better options are same position and within ±1.0m.</p>
                  </div>
                </div>
              </motion.div>

              {/* Right: Preview */}
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.6, ease: easeOut }}
                className="md:col-span-5"
              >
                <div className="rounded-3xl border border-slate-200/80 bg-white/80 shadow-xl shadow-slate-900/5 backdrop-blur">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 px-4 py-3">
                    <span className="h-3 w-3 rounded-full bg-red-400/80" />
                    <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                    <span className="h-3 w-3 rounded-full bg-lime-400/80" />
                    <div className="ml-auto text-xs font-medium text-slate-500">preview.png</div>
                  </div>

                  {/* Smaller preview */}
                  <div className="p-4">
                    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100">
                      <Image
                        src="/preview.png"
                        alt="FPL Simulator preview"
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="text-xs font-semibold text-slate-900">Simulator</div>
                        <div className="mt-1 text-xs text-slate-600">Window what if runs for any squad.</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="text-xs font-semibold text-slate-900">Analysis</div>
                        <div className="mt-1 text-xs text-slate-600">Import Entry and review season so far.</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                  <span className="font-semibold">Tip</span> Better option comparisons rank players by{' '}
                  <span className="font-semibold">points gained</span> and <span className="font-semibold">price increase</span>{' '}
                  within your chosen window.
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="relative py-14">
          <div className="mx-auto w-[min(1200px,92vw)]">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-120px' }}
              transition={{ duration: 0.6, ease: easeOut }}
              variants={fadeUp}
              className="rounded-3xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur sm:p-8"
            >
              <div className="max-w-3xl">
                <div className="text-xs font-semibold tracking-wide text-emerald-700">PROCESS</div>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                  How it works, end to end
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base">
                  Choose a gameweek window, lock a 15 player squad, then run comparisons that respect that window.
                  Better option suggestions are always same position and within ±1.0m at the start GW for fairness.
                </p>
              </div>

              {/* Timeline */}
              <div className="mt-8 grid gap-6 lg:grid-cols-4">
                {[
                  {
                    icon: Clock,
                    title: '1. Pick a window',
                    text: 'Select From GW and To GW. We validate against the last finished GW.',
                  },
                  {
                    icon: Users,
                    title: '2. Lock your squad',
                    text: 'Build a 15 player team or import via Entry ID. Formation and bench supported.',
                  },
                  {
                    icon: PlayCircle,
                    title: '3. Run simulation',
                    text: 'We compute points and price at both GWs and show deltas per player and totals.',
                  },
                  {
                    icon: BarChart3,
                    title: '4. Improve decisions',
                    text: 'Use Better option to compare within ±1.0m for the same position inside your window.',
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <div key={title} className="relative">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="text-sm font-semibold text-slate-900">{title}</div>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">{text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Two feature blocks */}
              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-emerald-50 p-6">
                  <div className="text-xs font-semibold text-emerald-700">FEATURE 1</div>
                  <div className="mt-2 text-lg font-bold">Simulator</div>
                  <p className="mt-2 text-sm text-slate-700">
                    Run a window scoped “what if” on your selected squad. You get per player deltas for points and
                    price, plus totals. The table appears only when you click Run.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-emerald-800">
                      From and To GW deltas
                    </span>
                    <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-emerald-800">
                      Prices within the window
                    </span>
                    <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-emerald-800">
                      Totals row
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-sky-50 p-6">
                  <div className="text-xs font-semibold text-sky-700">FEATURE 2</div>
                  <div className="mt-2 text-lg font-bold">Analysis</div>
                  <p className="mt-2 text-sm text-slate-700">
                    Import your Entry ID and review your season so far using the same window. Then, for any player,
                    open Better option and compare against same position players in the ±1.0m band.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-sky-900">
                      Entry import
                    </span>
                    <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-sky-900">
                      Window scoped comparisons
                    </span>
                    <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-sky-900">
                      Better option recommendations
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <footer className="border-t border-slate-200/70 bg-white/60 backdrop-blur">
          <div className="mx-auto w-[min(1200px,92vw)] py-8 text-sm text-slate-600">
            © {new Date().getFullYear()} FPL Simulator
          </div>
        </footer>
      </div>
    </main>
  );
}
