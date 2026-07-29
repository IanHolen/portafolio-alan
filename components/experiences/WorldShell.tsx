"use client";

/**
 * WorldShell — common chrome around every 3D world:
 * title intro that fades, control hints, grid-view toggle, lightbox,
 * and a footer strip. One viewport, no scroll narratives.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  next,
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
  next?: { href: string; label: string };
}) {
  const [grid, setGrid] = useState(false);
  const [introGone, setIntroGone] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setIntroGone(true), 4200);
    return () => clearTimeout(t);
  }, []);

  // close grid on Escape
  useEffect(() => {
    if (!grid) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && setGrid(false);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [grid]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-black">
      {children}

      {/* cinematic vignette */}
      <div className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(ellipse_at_center,transparent_52%,rgba(0,0,0,0.55)_100%)]" />

      {/* faint tiled watermark — any screenshot or screen-recording of the
          experience carries the author's name */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5] opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='210'%3E%3Ctext x='0' y='110' transform='rotate(-30 0 110)' fill='white' font-family='Georgia' font-size='17' font-style='italic'%3EAlan Kugelmass%3C/text%3E%3C/svg%3E\")",
        }}
      />

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
          <h1 className="font-display mt-3 text-4xl font-light italic md:text-7xl">{title}</h1>
          <div className="mt-3 text-[11px] font-light text-white/50">{sub}</div>
        </div>
      </div>

      {/* control hints */}
      <div className="pointer-events-none absolute bottom-5 left-1/2 z-10 w-full -translate-x-1/2 px-4 text-center text-[8px] uppercase tracking-wide2 text-white/35 md:w-auto md:whitespace-nowrap md:text-[9px]">
        <span className="md:hidden">Drag to explore · pinch to dive · tap a photo</span>
        <span className="hidden md:inline">Drag to explore · scroll to dive · click a photo to open</span>
      </div>

      {/* top-right actions */}
      <div className="absolute right-3 top-14 z-20 flex flex-col items-end gap-2 md:right-5 md:top-20">
        <button
          onClick={() => setGrid(true)}
          className="border border-white/25 bg-black/50 px-4 py-2.5 text-[10px] uppercase tracking-wide2 text-white/70 backdrop-blur transition-all hover:border-white hover:text-white md:px-6 md:py-3 md:text-[11px]"
        >
          Grid view
        </button>
        {cta && (
          <a
            href={cta.href}
            target="_blank"
            rel="noopener noreferrer"
            className="border bg-black/50 px-4 py-2.5 text-[10px] uppercase tracking-wide2 backdrop-blur transition-all md:px-6 md:py-3 md:text-[11px]"
            style={{ borderColor: accent, color: accent }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = accent;
              e.currentTarget.style.color = "#000";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.5)";
              e.currentTarget.style.color = accent;
            }}
          >
            {cta.label}
          </a>
        )}
      </div>

      {/* photo count */}
      <div className="pointer-events-none absolute bottom-5 right-5 z-10 hidden font-mono text-[9px] tracking-widest text-white/30 md:block">
        {photos.length} PHOTOGRAPHS
      </div>

      {/* next room */}
      {next && (
        <a
          href={next.href}
          className="group absolute bottom-12 right-5 z-20 text-right"
        >
          <span className="block text-[8px] uppercase tracking-huge text-white/30 transition-colors group-hover:text-white/60">
            Next room
          </span>
          <span
            className="mt-1 block text-[13px] uppercase tracking-wide2 transition-all group-hover:translate-x-1"
            style={{ color: accent }}
          >
            {next.label} →
          </span>
        </a>
      )}

      {/* grid overlay — portaled to <body> so it sits above the nav */}
      {mounted &&
        grid &&
        createPortal(
          <div className="fixed inset-0 z-[130] overflow-y-auto bg-black/97 backdrop-blur">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/85 px-6 py-5 backdrop-blur">
              <div className="text-[11px] uppercase tracking-huge" style={{ color: accent }}>
                {title} — all photographs
              </div>
              <button
                onClick={() => setGrid(false)}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-3xl font-light text-white/80 transition-all hover:border-white hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-3 md:grid-cols-6">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setGrid(false);
                    setLb(i);
                  }}
                  className="group relative aspect-square overflow-hidden bg-white/5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbSrc(p)}
                    alt={p.caption || ""}
                    loading="lazy"
                    className="h-full w-full object-cover opacity-75 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
                  />
                  {p.media_type === "video" && (
                    <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[10px] text-white">
                      ▶
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}

      <Lightbox photos={photos} index={lb} onClose={() => setLb(null)} onMove={setLb} accent={accent} />
    </main>
  );
}
