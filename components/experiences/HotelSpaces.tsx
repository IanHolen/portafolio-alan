"use client";

/**
 * HOTELS & SPACES — "The Pavilion"
 * Large glass-like panels float in a helix of depth. Orbit around
 * them, slide between floors, click a space to step inside it.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { Photo } from "@/lib/supabase";
import { fetchPhotos, hash01 } from "@/lib/photos";
import WorldShell from "./WorldShell";
import type { WorldNode } from "./World";
import { SITE } from "@/lib/site";

const World = dynamic(() => import("./World"), { ssr: false });

const ACCENT = "#8fb3b0";

export default function HotelSpaces() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [lb, setLb] = useState<number | null>(null);
  const [hov, setHov] = useState<Photo | null>(null);

  useEffect(() => {
    fetchPhotos("hotels").then(setPhotos).catch(console.error);
  }, []);

  const layout = useCallback((all: Photo[]): WorldNode[] => {
    // ascending helix of large panels
    return all.map((p, i) => {
      const t = i / Math.max(1, all.length - 1);
      const th = t * Math.PI * 1.9 + 0.6;
      const r = 11 + t * 3;
      const x = Math.cos(th) * r;
      const z = Math.sin(th) * r;
      const y = -6 + t * 12;
      const ar = (p.width || 1440) / (p.height || 960);
      const h = 5.4 + hash01(p.filename, 3) * 0.6;
      return {
        photo: p,
        index: i,
        pos: [x, y, z] as [number, number, number],
        rot: [0, Math.atan2(x, z) + Math.PI, 0] as [number, number, number],
        w: h * ar,
        h,
      };
    });
  }, []);

  return (
    <WorldShell
      photos={photos}
      accent={ACCENT}
      eyebrow="Hotels · Resorts · Real Estate"
      title="The Pavilion"
      sub="Spaces floating in the dark — orbit them, step inside"
      cta={{ label: "Commission a shoot", href: SITE.whatsappUrl }}
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
          background="#070a0a"
          startDistance={26}
          minDistance={4}
          maxDistance={38}
          fogNear={18}
          fogFar={60}
          autoRotate={0.5}
          dimOpacity={0.96}
        />
      )}
    </WorldShell>
  );
}
