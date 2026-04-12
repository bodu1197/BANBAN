// @client-reason: Fetches announcements client-side for display in mypage
"use client";

import { useState, useEffect } from "react";
import { Megaphone, ChevronDown, ChevronUp } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

function AnnouncementItem({ item, isExpanded, onToggle }: Readonly<{
  item: Announcement;
  isExpanded: boolean;
  onToggle: () => void;
}>): React.ReactElement {
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Megaphone className="h-4 w-4 shrink-0 text-brand-primary" />
        <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
        {isExpanded
          ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {isExpanded ? (
        <div className="px-3 pb-3 pl-9 text-xs text-muted-foreground whitespace-pre-wrap">
          {item.body}
        </div>
      ) : null}
    </div>
  );
}

export function AnnouncementsBanner(): React.ReactElement | null {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((data) => setAnnouncements(data.announcements ?? []))
      .catch(() => { /* ignore */ });
  }, []);

  if (announcements.length === 0) return null;

  return (
    <div className="rounded-lg border border-brand-primary/20 bg-brand-primary/5">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Megaphone className="h-4 w-4 text-brand-primary" />
        <h2 className="text-xs font-semibold text-brand-primary">공지사항</h2>
      </div>
      {announcements.map((a) => (
        <AnnouncementItem
          key={a.id}
          item={a}
          isExpanded={expandedId === a.id}
          onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
        />
      ))}
    </div>
  );
}
