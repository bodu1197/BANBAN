// @client-reason: 숨김(테이크다운)된 샵 안내 + 재검토 요청 버튼(서버액션 호출·상태 인터랙션)
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EyeOff, Pencil, RotateCcw } from "lucide-react";
import { requestShopReReview } from "@/lib/actions/shop-review";

function reReviewLabel(reReviewRequested: boolean, pending: boolean): string {
  if (reReviewRequested) return "재검토 요청됨";
  if (pending) return "요청 중…";
  return "재검토 요청";
}

export function HiddenShopBanner({ reason, reReviewRequested }: Readonly<{
  /** 관리자가 남긴 비공개 사유(reject_reason 재사용). null=사유 없음. */
  reason: string | null;
  /** 이미 재검토 요청을 보냈는지(resubmitted_at 존재). */
  reReviewRequested: boolean;
}>): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleReReview(): void {
    startTransition(async () => {
      const result = await requestShopReReview().catch(() => null);
      if (!result) { globalThis.alert("요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."); return; }
      if (result.ok) {
        globalThis.alert("재검토 요청이 접수되었습니다. 관리자 확인 후 다시 공개됩니다.");
        router.refresh();
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
            {reReviewRequested ? (
              <p className="mt-2 text-sm font-medium text-amber-700">✓ 재검토 요청됨 — 관리자 확인 중입니다.</p>
            ) : null}
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
            disabled={pending || reReviewRequested}
            aria-busy={pending}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand-primary"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {reReviewLabel(reReviewRequested, pending)}
          </button>
        </div>
      </div>
    </div>
  );
}
