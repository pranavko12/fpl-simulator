'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';

function Feature({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
        <span className="text-sm font-black">✓</span>
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-sm leading-relaxed text-slate-600">{desc}</div>
      </div>
    </div>
  );
}

function StatPill({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-slate-200 bg-white/75 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur">
      {children}
    </span>
  );
}

export default function AnalyzePage() {
  const router = useRouter();
  const [entryId, setEntryId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const trimmed = useMemo(() => entryId.trim(), [entryId]);
  const valid = useMemo(() => /^\d{1,10}$/.test(trimmed), [trimmed]);

  function submit() {
    if (!valid) {
      setError('Please enter a valid numeric FPL Entry ID.');
      return;
    }
    setError(null);
    router.push(`/analyze/${trimmed}`);
  }

  return (
    <>
      <Navbar />

      <main className="relative min-h-[100svh] overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
          <div className="absolute -top-44 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute -bottom-56 right-[-180px] h-[680px] w-[680px] rounded-full bg-sky-200/30 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.22] [background-image:radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-14">
          <div className="mb-10 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-white"
            >
              <span aria-hidden className="text-lg leading-none">←</span>
              Back to home
            </button>

            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/75 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur sm:inline-flex">
              Live from official FPL endpoints
              <span className="ml-1 h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          </div>

          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            {/* LEFT: value prop */}
            <section className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">
                FPL Simulator
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Entry analysis
              </div>

              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Analyze any FPL team in seconds
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Enter a public Entry ID to generate a manager profile with behavior signals, captain trends, chip timing,
                and performance charts. Built for quick decisions and clean comparisons.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <StatPill>Captain trends</StatPill>
                <StatPill>Transfer behavior</StatPill>
                <StatPill>Risk profile</StatPill>
                <StatPill>Rank trajectory</StatPill>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                <Feature
                  title="Behavior profile"
                  desc="Summarizes hits, transfer frequency, points volatility, and captain stability into a simple risk score."
                />
                <Feature
                  title="Captaincy patterns"
                  desc="Shows recent captains, concentration, and change frequency to reveal how the manager plays the armband."
                />
                <Feature
                  title="Chip timing"
                  desc="Lists chip usage by gameweek so you can spot early triggers and late-season planning."
                />
                <Feature
                  title="Season charts"
                  desc="Interactive sparklines for gameweek points, cumulative points, and overall rank."
                />
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200/70 bg-white/70 p-4 text-sm text-slate-600 shadow-sm backdrop-blur">
                Privacy note: you only input an Entry ID. No login required. Data is fetched from public FPL endpoints.
              </div>
            </section>

            {/* RIGHT: input card */}
            <section className="rounded-[28px] border border-slate-200/70 bg-white/85 shadow-[0_24px_90px_rgba(15,23,42,0.14)] backdrop-blur">
              <div className="border-b border-slate-100 px-8 py-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold text-slate-900">Entry lookup</div>
                    <div className="mt-1 text-sm text-slate-600">
                      Your Entry ID is public on the FPL website. Paste it here to generate the report.
                    </div>
                  </div>

                  <div className="hidden rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 sm:block">
                    Fast analysis
                  </div>
                </div>
              </div>

              <div className="px-8 py-8">
                <label className="block text-sm font-semibold text-slate-700">Entry ID</label>

                <div
                  className={[
                    'mt-3 flex items-center gap-4 rounded-2xl border bg-white px-5 py-4 shadow-sm transition',
                    error ? 'border-red-200' : valid || !trimmed ? 'border-slate-200' : 'border-amber-200',
                    'focus-within:ring-4',
                    error ? 'focus-within:ring-red-100' : 'focus-within:ring-emerald-100',
                  ].join(' ')}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-base font-extrabold text-white">
                    #
                  </div>

                  <input
                    value={entryId}
                    inputMode="numeric"
                    onChange={(e) => {
                      setEntryId(e.target.value);
                      if (error) setError(null);
                    }}
                    onKeyDown={(e) => (e.key === 'Enter' ? submit() : null)}
                    placeholder="e.g. 3233026"
                    className="w-full bg-transparent text-lg text-slate-900 outline-none placeholder:text-slate-400"
                    aria-label="FPL Entry ID"
                  />

                  <div className="shrink-0">
                    {trimmed ? (
                      valid ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          Valid
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                          Check
                        </span>
                      )
                    ) : (
                      <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                        Required
                      </span>
                    )}
                  </div>
                </div>

                {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

                <button
                  onClick={submit}
                  disabled={!valid}
                  className={[
                    'mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold transition',
                    valid
                      ? 'bg-slate-900 text-white shadow-sm hover:bg-slate-800'
                      : 'cursor-not-allowed bg-slate-100 text-slate-400',
                  ].join(' ')}
                >
                  Analyze
                  <span aria-hidden className="text-xl leading-none">→</span>
                </button>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                    Tip: If FPL is under load, refresh and try again.
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                    Press Enter to submit after typing the Entry ID.
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
