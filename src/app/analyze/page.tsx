'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="group flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm transition group-hover:scale-[1.02]">
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
    <span className="rounded-full border border-slate-200 bg-white/75 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white">
      {children}
    </span>
  );
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export default function AnalyzePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [entryId, setEntryId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  const trimmed = useMemo(() => entryId.trim(), [entryId]);
  const valid = useMemo(() => /^\d{1,10}$/.test(trimmed), [trimmed]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit() {
    if (!valid) {
      setError('Please enter a valid numeric FPL Entry ID (1–10 digits).');
      setShake(true);
      setTimeout(() => setShake(false), 280);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    setSubmitting(true);
    router.push(`/analyze/${trimmed}`);
  }

  async function pasteFromClipboard() {
    try {
      const t = await navigator.clipboard.readText();
      if (typeof t === 'string') setEntryId(t);
      if (error) setError(null);
      inputRef.current?.focus();
    } catch {
      setError('Clipboard access was blocked. Paste manually.');
      inputRef.current?.focus();
    }
  }

  const helperId = 'entry-id-helper';
  const errorId = 'entry-id-error';

  return (
    <>
      <Navbar />

      <main className="relative min-h-[100svh] overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
          <div className="absolute -top-44 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute -bottom-56 right-[-180px] h-[680px] w-[680px] rounded-full bg-sky-200/30 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-14">
          <div className="mb-10 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md"
            >
              <span aria-hidden className="text-lg leading-none">
                ←
              </span>
              Back to home
            </button>

            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/75 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur sm:inline-flex">
              Live from official FPL endpoints
              <span className="ml-1 h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          </div>

          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
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
                <Feature title="Chip timing" desc="Lists chip usage by gameweek so you can spot early triggers and late-season planning." />
                <Feature title="Season charts" desc="Interactive sparklines for gameweek points, cumulative points, and overall rank." />
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200/70 bg-white/70 p-4 text-sm text-slate-600 shadow-sm backdrop-blur">
                Privacy note: you only input an Entry ID. No login required. Data is fetched from public FPL endpoints.
              </div>
            </section>

            <section className="lg:sticky lg:top-24">
              <div
                className={cx(
                  'rounded-[28px] border border-slate-200/70 bg-white/85 shadow-[0_24px_90px_rgba(15,23,42,0.14)] backdrop-blur transition',
                  shake && 'animate-[shake_0.28s_ease-in-out]'
                )}
              >
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
                  <div className="flex items-center justify-between gap-3">
                    <label className="block text-sm font-semibold text-slate-700" htmlFor="entry-id">
                      Entry ID
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={pasteFromClipboard}
                        className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
                      >
                        Paste
                      </button>

                      <span
                        className={cx(
                          'rounded-full px-3 py-1.5 text-xs font-semibold',
                          trimmed
                            ? valid
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                            : 'bg-slate-50 text-slate-600'
                        )}
                      >
                        {trimmed ? (valid ? 'Valid' : 'Check') : 'Required'}
                      </span>
                    </div>
                  </div>

                  <div
                    className={cx(
                      'mt-3 flex items-center gap-4 rounded-2xl border bg-white px-5 py-4 shadow-sm transition focus-within:ring-4',
                      error ? 'border-red-200 focus-within:ring-red-100' : valid || !trimmed ? 'border-slate-200 focus-within:ring-emerald-100' : 'border-amber-200 focus-within:ring-amber-100'
                    )}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-base font-extrabold text-white">
                      #
                    </div>

                    <input
                      id="entry-id"
                      ref={inputRef}
                      value={entryId}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      onChange={(e) => {
                        setEntryId(e.target.value);
                        if (error) setError(null);
                      }}
                      onKeyDown={(e) => (e.key === 'Enter' ? submit() : null)}
                      placeholder="e.g. 3233026"
                      className="w-full bg-transparent text-lg text-slate-900 outline-none placeholder:text-slate-400"
                      aria-label="FPL Entry ID"
                      aria-invalid={!!error || (!!trimmed && !valid)}
                      aria-describedby={error ? errorId : helperId}
                    />
                  </div>

                  <div className="mt-3">
                    {!error ? (
                      <p id={helperId} className="text-sm text-slate-600">
                        Enter 1–10 digits. Tip: you can paste directly, or use the Paste button.
                      </p>
                    ) : (
                      <p id={errorId} className="text-sm font-medium text-red-600" role="alert">
                        {error}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={submit}
                    disabled={!valid || submitting}
                    className={cx(
                      'mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold transition',
                      valid && !submitting ? 'bg-slate-900 text-white shadow-sm hover:bg-slate-800' : 'cursor-not-allowed bg-slate-100 text-slate-400'
                    )}
                  >
                    {submitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                        Analyzing…
                      </>
                    ) : (
                      <>
                        Analyze
                        <span aria-hidden className="text-xl leading-none">
                          →
                        </span>
                      </>
                    )}
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
              </div>

              <style jsx global>{`
                @keyframes shake {
                  0% {
                    transform: translateX(0);
                  }
                  25% {
                    transform: translateX(-6px);
                  }
                  50% {
                    transform: translateX(6px);
                  }
                  75% {
                    transform: translateX(-4px);
                  }
                  100% {
                    transform: translateX(0);
                  }
                }
              `}</style>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
