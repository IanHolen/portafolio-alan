"use client";

/**
 * /w/[slug] — the private wedding experience.
 * One couple, one link, forever. The couple's album can use ANY
 * experience from the catalog (lib/layouts) — chosen in the admin.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { Album, Photo } from "@/lib/supabase";
import { fetchAlbum } from "@/lib/photos";
import { getExperience } from "@/lib/layouts";
import WorldShell from "./WorldShell";
import type { WorldNode } from "./World";

const World = dynamic(() => import("./World"), { ssr: false });

const ACCENT = "#caa87c";

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

  const def = getExperience(album?.experience) || getExperience("orbit")!;

  const layout = useCallback(
    (all: Photo[]): WorldNode[] => def.layout(all),
    [def]
  );

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
      sub="Your whole day, all around you — forever"
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
          {...def.world}
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
