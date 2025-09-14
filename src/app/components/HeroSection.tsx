'use client';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-green-500 via-green-600 to-blue-700">
      {/* subtle pitch grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '50px 50px, 50px 50px',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-12 md:py-14 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white drop-shadow-2xl mb-6">
          Fantasy Premier League Simulator
        </h1>

        <p className="text-gray-200 text-lg md:text-2xl max-w-3xl mx-auto leading-relaxed mb-8">
          ⚽ Relive any season. Pick your team from any{' '}
          <span className="text-green-300 font-semibold">Gameweek</span>, simulate matches, and
          track how your <span className="text-blue-300 font-semibold">alternate FPL journey</span>{' '}
          could have unfolded.
        </p>

        {/* Glass Info Pills (slightly smaller for single-line fit) */}
        <ul className="flex flex-wrap justify-center gap-4 text-base md:text-lg font-semibold">
          <li className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-emerald-50 backdrop-blur-md shadow-lg">
            💰 Budget: <span className="font-bold">100M</span>
          </li>
          <li className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-emerald-50 backdrop-blur-md shadow-lg">
            📅 Gameweeks: <span className="font-bold">1–38</span>
          </li>
          <li className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-emerald-50 backdrop-blur-md shadow-lg">
            🏆 Seasons: <span className="font-bold">2020 → 2026</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
