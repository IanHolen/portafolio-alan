"use client";

/**
 * DOCUMENTARY & STREET — "The Sphere" (v2)
 * A fibonacci sphere of photographs around you — fewer, larger radius,
 * uniform sizing, minimal jitter: the galaxy reads as one calm object,
 * and diving inside still surrounds you completely.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { Photo } from "@/lib/supabase";
import { fetchPhotos, hash01 } from "@/lib/photos";
import WorldShell from "./WorldShell";
import type { WorldNode } from "./World";

const World = dynamic(() => import("./World"), { ssr: false });

const COUNT = 190;

export default function DocumentarySwarm() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [lb, setLb] = useState<number | null>(null);
  const [hov, setHov] = useState<Photo | null>(null);

  useEffect(() => {
    fetchPhotos("documentary").then(setPhotos).catch(console.error);
  }, []);

  const layout = useCallback((all: Photo[]): WorldNode[] => {
    const step = Math.max(1, Math.floor(all.length / COUNT));
    const picked: { p: Photo; gi: number }[] = [];
    for (let i = 0; i < all.length && picked.length < COUNT; i += step)
      picked.push({ p: all[i], gi: i });

    const N = picked.length;
    const GA = Math.PI * (3 - Math.sqrt(5));
    // one clean shell — the sphere reads as a single calm object
    return picked.map(({ p, gi }, i) => {
      const r = 21;
      const y = 1 - (i / Math.max(1, N - 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const th = GA * i;
      const x = Math.cos(th) * rad * r;
      const z = Math.sin(th) * rad * r;
      const yy = y * r * 0.82;
      const ar = (p.width || 1080) / (p.height || 1080);
      const h = 2.2 + hash01(p.filename, 5) * 0.5; // near-uniform size
      return {
        photo: p,
        index: gi,
        pos: [x, yy, z] as [number, number, number],
        rot: [0, Math.atan2(x, z) + Math.PI, 0] as [number, number, number],
        w: h * ar,
        h,
      };
    });
  }, []);

  return (
    <WorldShell
      photos={photos}
      accent="#ffffff"
      eyebrow="Documentary & Street"
      title="The Sphere"
      sub="759 photographs from four continents, floating around you"
      lb={lb}
      setLb={setLb}
      hovered={hov}
      next={{ href: "/prints", label: "Prints" }}
    >
      {photos.length > 0 && (
        <World
          photos={photos}
          layout={layout}
          onPick={setLb}
          onHover={setHov}
          startDistance={36}
          minDistance={2}
          maxDistance={48}
          fogNear={22}
          fogFar={74}
          autoRotate={0.3}
          dimOpacity={0.92}
        />
      )}
    </WorldShell>
  );
}
