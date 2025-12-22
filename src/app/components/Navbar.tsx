'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;

      if (current < 40) {
        setVisible(true);
      } else if (current > lastScrollY) {
        setVisible(false);
      } else {
        setVisible(true);
      }

      setLastScrollY(current);
    };

    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [lastScrollY]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed inset-x-0 top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur"
        >
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex h-16 items-center justify-between">
              <Link href="/" className="text-xl font-extrabold tracking-tight">
                FPL <span className="text-emerald-700">Simulator</span>
              </Link>

              <div className="flex items-center gap-6 text-sm">
                <a
                  href="#how-it-works"
                  className="font-medium text-slate-600 transition hover:text-slate-900"
                >
                  How it works
                </a>

                <Link
                  href="/simulator"
                  className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-slate-800"
                >
                  Launch
                </Link>
              </div>
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
