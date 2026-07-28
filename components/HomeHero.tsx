"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";

export default function HomeHero() {
  const [ready, setReady] = useState(false);
  const [mx, setMx] = useState(0);

  useEffect(() => {
    setReady(true);
    const f = (e: MouseEvent) => setMx((e.clientX / window.innerWidth - 0.5) * 2);
    window.addEventListener("mousemove", f, { passive: true });
    return () => window.removeEventListener("mousemove", f);
  }, []);

  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6">
      {/* soft brass glow behind everything */}
      <div className="pointer-events-none absolute left-1/2 top-[38%] h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(200,162,74,0.10),transparent_65%)]" />

      {/* portrait */}
      <div
        className={`relative transition-all duration-[1800ms] ${
          ready ? "scale-100 opacity-100" : "scale-110 opacity-0"
        }`}
        style={{ transform: `translateX(${mx * -10}px)` }}
      >
        <div className="h-[34vmin] w-[34vmin] max-h-[300px] max-w-[300px] min-h-[180px] min-w-[180px] overflow-hidden rounded-full ring-1 ring-[var(--line)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/profile.jpg"
            alt="Alan Kugelmass"
            className="h-full w-full object-cover opacity-95 [filter:grayscale(0.15)]"
          />
        </div>
      </div>

      {/* name — clear of the photo, fully readable */}
      <div className="relative z-10 mt-8 text-center">
        <div
          className={`text-[10px] uppercase tracking-huge text-[var(--fg-dim)] transition-all delay-300 duration-1000 ${
            ready ? "opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          {SITE.location} · from {SITE.origin}
        </div>
        <h1
          className={`font-display mt-3 text-[11vw] font-light uppercase leading-[1.02] tracking-[0.08em] text-[var(--fg)] transition-all delay-150 duration-1000 md:text-[6.2vw] ${
            ready ? "opacity-100" : "translate-y-5 opacity-0"
          }`}
        >
          Alan Kugelmass
        </h1>
        <div
          className={`mt-4 text-[11px] uppercase tracking-huge text-[var(--accent)] transition-all delay-500 duration-1000 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          {SITE.role}
        </div>
      </div>

      {/* scroll hint */}
      <a
        href="#about"
        className="absolute bottom-7 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-huge text-[var(--fg-dim)] transition-colors hover:text-[var(--accent)]"
      >
        <span className="mb-3 block">Scroll</span>
        <span className="mx-auto block h-9 w-px animate-pulse bg-[var(--fg-dim)]" />
      </a>
    </section>
  );
}
