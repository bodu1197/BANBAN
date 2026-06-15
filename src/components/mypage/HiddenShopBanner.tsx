// @client-reason: 숨김(테이크다운)된 샵 안내 + 재검토 요청 버튼(서버액션 호출·상태 인터랙션)
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { EyeOff, Pencil, RotateCcw } from "lucide-react";
import { requestShopReReview } from "@/lib/actions/shop-review";

function reReviewLabel(requested: boolean, pending: boolean): string {
  if (requested) return "재검토 요청됨";
  if (pending) return "요청 중…";
  return "재검토 요청";
}

export function HiddenShopBanner({ reason, reReviewRequested }: Readonly<{
  /** 관리자가 남긴 비공개 사유(reject_reason 재사용). null=사유 없음. */
  reason: string | null;
  /** 이미 재검토 요청을 보냈는지(서버 props, resubmitted_at 존재). */
  reReviewRequested: boolean;
}>): React.ReactElement {
  const [pending, startTransition] = useTransition();
  // 낙관적 로컬 상태. 이 배너의 데이터 소스는 클라이언트 useAuth 훅(MyPageClient)이라,
  // router.refresh()(서버 컴포넌트만 재검증)로는 갱신되지 않아 요청 후에도 버튼이 멈춰(얼음) 보였다.
  // 성공 즉시 로컬로 '요청됨'을 반영해 해결. 다음 useAuth 재조회 때 서버 props 와 OR 로 수렴.
  const [localRequested, setLocalRequested] = useState(false);
  const requested = reReviewRequested || localRequested;

  function handleReReview(): void {
    startTransition(async () => {
      const result = await requestShopReReview().catch(() => null);
      if (!result) { globalThis.alert("요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."); return; }
      if (result.ok) {
        setLocalRequested(true);
        globalThis.alert("재검토 요청이 접수되었습니다. 관리자 확인 후 다시 공개됩니다.");
        return;
      }
      globalThis.alert(result.message ?? "재검토 요청에 실패했습니다.");
    });
  }

  return (
    <div className="bg-background px-4 pt-4">
      <div className="rounded-xl border-2 border-destructive bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-destructive">샵이 비공개(숨김) 처리되었습니다</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              관리자 점검으로 현재 검색·목록에서 숨겨진 상태입니다. 아래 사유를 확인해 샵을 수정한 뒤 <b>재검토를 요청</b>하면 관리자 확인 후 다시 공개됩니다.
            </p>
            {reason ? (
              <p className="mt-2 whitespace-pre-line rounded-lg bg-background p-2.5 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">사유:</span> {reason}
              </p>
            ) : null}
            {/* 상시 라이브 리전 — 요청 성공 시 내용이 채워지면 스크린리더가 변화를 읽어준다(빈 동안 숨김). */}
            <p role="status" aria-live="polite" className="mt-2 text-sm font-medium text-amber-700 empty:hidden">
              {requested ? "✓ 재검토 요청됨 — 관리자 확인 중입니다." : ""}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/mypage/artist/edit"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" /> 샵 수정하기
          </Link>
          <button
            type="button"
            onClick={handleReReview}
            disabled={pending || requested}
            aria-busy={pending}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand-primary"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {reReviewLabel(requested, pending)}
          </button>
        </div>
      </div>
    </div>
  );
}
