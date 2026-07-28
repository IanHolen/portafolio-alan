"use client";

import { useEffect, useRef } from "react";

/**
 * Elegant gallery cursor: a small brass dot with a thin ring that
 * grows when something is clickable. Desktop only.
 */
export default function GalleryCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return; // touch: skip
    const d = dot.current!;
    const r = ring.current!;
    d.style.display = "block";
    r.style.display = "block";
    let x = -100,
      y = -100,
      rx = -100,
      ry = -100;
    const move = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      d.style.transform = `translate(${x - 3}px, ${y - 3}px)`;
    };
    let raf = 0;
    const loop = () => {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      const active =
        document.body.style.cursor === "pointer" ||
        !!document.querySelector("a:hover, button:hover");
      r.style.transform = `translate(${rx - 16}px, ${ry - 16}px) scale(${active ? 1.5 : 1})`;
      r.style.borderColor = active ? "rgba(200,162,74,0.9)" : "rgba(242,239,233,0.35)";
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("mousemove", move, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div
        ref={dot}
        className="pointer-events-none fixed left-0 top-0 z-[200] hidden h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
      />
      <div
        ref={ring}
        className="pointer-events-none fixed left-0 top-0 z-[200] hidden h-8 w-8 rounded-full border transition-[border-color] duration-200"
      />
    </>
  );
}
