import { supabase, type Photo } from "./supabase";

// Image base: local /photos during initial deploy; switch to Supabase Storage
// by setting NEXT_PUBLIC_IMG_BASE=https://<ref>.supabase.co/storage/v1/object/public/photos
const IMG_BASE = process.env.NEXT_PUBLIC_IMG_BASE || "/photos";
const THUMB_BASE = process.env.NEXT_PUBLIC_THUMB_BASE || "/thumbs";

export const imgSrc = (p: Pick<Photo, "storage_path">) =>
  p.storage_path.startsWith("http")
    ? p.storage_path
    : `${IMG_BASE}/${p.storage_path}`;

export const thumbSrc = (p: Pick<Photo, "storage_path">) =>
  p.storage_path.startsWith("http")
    ? p.storage_path
        .replace("/object/public/photos/", "/object/public/thumbs/")
        .replace(/\.jpe?g$/i, ".webp")
    : `${THUMB_BASE}/${p.storage_path.replace(/\.jpg$/, ".webp")}`;

let capsCache: Record<string, { c: string; l: string }> | null = null;

async function loadCaptions() {
  if (capsCache) return capsCache;
  try {
    const r = await fetch("/captions.json");
    capsCache = r.ok ? await r.json() : {};
  } catch {
    capsCache = {};
  }
  return capsCache!;
}

async function fetchFromDb(category?: Photo["category"]): Promise<Photo[]> {
  let q = supabase
    .from("photos")
    .select(
      "id,code,filename,category,storage_path,width,height,caption,location,featured,sort_order"
    )
    .order("sort_order", { ascending: true })
    .limit(1200);
  if (category) q = q.eq("category", category);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Photo[];
  if (!rows.length) throw new Error("empty");
  return rows;
}

async function fetchFromManifest(category?: Photo["category"]): Promise<Photo[]> {
  const r = await fetch("/photos-manifest.json");
  const all = (await r.json()) as Photo[];
  return category ? all.filter((p) => p.category === category) : all;
}

export async function fetchPhotos(category?: Photo["category"]) {
  const caps = await loadCaptions();
  let photos: Photo[];
  try {
    // race the DB against a short timeout so a slow/unreachable backend
    // never blocks the experience — the static manifest is always ready
    photos = await Promise.race([
      fetchFromDb(category),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 3500)),
    ]);
  } catch (e) {
    console.warn("[photos] DB unreachable, using manifest fallback:", e);
    photos = await fetchFromManifest(category);
  }
  for (const p of photos) {
    const m = caps[p.code];
    if (m) {
      if (!p.caption && m.c) p.caption = m.c;
      if (!p.location && m.l) p.location = m.l;
    }
  }
  return photos;
}

/** Deterministic pseudo-random from a string — stable layouts across renders */
export function hash01(s: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}
