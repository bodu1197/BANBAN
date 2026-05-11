// @client-reason: useState for expanded rows, fetch for API calls
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Trash2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AdminPageHeader, AdminLoadingSpinner, AdminErrorState } from "@/components/admin/admin-shared";

interface ReportWithReporter {
  id: string;
  reporter_id: string;
  reportable_type: string;
  reportable_id: string;
  reason: string | null;
  description: string | null;
  status: string;
  reviewed_at: string | null;
  created_at: string;
  reporter: { nickname: string; email: string | null } | null;
}

const STATUS_LABELS = new Map<string, { label: string; className: string }>([
  ["PENDING", { label: "대기중", className: "bg-yellow-100 text-yellow-800" }],
  ["REVIEWED", { label: "검토완료", className: "bg-blue-100 text-blue-800" }],
  ["RESOLVED", { label: "처리완료", className: "bg-green-100 text-green-800" }],
  ["DISMISSED", { label: "반려", className: "bg-zinc-100 text-zinc-600" }],
]);

const PENDING_CONFIG = { label: "대기중", className: "bg-yellow-100 text-yellow-800" };

const REASON_LABELS = new Map<string, string>([
  ["SPAM", "스팸/광고"],
  ["ABUSE", "욕설/비방"],
  ["ADULT", "음란/선정성"],
  ["HATE", "혐오/차별"],
  ["OTHER", "기타"],
]);

const TYPE_LABELS = new Map<string, string>([
  ["post", "커뮤니티 게시글"],
  ["portfolio", "포트폴리오"],
  ["artist", "아티스트"],
]);

const JSON_HEADERS = { "Content-Type": "application/json" } as const;
const ADMIN_REPORTS_API = "/api/admin/reports";

function getStatusConfig(status: string): { label: string; className: string } {
  return STATUS_LABELS.get(status) ?? PENDING_CONFIG;
}

function StatusBadge({ status }: Readonly<{ status: string }>): React.ReactElement {
  const config = getStatusConfig(status);
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", config.className)}>{config.label}</span>;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul",
  });
}

function ReportHeader({ report, expanded }: Readonly<{
  report: ReportWithReporter; expanded: boolean;
}>): React.ReactElement {
  return (
    <>
      <div className="flex flex-1 items-center gap-2 overflow-hidden">
        <StatusBadge status={report.status} />
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
          {TYPE_LABELS.get(report.reportable_type) ?? report.reportable_type}
        </span>
        <span className="truncate text-sm font-medium">
          {REASON_LABELS.get(report.reason ?? "") ?? report.reason ?? "사유 없음"}
        </span>
        <span className="text-xs text-muted-foreground">
          — {report.reporter?.nickname ?? "알 수 없음"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{formatDate(report.created_at)}</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
    </>
  );
}

const CONTENT_LINK_MAP = new Map<string, string>([
  ["post", "/community/"],
  ["portfolio", "/portfolios/"],
]);

function getContentLink(type: string, id: string): string | null {
  const prefix = CONTENT_LINK_MAP.get(type);
  return prefix ? `${prefix}${id}` : null;
}

async function handleReportAction(
  reportId: string, status: string, reportableId: string, action?: string,
  onRefresh?: () => void,
): Promise<void> {
  const res = await fetch(ADMIN_REPORTS_API, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      id: reportId, status, action,
      targetId: action === "delete_content" ? reportableId : undefined,
    }),
  });
  if (res.ok) { toast.success("처리되었습니다"); onRefresh?.(); }
  else { toast.error("처리에 실패했습니다"); }
}

function ReportContentLink({ type, id }: Readonly<{ type: string; id: string }>): React.ReactElement | null {
  const link = getContentLink(type, id);
  if (!link) return null;
  return (
    <p><a href={link} target="_blank" rel="noopener noreferrer" className="text-brand-primary underline hover:no-underline">신고된 콘텐츠 보기 →</a></p>
  );
}

function ReportDetails({ report }: Readonly<{ report: ReportWithReporter }>): React.ReactElement {
  const reasonKey = report.reason ?? "";
  return (
    <div className="space-y-2 text-sm">
      <p><span className="font-medium">신고자:</span> {report.reporter?.nickname ?? "알 수 없음"} ({report.reporter?.email ?? ""})</p>
      <p><span className="font-medium">대상 유형:</span> {TYPE_LABELS.get(report.reportable_type) ?? report.reportable_type}</p>
      <p><span className="font-medium">신고 사유:</span> {REASON_LABELS.get(reasonKey) ?? report.reason}</p>
      {report.description ? <p><span className="font-medium">상세 설명:</span> {report.description}</p> : null}
      <ReportContentLink type={report.reportable_type} id={report.reportable_id} />
      {report.reviewed_at ? <p className="text-xs text-muted-foreground">검토일: {formatDate(report.reviewed_at)}</p> : null}
    </div>
  );
}

function ReportActions({ report, onRefresh }: Readonly<{
  report: ReportWithReporter; onRefresh: () => void;
}>): React.ReactElement | null {
  if (report.status !== "PENDING") return null;
  const act = (s: string, a?: string): void => { void handleReportAction(report.id, s, report.reportable_id, a, onRefresh); };
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => act("RESOLVED", "delete_content")} aria-label="콘텐츠 삭제"><Trash2 className="mr-1 h-3 w-3" />콘텐츠 삭제</Button>
      <Button size="sm" variant="outline" onClick={() => act("REVIEWED")} aria-label="검토 완료"><CheckCircle className="mr-1 h-3 w-3" />검토 완료</Button>
      <Button size="sm" variant="outline" onClick={() => act("DISMISSED")} aria-label="반려"><XCircle className="mr-1 h-3 w-3" />반려</Button>
    </div>
  );
}

function ReportBody({ report, onRefresh }: Readonly<{
  report: ReportWithReporter; onRefresh: () => void;
}>): React.ReactElement {
  return (
    <div className="border-t border-border px-4 pb-4 pt-3">
      <ReportDetails report={report} />
      <ReportActions report={report} onRefresh={onRefresh} />
    </div>
  );
}

function ReportRow({ report, onRefresh }: Readonly<{
  report: ReportWithReporter; onRefresh: () => void;
}>): React.ReactElement {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-background">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={expanded}
      >
        <ReportHeader report={report} expanded={expanded} />
      </button>
      {expanded ? <ReportBody report={report} onRefresh={onRefresh} /> : null}
    </div>
  );
}

async function loadReports(): Promise<{ reports: ReportWithReporter[]; error: boolean }> {
  try {
    const res = await fetch(ADMIN_REPORTS_API);
    if (!res.ok) return { reports: [], error: true };
    const data = await res.json();
    return { reports: data.reports ?? [], error: false };
  } catch {
    return { reports: [], error: true };
  }
}

export default function AdminReportsPage(): React.ReactElement {
  const [reports, setReports] = useState<ReportWithReporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const refreshRef = useRef(0);

  const refresh = (): void => {
    refreshRef.current += 1;
    const seq = refreshRef.current;
    loadReports().then((result) => {
      if (seq === refreshRef.current) {
        setReports(result.reports);
        setError(result.error);
        setLoading(false);
      }
    }).catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { refresh(); }, []);

  if (loading) return <AdminLoadingSpinner />;
  if (error) return <AdminErrorState message="신고 목록을 불러오는데 실패했습니다" />;

  const pendingCount = reports.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <AdminPageHeader title="신고 관리" count={pendingCount} countLabel="대기중" />
      {reports.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">등록된 신고가 없습니다</p>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <ReportRow key={report.id} report={report} onRefresh={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
