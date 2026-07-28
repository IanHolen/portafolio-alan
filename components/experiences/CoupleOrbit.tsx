"use client";

/**
 * /w/[slug] — the private wedding experience.
 * One couple, one link, forever: their whole day orbits around them
 * in three rings, with their names above it. Shareable, unlisted.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { Album, Photo } from "@/lib/supabase";
import { fetchAlbum } from "@/lib/photos";
import WorldShell from "./WorldShell";
import type { WorldNode } from "./World";

const World = dynamic(() => import("./World"), { ssr: false });

const ACCENT = "#caa87c";
const RINGS: [number, number, number, number][] = [
  [12.5, 3.4, 0.016, 2.9],
  [14.0, 0.0, -0.011, 3.2],
  [12.5, -3.4, 0.019, 2.9],
];
const GAP = 1.6;

export default function CoupleOrbit({ slug }: { slug: string }) {
  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [lb, setLb] = useState<number | null>(null);
  const [hov, setHov] = useState<Photo | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchAlbum(slug)
      .then((r) => {
        setAlbum(r.album);
        setPhotos(r.photos);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [slug]);

  const layout = useCallback((all: Photo[]): WorldNode[] => {
    const nodes: WorldNode[] = [];
    let idx = 0;
    for (const [r, y, speed, h] of RINGS) {
      if (idx >= all.length) break;
      const circumference = 2 * Math.PI * r;
      const widths: number[] = [];
      let used = 0;
      let probe = idx;
      while (probe < all.length) {
        const p = all[probe];
        const w = h * ((p.width || 1440) / (p.height || 960));
        if (used + w + GAP > circumference) break;
        widths.push(w);
        used += w + GAP;
        probe++;
      }
      const n = widths.length;
      if (!n) break;
      const slack = (circumference - used) / n;
      let arc = 0;
      for (let j = 0; j < n; j++, idx++) {
        const p = all[idx];
        const w = widths[j];
        const phase = ((arc + w / 2) / circumference) * Math.PI * 2;
        arc += w + GAP + slack;
        nodes.push({
          photo: p,
          index: idx,
          pos: [Math.cos(phase) * r, y, Math.sin(phase) * r],
          rot: [0, 0, 0],
          w,
          h,
          orbit: { r, y, speed, phase },
        });
      }
    }
    return nodes;
  }, []);

  if (loaded && (!album || photos.length === 0)) {
    return (
      <main className="flex min-h-[100svh] flex-col items-center justify-center bg-black px-6 text-center">
        <div className="font-display text-3xl font-light italic text-white/80">
          This gallery isn&apos;t here yet
        </div>
        <p className="mt-3 max-w-[40ch] text-xs font-light text-white/40">
          Check the link with your photographer — or explore the
          <a href="/" className="ml-1 text-[#caa87c]">
            main gallery
          </a>
          .
        </p>
      </main>
    );
  }

  const dateStr = album?.event_date
    ? new Date(album.event_date + "T12:00:00").toLocaleDateString("en", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <WorldShell
      photos={photos}
      accent={ACCENT}
      eyebrow={`ziggyweddings · ${dateStr}`}
      title={album?.title || "The Wedding"}
      sub="Your whole day, orbiting around you — forever"
      lb={lb}
      setLb={setLb}
      hovered={hov}
    >
      {photos.length > 0 && (
        <World
          photos={photos}
          layout={layout}
          onPick={setLb}
          onHover={setHov}
          background="#0a0705"
          startDistance={27}
          minDistance={4}
          maxDistance={40}
          fogNear={16}
          fogFar={58}
          autoRotate={0.3}
          dimOpacity={0.96}
        />
      )}

      {/* permanent couple title */}
      {album && (
        <div className="pointer-events-none absolute inset-x-0 top-[12vh] z-[6] text-center">
          <div className="text-[9px] uppercase tracking-huge text-white/40">{dateStr}</div>
          <div className="font-display mt-1 text-3xl font-light italic text-white/85 md:text-4xl">
            {album.title}
          </div>
        </div>
      )}
    </WorldShell>
  );
}
