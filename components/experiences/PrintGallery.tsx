"use client";

/**
 * PRINTS — "The Gallery"
 * A virtual exhibition: vertical scroll walks you horizontally along a
 * dark gallery wall. Each photograph hangs in a thin frame under its own
 * spotlight, with a wall label. Click a piece to view it large and
 * inquire via WhatsApp.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Photo } from "@/lib/supabase";
import { fetchPhotos, imgSrc, thumbSrc, hash01 } from "@/lib/photos";
import Footer from "@/components/Footer";
import { SITE } from "@/lib/site";

const ACCENT = "#d9c9a3";

export default function PrintGallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sel, setSel] = useState<Photo | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPhotos("prints").then(setPhotos).catch(console.error);
  }, []);

  // vertical scroll -> horizontal walk
  useEffect(() => {
    const f = () => {
      const body = bodyRef.current;
      const track = trackRef.current;
      if (!body || !track) return;
      const r = body.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      const walk = track.scrollWidth - window.innerWidth;
      track.style.transform = `translateX(${-p * walk}px)`;
    };
    f();
    window.addEventListener("scroll", f, { passive: true });
    window.addEventListener("resize", f);
    return () => {
      window.removeEventListener("scroll", f);
      window.removeEventListener("resize", f);
    };
  }, [photos.length]);

  const pieces = useMemo(() => photos.slice(0, 60), [photos]);

  return (
    <main className="bg-[#0b0a08]">
      {/* entry */}
      <section className="flex h-[100svh] flex-col items-center justify-center text-center">
        <div className="text-[10px] uppercase tracking-huge" style={{ color: ACCENT }}>
          Fine-art prints · worldwide shipping
        </div>
        <h1 className="font-display mt-6 text-6xl font-light italic md:text-8xl">
          The Gallery
        </h1>
        <p className="mt-6 max-w-[40ch] text-xs font-light leading-relaxed text-white/40">
          A private exhibition of landscapes and quiet moments. Scroll to walk
          the room; every piece is available as a print.
        </p>
        <div className="mt-12 h-14 w-px animate-pulse bg-white/25" />
      </section>

      {/* gallery walk */}
      <div ref={bodyRef} style={{ height: `${Math.max(pieces.length, 6) * 42}vh` }}>
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          {/* ambient wall gradient + floor */}
          <div className="absolute inset-0 bg-[linear-gradient(#0e0d0a_0%,#12100c_55%,#060505_78%,#000_100%)]" />
          <div
            ref={trackRef}
            className="absolute top-0 flex h-full items-center gap-[14vw] pl-[30vw] pr-[35vw] will-change-transform"
          >
            {pieces.map((p, i) => {
              const landscape = (p.width || 1) >= (p.height || 1);
              const hpx = landscape ? 40 + hash01(p.filename, 5) * 8 : 52 + hash01(p.filename, 5) * 6;
              return (
                <figure key={p.id} className="relative shrink-0" style={{ height: `${hpx}vh` }}>
                  {/* spotlight cone */}
                  <div className="absolute -top-[26vh] left-1/2 h-[30vh] w-[42vh] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(255,238,200,0.16),transparent_70%)]" />
                  {/* frame */}
                  <button
                    onClick={() => setSel(p)}
                    className="group relative block h-full border-[10px] border-[#151310] bg-[#f5f2ea] p-[1.6vh] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] transition-transform duration-500 hover:scale-[1.015]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbSrc(p)}
                      alt={p.caption || "print"}
                      loading="lazy"
                      className="h-full w-auto object-contain"
                    />
                    <span className="pointer-events-none absolute inset-0 shadow-[inset_0_2px_10px_rgba(0,0,0,0.35)]" />
                  </button>
                  {/* wall label */}
                  <figcaption className="absolute -bottom-14 left-0 w-56 text-left">
                    <div className="text-[9px] uppercase tracking-wide2" style={{ color: ACCENT }}>
                      Nº {String(i + 1).padStart(2, "0")}
                      {p.location ? ` · ${p.location}` : ""}
                    </div>
                    <div className="mt-1 text-[10px] font-light text-white/35">
                      Archival print · edition on inquiry
                    </div>
                  </figcaption>
                </figure>
              );
            })}

            {/* end wall */}
            <div className="flex h-full w-[50vw] shrink-0 flex-col items-center justify-center text-center">
              <div className="font-display text-3xl font-light italic md:text-5xl">
                Take one home
              </div>
              <a
                href={`${SITE.whatsappUrl}%20about%20a%20print`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 border px-10 py-4 text-[10px] uppercase tracking-huge transition-all hover:bg-[#d9c9a3] hover:text-black"
                style={{ borderColor: ACCENT, color: ACCENT }}
              >
                Inquire · WhatsApp
              </a>
            </div>
          </div>

          {/* walk hint */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-huge text-white/30">
            Scroll to walk the gallery
          </div>
        </div>
      </div>

      {/* piece viewer */}
      {sel && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-6 backdrop-blur"
          onClick={() => setSel(null)}
        >
          <button className="absolute right-6 top-5 text-3xl font-light text-white/70 hover:text-white">×</button>
          <div className="flex max-h-[90vh] max-w-[95vw] flex-col items-center md:flex-row md:gap-12" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgSrc(sel)} alt="" className="max-h-[70vh] max-w-[90vw] object-contain shadow-2xl md:max-h-[85vh] md:max-w-[60vw]" />
            <div className="mt-6 max-w-xs text-center md:mt-0 md:text-left">
              {sel.location && (
                <div className="text-[10px] uppercase tracking-wide2" style={{ color: ACCENT }}>{sel.location}</div>
              )}
              <div className="font-display mt-2 text-2xl font-light italic">Archival pigment print</div>
              <p className="mt-3 text-xs font-light leading-relaxed text-white/50">
                Printed on fine-art paper, shipped worldwide. Sizes and editions
                on request.
              </p>
              <a
                href={`https://wa.me/254717744389?text=${encodeURIComponent(`Hi Alan, I'm interested in a print of ${sel.filename} (${sel.location || "landscape"}) from your portfolio.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block border px-8 py-3 text-[10px] uppercase tracking-huge transition-all hover:bg-[#d9c9a3] hover:text-black"
                style={{ borderColor: ACCENT, color: ACCENT }}
              >
                Inquire about this print
              </a>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
