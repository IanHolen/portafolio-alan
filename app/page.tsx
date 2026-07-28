import Link from "next/link";
import { ABOUT, SITE } from "@/lib/site";
import Reveal from "@/components/Reveal";
import HomeHero from "@/components/HomeHero";
import SectionCard from "@/components/SectionCard";
import Footer from "@/components/Footer";

const CARD_IMAGES: Record<string, string> = {
  weddings: "/photos/weddings/Blbfx4eBXmi.jpg",
  hotels: "/photos/hotels/CD108BVpqbl_001.jpg",
  documentary: "/photos/documentary/DaQPX4iAm0g_001.jpg",
  prints: "/photos/prints/BwZoXQLgW5x.jpg",
};

export default function Home() {
  return (
    <main>
      <HomeHero />

      {/* ABOUT */}
      <section id="about" className="relative mx-auto max-w-[1200px] px-6 py-28 md:px-10 md:py-40">
        <Reveal>
          <div className="text-[11px] uppercase tracking-huge text-[var(--accent)]">
            About
          </div>
          <h2 className="font-display mt-6 max-w-[24ch] text-4xl font-light leading-tight md:text-6xl">
            {ABOUT.headline}
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-10 md:grid-cols-2 md:gap-16">
          <Reveal delay={100}>
            <p className="text-[15px] font-light leading-relaxed text-[var(--fg-dim)]">
              {ABOUT.paragraphs[0]}
            </p>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-[15px] font-light leading-relaxed text-[var(--fg-dim)]">
              {ABOUT.paragraphs[1]}
            </p>
            <p className="mt-6 text-[15px] font-light leading-relaxed text-[var(--fg-dim)]">
              {ABOUT.paragraphs[2]}
            </p>
          </Reveal>
        </div>

        <Reveal delay={150}>
          <div className="mt-20 grid grid-cols-2 gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] md:grid-cols-4">
            {ABOUT.stats.map((s) => (
              <div key={s.label} className="bg-[var(--bg)] px-6 py-8 text-center">
                <div className="font-display text-4xl font-light text-[var(--fg)]">
                  {s.value}
                </div>
                <div className="mt-2 text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* FOUR WORLDS */}
      <section className="mx-auto max-w-[1600px] px-4 pb-32 md:px-8">
        <Reveal>
          <div className="mb-10 px-2 text-[11px] uppercase tracking-huge text-[var(--accent)]">
            Four worlds
          </div>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-2">
          {SITE.sections.map((s, i) => (
            <SectionCard
              key={s.slug}
              slug={s.slug}
              title={s.title}
              subtitle={s.subtitle}
              blurb={s.blurb}
              image={CARD_IMAGES[s.slug]}
              index={i}
            />
          ))}
        </div>
      </section>

      {/* CONTACT STRIP */}
      <section className="border-t border-[var(--line)] py-24 text-center">
        <Reveal>
          <div className="font-display text-3xl font-light italic md:text-5xl">
            Have a story worth telling?
          </div>
          <Link
            href="/contact"
            className="mt-8 inline-block border border-[var(--accent)] px-10 py-4 text-[11px] uppercase tracking-huge text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-black"
          >
            Get in touch
          </Link>
        </Reveal>
      </section>

      <Footer />
    </main>
  );
}
