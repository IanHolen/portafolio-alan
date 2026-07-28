"use client";

/**
 * DOCUMENTARY & STREET — "The Swarm"
 * A deep 3D tunnel of floating photographs you fly through by scrolling.
 * Mouse steers gently; every photo is clickable. After the flight, the
 * full archive lands in a grid.
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Photo } from "@/lib/supabase";
import { fetchPhotos, thumbSrc } from "@/lib/photos";
import Lightbox from "@/components/Lightbox";
import Footer from "@/components/Footer";

const SwarmCanvas = dynamic(() => import("./SwarmCanvas"), { ssr: false });

export default function DocumentarySwarm() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [lb, setLb] = useState<number | null>(null);
  const [visible, setVisible] = useState(240); // grid pagination

  useEffect(() => {
    fetchPhotos("documentary").then(setPhotos).catch(console.error);
  }, []);

  return (
    <main className="bg-black">
      {/* 3D flight — tall scroll body drives the camera */}
      <div className="relative" style={{ height: "1400vh" }}>
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          {photos.length > 0 && (
            <SwarmCanvas
              photos={photos}
              onPick={(i) => setLb(i)}
            />
          )}

          {/* HUD */}
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center text-center opacity-0 [animation:fadeInOut_5s_ease-out_forwards]">
            <div className="text-[10px] uppercase tracking-huge text-white/60">
              Documentary & Street
            </div>
            <h1 className="font-display mt-4 text-5xl font-light italic md:text-7xl">
              The Swarm
            </h1>
            <div className="mt-4 text-[11px] font-light text-white/40">
              759 photographs · scroll to fly · click to look closer
            </div>
          </div>
          <style>{`@keyframes fadeInOut{0%{opacity:0}12%{opacity:1}70%{opacity:1}100%{opacity:0}}`}</style>
        </div>
      </div>

      {/* THE ARCHIVE GRID */}
      <section className="mx-auto max-w-[1600px] px-3 py-24 md:px-6">
        <div className="mb-3 text-center text-[10px] uppercase tracking-huge text-white/50">
          The Archive
        </div>
        <h2 className="font-display mb-12 text-center text-4xl font-light italic md:text-5xl">
          Streets, faces, wild places
        </h2>
        <div className="grid grid-cols-3 gap-1.5 md:grid-cols-6">
          {photos.slice(0, visible).map((p, i) => (
            <button
              key={p.id}
              onClick={() => setLb(i)}
              className="group relative aspect-square overflow-hidden bg-white/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbSrc(p)}
                alt={p.caption || "documentary"}
                loading="lazy"
                className="h-full w-full object-cover opacity-75 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
              />
            </button>
          ))}
        </div>
        {visible < photos.length && (
          <div className="mt-10 text-center">
            <button
              onClick={() => setVisible((v) => v + 240)}
              className="border border-white/25 px-8 py-3 text-[10px] uppercase tracking-huge text-white/60 transition-all hover:border-white hover:text-white"
            >
              Load more ({photos.length - visible} left)
            </button>
          </div>
        )}
      </section>

      <Lightbox photos={photos} index={lb} onClose={() => setLb(null)} onMove={setLb} accent="#ffffff" />
      <Footer />
    </main>
  );
}
