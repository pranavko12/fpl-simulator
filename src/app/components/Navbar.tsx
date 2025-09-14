'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 50) {
        setShowNav(true);
      } else if (currentScrollY > lastScrollY) {
        setShowNav(false); // scrolling down → hide
      } else {
        setShowNav(true); // scrolling up → show
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
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
  );
}
