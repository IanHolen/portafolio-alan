"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";

export default function HomeHero() {
  const [ready, setReady] = useState(false);
  const [my, setMy] = useState(0); // mouse parallax

  useEffect(() => {
    setReady(true);
    const f = (e: MouseEvent) => {
      setMy((e.clientX / window.innerWidth - 0.5) * 2);
    };
    window.addEventListener("mousemove", f, { passive: true });
    return () => window.removeEventListener("mousemove", f);
  }, []);

  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
      {/* portrait */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-[2000ms] ${
          ready ? "opacity-100 scale-100" : "opacity-0 scale-110"
        }`}
      >
        <div
          className="relative h-[62vmin] w-[62vmin] max-h-[560px] max-w-[560px]"
          style={{ transform: `translateX(${my * -12}px)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/profile.jpg"
            alt="Alan Kugelmass"
            className="h-full w-full rounded-full object-cover opacity-90 [filter:grayscale(0.15)]"
          />
          <div className="absolute inset-0 rounded-full ring-1 ring-[var(--line)]" />
          {/* soft vignette behind */}
          <div className="absolute -inset-24 -z-10 rounded-full bg-[radial-gradient(circle,rgba(200,162,74,0.10),transparent_65%)]" />
        </div>
      </div>

      {/* name overlay */}
      <div className="pointer-events-none relative z-10 text-center mix-blend-difference">
        <div
          className={`text-[10px] uppercase tracking-huge text-white/70 transition-all delay-500 duration-1000 ${
            ready ? "opacity-100" : "opacity-0 translate-y-4"
          }`}
        >
          {SITE.location} · from {SITE.origin}
        </div>
        <h1
          className={`font-display mt-4 text-[13vw] font-light uppercase leading-[0.95] tracking-[0.06em] text-white transition-all duration-1000 md:text-[8.5vw] ${
            ready ? "opacity-100" : "opacity-0 translate-y-6"
          }`}
        >
          Alan
          <br />
          Kugelmass
        </h1>
        <div
          className={`mt-5 text-[11px] uppercase tracking-huge text-white/80 transition-all delay-700 duration-1000 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          {SITE.role}
        </div>
      </div>

      {/* scroll hint */}
      <a
        href="#about"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-huge text-[var(--fg-dim)] transition-colors hover:text-[var(--accent)]"
      >
        <span className="mb-3 block">Scroll</span>
        <span className="mx-auto block h-10 w-px animate-pulse bg-[var(--fg-dim)]" />
      </a>
    </section>
  );
}
