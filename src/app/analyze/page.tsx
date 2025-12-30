'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';

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

      <main className="relative min-h-[100svh] overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
          <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute -bottom-48 right-[-140px] h-[620px] w-[620px] rounded-full bg-sky-200/35 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.25] [background-image:radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>

        <div className="mx-auto flex min-h-[100svh] max-w-7xl items-center px-6 py-16">
          <div className="w-full">
            <div className="mb-10">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-white"
              >
                <span aria-hidden className="text-lg leading-none">←</span>
                Back to home
              </button>
            </div>

            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <section>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">
                  FPL Simulator
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Entry analysis
                </div>

                <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
                  Analyze your FPL team
                </h1>

                <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                  Paste your public FPL Entry ID to generate a profile summary and performance charts.
                </p>

                <div className="mt-7 flex flex-wrap gap-3 text-sm text-slate-600">
                  <span className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 font-medium backdrop-blur">
                    Captain trends
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 font-medium backdrop-blur">
                    Transfer behavior
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 font-medium backdrop-blur">
                    Risk profile
                  </span>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200/70 bg-white/85 shadow-[0_24px_90px_rgba(15,23,42,0.14)] backdrop-blur">
                <div className="border-b border-slate-100 px-8 py-7">
                  <div className="text-base font-semibold text-slate-900">Entry lookup</div>
                  <div className="mt-1 text-sm text-slate-600">Your Entry ID is public on the FPL website.</div>
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
                      placeholder="e.g. 1234567"
                      className="w-full bg-transparent text-lg text-slate-900 outline-none placeholder:text-slate-400"
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

                  {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

                  <button
                    onClick={submit}
                    disabled={!valid}
                    className={[
                      'mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold transition',
                      valid ? 'bg-slate-900 text-white hover:bg-slate-800' : 'cursor-not-allowed bg-slate-100 text-slate-400',
                    ].join(' ')}
                  >
                    Analyze
                    <span aria-hidden className="text-xl leading-none">→</span>
                  </button>

                  <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                    Tip: If FPL is under load, refresh and try again.
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
