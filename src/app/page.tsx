'use client';

import Link from 'next/link';
import { Clock, PlayCircle, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      if (current < 50) {
        setShowNav(true);
      } else if (current > lastScrollY) {
        setShowNav(false); // scrolling down
      } else {
        setShowNav(true); // scrolling up
      }
      setLastScrollY(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Floating NavBar with hide/show on scroll */}
      <nav
        className={`fixed top-0 left-0 w-full z-20 bg-white/80 backdrop-blur shadow-sm transition-transform duration-300 ${
          showNav ? 'translate-y-0' : '-translate-y-full'
        }`}
        aria-label="Primary"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="text-xl font-extrabold tracking-tight">
              FPL <span className="text-emerald-700">Simulator</span>
            </Link>
            <div className="flex items-center gap-6 text-sm font-medium">
              <a href="#how-it-works" className="hover:text-emerald-700 transition">
                How it works
              </a>
              <Link
                href="/simulator"
                className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-white shadow-sm hover:bg-emerald-700 transition"
              >
                Launch App
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Decorative background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* subtle radial light */}
        <div className="absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-green-300/30 via-teal-200/20 to-blue-300/20 blur-3xl" />
        {/* floating blobs */}
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-gradient-to-tr from-green-200/40 to-blue-200/30 blur-2xl animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute -bottom-40 -left-16 h-[28rem] w-[28rem] rounded-full bg-gradient-to-tr from-emerald-200/40 to-cyan-200/30 blur-2xl animate-[pulse_7s_ease-in-out_infinite]" />
        {/* subtle noise overlay */}
        <div className="absolute inset-0 opacity-[0.04] [background-image:url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'120\\' height=\\'120\\' viewBox=\\'0 0 120 120\\'><filter id=\\'n\\'><feTurbulence type=\\'fractalNoise\\' baseFrequency=\\'0.8\\' numOctaves=\\'2\\' stitchTiles=\\'stitch\\'/></filter><rect width=\\'100%\\' height=\\'100%\\' filter=\\'url(%23n)\\' opacity=\\'0.5\\'/></svg>')]"></div>
      </div>

      {/* Hero */}
      <section className="relative mx-auto grid max-w-6xl grid-cols-1 px-6 pt-28 md:grid-cols-2 md:gap-10 md:pt-36">
        {/* Left: Copy */}
        <div className="flex flex-col justify-center">
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            New for 2024/25
          </span>

          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl md:text-6xl">
            Simulate your
            <span className="mx-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent">
              alternate FPL season
            </span>
            in seconds.
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
            Pick a gameweek, lock your team, and see price changes and points across any
            range. No login, no fuss—just pure what-if magic.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/simulator"
              className="inline-flex items-center rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:translate-y-[-1px] hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300"
            >
              🚀 Launch Simulator
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
            >
              How it works
            </a>
          </div>

          <div className="mt-4 text-xs text-slate-500">Free to use · No account required</div>
        </div>

        {/* Right: Hero card / Preview frame */}
        <div className="relative mt-12 md:mt-0">
          <div className="mx-auto max-w-lg rounded-3xl border border-slate-200/70 bg-white/80 p-4 shadow-xl backdrop-blur">
            {/* window chrome */}
            <div className="mb-3 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-400/80" />
              <span className="h-3 w-3 rounded-full bg-amber-400/80" />
              <span className="h-3 w-3 rounded-full bg-lime-400/80" />
              <div className="ml-auto text-xs font-medium text-slate-400">Preview</div>
            </div>

            {/* mock pitch */}
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-tr from-white to-slate-50">
              <div className="absolute inset-0 grid place-items-center">
                <div className="rounded-2xl border border-emerald-200/50 bg-emerald-50/40 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm">
                  Pitch UI Preview
                </div>
              </div>
              {/* shimmer */}
              <div className="pointer-events-none absolute -inset-1 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 [mask-image:linear-gradient(transparent,white,transparent)] animate-[shine_2.5s_ease-in-out_infinite]" />
            </div>

            <style jsx>{`
              @keyframes shine {
                0% { opacity: 0; transform: translateX(-100%); }
                15% { opacity: 1; }
                50% { opacity: 0.6; transform: translateX(100%); }
                100% { opacity: 0; transform: translateX(150%); }
              }
            `}</style>

            {/* mini bullets */}
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-600">
              <li className="rounded-lg bg-slate-50 px-3 py-2">✓ GW→GW price deltas</li>
              <li className="rounded-lg bg-slate-50 px-3 py-2">✓ Points in selected range</li>
              <li className="rounded-lg bg-slate-50 px-3 py-2">✓ Fast player search</li>
              <li className="rounded-lg bg-slate-50 px-3 py-2">✓ Formation friendly</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative mx-auto max-w-6xl px-6 pb-24">
        <h2 className="mb-8 text-center text-2xl md:text-3xl font-extrabold text-slate-900">
          How it works
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {/* Step 1 */}
          <div className="group relative rounded-2xl border border-emerald-100 bg-gradient-to-b from-white to-emerald-50/40 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 group-hover:bg-emerald-200 transition">
              <Clock className="h-7 w-7 text-emerald-700" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">1. Pick a range</h3>
            <p className="mt-2 text-sm text-slate-600">
              Choose any start and end gameweek—see prices at each endpoint.
            </p>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 opacity-0 group-hover:opacity-100 transition" />
          </div>

          {/* Step 2 */}
          <div className="group relative rounded-2xl border border-emerald-100 bg-gradient-to-b from-white to-emerald-50/40 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 group-hover:bg-emerald-200 transition">
              <Users className="h-7 w-7 text-emerald-700" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">2. Select players</h3>
            <p className="mt-2 text-sm text-slate-600">
              Search by name and position. We handle duplicates and benching logic.
            </p>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 opacity-0 group-hover:opacity-100 transition" />
          </div>

          {/* Step 3 */}
          <div className="group relative rounded-2xl border border-emerald-100 bg-gradient-to-b from-white to-emerald-50/40 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 group-hover:bg-emerald-200 transition">
              <PlayCircle className="h-7 w-7 text-emerald-700" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">3. Simulate</h3>
            <p className="mt-2 text-sm text-slate-600">
              We compute price delta and points scored in that exact window.
            </p>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 opacity-0 group-hover:opacity-100 transition" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-6 py-6 text-sm text-slate-600">
          <div>© {new Date().getFullYear()} FPL Simulator</div>
        </div>
      </footer>
    </main>
  );
}
