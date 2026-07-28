"use client";

/**
 * HOTELS & SPACES — "Architecture of Calm"
 * A slow horizontal traverse: vertical scroll slides full-height panels
 * sideways, like walking through rooms. Architectural type, hairline
 * rules, and generous negative space. Ends with a commissions call.
 */

import { useEffect, useRef, useState } from "react";
import type { Photo } from "@/lib/supabase";
import { fetchPhotos, imgSrc } from "@/lib/photos";
import Footer from "@/components/Footer";
import { SITE } from "@/lib/site";

const ACCENT = "#8fb3b0"; // cool eucalyptus

const PANEL_META: Record<string, { title: string; line: string }> = {
  BAI3yUFDmLi: { title: "Night Water", line: "Punta del Este, Uruguay" },
  CD108BVpqbl_001: { title: "The Treehouse", line: "Watamu, Kenyan Coast" },
  CD108BVpqbl_002: { title: "Above the Canopy", line: "Watamu, Kenyan Coast" },
  CEJuuwHJex5_001: { title: "Morning Practice", line: "Watamu Treehouse" },
  CEJuuwHJex5_002: { title: "Light Study I", line: "Watamu Treehouse" },
  CEJuuwHJex5_003: { title: "Light Study II", line: "Watamu Treehouse" },
  CEJuuwHJex5_004: { title: "Stillness", line: "Watamu Treehouse" },
};

export default function HotelSpaces() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    fetchPhotos("hotels").then(setPhotos).catch(console.error);
  }, []);

  useEffect(() => {
    const f = () => {
      const body = bodyRef.current;
      const track = trackRef.current;
      if (!body || !track) return;
      const r = body.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const prog = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      setP(prog);
      const walk = track.scrollWidth - window.innerWidth;
      track.style.transform = `translateX(${-prog * walk}px)`;
    };
    f();
    window.addEventListener("scroll", f, { passive: true });
    window.addEventListener("resize", f);
    return () => {
      window.removeEventListener("scroll", f);
      window.removeEventListener("resize", f);
    };
  }, [photos.length]);

  return (
    <main className="bg-[#090b0b]">
      {/* entry */}
      <section className="relative flex h-[100svh] flex-col items-center justify-center overflow-hidden text-center">
        <div className="absolute inset-0 opacity-20">
          {photos[1] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc(photos[1])} alt="" className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-[#090b0b]/60 via-transparent to-[#090b0b]" />
        </div>
        <div className="relative">
          <div className="text-[10px] uppercase tracking-huge" style={{ color: ACCENT }}>
            Hotels · Resorts · Real Estate
          </div>
          <h1 className="font-display mt-6 text-5xl font-light md:text-8xl">
            Architecture <span className="italic">of</span> Calm
          </h1>
          <p className="mx-auto mt-6 max-w-[44ch] text-xs font-light leading-relaxed text-white/45">
            Spaces photographed the way guests remember them — light first,
            geometry second, feeling always. Scroll to move through the rooms.
          </p>
        </div>
        <div className="absolute bottom-8 h-12 w-px animate-pulse bg-white/25" />
      </section>

      {/* horizontal traverse */}
      <div ref={bodyRef} style={{ height: `${Math.max(photos.length, 4) * 90}vh` }}>
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <div ref={trackRef} className="flex h-full will-change-transform">
            {photos.map((ph, i) => {
              const meta = PANEL_META[ph.filename.replace(".jpg", "")] || {
                title: `Space ${i + 1}`,
                line: ph.location || "",
              };
              return (
                <section key={ph.id} className="relative flex h-full w-[100vw] shrink-0 items-center justify-center md:w-[85vw]">
                  <div className="relative h-[72vh] w-[86vw] overflow-hidden md:w-[64vw]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgSrc(ph)}
                      alt={meta.title}
                      className="h-full w-full object-cover"
                      style={{ transform: `scale(1.08) translateX(${(p - i / photos.length) * 40}px)` }}
                    />
                    <div className="absolute inset-0 ring-1 ring-white/10" />
                  </div>
                  {/* label */}
                  <div className="absolute bottom-[9vh] left-[8vw] md:left-[10vw]">
                    <div className="text-[9px] uppercase tracking-huge" style={{ color: ACCENT }}>
                      {String(i + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")} — {meta.line}
                    </div>
                    <div className="font-display mt-2 text-4xl font-light md:text-6xl">{meta.title}</div>
                  </div>
                </section>
              );
            })}

            {/* commissions panel */}
            <section className="flex h-full w-[100vw] shrink-0 flex-col items-center justify-center text-center md:w-[70vw]">
              <div className="text-[10px] uppercase tracking-huge" style={{ color: ACCENT }}>
                Commissions open
              </div>
              <div className="font-display mt-6 max-w-[16ch] text-4xl font-light md:text-6xl">
                Your property, seen properly.
              </div>
              <p className="mt-6 max-w-[42ch] text-xs font-light leading-relaxed text-white/45">
                Hotels, lodges, villas and developments — photographed for the
                people who haven&apos;t arrived yet.
              </p>
              <a
                href={SITE.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-10 border px-10 py-4 text-[10px] uppercase tracking-huge transition-all hover:text-black"
                style={{ borderColor: ACCENT, color: ACCENT }}
                onMouseEnter={(e) => (e.currentTarget.style.background = ACCENT)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Commission a shoot
              </a>
            </section>
          </div>

          {/* progress rail */}
          <div className="absolute bottom-6 left-1/2 h-px w-40 -translate-x-1/2 bg-white/15">
            <div className="h-px bg-white/70" style={{ width: `${p * 100}%` }} />
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
