"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * ContentGuard — strong deterrence against casual content theft:
 * · blocks right-click, drag, copy, save/print shortcuts
 * · PrintScreen key → instant black screen (Windows)
 * · window loses focus / tab hidden → gallery goes black
 * Honest note: no website can fully prevent OS-level screenshots;
 * this raises the effort bar as high as the web allows.
 */
export default function ContentGuard() {
  const path = usePathname();
  const [veil, setVeil] = useState(false);
  const [flash, setFlash] = useState(false);
  const active = !path?.startsWith("/admin");

  useEffect(() => {
    if (!active) return;

    const kill = (e: Event) => e.preventDefault();

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const combo = e.ctrlKey || e.metaKey;
      if (
        (combo && (k === "s" || k === "p" || k === "u")) ||
        (combo && e.shiftKey && (k === "s" || k === "i" || k === "c"))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (e.key === "PrintScreen") {
        setFlash(true);
        try {
          navigator.clipboard?.writeText("");
        } catch {}
        setTimeout(() => setFlash(false), 1600);
      }
    };

    const onVis = () => setVeil(document.hidden);
    const onBlur = () => setVeil(true);
    const onFocus = () => setVeil(false);

    document.addEventListener("contextmenu", kill);
    document.addEventListener("dragstart", kill);
    document.addEventListener("copy", kill);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("contextmenu", kill);
      document.removeEventListener("dragstart", kill);
      document.removeEventListener("copy", kill);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[300] flex items-center justify-center bg-black transition-opacity duration-150 ${
        veil || flash ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="text-center">
        <div className="font-display text-2xl font-light italic text-white/70">
          Alan Kugelmass
        </div>
        <div className="mt-2 text-[9px] uppercase tracking-huge text-white/30">
          Protected work · © all rights reserved
        </div>
      </div>
    </div>
  );
}
