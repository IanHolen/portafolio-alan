"use client";

/**
 * Studio uploader:
 * · FINAL rooms (Alan's curated work) + PREVIEW rooms (Instagram-era)
 * · weddings → album picker (each album = one couple = one ring + /w/link)
 * · per-file caption & date, photos AND videos (live in the worlds)
 * · auto thumbnails (webp) — video posters grabbed from the first frames
 */

import { useEffect, useRef, useState } from "react";
import { supabase, type Album, type WeddingExperience } from "@/lib/supabase";
import { EXPERIENCES } from "@/lib/layouts";
import { fetchAlbums, slugify } from "@/lib/photos";

const CATS = [
  { id: "weddings", label: "Weddings", thumb: "/thumbs/weddings/Blbfx4eBXmi.webp" },
  { id: "hotels", label: "Hotels & Spaces", thumb: "/thumbs/hotels/CD108BVpqbl_001.webp" },
  { id: "documentary", label: "Documentary & Street", thumb: "/thumbs/documentary/DaQPX4iAm0g_001.webp" },
  { id: "prints", label: "Prints", thumb: "/thumbs/prints/BwZoXQLgW5x.webp" },
] as const;

const SB_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://udistfvjicapcfmyqwut.supabase.co";

type Item = {
  file: File;
  isVideo: boolean;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  preview: string;
  caption: string;
  takenAt: string;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

/** first-frame poster + dimensions for a video file */
function videoPoster(file: File): Promise<{ canvas: HTMLCanvasElement; w: number; h: number }> {
  return new Promise((res, rej) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.playsInline = true;
    v.src = URL.createObjectURL(file);
    v.onloadeddata = () => {
      v.currentTime = Math.min(0.5, (v.duration || 1) / 2);
    };
    v.onseeked = () => {
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext("2d")!.drawImage(v, 0, 0);
      res({ canvas: c, w: v.videoWidth, h: v.videoHeight });
      URL.revokeObjectURL(v.src);
    };
    v.onerror = rej;
  });
}

function toWebpThumb(source: HTMLImageElement | HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => {
    const sw = "naturalWidth" in source ? source.naturalWidth : source.width;
    const sh = "naturalHeight" in source ? source.naturalHeight : source.height;
    const s = Math.min(256 / sw, 256 / sh, 1);
    const c = document.createElement("canvas");
    c.width = Math.round(sw * s);
    c.height = Math.round(sh * s);
    c.getContext("2d")!.drawImage(source, 0, 0, c.width, c.height);
    c.toBlob((b) => (b ? res(b) : rej(new Error("thumb"))), "image/webp", 0.75);
  });
}

const fileSlug = (s: string) =>
  s
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "media";

