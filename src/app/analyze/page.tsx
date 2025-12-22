'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AnalyzePage() {
  const router = useRouter();
  const [entryId, setEntryId] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const trimmed = entryId.trim();
    if (!/^\d{1,10}$/.test(trimmed)) {
      setError('Please enter a valid numeric FPL Entry ID.');
      return;
    }
    setError(null);
    router.push(`/analyze/${trimmed}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 pt-28 pb-24">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
        Analyze your FPL team
      </h1>

      <p className="mt-3 text-slate-600">
        Enter your public FPL Entry ID.
      </p>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-semibold text-slate-900">
          Entry ID
        </label>

        <input
          value={entryId}
          onChange={(e) => setEntryId(e.target.value)}
          onKeyDown={(e) => (e.key === 'Enter' ? submit() : null)}
          placeholder="e.g. 1234567"
          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:ring-4 focus:ring-slate-200"
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          onClick={submit}
          className="mt-5 inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Analyze
        </button>
      </div>
    </main>
  );
}
