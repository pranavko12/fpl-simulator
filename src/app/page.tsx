'use client';

import Link from 'next/link';
import Navbar from './components/Navbar';
import {
  ArrowRight,
  BarChart3,
  Clock,
  PlayCircle,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50">
      <Navbar />

      {/* Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-emerald-300/15 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 pt-28 md:grid-cols-2 md:pt-36"
      >
        {/* Copy */}
        <div className="flex flex-col justify-center">
          <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            New for 2024/25
          </span>

          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
            Simulate your{' '}
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 bg-clip-text text-transparent">
              alternate FPL season
            </span>{' '}
            in seconds
          </h1>

          <p className="mt-6 max-w-xl text-lg text-slate-600">
            Pick a gameweek window, lock your team, and simulate price changes and
            points using deterministic rules. No accounts. No noise.
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/simulator"
              className="group inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Launch Simulator
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              <BarChart3 className="h-4 w-4 text-slate-700" />
              Analyze my team
            </Link>
          </div>

          {/* Trust */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
            <div className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              No login required
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              Public FPL data
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              Built for 2024/25
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="relative">
          <div className="mx-auto max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-400/80" />
              <span className="h-3 w-3 rounded-full bg-amber-400/80" />
              <span className="h-3 w-3 rounded-full bg-lime-400/80" />
              <div className="ml-auto text-xs font-medium text-slate-400">
                Preview
              </div>
            </div>

            {/* Swap this block with a real screenshot later */}
            <div className="relative aspect-[16/10] bg-slate-100">
              {/* 
              <Image
                src="/screenshots/simulator.png"
                alt="FPL Simulator"
                fill
                className="object-cover"
                priority
              />
              */}
            </div>
          </div>
        </div>
      </motion.section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="relative mx-auto max-w-6xl px-6 pb-24 pt-28"
      >
        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2 className="text-2xl font-extrabold text-slate-900 md:text-3xl">
            How it works
          </h2>
          <p className="max-w-xl text-sm md:text-base text-slate-600">
            Define a window, lock your XI, and simulate outcomes with clean,
            reproducible logic.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              icon: Clock,
              title: 'Pick a range',
              text: 'Choose a start and end gameweek for the simulation.',
            },
            {
              icon: Users,
              title: 'Select players',
              text: 'Search and lock your XI. Formation logic handled.',
            },
            {
              icon: PlayCircle,
              title: 'Simulate',
              text: 'We compute price deltas and points deterministically.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                <Icon className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-slate-600">
          © {new Date().getFullYear()} FPL Simulator
        </div>
      </footer>
    </main>
  );
}
