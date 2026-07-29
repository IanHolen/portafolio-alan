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

const COLS =
  "id,code,filename,category,storage_path,width,height,caption,location,featured,sort_order,source,album_slug,taken_at,media_type";

async function fetchFromDb(category?: Photo["category"]): Promise<Photo[]> {
  let q = supabase
    .from("photos")
    .select(COLS)
    .order("sort_order", { ascending: true })
    .limit(1500);
  if (category) q = q.eq("category", category);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Photo[];
  if (!rows.length) throw new Error("empty");
  // Fresh-start logic: as soon as a category has FINAL content, its
  // preview (Instagram) photos are hidden automatically.
  // EXCEPTION — weddings: every wedding is its own ring, so final albums
  // and preview weddings live together (finals first) instead of the
  // first album wiping out the rest of the room.
  // A category goes fully "final-only" once it has a real body of work
  // (40+ finals). Until then, finals lead and previews fill the room.
  // Weddings ALWAYS shows both — every wedding is its own ring.
  const FRESH_START_AT = 40;
  if (category) {
    const finals = rows.filter((p) => p.source === "final");
    const previews = rows.filter((p) => p.source !== "final");
    if (category === "weddings" || finals.length < FRESH_START_AT)
      return [...finals, ...previews];
    return finals;
  }
  const counts = new Map<string, number>();
  for (const p of rows)
    if (p.source === "final") counts.set(p.category, (counts.get(p.category) || 0) + 1);
  return rows.filter((p) => {
    if (p.category === "weddings") return true;
    const n = counts.get(p.category) || 0;
    return n >= FRESH_START_AT ? p.source === "final" : true;
  });
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

/* ---------- wedding albums ---------- */

import type { Album } from "./supabase";

export async function fetchAlbums(): Promise<Album[]> {
  const { data } = await supabase
    .from("albums")
    .select("slug,title,event_date,category,experience,created_at")
    .order("created_at", { ascending: false });
  return (data ?? []) as Album[];
}

export async function fetchAlbum(slug: string) {
  const [{ data: album }, { data: photos }] = await Promise.all([
    supabase.from("albums").select("*").eq("slug", slug).maybeSingle(),
    supabase
      .from("photos")
      .select(
        "id,code,filename,category,storage_path,width,height,caption,location,featured,sort_order,source,album_slug,taken_at,media_type"
      )
      .eq("album_slug", slug)
      .order("sort_order", { ascending: true }),
  ]);
  return { album: (album as Album) || null, photos: (photos ?? []) as Photo[] };
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