export default function AdminUpload({ onDone }: { onDone: () => void }) {
  const [cat, setCat] = useState<(typeof CATS)[number]["id"]>("documentary");
  const [srcMode, setSrcMode] = useState<"final" | "preview">("final");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // wedding albums
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumSlug, setAlbumSlug] = useState<string>("");
  const [newAlbum, setNewAlbum] = useState<{ title: string; date: string; experience: WeddingExperience }>({
    title: "",
    date: "",
    experience: "orbit",
  });
  const needsAlbum = cat === "weddings" && srcMode === "final";

  useEffect(() => {
    fetchAlbums().then(setAlbums).catch(() => {});
  }, []);

  function addFiles(files: FileList | File[]) {
    const media = [...files].filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    setItems((prev) => [
      ...prev,
      ...media.map((file) => ({
        file,
        isVideo: file.type.startsWith("video/"),
        status: "pending" as const,
        preview: URL.createObjectURL(file),
        caption: "",
        takenAt: "",
      })),
    ]);
  }

  function setItem(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  }

  async function ensureAlbum(): Promise<string | null> {
    if (!needsAlbum) return null;
    if (albumSlug && albumSlug !== "__new") return albumSlug;
    const title = newAlbum.title.trim();
    if (!title) throw new Error("Album title required");
    const slug = slugify(title);
    const row = {
      slug,
      title,
      event_date: newAlbum.date || null,
      category: "weddings",
      experience: newAlbum.experience,
    };
    const { error } = await supabase.from("albums").upsert(row);
    if (error) throw error;
    setAlbums((a) => [row, ...a]);
    setAlbumSlug(slug);
    return slug;
  }

  async function uploadAll() {
    setBusy(true);
    let album: string | null = null;
    try {
      album = await ensureAlbum();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
      setBusy(false);
      return;
    }
    const list = [...items];
    for (let i = 0; i < list.length; i++) {
      if (list[i].status === "done") continue;
      list[i] = { ...list[i], status: "uploading" };
      setItems([...list]);
      try {
        const it = list[i];
        const f = it.file;
        const stamp = Date.now().toString(36);
        const base = `up_${stamp}_${fileSlug(f.name)}`;

        let w = 0,
          h = 0,
          thumb: Blob,
          ext: string,
          ctype: string;

        if (it.isVideo) {
          const p = await videoPoster(f);
          w = p.w;
          h = p.h;
          thumb = await toWebpThumb(p.canvas);
          ext = (f.name.match(/\.(mp4|webm|mov)$/i)?.[1] || "mp4").toLowerCase();
          ctype = f.type || "video/mp4";
        } else {
          const img = await loadImage(it.preview);
          w = img.naturalWidth;
          h = img.naturalHeight;
          thumb = await toWebpThumb(img);
          ext = "jpg";
          ctype = f.type || "image/jpeg";
        }

        const mediaPath = `${cat}/${base}.${ext}`;
        const up1 = await supabase.storage
          .from("photos")
          .upload(mediaPath, f, { contentType: ctype, upsert: false });
        if (up1.error) throw up1.error;
        const up2 = await supabase.storage
          .from("thumbs")
          .upload(`${cat}/${base}.webp`, thumb, { contentType: "image/webp", upsert: true });
        if (up2.error) throw up2.error;

        const { error: dbErr } = await supabase.from("photos").insert({
          code: base,
          filename: `${base}.${ext}`,
          category: cat,
          storage_path: `${SB_URL}/storage/v1/object/public/photos/${mediaPath}`,
          width: w,
          height: h,
          caption: it.caption.trim() || null,
          taken_at: it.takenAt || null,
          source: srcMode,
          album_slug: album,
          media_type: it.isVideo ? "video" : "photo",
          sort_order: 5000 + (Math.floor(Date.now() / 1000) % 100000),
        });
        if (dbErr) throw dbErr;

        list[i] = { ...list[i], status: "done" };
      } catch (e) {
        list[i] = {
          ...list[i],
          status: "error",
          error: e instanceof Error ? e.message : String(e),
        };
      }
      setItems([...list]);
    }
    setBusy(false);
    onDone();
  }

  const pending = items.filter((i) => i.status !== "done").length;

  return (
    <div className="space-y-8">
      {/* source mode */}
      <div>
        <div className="mb-3 text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
          1 · Collection
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSrcMode("final")}
            className={`border px-6 py-3 text-left transition-all ${
              srcMode === "final"
                ? "border-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--line)] opacity-60 hover:opacity-90"
            }`}
          >
            <div className="text-[11px] uppercase tracking-wide2 text-[var(--fg)]">Final</div>
            <div className="mt-0.5 text-[9px] text-[var(--fg-dim)]">
              Alan&apos;s curated work — replaces previews in that room
            </div>
          </button>
          <button
            onClick={() => setSrcMode("preview")}
            className={`border px-6 py-3 text-left transition-all ${
              srcMode === "preview"
                ? "border-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--line)] opacity-60 hover:opacity-90"
            }`}
          >
            <div className="text-[11px] uppercase tracking-wide2 text-[var(--fg)]">
              Preview
              <span className="ml-2 rounded-sm bg-white/10 px-1.5 py-0.5 text-[8px] text-[var(--fg-dim)]">
                IG era
              </span>
            </div>
            <div className="mt-0.5 text-[9px] text-[var(--fg-dim)]">
              Placeholder collection — auto-hidden once finals exist
            </div>
          </button>
        </div>
      </div>

      {/* category picker */}
      <div>
        <div className="mb-3 text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
          2 · Choose the room
          {srcMode === "preview" && (
            <span className="ml-2 text-[var(--accent)]">(preview)</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {CATS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`group relative aspect-[16/7] overflow-hidden border text-left transition-all ${
                cat === c.id ? "border-[var(--accent)]" : "border-[var(--line)] opacity-60 hover:opacity-90"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.thumb}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              <div className="absolute bottom-2 left-3 right-2 flex items-center gap-2">
                <span
                  className={`text-[10px] uppercase tracking-wide2 ${cat === c.id ? "text-[var(--accent)]" : "text-white/80"}`}
                >
                  {c.label}
                </span>
                {srcMode === "preview" && (
                  <span className="rounded-sm bg-black/60 px-1.5 py-0.5 text-[7px] uppercase tracking-wider text-white/50">
                    preview
                  </span>
                )}
              </div>
              {cat === c.id && (
                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] text-black">
                  ✓
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* wedding album */}
      {needsAlbum && (
        <div>
          <div className="mb-3 text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
            2.5 · Which wedding? <span className="text-[var(--accent)]">(each wedding = its own ring + private link)</span>
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <select
              value={albumSlug}
              onChange={(e) => setAlbumSlug(e.target.value)}
              className="border border-[var(--line)] bg-[var(--bg)] px-4 py-3 text-xs font-light outline-none focus:border-[var(--accent)]"
            >
              <option value="">— select a wedding —</option>
              <option value="__new">+ New wedding…</option>
              {albums.map((a) => (
                <option key={a.slug} value={a.slug}>
                  {a.title}
                </option>
              ))}
            </select>
            {albumSlug === "__new" && (
              <div className="flex flex-wrap gap-3">
                <input
                  placeholder="Couple · e.g. María & Juan"
                  value={newAlbum.title}
                  onChange={(e) => setNewAlbum({ ...newAlbum, title: e.target.value })}
                  className="border-b border-[var(--line)] bg-transparent px-1 py-3 text-xs font-light outline-none focus:border-[var(--accent)]"
                />
                <input
                  type="date"
                  value={newAlbum.date}
                  onChange={(e) => setNewAlbum({ ...newAlbum, date: e.target.value })}
                  className="border-b border-[var(--line)] bg-transparent px-1 py-3 text-xs font-light text-[var(--fg-dim)] outline-none focus:border-[var(--accent)]"
                />
                {newAlbum.title && (
                  <span className="self-center text-[9px] text-[var(--fg-dim)]">
                    → /w/{slugify(newAlbum.title)}
                  </span>
                )}
              </div>
            )}
          </div>

          {albumSlug === "__new" && (
            <div className="mt-5">
              <div className="mb-2 text-[9px] uppercase tracking-wide2 text-[var(--fg-dim)]">
                Experience for the couple&apos;s page
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {EXPERIENCES.map((x) => (
                  <button
                    key={x.id}
                    onClick={() => setNewAlbum({ ...newAlbum, experience: x.id })}
                    className={`border px-4 py-3 text-left transition-all ${
                      newAlbum.experience === x.id
                        ? "border-[var(--accent)] bg-[var(--accent)]/10"
                        : "border-[var(--line)] opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className="text-[11px] uppercase tracking-wide2 text-[var(--fg)]">
                      {x.label}
                    </div>
                    <div className="mt-0.5 text-[9px] leading-snug text-[var(--fg-dim)]">
                      {x.blurb}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* dropzone */}
      <div>
        <div className="mb-3 text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
          3 · Drop photos or videos
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex min-h-36 cursor-pointer flex-col items-center justify-center border border-dashed px-6 py-8 text-center transition-colors ${
            dragOver ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--line)]"
          }`}
        >
          <div className="font-display text-2xl font-light italic">Drop media here</div>
          <div className="mt-2 text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
            or click to browse · JPG / PNG / WebP / MP4 / WebM — videos play live in the worlds · up to 2 GB
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>
      </div>

      {/* queue with per-file metadata */}
      {items.length > 0 && (
        <div>
          {busy && (
            <div className="mb-4 h-1 w-full bg-white/5">
              <div
                className="h-1 bg-[var(--accent)] transition-all duration-500"
                style={{
                  width: `${(items.filter((i) => i.status === "done").length / items.length) * 100}%`,
                }}
              />
            </div>
          )}
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
              4 · {items.length} in queue → {CATS.find((c) => c.id === cat)?.label}
              {srcMode === "preview" ? " (preview)" : ""}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setItems([])}
                disabled={busy}
                className="border border-[var(--line)] px-6 py-3 text-[11px] uppercase tracking-wide2 text-[var(--fg-dim)] hover:text-[var(--fg)] disabled:opacity-40"
              >
                Clear
              </button>
              <button
                onClick={uploadAll}
                disabled={busy || pending === 0 || (needsAlbum && !albumSlug)}
                className="border border-[var(--accent)] px-8 py-3 text-[11px] uppercase tracking-huge text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-black disabled:opacity-40"
              >
                {busy ? "Uploading…" : `Upload ${pending}`}
              </button>
            </div>
          </div>
          {needsAlbum && !albumSlug && (
            <div className="mb-3 text-[10px] text-amber-400/80">
              Select or create the wedding above before uploading.
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((it, i) => (
              <div key={i} className="flex gap-3 border border-[var(--line)] p-3">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-white/5">
                  {it.isVideo ? (
                    <video src={it.preview} muted className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.preview} alt="" className="h-full w-full object-cover" />
                  )}
                  {it.isVideo && (
                    <span className="absolute left-1 top-1 bg-black/70 px-1.5 py-0.5 text-[7px] uppercase tracking-wider text-white/80">
                      video
                    </span>
                  )}
                  <span
                    className={`absolute inset-x-0 bottom-0 px-1 py-0.5 text-center text-[7px] uppercase tracking-wider ${
                      it.status === "done"
                        ? "bg-emerald-900/80 text-emerald-200"
                        : it.status === "error"
                          ? "bg-red-900/80 text-red-200"
                          : it.status === "uploading"
                            ? "bg-black/70 text-white/80"
                            : "bg-black/60 text-white/50"
                    }`}
                  >
                    {it.status === "error" ? it.error?.slice(0, 20) : it.status}
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    placeholder="Caption / note (optional)"
                    value={it.caption}
                    disabled={busy || it.status === "done"}
                    onChange={(e) => setItem(i, { caption: e.target.value })}
                    className="w-full border-b border-[var(--line)] bg-transparent py-1.5 text-[11px] font-light outline-none focus:border-[var(--accent)] disabled:opacity-50"
                  />
                  <input
                    type="date"
                    value={it.takenAt}
                    disabled={busy || it.status === "done"}
                    onChange={(e) => setItem(i, { takenAt: e.target.value })}
                    className="w-full border-b border-[var(--line)] bg-transparent py-1.5 text-[11px] font-light text-[var(--fg-dim)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                  />
                  <div className="truncate text-[9px] text-[var(--fg-dim)]">{it.file.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
