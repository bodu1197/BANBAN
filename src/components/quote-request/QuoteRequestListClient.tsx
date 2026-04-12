// @client-reason: interactive list with navigation to create/detail pages
"use client";

import Link from "next/link";
import { Plus, FileText, Clock } from "lucide-react";
import type { QuoteRequestSummary } from "@/lib/supabase/quote-queries";

interface Props {
  requests: QuoteRequestSummary[];
  labels: Record<string, string>;
  }

function StatusBadge({ status, labels }: Readonly<{ status: string; labels: Record<string, string> }>): React.ReactElement {
  const entries = [
    { key: "OPEN", label: labels.statusOpen, className: "bg-emerald-100 text-emerald-700" },
    { key: "CLOSED", label: labels.statusClosed, className: "bg-gray-100 text-gray-600" },
    { key: "COMPLETED", label: labels.statusCompleted, className: "bg-blue-100 text-blue-700" },
    { key: "CANCELLED", label: labels.statusCancelled, className: "bg-red-100 text-red-600" },
  ];
  const info = entries.find((e) => e.key === status) ?? entries[0];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${info.className}`}>
      {info.label}
    </span>
  );
}

function formatBudget(min: number | null, max: number | null, unit: string): string {
  if (min && max) return `${min.toLocaleString()} ~ ${max.toLocaleString()} ${unit}`;
  if (max) return `~ ${max.toLocaleString()} ${unit}`;
  if (min) return `${min.toLocaleString()} ${unit} ~`;
  return "";
}

function QuoteRequestCard({ request, labels }: Readonly<{
  request: QuoteRequestSummary;
  labels: Record<string, string>;
  }>): React.ReactElement {
  const elapsed = getTimeAgo(request.createdAt);
  const budget = formatBudget(request.budgetMin, request.budgetMax, labels.budgetUnit);

  return (
    <Link
      href={`/quote-request/${request.id}`}
      className="block rounded-xl border border-border p-4 transition-colors hover:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="flex-1 text-sm font-semibold line-clamp-1">{request.title}</h3>
        <StatusBadge status={request.status} labels={labels} />
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {request.bodyPart}
        </span>
        {request.size ? (
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {request.size}
          </span>
        ) : null}
        {request.style ? (
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {request.style}
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {budget ? (
            <span className="font-medium text-foreground">{budget}</span>
          ) : null}
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" aria-hidden="true" />
            {labels.bidCount.replace("{count}", String(request.bidCount))}
          </span>
        </div>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {elapsed}
        </span>
      </div>
    </Link>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function QuoteRequestListClient({ requests, labels}: Readonly<Props>): React.ReactElement {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">{labels.listTitle}</h1>
        <Link
          href={`/quote-request/create`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {labels.createNew}
        </Link>
      </div>
      {requests.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed">
          <FileText className="mb-3 h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
          <p className="text-muted-foreground">{labels.noRequests}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <QuoteRequestCard key={r.id} request={r} labels={labels} />
          ))}
        </div>
      )}
    </div>
  );
}
