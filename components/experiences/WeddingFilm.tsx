"use client";

/**
 * WEDDINGS — "The Orbit" (v3)
 * Every ring is ONE wedding. Final albums (curated by Alan) each get
 * their own band; while only Instagram previews exist, posts act as
 * pseudo-albums. A side index lists the weddings — final albums link
 * to their private couple page (/w/slug).
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Album, Photo } from "@/lib/supabase";
import { fetchPhotos, fetchAlbums } from "@/lib/photos";
import { fetchCategoryExperience, type ExperienceDef } from "@/lib/layouts";
import WorldShell from "./WorldShell";
import type { WorldNode } from "./World";
import { SITE } from "@/lib/site";

const World = dynamic(() => import("./World"), { ssr: false });

const ACCENT = "#caa87c";
const MAX_BANDS = 8;
// [radius, y, speed, photo height]
const BAND_GEO: [number, number, number, number][] = [
  [13.0, 0.0, 0.010, 3.2],
  [14.5, 3.6, -0.014, 2.9],
  [14.5, -3.6, 0.017, 2.9],
  [17.5, 7.2, 0.020, 2.6],
  [17.5, -7.2, -0.023, 2.6],
  [20.5, 0.2, 0.008, 2.7],
  [23.0, 4.2, 0.013, 2.4],
  [23.0, -4.2, -0.016, 2.4],
];
const GAP = 1.6;

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

  // group photos into weddings: album_slug (finals) or post code (previews).
  // Real albums ALWAYS get a ring; remaining rings go to the biggest previews.
  const groups = useMemo(() => {
    const m = new Map<string, Photo[]>();
    for (const p of photos) {
      const key = p.album_slug || p.code;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(p);
    }
    const entries = [...m.entries()];
    const finalAlbums = entries.filter(([, ps]) => ps[0]?.album_slug);
    const previews = entries
      .filter(([, ps]) => !ps[0]?.album_slug)
      .sort((a, b) => b[1].length - a[1].length);
    return [...finalAlbums, ...previews].slice(0, MAX_BANDS);
  }, [photos]);

  const isFinal = photos.some((p) => p.source === "final");

  const layout = useCallback(
    (all: Photo[]): WorldNode[] => {
      if (exp) return exp.layout(all);
      const nodes: WorldNode[] = [];
      groups.forEach(([, groupPhotos], gi) => {
        const [r, y, speed, h] = BAND_GEO[gi % BAND_GEO.length];
        const circumference = 2 * Math.PI * r;
        const widths: number[] = [];
        let used = 0;
        for (const p of groupPhotos) {
          const w = h * ((p.width || 1440) / (p.height || 960));
          if (used + w + GAP > circumference) break;
          widths.push(w);
          used += w + GAP;
        }
        const n = widths.length;
        if (!n) return;
        const slack = (circumference - used) / n;
        let arc = 0;
        for (let j = 0; j < n; j++) {
          const p = groupPhotos[j];
          const w = widths[j];
          const phase = ((arc + w / 2) / circumference) * Math.PI * 2 + gi * 0.9;
          arc += w + GAP + slack;
          nodes.push({
            photo: p,
            index: all.indexOf(p),
            pos: [Math.cos(phase) * r, y, Math.sin(phase) * r],
            rot: [0, 0, 0],
            w,
            h,
            orbit: { r, y, speed, phase },
          });
        }
      });
      return nodes;
    },
    [groups, exp]
  );

  return (
    <WorldShell
      photos={photos}
      accent={ACCENT}
      eyebrow="ziggyweddings"
      title={exp ? exp.label : "The Orbit"}
      sub={
        isFinal
          ? "Every ring is one wedding — grab the day, spin it, step inside"
          : "Every ring is one wedding · preview collection"
      }
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
                maxDistance: 44,
                fogNear: 18,
                fogFar: 64,
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
