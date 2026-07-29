"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, type Album, type Photo } from "@/lib/supabase";
import { thumbSrc, imgSrc } from "@/lib/photos";
import {
  EXPERIENCE_DEFS,
  getExperience,
  fetchCategoryExperiences,
  setCategoryExperience,
} from "@/lib/layouts";
import AdminUpload from "./AdminUpload";

const World = dynamic(() => import("../experiences/World"), { ssr: false });

type View = { path: string; created_at: string };
type Msg = { id: string; name: string; email: string; message: string; created_at: string };
type Tab = "stats" | "upload" | "photos" | "albums" | "experiences" | "inbox";

const ROOMS: Record<string, { label: string; thumb: string }> = {
  "/": { label: "Landing", thumb: "/profile.jpg" },
  "/weddings": { label: "Weddings", thumb: "/thumbs/weddings/Blbfx4eBXmi.webp" },
  "/hotels": { label: "Hotels", thumb: "/thumbs/hotels/CD108BVpqbl_001.webp" },
  "/documentary": { label: "Documentary", thumb: "/thumbs/documentary/DaQPX4iAm0g_001.webp" },
  "/prints": { label: "Prints", thumb: "/thumbs/prints/BwZoXQLgW5x.webp" },
  "/contact": { label: "Contact", thumb: "/thumbs/prints/BSCmSgthxNx.webp" },
};

const CAT_LABEL: Record<string, string> = {
  weddings: "Weddings",
  hotels: "Hotels",
  documentary: "Documentary",
  prints: "Prints",
};

