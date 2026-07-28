"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/weddings", label: "Weddings" },
  { href: "/hotels", label: "Hotels" },
  { href: "/documentary", label: "Documentary" },
  { href: "/prints", label: "Prints" },
  { href: "/contact", label: "Contact" },
];

export default function Nav() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const hidden = path?.startsWith("/admin");

  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 40);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);

  useEffect(() => setOpen(false), [path]);

  if (hidden) return null;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "backdrop-blur-md bg-black/55" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-4 md:px-10">
        <Link
          href="/"
          className="font-display text-[15px] tracking-wide2 uppercase text-[var(--fg)] hover:text-[var(--accent)] transition-colors"
        >
          Alan Kugelmass
        </Link>

        {/* desktop */}
        <nav className="hidden gap-8 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-[11px] uppercase tracking-wide2 transition-colors hover:text-[var(--accent)] ${
                path?.startsWith(l.href)
                  ? "text-[var(--accent)]"
                  : "text-[var(--fg-dim)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* mobile burger */}
        <button
          aria-label="Menu"
          onClick={() => setOpen(!open)}
          className="flex h-8 w-8 flex-col items-end justify-center gap-1.5 md:hidden"
        >
          <span
            className={`h-px bg-[var(--fg)] transition-all ${open ? "w-6 translate-y-[3.5px] rotate-45" : "w-6"}`}
          />
          <span
            className={`h-px bg-[var(--fg)] transition-all ${open ? "w-6 -translate-y-[3px] -rotate-45" : "w-4"}`}
          />
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-5 border-t border-[var(--line)] bg-black/90 px-6 py-8 backdrop-blur-lg md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-display text-2xl italic text-[var(--fg)]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
