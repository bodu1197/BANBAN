// @client-reason: interactive list with navigation
"use client";

import Link from "next/link";
import Image from "next/image";
import { Plus, Users, Clock, User } from "lucide-react";
import type { HomeRecruitment } from "@/lib/supabase/home-recruitment-queries";

interface Props {
  recruitments: HomeRecruitment[];
  labels: Record<string, string>;
  }

function getDaysLeft(closedAt: string | null): number | null {
  if (!closedAt) return null;
  const diff = new Date(closedAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function RecruitmentItem({ item, labels }: Readonly<{
  item: HomeRecruitment;
  labels: Record<string, string>;
  }>): React.ReactElement {
  const daysLeft = getDaysLeft(item.closedAt);
  const isFree = item.expense === 0;

  return (
    <Link
      href={`/recruitment/${item.id}`}
      className="flex gap-3 rounded-xl border border-border p-4 transition-colors hover:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
        {item.artistProfileImage ? (
          <Image src={item.artistProfileImage} alt="" width={48} height={48} className="rounded-full object-cover" unoptimized />
        ) : (
          <User className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="mb-1 text-sm font-semibold line-clamp-1">{item.title}</h3>
        <p className="mb-1 text-xs text-muted-foreground">{item.artistName}</p>
        <div className="flex flex-wrap items-center gap-2">
          {item.parts ? <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{item.parts}</span> : null}
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${isFree ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
            {isFree ? labels.free : `${item.expense.toLocaleString()}원`}
          </span>
          {daysLeft !== null ? (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {labels.dDay.replace("{days}", String(daysLeft))}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function RecruitmentListClient({ recruitments, labels}: Readonly<Props>): React.ReactElement {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">{labels.listTitle}</h1>
        <Link
          href={`/recruitment/create`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {labels.createNew}
        </Link>
      </div>
      {recruitments.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed">
          <Users className="mb-3 h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
          <p className="text-muted-foreground">{labels.noRecruitments}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {recruitments.map((r) => (
            <RecruitmentItem key={r.id} item={r} labels={labels} />
          ))}
        </div>
      )}
    </div>
  );
}
