"use client";

/**
 * Drag & drop uploader: pick a category, drop images, and they land in
 * Supabase Storage (original + auto-generated webp thumbnail) plus a
 * row in the photos table — visible in the gallery immediately.
 */

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const CATS = [
  { id: "weddings", label: "Weddings" },
  { id: "hotels", label: "Hotels & Spaces" },
  { id: "documentary", label: "Documentary & Street" },
  { id: "prints", label: "Prints" },
] as const;

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

type Item = {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  preview: string;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

function makeThumb(img: HTMLImageElement): Promise<Blob> {
  return new Promise((res, rej) => {
    const s = Math.min(256 / img.naturalWidth, 256 / img.naturalHeight, 1);
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * s);
    c.height = Math.round(img.naturalHeight * s);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    c.toBlob((b) => (b ? res(b) : rej(new Error("thumb"))), "image/webp", 0.75);
  });
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "photo";

export default function AdminUpload({ onDone }: { onDone: () => void }) {
  const [cat, setCat] = useState<(typeof CATS)[number]["id"]>("documentary");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    const imgs = [...files].filter((f) => f.type.startsWith("image/"));
    setItems((prev) => [
      ...prev,
      ...imgs.map((file) => ({
        file,
        status: "pending" as const,
        preview: URL.createObjectURL(file),
      })),
    ]);
  }

  async function uploadAll() {
    setBusy(true);
    const list = [...items];
    for (let i = 0; i < list.length; i++) {
      if (list[i].status === "done") continue;
      list[i] = { ...list[i], status: "uploading" };
      setItems([...list]);
      try {
        const f = list[i].file;
        const img = await loadImage(f);
        const thumb = await makeThumb(img);
        const stamp = Date.now().toString(36);
        const base = `up_${stamp}_${slug(f.name)}`;
        const jpgPath = `${cat}/${base}.jpg`;

        const up1 = await supabase.storage.from("photos").upload(jpgPath, f, {
          contentType: f.type || "image/jpeg",
          upsert: false,
        });
        if (up1.error) throw up1.error;
        const up2 = await supabase.storage
          .from("thumbs")
          .upload(`${cat}/${base}.webp`, thumb, { contentType: "image/webp", upsert: true });
        if (up2.error) throw up2.error;

        const { error: dbErr } = await supabase.from("photos").insert({
          code: base,
          filename: `${base}.jpg`,
          category: cat,
          storage_path: `${SB_URL}/storage/v1/object/public/photos/${jpgPath}`,
          width: img.naturalWidth,
          height: img.naturalHeight,
          sort_order: 5000 + Math.floor(Date.now() / 1000) % 100000,
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
      {/* category picker */}
      <div>
        <div className="mb-3 text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
          1 · Choose the room
        </div>
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`border px-5 py-2.5 text-[10px] uppercase tracking-wide2 transition-all ${
                cat === c.id
                  ? "border-[var(--accent)] bg-[var(--accent)] text-black"
                  : "border-[var(--line)] text-[var(--fg-dim)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* dropzone */}
      <div>
        <div className="mb-3 text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
          2 · Drop the photographs
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
          className={`flex min-h-40 cursor-pointer flex-col items-center justify-center border border-dashed px-6 py-10 text-center transition-colors ${
            dragOver ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--line)]"
          }`}
        >
          <div className="font-display text-2xl font-light italic">
            Drop images here
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
            or click to browse · JPG / PNG / WebP
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>
      </div>

      {/* queue */}
      {items.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
              3 · {items.length} in queue → {CATS.find((c) => c.id === cat)?.label}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setItems([])}
                disabled={busy}
                className="border border-[var(--line)] px-4 py-2 text-[9px] uppercase tracking-wide2 text-[var(--fg-dim)] hover:text-[var(--fg)] disabled:opacity-40"
              >
                Clear
              </button>
              <button
                onClick={uploadAll}
                disabled={busy || pending === 0}
                className="border border-[var(--accent)] px-6 py-2 text-[9px] uppercase tracking-huge text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-black disabled:opacity-40"
              >
                {busy ? "Uploading…" : `Upload ${pending}`}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
            {items.map((it, i) => (
              <div key={i} className="relative aspect-square overflow-hidden bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.preview} alt="" className="h-full w-full object-cover" />
                <div
                  className={`absolute inset-x-0 bottom-0 px-1 py-0.5 text-center text-[8px] uppercase tracking-wider ${
                    it.status === "done"
                      ? "bg-emerald-900/80 text-emerald-200"
                      : it.status === "error"
                        ? "bg-red-900/80 text-red-200"
                        : it.status === "uploading"
                          ? "bg-black/70 text-white/80"
                          : "bg-black/60 text-white/50"
                  }`}
                >
                  {it.status === "error" ? it.error?.slice(0, 24) : it.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
