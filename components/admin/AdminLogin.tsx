"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminLogin() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    if (!email || !password) return;
    setBusy(true);
    setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      setMsg(
        error
          ? error.message
          : "Account created — check your inbox to confirm the email, then sign in."
      );
      if (!error) setMode("in");
    }
    setBusy(false);
  }

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-[var(--bg)] px-6">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-huge text-[var(--accent)]">
            The Studio
          </div>
          <h1 className="font-display mt-3 text-4xl font-light italic">
            Curator access
          </h1>
        </div>

        <form onSubmit={submit} className="mt-10 space-y-6">
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            autoComplete="email"
            className="w-full border-b border-[var(--line)] bg-transparent py-3 text-sm font-light outline-none focus:border-[var(--accent)]"
          />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            className="w-full border-b border-[var(--line)] bg-transparent py-3 text-sm font-light outline-none focus:border-[var(--accent)]"
          />
          <button
            disabled={busy}
            className="w-full border border-[var(--accent)] py-3.5 text-[10px] uppercase tracking-huge text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-black disabled:opacity-40"
          >
            {busy ? "…" : mode === "in" ? "Enter the studio" : "Create account"}
          </button>
        </form>

        {msg && (
          <p className="mt-4 text-center text-xs font-light text-[var(--fg-dim)]">{msg}</p>
        )}

        <button
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="mx-auto mt-8 block text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)] hover:text-[var(--accent)]"
        >
          {mode === "in" ? "First time? Create account" : "Have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
