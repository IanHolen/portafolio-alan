"use client";

/**
 * WEDDINGS — "The Orbit" (the one)
 * Five counter-rotating bands in an hourglass profile, every photo
 * measured so nothing crowds. All the weddings flow together through
 * the bands; the side index links each final album to its private page.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { Album, Photo } from "@/lib/supabase";
import { fetchPhotos, fetchAlbums } from "@/lib/photos";
import { fetchCategoryExperience, type ExperienceDef } from "@/lib/layouts";
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
  const [albums, setAlbums] = useState<Album[]>([]);
  const [lb, setLb] = useState<number | null>(null);
  const [hov, setHov] = useState<Photo | null>(null);
  const [exp, setExp] = useState<ExperienceDef | null>(null);

  useEffect(() => {
    fetchPhotos("weddings").then(setPhotos).catch(console.error);
    fetchAlbums().then(setAlbums).catch(() => {});
    fetchCategoryExperience("weddings").then(setExp).catch(() => {});
  }, []);

  const isFinal = photos.some((p) => p.source === "final");

  const layout = useCallback(
    (all: Photo[]): WorldNode[] => {
      if (exp) return exp.layout(all);
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
            rot: [0, 0, 0],
            w,
            h,
            orbit: { r, y, speed, phase },
          });
        }
      }
      return nodes;
    },
    [exp]
  );

  return (
    <WorldShell
      photos={photos}
      accent={ACCENT}
      eyebrow="ziggyweddings"
      title={exp ? exp.label : "The Orbit"}
      sub="The whole day circles around you — grab it, spin it, step inside"
      cta={{ label: "Book your wedding", href: SITE.whatsappUrl }}
      lb={lb}
      setLb={setLb}
      hovered={hov}
      next={{ href: "/hotels", label: "Hotels & Spaces" }}
    >
      {photos.length > 0 && (
        <World
          key={exp?.id || "default"}
          photos={photos}
          layout={layout}
          onPick={setLb}
          onHover={setHov}
          {...(exp
            ? exp.world
            : {
                background: "#0a0705",
                startDistance: 31,
                minDistance: 4,
                maxDistance: 52,
                fogNear: 18,
                fogFar: 95,
                autoRotate: 0.25,
                dimOpacity: 0.96,
              })}
        />
      )}

      {/* wedding index — final albums link to their private page */}
      {isFinal && albums.length > 0 && (
        <div className="absolute left-5 top-24 z-20 max-w-[220px]">
          <div className="mb-3 text-[9px] uppercase tracking-huge text-white/35">
            The weddings
          </div>
          <div className="space-y-2">
            {albums.slice(0, 10).map((a) => (
              <a
                key={a.slug}
                href={`/w/${a.slug}`}
                className="block border-l border-white/15 pl-3 text-[11px] font-light text-white/60 transition-all hover:border-[#caa87c] hover:pl-4 hover:text-[#caa87c]"
              >
                {a.title}
                {a.event_date && (
                  <span className="ml-2 text-[9px] text-white/30">
                    {new Date(a.event_date + "T12:00:00").getFullYear()}
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </WorldShell>
  );
}
