"use client";

/**
 * WorldShell — common chrome around every 3D world:
 * title intro that fades, control hints, grid-view toggle, lightbox,
 * and a footer strip. One viewport, no scroll narratives.
 */

import { useEffect, useState } from "react";
import type { Photo } from "@/lib/supabase";
import { thumbSrc } from "@/lib/photos";
import Lightbox from "@/components/Lightbox";

export default function WorldShell({
  photos,
  accent,
  eyebrow,
  title,
  sub,
  children,
  cta,
  lb,
  setLb,
  hovered,
}: {
  photos: Photo[];
  accent: string;
  eyebrow: string;
  title: string;
  sub: string;
  children: React.ReactNode; // the <World/> canvas
  cta?: { label: string; href: string };
  lb: number | null;
  setLb: (i: number | null) => void;
  hovered?: Photo | null;
}) {
  const [grid, setGrid] = useState(false);
  const [introGone, setIntroGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIntroGone(true), 4200);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-black">
      {children}

      {/* cinematic vignette */}
      <div className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(ellipse_at_center,transparent_52%,rgba(0,0,0,0.55)_100%)]" />

      {/* hover label — location/caption of the photo under the cursor */}
      <div
        className={`pointer-events-none absolute bottom-14 left-1/2 z-10 -translate-x-1/2 text-center transition-opacity duration-300 ${
          hovered ? "opacity-100" : "opacity-0"
        }`}
      >
        {hovered?.location && (
          <div className="text-[10px] uppercase tracking-huge" style={{ color: accent }}>
            {hovered.location}
          </div>
        )}
        {hovered?.caption && (
          <div className="mx-auto mt-1 max-w-[52ch] truncate text-[11px] font-light text-white/55">
            {hovered.caption}
          </div>
        )}
      </div>

      {/* intro title (fades out, pointer-through) */}
      <div
        className={`pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center text-center transition-opacity duration-[1500ms] ${
          introGone ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="bg-black/30 px-8 py-6 backdrop-blur-[2px]">
          <div className="text-[10px] uppercase tracking-huge" style={{ color: accent }}>
            {eyebrow}
          </div>
          <h1 className="font-display mt-3 text-5xl font-light italic md:text-7xl">{title}</h1>
          <div className="mt-3 text-[11px] font-light text-white/50">{sub}</div>
        </div>
      </div>

      {/* control hints */}
      <div className="pointer-events-none absolute bottom-5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap text-[9px] uppercase tracking-wide2 text-white/35">
        Drag to explore · scroll to dive · click a photo to open
      </div>

      {/* top-right actions */}
      <div className="absolute right-5 top-16 z-20 flex flex-col items-end gap-2 md:top-20">
        <button
          onClick={() => setGrid(true)}
          className="border border-white/20 bg-black/40 px-4 py-2 text-[9px] uppercase tracking-wide2 text-white/60 backdrop-blur transition-all hover:border-white/60 hover:text-white"
        >
          Grid view
        </button>
        {cta && (
          <a
            href={cta.href}
            target="_blank"
            rel="noopener noreferrer"
            className="border bg-black/40 px-4 py-2 text-[9px] uppercase tracking-wide2 backdrop-blur transition-all hover:text-black"
            style={{ borderColor: accent, color: accent }}
            onMouseEnter={(e) => (e.currentTarget.style.background = accent)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.4)")}
          >
            {cta.label}
          </a>
        )}
      </div>

      {/* photo count */}
      <div className="pointer-events-none absolute bottom-5 right-5 z-10 font-mono text-[9px] tracking-widest text-white/30">
        {photos.length} PHOTOGRAPHS
      </div>

      {/* grid overlay */}
      {grid && (
        <div className="absolute inset-0 z-30 overflow-y-auto bg-black/95 backdrop-blur">
          <div className="sticky top-0 z-10 flex items-center justify-between bg-black/80 px-5 py-4 backdrop-blur">
            <div className="text-[10px] uppercase tracking-huge" style={{ color: accent }}>
              {title} — all photographs
            </div>
            <button
              onClick={() => setGrid(false)}
              className="text-2xl font-light text-white/60 hover:text-white"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-3 md:grid-cols-6">
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setLb(i)}
                className="group relative aspect-square overflow-hidden bg-white/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbSrc(p)}
                  alt={p.caption || ""}
                  loading="lazy"
                  className="h-full w-full object-cover opacity-75 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <Lightbox photos={photos} index={lb} onClose={() => setLb(null)} onMove={setLb} accent={accent} />
    </main>
  );
}
