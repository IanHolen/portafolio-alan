"use client";

/**
 * WEDDINGS — "The Film"
 * A cinematic, scroll-driven film reel: the viewport is the screen,
 * scrolling advances the frames with slow crossfades and a gentle push-in,
 * intertitles appear between acts like a silent movie. Ends on a credits
 * wall with every frame.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Photo } from "@/lib/supabase";
import { fetchPhotos, imgSrc, thumbSrc } from "@/lib/photos";
import Lightbox from "@/components/Lightbox";
import Footer from "@/components/Footer";
import { SITE } from "@/lib/site";

const ACTS = [
  { at: 0.0, title: "Act I", line: "Before — the quiet, the nerves, the getting ready" },
  { at: 0.28, title: "Act II", line: "The vows — everything they promised each other" },
  { at: 0.56, title: "Act III", line: "The night — when the floor catches fire" },
  { at: 0.85, title: "Fin", line: "And they kept on going" },
];

export default function WeddingFilm() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [progress, setProgress] = useState(0);
  const [lb, setLb] = useState<number | null>(null);
  const reelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPhotos("weddings").then(setPhotos).catch(console.error);
  }, []);

  // scroll progress over the reel section
  useEffect(() => {
    const f = () => {
      const el = reelRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      setProgress(p);
    };
    f();
    window.addEventListener("scroll", f, { passive: true });
    window.addEventListener("resize", f);
    return () => {
      window.removeEventListener("scroll", f);
      window.removeEventListener("resize", f);
    };
  }, []);

  // pick the reel frames (up to 42, keep order)
  const reel = useMemo(() => photos.slice(0, 42), [photos]);
  const fIdx = reel.length
    ? Math.min(reel.length - 1, Math.floor(progress * reel.length))
    : 0;
  const frameP = reel.length ? progress * reel.length - fIdx : 0; // 0..1 inside frame

  const act = ACTS.filter((a) => progress >= a.at).pop();

  return (
    <main className="bg-black">
      {/* opening title */}
      <section className="flex h-[100svh] flex-col items-center justify-center text-center">
        <div className="text-[10px] uppercase tracking-huge text-[#caa87c]">
          ziggyweddings presents
        </div>
        <h1 className="font-display mt-6 text-6xl font-light italic md:text-8xl">
          The Film
        </h1>
        <div className="mt-6 max-w-[38ch] text-xs font-light leading-relaxed text-white/40">
          Two people, one day, and every unrepeatable second in between.
          Scroll to roll the reel.
        </div>
        <div className="mt-12 h-14 w-px animate-pulse bg-white/30" />
      </section>

      {/* THE REEL — sticky screen, tall scroll body */}
      <div ref={reelRef} style={{ height: `${Math.max(reel.length, 8) * 55}vh` }}>
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          {/* letterbox bars */}
          <div className="absolute inset-x-0 top-0 z-20 h-[7vh] bg-black" />
          <div className="absolute inset-x-0 bottom-0 z-20 h-[7vh] bg-black" />

          {reel.map((p, i) => {
            const active = i === fIdx;
            const prev = i === fIdx - 1 || (fIdx === 0 && i === 0);
            if (!active && !prev && i !== fIdx + 1) return null;
            const scale = active ? 1.02 + frameP * 0.06 : 1.02;
            const opacity = active ? 1 : i < fIdx ? 1 - frameP * 1.6 : 0;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={imgSrc(p)}
                alt={p.caption || "wedding"}
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-200 [filter:sepia(0.12)_contrast(1.04)]"
                style={{ opacity, transform: `scale(${scale})`, zIndex: active ? 10 : 5 }}
              />
            );
          })}

          {/* act intertitle */}
          {act && (
            <div
              key={act.title}
              className="pointer-events-none absolute inset-x-0 top-[11vh] z-30 text-center"
            >
              <span className="font-display bg-black/45 px-6 py-2 text-xs uppercase tracking-huge text-[#caa87c] backdrop-blur-sm">
                {act.title} · {act.line}
              </span>
            </div>
          )}

          {/* frame counter */}
          <div className="absolute bottom-[9vh] right-6 z-30 font-mono text-[10px] tracking-widest text-white/50">
            {String(fIdx + 1).padStart(2, "0")} / {String(reel.length || 0).padStart(2, "0")}
          </div>
          {/* progress line */}
          <div className="absolute bottom-[7vh] left-0 z-30 h-px bg-[#caa87c]" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {/* CREDITS WALL */}
      <section className="mx-auto max-w-[1500px] px-4 py-28 md:px-8">
        <div className="mb-3 text-center text-[10px] uppercase tracking-huge text-[#caa87c]">
          Credits
        </div>
        <h2 className="font-display mb-14 text-center text-4xl font-light italic md:text-5xl">
          Every frame of the day
        </h2>
        <div className="columns-2 gap-3 md:columns-4">
          {photos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setLb(i)}
              className="group mb-3 block w-full overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbSrc(p)}
                alt={p.caption || "wedding"}
                loading="lazy"
                className="w-full opacity-80 transition-all duration-700 [filter:sepia(0.1)] group-hover:scale-[1.03] group-hover:opacity-100"
              />
            </button>
          ))}
        </div>
        <div className="mt-20 text-center">
          <a
            href={SITE.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block border border-[#caa87c] px-10 py-4 text-[11px] uppercase tracking-huge text-[#caa87c] transition-all hover:bg-[#caa87c] hover:text-black"
          >
            Book your wedding
          </a>
        </div>
      </section>

      <Lightbox photos={photos} index={lb} onClose={() => setLb(null)} onMove={setLb} accent="#caa87c" />
      <Footer />
    </main>
  );
}
