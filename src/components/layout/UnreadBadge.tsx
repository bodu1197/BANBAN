// @client-reason: real-time unread message count via Supabase subscription
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export function UnreadBadge(): React.ReactElement | null {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  // @client-reason: 채팅 안읽음 배지 카운트 — 로그인 사용자별 실시간 데이터로, Supabase realtime(postgres_changes) 구독으로 새 메시지 도착 시 즉시 갱신. 서버 컴포넌트로 옮길 수 없음(라이브 구독 필수).
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
