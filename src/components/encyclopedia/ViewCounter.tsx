// @client-reason: dispatches a one-time view ping per session; browser-only
"use client";

import { useEffect } from "react";

export default function ViewCounter({ slug }: Readonly<{ slug: string }>): null {
  useEffect(() => {
    const key = `enc-view:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Private mode / blocked storage — still try once
    }

    const controller = new AbortController();
    fetch("/api/encyclopedia/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {
      // silent — analytics must never break the page
    });

    return () => controller.abort();
  }, [slug]);

  return null;
}