function rel(ts: string) {
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ---------- charts (single accent, minimal ink) ---------- */

function AreaChart({ days }: { days: { key: string; n: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 900,
    H = 190,
    P = 8;
  const max = Math.max(1, ...days.map((d) => d.n));
  const x = (i: number) => P + (i / (days.length - 1)) * (W - P * 2);
  const y = (n: number) => H - P - (n / max) * (H - P * 2);
  const line = days.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.n)}`).join(" ");
  const area = `${line} L${x(days.length - 1)},${H - P} L${x(0)},${H - P} Z`;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((e.clientX - r.left) / r.width) * (days.length - 1));
          setHover(Math.max(0, Math.min(days.length - 1, i)));
        }}
      >
        <defs>
          <linearGradient id="ak-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c8a24a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#c8a24a" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* baseline grid */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={P}
            x2={W - P}
            y1={y(max * f)}
            y2={y(max * f)}
            stroke="rgba(242,239,233,0.06)"
            strokeWidth="1"
          />
        ))}
        <path d={area} fill="url(#ak-area)" />
        <path d={line} fill="none" stroke="#c8a24a" strokeWidth="1.8" strokeLinejoin="round" />
        <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="rgba(242,239,233,0.18)" strokeWidth="1" />
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={P} y2={H - P} stroke="rgba(242,239,233,0.25)" strokeWidth="1" />
            <circle cx={x(hover)} cy={y(days[hover].n)} r="3.5" fill="#c8a24a" />
          </>
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-2 -translate-x-1/2 border border-[var(--line)] bg-black/90 px-3 py-1.5 text-center backdrop-blur"
          style={{ left: `${(hover / (days.length - 1)) * 100}%` }}
        >
          <div className="font-display text-lg leading-none text-[var(--fg)]">{days[hover].n}</div>
          <div className="mt-0.5 text-[8px] uppercase tracking-wider text-[var(--fg-dim)]">
            {new Date(days[hover].key + "T12:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })}
          </div>
        </div>
      )}
    </div>
  );
}

function Spark({ pts }: { pts: number[] }) {
  const W = 90,
    H = 26;
  const max = Math.max(1, ...pts);
  const d = pts
    .map((n, i) => `${i === 0 ? "M" : "L"}${(i / (pts.length - 1)) * W},${H - 2 - (n / max) * (H - 4)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-6 w-[90px] opacity-70">
      <path d={d} fill="none" stroke="#c8a24a" strokeWidth="1.4" />
    </svg>
  );
}

/* ---------- dashboard ---------- */

export default function AdminDash({ email }: { email: string }) {
  const [views, setViews] = useState<View[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [tab, setTab] = useState<Tab>("stats");
  const [photoFilter, setPhotoFilter] = useState<string>("all");
  const [albumFilter, setAlbumFilter] = useState<string | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<Photo | null>(null);
  const [editForm, setEditForm] = useState({ caption: "", taken_at: "", category: "", album_slug: "" });
  const [saving, setSaving] = useState(false);
  const [catExp, setCatExp] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ exp: string; cat: string } | null>(null);

  const reload = useCallback(() => {
    const since = new Date(Date.now() - 30 * 86400e3).toISOString();
    supabase
      .from("page_views")
      .select("path,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20000)
      .then(({ data }) => setViews((data as View[]) || []));
    supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setMsgs((data as Msg[]) || []));
    supabase
      .from("photos")
      .select("id,code,filename,category,storage_path,width,height,caption,location,featured,sort_order,source,album_slug,taken_at,media_type")
      .order("sort_order", { ascending: false })
      .limit(1500)
      .then(({ data }) => setPhotos((data as Photo[]) || []));
    supabase
      .from("albums")
      .select("slug,title,event_date,category,experience,created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setAlbums((data as Album[]) || []));
    fetchCategoryExperiences().then(setCatExp).catch(() => {});
  }, []);

  useEffect(reload, [reload]);

  const stats = useMemo(() => {
    const now = new Date();
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const today = dayKey(now);
    const days: { key: string; n: number }[] = [];
    for (let i = 29; i >= 0; i--) days.push({ key: dayKey(new Date(now.getTime() - i * 86400e3)), n: 0 });
    const byDay = new Map(days.map((d) => [d.key, d]));
    const byPath = new Map<string, number>();
    let todayN = 0,
      week = 0,
      prevWeek = 0;
    const w1 = now.getTime() - 7 * 86400e3;
    const w2 = now.getTime() - 14 * 86400e3;
    for (const v of views) {
      const k = v.created_at.slice(0, 10);
      const slot = byDay.get(k);
      if (slot) slot.n++;
      if (k === today) todayN++;
      const t = new Date(v.created_at).getTime();
      if (t >= w1) week++;
      else if (t >= w2) prevWeek++;
      byPath.set(v.path, (byPath.get(v.path) || 0) + 1);
    }
    const paths = [...byPath.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const delta = prevWeek > 0 ? Math.round(((week - prevWeek) / prevWeek) * 100) : null;
    return { days, todayN, week, prevWeek, delta, total: views.length, paths, spark: days.slice(-14).map((d) => d.n) };
  }, [views]);

  const catCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of photos) m.set(p.category, (m.get(p.category) || 0) + 1);
    return m;
  }, [photos]);

  const shownPhotos = useMemo(() => {
    let list = photoFilter === "all" ? photos : photos.filter((p) => p.category === photoFilter);
    if (albumFilter) list = list.filter((p) => p.album_slug === albumFilter);
    return list;
  }, [photos, photoFilter, albumFilter]);

  async function deletePhoto(p: Photo) {
    if (!confirm(`Delete ${p.filename} from the gallery? This cannot be undone.`)) return;
    await supabase.from("photos").delete().eq("id", p.id);
    if (p.storage_path.startsWith("http")) {
      const relPath = p.storage_path.split("/object/public/photos/")[1];
      if (relPath) {
        await supabase.storage.from("photos").remove([relPath]);
        await supabase.storage.from("thumbs").remove([relPath.replace(/\.(jpg|jpeg|png|mp4|mov|webm)$/i, ".webp"), relPath.replace(/\.[^.]+$/, ".jpg")]);
      }
    }
    setEditing(null);
    reload();
  }

  function openEditor(p: Photo) {
    setEditing(p);
    setEditForm({
      caption: p.caption || "",
      taken_at: p.taken_at ? p.taken_at.slice(0, 10) : "",
      category: p.category,
      album_slug: p.album_slug || "",
    });
  }

  async function saveEditor() {
    if (!editing) return;
    setSaving(true);
    await supabase
      .from("photos")
      .update({
        caption: editForm.caption || null,
        taken_at: editForm.taken_at || null,
        category: editForm.category as Photo["category"],
        album_slug: editForm.category === "weddings" ? editForm.album_slug || null : null,
      })
      .eq("id", editing.id);
    setSaving(false);
    setEditing(null);
    reload();
  }

  async function assignExp(cat: string, value: string) {
    try {
      await setCategoryExperience(cat, value);
      setCatExp((prev) => ({ ...prev, [cat]: value }));
    } catch (e) {
      alert("Could not save — check you are signed in as admin. " + (e as Error).message);
    }
  }

  const previewPhotos = useMemo(() => {
    if (!preview) return [];
    const pool = photos.filter((p) => p.category === preview.cat);
    const finals = pool.filter((p) => p.source === "final");
    return (finals.length ? finals : pool).slice(0, 160);
  }, [preview, photos]);

  const NAV: { id: Tab; label: string; glyph: string; badge?: number }[] = [
    { id: "stats", label: "Analytics", glyph: "◐" },
    { id: "upload", label: "Upload", glyph: "↑" },
    { id: "photos", label: "Photos", glyph: "▦" },
    { id: "albums", label: "Weddings", glyph: "◈", badge: albums.length || undefined },
    { id: "experiences", label: "Experiences", glyph: "✦", badge: EXPERIENCE_DEFS.length },
    { id: "inbox", label: "Inbox", glyph: "✉", badge: msgs.length || undefined },
  ];

  return (
    <main className="flex min-h-[100svh] flex-col bg-[#0a0908] md:flex-row">
      {/* ============ SIDEBAR ============ */}
      <aside className="flex shrink-0 flex-row items-center justify-between border-b border-[var(--line)] bg-[#070606] px-5 py-4 md:sticky md:top-0 md:h-[100svh] md:w-72 md:flex-col md:items-stretch md:justify-start md:self-start md:overflow-y-auto md:border-b-0 md:border-r md:px-0 md:py-0">
        <div className="md:border-b md:border-[var(--line)] md:px-7 md:py-8">
          <div className="text-[9px] uppercase tracking-huge text-[var(--accent)]">The Studio</div>
          <div className="font-display mt-1 text-2xl font-light italic leading-none">
            Alan Kugelmass
          </div>
        </div>

        <nav className="flex gap-1 md:mt-6 md:flex-col md:gap-0 md:px-4">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`group flex items-center gap-3 px-5 py-3 text-left transition-all md:py-4 ${
                tab === n.id
                  ? "border-l-2 border-[var(--accent)] bg-white/[0.03] text-[var(--fg)]"
                  : "border-l-2 border-transparent text-[var(--fg-dim)] hover:bg-white/[0.02] hover:text-[var(--fg)]"
              }`}
            >
              <span
                className={`hidden w-5 text-center text-base md:block ${tab === n.id ? "text-[var(--accent)]" : "opacity-50"}`}
              >
                {n.glyph}
              </span>
              <span className="text-[12px] uppercase tracking-wide2">{n.label}</span>
              {n.badge && (
                <span className="ml-auto hidden rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[8px] font-medium text-black md:block">
                  {n.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="md:mt-auto md:border-t md:border-[var(--line)] md:px-7 md:py-6">
          <div className="hidden truncate text-[10px] font-light text-[var(--fg-dim)] md:block">{email}</div>
          <div className="mt-0 flex gap-4 md:mt-3">
            <a
              href="/"
              className="text-[11px] uppercase tracking-wide2 text-[var(--fg-dim)] transition-colors hover:text-[var(--accent)]"
            >
              Gallery
            </a>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-[11px] uppercase tracking-wide2 text-[var(--fg-dim)] transition-colors hover:text-[var(--accent)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ============ CONTENT ============ */}
      <section className="flex-1 px-5 py-8 md:px-10 md:py-10">
        {/* page header */}
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-6">
          <div>
            <h1 className="font-display text-3xl font-light italic md:text-4xl">
              {NAV.find((n) => n.id === tab)?.label}
            </h1>
            <div className="mt-1 text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
              {new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
            </div>
          </div>
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-wide2 text-[var(--fg-dim)]">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Live · tracking on
          </div>
        </div>

        {/* ---------- ANALYTICS ---------- */}
        {tab === "stats" && (
          <div className="mt-8 space-y-8">
            {/* stat cards */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Views today", n: stats.todayN, extra: <Spark pts={stats.spark} /> },
                {
                  label: "Last 7 days",
                  n: stats.week,
                  extra:
                    stats.delta !== null ? (
                      <span className={`text-[10px] ${stats.delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {stats.delta >= 0 ? "▲" : "▼"} {Math.abs(stats.delta)}% vs prev week
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--fg-dim)]">first week</span>
                    ),
                },
                { label: "Last 30 days", n: stats.total, extra: <span className="text-[10px] text-[var(--fg-dim)]">total visits</span> },
                { label: "Photographs", n: photos.length, extra: <span className="text-[10px] text-[var(--fg-dim)]">in the gallery</span> },
              ].map((c) => (
                <div
                  key={c.label}
                  className="border border-[var(--line)] bg-gradient-to-b from-white/[0.03] to-transparent p-6"
                >
                  <div className="text-[9px] uppercase tracking-wide2 text-[var(--fg-dim)]">{c.label}</div>
                  <div className="font-display mt-2 text-5xl font-light leading-none">{c.n}</div>
                  <div className="mt-3 flex h-6 items-center">{c.extra}</div>
                </div>
              ))}
            </div>

            {/* main chart */}
            <div className="border border-[var(--line)] bg-gradient-to-b from-white/[0.02] to-transparent p-6">
              <div className="mb-5 flex items-baseline justify-between">
                <div className="text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
                  Daily views · last 30 days
                </div>
                <div className="text-[9px] text-[var(--fg-dim)]">hover for detail</div>
              </div>
              <AreaChart days={stats.days} />
            </div>

            {/* rooms + inbox preview */}
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="border border-[var(--line)] p-6">
                <div className="mb-5 text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
                  Most visited rooms
                </div>
                <div className="space-y-4">
                  {stats.paths.map(([path, n]) => {
                    const share = stats.total ? Math.round((n / stats.total) * 100) : 0;
                    const room = ROOMS[path] || { label: path, thumb: "/profile.jpg" };
                    return (
                      <div key={path} className="flex items-center gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={room.thumb} alt="" className="h-9 w-9 shrink-0 object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[10px] uppercase tracking-wide2">{room.label}</span>
                            <span className="text-[10px] text-[var(--fg-dim)]">
                              {n} · {share}%
                            </span>
                          </div>
                          <div className="mt-1.5 h-1 bg-white/5">
                            <div className="h-1 bg-[var(--accent)]" style={{ width: `${share}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {stats.paths.length === 0 && (
                    <div className="text-xs font-light text-[var(--fg-dim)]">
                      No visits yet — the charts light up as soon as people arrive.
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-[var(--line)] p-6">
                <div className="mb-5 flex items-baseline justify-between">
                  <div className="text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">Latest messages</div>
                  <button
                    onClick={() => setTab("inbox")}
                    className="text-[9px] uppercase tracking-wide2 text-[var(--accent)]"
                  >
                    Open inbox →
                  </button>
                </div>
                <div className="space-y-4">
                  {msgs.slice(0, 3).map((m) => (
                    <div key={m.id} className="border-l-2 border-[var(--accent)]/40 pl-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs">{m.name}</span>
                        <span className="text-[9px] text-[var(--fg-dim)]">{rel(m.created_at)}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] font-light text-[var(--fg-dim)]">{m.message}</p>
                    </div>
                  ))}
                  {msgs.length === 0 && (
                    <div className="text-xs font-light text-[var(--fg-dim)]">No messages yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------- UPLOAD ---------- */}
        {tab === "upload" && (
          <div className="mt-8">
            <AdminUpload onDone={reload} />
          </div>
        )}

        {/* ---------- PHOTOS ---------- */}
        {tab === "photos" && (
          <div className="mt-8">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {["all", "weddings", "hotels", "documentary", "prints"].map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setPhotoFilter(c);
                    setAlbumFilter(null);
                  }}
                  className={`border px-5 py-3 text-[11px] uppercase tracking-wide2 transition-all ${
                    photoFilter === c && !albumFilter
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-[var(--line)] text-[var(--fg-dim)] hover:text-[var(--fg)]"
                  }`}
                >
                  {c === "all" ? `All · ${photos.length}` : `${CAT_LABEL[c]} · ${catCounts.get(c) || 0}`}
                </button>
              ))}
            </div>
            {/* wedding album sub-filter */}
            {(photoFilter === "weddings" || albumFilter) && albums.length > 0 && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="text-[9px] uppercase tracking-wide2 text-[var(--fg-dim)]">Wedding:</span>
                {albums.map((a) => (
                  <button
                    key={a.slug}
                    onClick={() => {
                      setPhotoFilter("weddings");
                      setAlbumFilter(albumFilter === a.slug ? null : a.slug);
                    }}
                    className={`border px-4 py-2 text-[10px] uppercase tracking-wide2 transition-all ${
                      albumFilter === a.slug
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--line)] text-[var(--fg-dim)] hover:text-[var(--fg)]"
                    }`}
                  >
                    {a.title}
                  </button>
                ))}
              </div>
            )}
            <div className="mb-4 text-[9px] uppercase tracking-wide2 text-[var(--fg-dim)]">
              {shownPhotos.length} items · click any photo to edit or delete it
            </div>
            <div className="grid grid-cols-3 gap-1.5 md:grid-cols-6 xl:grid-cols-8">
              {shownPhotos.slice(0, 400).map((p) => (
                <button
                  key={p.id}
                  onClick={() => openEditor(p)}
                  className="group relative aspect-square overflow-hidden bg-white/5 text-left"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbSrc(p)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-center text-[7px] uppercase tracking-wider text-white/60 opacity-0 transition-opacity group-hover:opacity-100">
                    {p.category}{p.source === "preview" ? " · preview" : ""}{p.media_type === "video" ? " · video" : ""}
                  </div>
                  <span className="absolute right-1 top-1 hidden bg-black/80 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-[var(--accent)] group-hover:block">
                    Edit
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---------- PHOTO EDITOR overlay ---------- */}
        {editing && (
          <div
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 p-4 backdrop-blur"
            onClick={() => setEditing(null)}
          >
            <div
              className="flex max-h-[92vh] w-full max-w-3xl flex-col gap-6 overflow-y-auto border border-[var(--line)] bg-[#0b0a09] p-6 md:flex-row"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="md:w-1/2">
                {editing.media_type === "video" ? (
                  <video src={imgSrc(editing)} controls muted playsInline className="max-h-[50vh] w-full object-contain" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imgSrc(editing)} alt="" className="max-h-[50vh] w-full object-contain" />
                )}
                <div className="mt-2 break-all text-[9px] text-[var(--fg-dim)]">{editing.filename}</div>
              </div>
              <div className="flex flex-1 flex-col gap-4">
                <div className="font-display text-2xl font-light italic">Edit media</div>
                <label className="block">
                  <span className="text-[9px] uppercase tracking-wide2 text-[var(--fg-dim)]">Caption / note</span>
                  <textarea
                    value={editForm.caption}
                    onChange={(e) => setEditForm({ ...editForm, caption: e.target.value })}
                    rows={3}
                    className="mt-1 w-full border border-[var(--line)] bg-transparent px-3 py-2 text-xs font-light outline-none focus:border-[var(--accent)]"
                  />
                </label>
                <label className="block">
                  <span className="text-[9px] uppercase tracking-wide2 text-[var(--fg-dim)]">Date taken</span>
                  <input
                    type="date"
                    value={editForm.taken_at}
                    onChange={(e) => setEditForm({ ...editForm, taken_at: e.target.value })}
                    className="mt-1 w-full border border-[var(--line)] bg-transparent px-3 py-2 text-xs font-light outline-none focus:border-[var(--accent)]"
                  />
                </label>
                <label className="block">
                  <span className="text-[9px] uppercase tracking-wide2 text-[var(--fg-dim)]">Category</span>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="mt-1 w-full border border-[var(--line)] bg-[#0b0a09] px-3 py-2 text-xs outline-none focus:border-[var(--accent)]"
                  >
                    {Object.entries(CAT_LABEL).map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </label>
                {editForm.category === "weddings" && (
                  <label className="block">
                    <span className="text-[9px] uppercase tracking-wide2 text-[var(--fg-dim)]">Wedding album</span>
                    <select
                      value={editForm.album_slug}
                      onChange={(e) => setEditForm({ ...editForm, album_slug: e.target.value })}
                      className="mt-1 w-full border border-[var(--line)] bg-[#0b0a09] px-3 py-2 text-xs outline-none focus:border-[var(--accent)]"
                    >
                      <option value="">— none (general weddings) —</option>
                      {albums.map((a) => (
                        <option key={a.slug} value={a.slug}>{a.title}</option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <button
                    onClick={saveEditor}
                    disabled={saving}
                    className="border border-[var(--accent)] px-6 py-3 text-[11px] uppercase tracking-wide2 text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-black disabled:opacity-40"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="border border-[var(--line)] px-6 py-3 text-[11px] uppercase tracking-wide2 text-[var(--fg-dim)] hover:text-[var(--fg)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deletePhoto(editing)}
                    className="ml-auto border border-red-900 px-6 py-3 text-[11px] uppercase tracking-wide2 text-red-400 transition-all hover:bg-red-950"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ---------- ALBUMS (weddings) ---------- */}
        {tab === "albums" && (
          <div className="mt-8 space-y-3">
            <div className="text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
              Each wedding gets a private link you can send to the couple — it lives forever.
              Create albums from the Upload tab.
            </div>
            {albums.length === 0 && (
              <div className="text-xs font-light text-[var(--fg-dim)]">
                No weddings yet — upload final wedding photos and create the first album.
              </div>
            )}
            {albums.map((a) => {
              const count = photos.filter((p) => p.album_slug === a.slug).length;
              const url = `${typeof window !== "undefined" ? window.location.origin : ""}/w/${a.slug}`;
              return (
                <div key={a.slug} className="flex flex-wrap items-center justify-between gap-3 border border-[var(--line)] bg-gradient-to-b from-white/[0.02] to-transparent p-5">
                  <div>
                    <div className="font-display text-xl font-light italic">{a.title}</div>
                    <div className="mt-0.5 text-[10px] text-[var(--fg-dim)]">
                      {a.event_date || "no date"} · {count} media
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={a.experience || "orbit"}
                      onChange={async (e) => {
                        const experience = e.target.value;
                        await supabase.from("albums").update({ experience }).eq("slug", a.slug);
                        setAlbums((prev) => prev.map((x) => (x.slug === a.slug ? { ...x, experience: experience as Album["experience"] } : x)));
                      }}
                      className="border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)] outline-none focus:border-[var(--accent)]"
                      title="Experience style"
                    >
                      {EXPERIENCE_DEFS.map((x) => (
                        <option key={x.id} value={x.id}>{x.glyph} {x.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setPreview({ exp: a.experience || "orbit", cat: "weddings" })}
                      className="border border-[var(--line)] px-5 py-3 text-[11px] uppercase tracking-wide2 text-[var(--fg-dim)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => {
                        setTab("photos");
                        setPhotoFilter("weddings");
                        setAlbumFilter(a.slug);
                      }}
                      className="border border-[var(--line)] px-5 py-3 text-[11px] uppercase tracking-wide2 text-[var(--fg-dim)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      Manage photos
                    </button>
                    <a
                      href={`/w/${a.slug}`}
                      target="_blank"
                      className="border border-[var(--line)] px-5 py-3 text-[11px] uppercase tracking-wide2 text-[var(--fg-dim)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      Open
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(url);
                        setCopied(a.slug);
                        setTimeout(() => setCopied(null), 1500);
                      }}
                      className="border border-[var(--accent)] px-5 py-3 text-[11px] uppercase tracking-wide2 text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-black"
                    >
                      {copied === a.slug ? "Copied ✓" : "Copy link"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------- EXPERIENCES ---------- */}
        {tab === "experiences" && (
          <div className="mt-8 space-y-10">
            {/* current room assignments */}
            <div>
              <div className="mb-4 text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
                What each room uses right now — pick any experience from the catalog, or keep the signature design.
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Object.entries(CAT_LABEL).map(([cat, label]) => {
                  const cur = catExp[cat];
                  const curDef = cur && cur !== "default" ? getExperience(cur) : null;
                  return (
                    <div key={cat} className="border border-[var(--line)] bg-gradient-to-b from-white/[0.02] to-transparent p-5">
                      <div className="text-[9px] uppercase tracking-wide2 text-[var(--fg-dim)]">{label}</div>
                      <div className="font-display mt-1 text-xl font-light italic">
                        {curDef ? `${curDef.glyph} ${curDef.label}` : "Signature"}
                      </div>
                      <select
                        value={cur || "default"}
                        onChange={(e) => assignExp(cat, e.target.value)}
                        className="mt-3 w-full border border-[var(--line)] bg-[#0b0a09] px-3 py-2.5 text-[10px] uppercase tracking-wide2 outline-none focus:border-[var(--accent)]"
                      >
                        <option value="default">★ Signature (original design)</option>
                        {EXPERIENCE_DEFS.map((x) => (
                          <option key={x.id} value={x.id}>{x.glyph} {x.label}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* catalog */}
            <div>
              <div className="mb-4 flex items-baseline justify-between">
                <div className="text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
                  The catalog · {EXPERIENCE_DEFS.length} experiences
                </div>
                <div className="text-[9px] text-[var(--fg-dim)]">preview uses your real photos</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {EXPERIENCE_DEFS.map((x) => (
                  <div
                    key={x.id}
                    className="group flex flex-col border border-[var(--line)] bg-gradient-to-b from-white/[0.02] to-transparent p-6 transition-all hover:border-[var(--accent)]/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl text-[var(--accent)]">{x.glyph}</span>
                      <div className="font-display text-2xl font-light italic">{x.label}</div>
                    </div>
                    <p className="mt-2 flex-1 text-[11px] font-light leading-relaxed text-[var(--fg-dim)]">
                      {x.blurb}
                    </p>
                    <div className="mt-5">
                      <button
                        onClick={() => setPreview({ exp: x.id, cat: "weddings" })}
                        className="w-full border border-[var(--accent)] px-5 py-3 text-[11px] uppercase tracking-wide2 text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-black"
                      >
                        ▶ Live preview
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------- EXPERIENCE PREVIEW overlay ---------- */}
        {preview && (() => {
          const def = getExperience(preview.exp);
          if (!def) return null;
          return (
            <div className="fixed inset-0 z-[160] bg-black">
              {previewPhotos.length > 0 ? (
                <World
                  key={`${preview.exp}-${preview.cat}`}
                  photos={previewPhotos}
                  layout={def.layout}
                  onPick={() => {}}
                  {...def.world}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-white/40">
                  No photos in this category yet — pick another one below.
                </div>
              )}

              {/* top bar */}
              <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-b from-black/85 to-transparent px-6 py-5">
                <div>
                  <div className="text-[9px] uppercase tracking-huge text-[var(--accent)]">Previewing</div>
                  <div className="font-display text-2xl font-light italic text-white">
                    {def.glyph} {def.label}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={preview.cat}
                    onChange={(e) => setPreview({ ...preview, cat: e.target.value })}
                    className="border border-white/25 bg-black/60 px-3 py-2.5 text-[10px] uppercase tracking-wide2 text-white outline-none"
                    title="Preview with photos from…"
                  >
                    {Object.entries(CAT_LABEL).map(([id, label]) => (
                      <option key={id} value={id}>{label} photos</option>
                    ))}
                  </select>
                  <select
                    value={preview.exp}
                    onChange={(e) => setPreview({ ...preview, exp: e.target.value })}
                    className="border border-white/25 bg-black/60 px-3 py-2.5 text-[10px] uppercase tracking-wide2 text-white outline-none"
                    title="Switch experience"
                  >
                    {EXPERIENCE_DEFS.map((x) => (
                      <option key={x.id} value={x.id}>{x.glyph} {x.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setPreview(null)}
                    aria-label="Close preview"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-2xl font-light text-white/80 transition-all hover:border-white hover:text-white"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* bottom bar: apply */}
              <div className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-center justify-center gap-2 bg-gradient-to-t from-black/85 to-transparent px-6 py-5">
                <span className="mr-2 text-[9px] uppercase tracking-wide2 text-white/45">
                  I like it → use for:
                </span>
                {Object.entries(CAT_LABEL).map(([cat, label]) => (
                  <button
                    key={cat}
                    onClick={async () => {
                      await assignExp(cat, preview.exp);
                    }}
                    className={`border px-5 py-2.5 text-[10px] uppercase tracking-wide2 transition-all ${
                      catExp[cat] === preview.exp
                        ? "border-[var(--accent)] bg-[var(--accent)] text-black"
                        : "border-white/30 text-white/75 hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    }`}
                  >
                    {catExp[cat] === preview.exp ? `✓ ${label}` : label}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ---------- INBOX ---------- */}
        {tab === "inbox" && (
          <div className="mt-8 space-y-3">
            {msgs.length === 0 && <div className="text-xs font-light text-[var(--fg-dim)]">No messages yet.</div>}
            {msgs.map((m) => (
              <div
                key={m.id}
                className="border border-[var(--line)] bg-gradient-to-b from-white/[0.02] to-transparent p-6"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="text-sm">{m.name}</span>
                    <span className="ml-3 text-[11px] text-[var(--accent)]">{m.email}</span>
                  </div>
                  <div className="text-[10px] text-[var(--fg-dim)]">{rel(m.created_at)}</div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-xs font-light leading-relaxed text-[var(--fg-dim)]">
                  {m.message}
                </p>
                <a
                  href={`mailto:${m.email}?subject=Re:%20your%20message%20to%20Alan%20Kugelmass`}
                  className="mt-4 inline-block border border-[var(--accent)] px-5 py-2 text-[9px] uppercase tracking-wide2 text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-black"
                >
                  Reply
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
