"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

/** Silent page-view beacon (once per path per session; skips /admin). */
export default function Tracker() {
  const path = usePathname();

  useEffect(() => {
    if (!path || path.startsWith("/admin")) return;
    const key = `pv:${path}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode */
    }
    supabase
      .from("page_views")
      .insert({ path, referrer: document.referrer || null })
      .then(() => {});
  }, [path]);

  return null;
}
