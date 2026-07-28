"use client";

/**
 * /admin — hidden studio. Same aesthetic as the gallery, admin powers:
 * traffic analytics, photo uploads with category, photo management,
 * and contact inbox. Auth via Supabase; only allow-listed emails get
 * data access (enforced by RLS, not by obscurity).
 */

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import AdminLogin from "./AdminLogin";
import AdminDash from "./AdminDash";

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setBooted(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setIsAdmin(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("admin_users")
      .select("email")
      .then(({ data }) => setIsAdmin(!!data && data.length > 0));
  }, [session]);

  if (!booted) return <main className="min-h-[100svh] bg-[var(--bg)]" />;

  if (!session) return <AdminLogin />;

  if (isAdmin === null)
    return (
      <main className="flex min-h-[100svh] items-center justify-center bg-[var(--bg)]">
        <div className="text-[10px] uppercase tracking-huge text-[var(--fg-dim)]">
          Verifying access…
        </div>
      </main>
    );

  if (!isAdmin)
    return (
      <main className="flex min-h-[100svh] flex-col items-center justify-center gap-6 bg-[var(--bg)] px-6 text-center">
        <div className="font-display text-3xl font-light italic">
          This studio is private.
        </div>
        <p className="max-w-[40ch] text-xs font-light text-[var(--fg-dim)]">
          Your account doesn&apos;t have curator access.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="border border-[var(--line)] px-6 py-2 text-[10px] uppercase tracking-wide2 text-[var(--fg-dim)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Sign out
        </button>
      </main>
    );

  return <AdminDash email={session.user.email || ""} />;
}
