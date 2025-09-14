'use client';

import { useState } from 'react';

export default function SimulateButton({ onClick }: { onClick: () => void }) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      document.cookie = `fpl_ready=1; Path=/; Max-Age=${60 * 60 * 2}`;
      await Promise.resolve();
      onClick();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 text-white font-bold text-lg px-8 py-3 rounded-xl shadow-lg transition-all disabled:opacity-60"
    >
      {loading ? 'Simulating…' : 'Pick Team'}
    </button>
  );
}
