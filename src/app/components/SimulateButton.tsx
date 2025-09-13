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
    <div className="flex justify-center">
      <button
        onClick={handle}
        disabled={loading}
        className="mt-8 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold text-lg px-8 py-3 rounded-lg shadow-lg transition-all disabled:opacity-60"
      >
        {loading ? 'Simulating…' : '▶️ Simulate'}
      </button>
    </div>
  );
}
