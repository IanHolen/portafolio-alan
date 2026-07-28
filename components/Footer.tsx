import { SITE } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--line)] px-6 py-12 md:px-10">
      <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-8 md:flex-row md:justify-between">
        <div className="font-display text-sm uppercase tracking-wide2 text-[var(--fg-dim)]">
          © {new Date().getFullYear()} Alan Kugelmass
        </div>

        <nav className="flex flex-wrap justify-center gap-x-7 gap-y-3">
          {SITE.socials.map((s) => (
            <a
              key={s.label}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)] transition-colors hover:text-[var(--accent)]"
            >
              {s.label}
            </a>
          ))}
          <a
            href={SITE.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)] transition-colors hover:text-[var(--accent)]"
          >
            WhatsApp
          </a>
        </nav>
      </div>
    </footer>
  );
}
