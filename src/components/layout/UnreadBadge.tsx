// @client-reason: real-time unread message count via Supabase subscription
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export function UnreadBadge(): React.ReactElement | null {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    async function fetchUnread(): Promise<void> {
      try {
        const res = await fetch("/api/chat/unread-count");
        if (!res.ok || cancelled) return;
        const data = await res.json() as { count: number };
        if (!cancelled) setCount(data.count);
      } catch { /* ignore */ }
    }

    fetchUnread();

    import("@/lib/supabase/client").then(({ createClient }) => {
      if (cancelled) return;
      const supabase = createClient();
      const channel = supabase
        .channel(`unread:${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          () => { fetchUnread(); },
        )
        .subscribe();

      cleanup = () => { supabase.removeChannel(channel); };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [user]);

  if (count === 0) return null;

  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-0.5 text-[10px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
