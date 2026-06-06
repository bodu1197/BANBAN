// @client-reason: 알림 드롭다운 상호작용 + 주기적 폴링(클라 상태/이벤트 필요, 서버 컴포넌트 불가)
"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

// 알림은 60초 폴링으로 갱신. realtime(postgres_changes) 구독은 제거했다 — 알림 미사용 상태에서
// Realtime WAL 폴러(realtime.list_changes)를 상시 깨워 DB 부하 1순위였음. 알림 도입 시
// notifications 를 publication 에 등록하고 구독을 재추가(또는 폴링 유지) 검토.
const NOTIFICATION_POLL_INTERVAL = 60_000;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function getNotificationLink(n: Notification): string {
  const _data = n.data as Record<string, string> | null;
  if (n.type === "NEW_CHAT_MESSAGE") return "/mypage/messages";
  if (n.type === "INCOMING_CALL") return "/mypage/messages";
  if (n.type === "ANNOUNCEMENT") return "/mypage";
  return "/mypage";
}

function NotificationItem({ notification}: Readonly<{
  notification: Notification;
  }>): React.ReactElement {
  return (
    <Link
      href={getNotificationLink(notification)}
      className={`block border-b border-border px-3 py-2.5 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        notification.is_read ? "opacity-60" : ""
      }`}
    >
      <p className="font-medium">{notification.title}</p>
      {notification.body ? (
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{notification.body}</p>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground">{timeAgo(notification.created_at)}</p>
    </Link>
  );
}

async function fetchNotifications(): Promise<{ notifications: Notification[]; unreadCount: number }> {
  try {
    const res = await fetch("/api/notifications");
    if (!res.ok) return { notifications: [], unreadCount: 0 };
    const json = await res.json();
    return {
      notifications: json.notifications ?? [],
      unreadCount: json.unreadCount ?? 0,
    };
  } catch {
    return { notifications: [], unreadCount: 0 };
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- hook return type is inferred
function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(() => {
    fetchNotifications().then(({ notifications: n, unreadCount: c }) => {
      setNotifications(n);
      setUnreadCount(c);
    });
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, NOTIFICATION_POLL_INTERVAL);
    return () => { clearInterval(interval); };
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, []);

  return { notifications, unreadCount, markAllRead };
}

export function NotificationBell(): React.ReactElement {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  function handleOpen(isOpen: boolean): void {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0) {
      markAllRead();
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="알림">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <h3 className="text-sm font-semibold">알림</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))
          ) : (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">알림이 없습니다</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
