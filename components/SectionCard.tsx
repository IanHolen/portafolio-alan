"use client";

import Link from "next/link";
import Reveal from "./Reveal";

export default function SectionCard({
  slug,
  title,
  subtitle,
  blurb,
  image,
  index,
}: {
  slug: string;
  title: string;
  subtitle: string;
  blurb: string;
  image: string;
  index: number;
}) {
  return (
    <Reveal delay={index * 120}>
      <Link
        href={`/${slug}`}
        className="group relative block aspect-[4/3] overflow-hidden md:aspect-[16/10]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-75 transition-all duration-[1200ms] group-hover:scale-105 group-hover:opacity-95"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-7 md:p-9">
          <div className="text-[10px] uppercase tracking-huge text-[var(--accent)]">
            {String(index + 1).padStart(2, "0")} — {subtitle}
          </div>
          <div className="font-display mt-2 text-3xl font-light md:text-4xl">
            {title}
          </div>
          <p className="mt-2 max-w-[46ch] text-xs font-light leading-relaxed text-white/55 opacity-0 transition-all duration-700 group-hover:opacity-100">
            {blurb}
          </p>
          <div className="mt-4 inline-block text-[10px] uppercase tracking-huge text-white/60 transition-colors group-hover:text-[var(--accent)]">
            Enter →
          </div>
        </div>
      </Link>
    </Reveal>
  );
}
