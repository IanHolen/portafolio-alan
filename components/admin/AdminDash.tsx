"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, type Photo } from "@/lib/supabase";
import { thumbSrc } from "@/lib/photos";
import AdminUpload from "./AdminUpload";

type View = { path: string; created_at: string };
type Msg = { id: string; name: string; email: string; message: string; created_at: string };

const ROOM_LABELS: Record<string, string> = {
  "/": "Landing",
  "/weddings": "Weddings",
  "/hotels": "Hotels",
  "/documentary": "Documentary",
  "/prints": "Prints",
  "/contact": "Contact",
};

export default function AdminDash({ email }: { email: string }) {
  const [views, setViews] = useState<View[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [tab, setTab] = useState<"stats" | "upload" | "photos" | "inbox">("stats");

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
      .select("id,code,filename,category,storage_path,width,height,caption,location,featured,sort_order")
      .order("sort_order", { ascending: false })
      .limit(1500)
      .then(({ data }) => setPhotos((data as Photo[]) || []));
  }, []);

  useEffect(reload, [reload]);

  // ---- analytics aggregation ----
  const stats = useMemo(() => {
    const now = new Date();
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const today = dayKey(now);
    const days: { key: string; label: string; n: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400e3);
      days.push({ key: dayKey(d), label: `${d.getDate()}`, n: 0 });
    }
    const byDay = new Map(days.map((d) => [d.key, d]));
    const byPath = new Map<string, number>();
    let todayN = 0,
      week = 0;
    const weekSince = now.getTime() - 7 * 86400e3;
    for (const v of views) {
      const k = v.created_at.slice(0, 10);
      const slot = byDay.get(k);
      if (slot) slot.n++;
      if (k === today) todayN++;
      if (new Date(v.created_at).getTime() >= weekSince) week++;
      byPath.set(v.path, (byPath.get(v.path) || 0) + 1);
    }
    const paths = [...byPath.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const max = Math.max(1, ...days.map((d) => d.n));
    return { days, max, todayN, week, total: views.length, paths };
  }, [views]);

  async function deletePhoto(p: Photo) {
    if (!confirm(`Delete ${p.filename} from the gallery?`)) return;
    await supabase.from("photos").delete().eq("id", p.id);
    if (p.storage_path.startsWith("http")) {
      const rel = p.storage_path.split("/object/public/photos/")[1];
      if (rel) {
        await supabase.storage.from("photos").remove([rel]);
        await supabase.storage.from("thumbs").remove([rel.replace(/\.jpg$/, ".webp")]);
      }
    }
    reload();
  }

  const TABS = [
    ["stats", "Analytics"],
    ["upload", "Upload"],
    ["photos", "Photos"],
    ["inbox", `Inbox${msgs.length ? ` (${msgs.length})` : ""}`],
  ] as const;

  return (
    <main className="min-h-[100svh] bg-[var(--bg)] px-5 pb-24 pt-24 md:px-10">
      {/* header */}
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-huge text-[var(--accent)]">
            The Studio · private
          </div>
          <h1 className="font-display mt-2 text-4xl font-light italic md:text-5xl">
            Welcome back
          </h1>
          <div className="mt-1 text-[11px] font-light text-[var(--fg-dim)]">{email}</div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="border border-[var(--line)] px-4 py-2 text-[9px] uppercase tracking-wide2 text-[var(--fg-dim)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            View gallery
          </a>
          <button
            onClick={() => supabase.auth.signOut()}
            className="border border-[var(--line)] px-4 py-2 text-[9px] uppercase tracking-wide2 text-[var(--fg-dim)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* tabs */}
      <div className="mx-auto mt-10 flex max-w-[1200px] gap-6 border-b border-[var(--line)]">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`pb-3 text-[10px] uppercase tracking-wide2 transition-colors ${
              tab === id
                ? "border-b border-[var(--accent)] text-[var(--accent)]"
                : "text-[var(--fg-dim)] hover:text-[var(--fg)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-10 max-w-[1200px]">
        {/* ============ ANALYTICS ============ */}
        {tab === "stats" && (
          <div className="space-y-10">
            <div className="grid grid-cols-2 gap-px border border-[var(--line)] bg-[var(--line)] md:grid-cols-4">
              {[
                ["Today", stats.todayN],
                ["Last 7 days", stats.week],
                ["Last 30 days", stats.total],
                ["Messages", msgs.length],
              ].map(([label, n]) => (
                <div key={label} className="bg-[var(--bg)] px-6 py-7 text-center">
                  <div className="font-display text-4xl font-light">{n}</div>
                  <div className="mt-1 text-[9px] uppercase tracking-wide2 text-[var(--fg-dim)]">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* daily views — 30 days */}
            <div>
              <div className="mb-4 text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
                Daily views · last 30 days
              </div>
              <div className="flex h-40 items-end gap-[3px] border-b border-[var(--line)] pb-px">
                {stats.days.map((d) => (
                  <div key={d.key} className="group relative flex-1">
                    <div
                      className="w-full bg-[var(--accent)] opacity-70 transition-opacity group-hover:opacity-100"
                      style={{ height: `${Math.max(2, (d.n / stats.max) * 152)}px` }}
                    />
                    <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-[var(--fg)] opacity-0 group-hover:opacity-100">
                      {d.n}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[8px] text-[var(--fg-dim)]">
                <span>{stats.days[0]?.key}</span>
                <span>today</span>
              </div>
            </div>

            {/* by room */}
            <div>
              <div className="mb-4 text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
                Views by room
              </div>
              <div className="space-y-2">
                {stats.paths.map(([path, n]) => {
                  const maxP = stats.paths[0]?.[1] || 1;
                  return (
                    <div key={path} className="flex items-center gap-3">
                      <div className="w-28 shrink-0 text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
                        {ROOM_LABELS[path] || path}
                      </div>
                      <div className="h-4 bg-[var(--accent)] opacity-70" style={{ width: `${(n / maxP) * 70}%` }} />
                      <div className="text-[10px] text-[var(--fg-dim)]">{n}</div>
                    </div>
                  );
                })}
                {stats.paths.length === 0 && (
                  <div className="text-xs font-light text-[var(--fg-dim)]">
                    No visits recorded yet — they&apos;ll appear as soon as the site is live.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============ UPLOAD ============ */}
        {tab === "upload" && <AdminUpload onDone={reload} />}

        {/* ============ PHOTOS ============ */}
        {tab === "photos" && (
          <div>
            <div className="mb-4 text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
              {photos.length} photographs · newest first · click × to remove
            </div>
            <div className="grid grid-cols-3 gap-1.5 md:grid-cols-8">
              {photos.slice(0, 400).map((p) => (
                <div key={p.id} className="group relative aspect-square overflow-hidden bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbSrc(p)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-center text-[7px] uppercase tracking-wider text-white/60 opacity-0 group-hover:opacity-100">
                    {p.category}
                  </div>
                  <button
                    onClick={() => deletePhoto(p)}
                    className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center bg-black/80 text-xs text-white/80 hover:text-red-400 group-hover:flex"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============ INBOX ============ */}
        {tab === "inbox" && (
          <div className="space-y-4">
            {msgs.length === 0 && (
              <div className="text-xs font-light text-[var(--fg-dim)]">No messages yet.</div>
            )}
            {msgs.map((m) => (
              <div key={m.id} className="border border-[var(--line)] p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-sm">{m.name}</div>
                  <div className="text-[10px] text-[var(--fg-dim)]">
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>
                <a
                  href={`mailto:${m.email}`}
                  className="text-[11px] text-[var(--accent)]"
                >
                  {m.email}
                </a>
                <p className="mt-3 whitespace-pre-wrap text-xs font-light leading-relaxed text-[var(--fg-dim)]">
                  {m.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
