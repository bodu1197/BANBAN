import Link from "next/link";
import { Clock, XCircle, ChevronRight } from "lucide-react";
import { DraftReviewBanner } from "./DraftReviewBanner";

interface ShopStatusBannerProps {
  status: string;
  rejectReason: string | null;
}

/**
 * 마이페이지 상단 샵 상태 배너.
 * - draft: 작성 중 + '지금 공개하기' 버튼(배너+포폴 REQUIRED_PORTFOLIOS개 충족 시 즉시 active 공개 — 사전승인 폐지)
 * - pending: (레거시) 승인 대기 안내 (amber — 등록폼 경고 톤과 일치)
 * - rejected: (레거시) 반려 사유 + 재신청 CTA (destructive 토큰 — ArtistShopSetupBanner 와 일치)
 * - active/dormant: 표시 없음(null)
 */
export function ShopStatusBanner({ status, rejectReason }: Readonly<ShopStatusBannerProps>): React.ReactElement | null {
  if (status === "draft") {
    return <DraftReviewBanner />;
  }

  if (status === "pending") {
    return (
      <div className="bg-background px-4 pt-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-semibold text-amber-800">샵 승인 대기 중</p>
            <p className="mt-0.5 text-sm text-amber-800">
              관리자 검토 후 정식 오픈됩니다. 승인되면 검색·추천에 노출되고 고객이 찾아올 수 있어요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="bg-background px-4 pt-4">
        <div className="rounded-xl border-2 border-destructive bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-destructive">샵 등록이 반려되었습니다</p>
              {rejectReason && (
                <p className="mt-0.5 text-sm text-muted-foreground">사유: {rejectReason}</p>
              )}
              <p className="mt-0.5 text-sm text-muted-foreground">
                내용을 수정한 뒤 다시 신청해 주세요. (재신청은 24시간에 한 번 가능)
              </p>
            </div>
          </div>
          <Link
            href="/mypage/artist/edit"
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          >
            수정하고 다시 신청하기
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
