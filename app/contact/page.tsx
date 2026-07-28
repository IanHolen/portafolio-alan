import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact — Alan Kugelmass",
  description: "Get in touch with Alan Kugelmass for weddings, commissions and prints.",
};

export default function ContactPage() {
  return (
    <main className="flex min-h-[100svh] flex-col">
      <section className="mx-auto w-full max-w-[760px] flex-1 px-6 pb-24 pt-36 md:pt-44">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-huge text-[var(--accent)]">
            Contact
          </div>
          <h1 className="font-display mt-5 text-5xl font-light italic md:text-6xl">
            Tell me your story
          </h1>
          <p className="mx-auto mt-5 max-w-[46ch] text-xs font-light leading-relaxed text-[var(--fg-dim)]">
            Weddings, hotel & property commissions, documentary projects or
            prints — write below, or jump straight to WhatsApp.
          </p>
          <a
            href={SITE.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block border border-[var(--line)] px-8 py-3 text-[10px] uppercase tracking-huge text-[var(--fg-dim)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            WhatsApp · {SITE.whatsapp}
          </a>
        </div>

        <ContactForm />

        <div className="mt-16 flex flex-wrap justify-center gap-x-8 gap-y-3">
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
        </div>
      </section>
      <Footer />
    </main>
  );
}
