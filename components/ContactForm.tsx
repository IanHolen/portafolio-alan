"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type State = "idle" | "sending" | "ok" | "error";

export default function ContactForm() {
  const [state, setState] = useState<State>("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const message = String(fd.get("message") || "").trim();
    if (!name || !email || !message) return;

    setState("sending");
    const { error } = await supabase
      .from("contact_messages")
      .insert({ name, email, message });
    setState(error ? "error" : "ok");
  }

  if (state === "ok") {
    return (
      <div className="mt-14 border border-[var(--line)] px-8 py-14 text-center">
        <div className="font-display text-3xl font-light italic">
          Message received.
        </div>
        <p className="mt-3 text-xs font-light text-[var(--fg-dim)]">
          Alan will get back to you soon. For anything urgent, WhatsApp is the
          fastest road.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-14 space-y-8">
      <div className="grid gap-8 md:grid-cols-2">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
            Name
          </span>
          <input
            name="name"
            required
            autoComplete="name"
            className="mt-2 w-full border-b border-[var(--line)] bg-transparent py-3 text-sm font-light outline-none transition-colors focus:border-[var(--accent)]"
            placeholder="Your name"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
            Email
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-2 w-full border-b border-[var(--line)] bg-transparent py-3 text-sm font-light outline-none transition-colors focus:border-[var(--accent)]"
            placeholder="you@example.com"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)]">
          Message
        </span>
        <textarea
          name="message"
          required
          rows={5}
          className="mt-2 w-full resize-none border-b border-[var(--line)] bg-transparent py-3 text-sm font-light outline-none transition-colors focus:border-[var(--accent)]"
          placeholder="A wedding in the Riviera? A lodge on the coast? A print for your wall?"
        />
      </label>

      <div className="text-center">
        <button
          type="submit"
          disabled={state === "sending"}
          className="border border-[var(--accent)] px-12 py-4 text-[11px] uppercase tracking-huge text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-black disabled:opacity-40"
        >
          {state === "sending" ? "Sending…" : "Send message"}
        </button>
        {state === "error" && (
          <p className="mt-4 text-xs text-red-400">
            Something went wrong — please try WhatsApp instead.
          </p>
        )}
      </div>
    </form>
  );
}
