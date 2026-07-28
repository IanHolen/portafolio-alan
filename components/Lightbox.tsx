"use client";

import { useCallback, useEffect } from "react";
import type { Photo } from "@/lib/supabase";
import { imgSrc } from "@/lib/photos";

export default function Lightbox({
  photos,
  index,
  onClose,
  onMove,
  accent = "var(--accent)",
}: {
  photos: Photo[];
  index: number | null;
  onClose: () => void;
  onMove: (next: number) => void;
  accent?: string;
}) {
  const move = useCallback(
    (d: number) => {
      if (index === null) return;
      const n = (index + d + photos.length) % photos.length;
      onMove(n);
    },
    [index, photos.length, onMove]
  );

  useEffect(() => {
    if (index === null) return;
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", f);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", f);
      document.body.style.overflow = "";
    };
  }, [index, move, onClose]);

  if (index === null) return null;
  const p = photos[index];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute right-6 top-5 z-10 text-3xl font-light text-white/70 transition-colors hover:text-white"
      >
        ×
      </button>

      <button
        aria-label="Previous"
        onClick={(e) => {
          e.stopPropagation();
          move(-1);
        }}
        className="absolute left-2 md:left-6 z-10 p-4 text-4xl font-thin text-white/40 transition-colors hover:text-white"
      >
        ‹
      </button>

      <figure
        className="flex max-h-[92vh] max-w-[92vw] flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc(p)}
          alt={p.caption || p.filename}
          className="max-h-[82vh] max-w-[92vw] object-contain shadow-2xl"
        />
        <figcaption className="mt-4 max-w-[70ch] text-center">
          {p.location && (
            <div
              className="text-[10px] uppercase tracking-wide2"
              style={{ color: accent }}
            >
              {p.location}
            </div>
          )}
          {p.caption && (
            <div className="mt-1 line-clamp-2 text-xs font-light text-white/50">
              {p.caption.split("\n")[0].replace(/#[\w]+/g, "").trim()}
            </div>
          )}
          <div className="mt-2 text-[10px] tracking-wide2 text-white/30">
            {index + 1} / {photos.length}
          </div>
        </figcaption>
      </figure>

      <button
        aria-label="Next"
        onClick={(e) => {
          e.stopPropagation();
          move(1);
        }}
        className="absolute right-2 md:right-6 z-10 p-4 text-4xl font-thin text-white/40 transition-colors hover:text-white"
      >
        ›
      </button>
    </div>
  );
}
