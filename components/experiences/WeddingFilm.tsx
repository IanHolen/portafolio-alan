"use client";

/**
 * WEDDINGS — "The Orbit" (v2)
 * Five clean bands of photographs circle you like rings of a carousel,
 * each band turning at its own speed — some clockwise, some counter.
 * Uniform heights and computed spacing: airy, ordered, alive.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { Photo } from "@/lib/supabase";
import { fetchPhotos } from "@/lib/photos";
import WorldShell from "./WorldShell";
import type { WorldNode } from "./World";
import { SITE } from "@/lib/site";

const World = dynamic(() => import("./World"), { ssr: false });

const ACCENT = "#caa87c";

// [radius, y, angular speed (rad/s), photo height]
const BANDS: [number, number, number, number][] = [
  [17.5, 7.2, 0.020, 2.6],
  [14.5, 3.6, -0.014, 2.9],
  [13.0, 0.0, 0.010, 3.2],
  [14.5, -3.6, -0.017, 2.9],
  [17.5, -7.2, 0.023, 2.6],
];
const GAP = 1.6; // world units between photos along the band

export default function WeddingFilm() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [lb, setLb] = useState<number | null>(null);
  const [hov, setHov] = useState<Photo | null>(null);

  useEffect(() => {
    fetchPhotos("weddings").then(setPhotos).catch(console.error);
  }, []);

  const layout = useCallback((all: Photo[]): WorldNode[] => {
    const nodes: WorldNode[] = [];
    let idx = 0;
    for (const [r, y, speed, h] of BANDS) {
      if (idx >= all.length) break;
      // measure how many photos fit on this band without crowding
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
      if (n === 0) break;
      // distribute remaining slack evenly
      const slack = (circumference - used) / n;
      let arc = 0;
      for (let j = 0; j < n; j++, idx++) {
        const p = all[idx];
        const w = widths[j];
        const centerArc = arc + w / 2;
        const phase = (centerArc / circumference) * Math.PI * 2;
        arc += w + GAP + slack;
        nodes.push({
          photo: p,
          index: idx,
          pos: [Math.cos(phase) * r, y, Math.sin(phase) * r],
          rot: [0, Math.atan2(Math.cos(phase) * r, Math.sin(phase) * r) + Math.PI, 0],
          w,
          h,
          orbit: { r, y, speed, phase },
        });
      }
    }
    return nodes;
  }, []);

  return (
    <WorldShell
      photos={photos}
      accent={ACCENT}
      eyebrow="ziggyweddings"
      title="The Orbit"
      sub="The whole day circles around you — grab it, spin it, step inside"
      cta={{ label: "Book your wedding", href: SITE.whatsappUrl }}
      lb={lb}
      setLb={setLb}
      hovered={hov}
      next={{ href: "/hotels", label: "Hotels & Spaces" }}
    >
      {photos.length > 0 && (
        <World
          photos={photos}
          layout={layout}
          onPick={setLb}
          onHover={setHov}
          background="#0a0705"
          startDistance={31}
          minDistance={4}
          maxDistance={44}
          fogNear={18}
          fogFar={64}
          autoRotate={0.25}
          dimOpacity={0.96}
        />
      )}
    </WorldShell>
  );
}
