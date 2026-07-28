"use client";

/**
 * PRINTS — "The Rotunda"
 * A circular museum room: you stand at the center and the collection
 * hangs framed on the walls around you, in two rings. Drag to look
 * around the room; zoom toward any wall; click a piece to inquire.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { Photo } from "@/lib/supabase";
import { fetchPhotos, imgSrc } from "@/lib/photos";
import WorldShell from "./WorldShell";
import type { WorldNode } from "./World";

const World = dynamic(() => import("./World"), { ssr: false });

const ACCENT = "#d9c9a3";

export default function PrintGallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [lb, setLb] = useState<number | null>(null);
  const [sel, setSel] = useState<Photo | null>(null);
  const [hov, setHov] = useState<Photo | null>(null);

  useEffect(() => {
    fetchPhotos("prints").then(setPhotos).catch(console.error);
  }, []);

  const layout = useCallback((all: Photo[]): WorldNode[] => {
    // museum hang: two perfectly level rails, spacing measured so frames
    // never touch — like a real rotunda gallery
    const nodes: WorldNode[] = [];
    const R = 16.5;
    const GAP = 1.9;
    const rails: { y: number }[] = [{ y: 2.9 }, { y: -2.9 }];
    let idx = 0;
    for (const rail of rails) {
      if (idx >= all.length) break;
      const circumference = 2 * Math.PI * R;
      const widths: number[] = [];
      let used = 0;
      let probe = idx;
      while (probe < all.length) {
        const p = all[probe];
        const ar = (p.width || 1080) / (p.height || 720);
        const h = ar > 1 ? 2.7 : 3.5;
        const w = h * ar + 0.35; // include frame
        if (used + w + GAP > circumference) break;
        widths.push(w);
        used += w + GAP;
        probe++;
      }
      const n = widths.length;
      if (n === 0) break;
      const slack = (circumference - used) / n;
      let arc = 0;
      for (let j = 0; j < n; j++, idx++) {
        const p = all[idx];
        const ar = (p.width || 1080) / (p.height || 720);
        const h = ar > 1 ? 2.7 : 3.5;
        const w = widths[j];
        const th = ((arc + w / 2) / circumference) * Math.PI * 2;
        arc += w + GAP + slack;
        const x = Math.cos(th) * R;
        const z = Math.sin(th) * R;
        nodes.push({
          photo: p,
          index: idx,
          pos: [x, rail.y, z],
          rot: [0, Math.atan2(x, z) + Math.PI, 0],
          w: h * ar,
          h,
          pinned: true,
          frame: "#efe9dc",
        });
      }
    }
    return nodes;
  }, []);

  const pick = (i: number) => setSel(photos[i]);

  return (
    <>
      <WorldShell
        photos={photos}
        accent={ACCENT}
        eyebrow="Fine-art prints · worldwide shipping"
        title="The Rotunda"
        sub="A circular gallery — you are standing in the middle of it"
        lb={lb}
        setLb={setLb}
        hovered={hov}
      >
        {photos.length > 0 && (
          <World
            photos={photos}
            layout={layout}
            onPick={pick}
            onHover={setHov}
            background="#0c0a07"
            startDistance={9}
            minDistance={2}
            maxDistance={13.5}
            fogNear={26}
            fogFar={60}
            autoRotate={0.3}
            minPolar={Math.PI / 2 - 0.55}
            maxPolar={Math.PI / 2 + 0.55}
            dimOpacity={1}
          />
        )}
      </WorldShell>

      {/* print inquiry viewer */}
      {sel && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-6 backdrop-blur"
          onClick={() => setSel(null)}
        >
          <button className="absolute right-6 top-5 text-3xl font-light text-white/70 hover:text-white">
            ×
          </button>
          <div
            className="flex max-h-[90vh] max-w-[95vw] flex-col items-center md:flex-row md:gap-12"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc(sel)}
              alt=""
              className="max-h-[70vh] max-w-[90vw] object-contain shadow-2xl md:max-h-[85vh] md:max-w-[60vw]"
            />
            <div className="mt-6 max-w-xs text-center md:mt-0 md:text-left">
              {sel.location && (
                <div className="text-[10px] uppercase tracking-wide2" style={{ color: ACCENT }}>
                  {sel.location}
                </div>
              )}
              <div className="font-display mt-2 text-2xl font-light italic">
                Archival pigment print
              </div>
              <p className="mt-3 text-xs font-light leading-relaxed text-white/50">
                Printed on fine-art paper, shipped worldwide. Sizes and editions on request.
              </p>
              <a
                href={`https://wa.me/254717744389?text=${encodeURIComponent(
                  `Hi Alan, I'm interested in a print of ${sel.filename} (${sel.location || "landscape"}) from your portfolio.`
                )}`}
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
    </>
  );
}
