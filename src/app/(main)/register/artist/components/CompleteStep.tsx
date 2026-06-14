// @client-reason: 위저드 4단계 — 등록 완료 안내 + 마이페이지 이동 CTA
"use client";

import { useRouter } from "next/navigation";
import { BadgeCheck, Clock } from "lucide-react";
import { REQUIRED_PORTFOLIOS } from "@/lib/artist-status";

export function CompleteStep({
  reviewSubmitted, portfolioCount,
}: Readonly<{
  /** 배너+포폴 10개 충족으로 자동 검수 신청(draft→pending) 되었는지. */
  reviewSubmitted: boolean;
  portfolioCount: number;
}>): React.ReactElement {
  const router = useRouter();
  const remaining = Math.max(0, REQUIRED_PORTFOLIOS - portfolioCount);

  return (
    <div className="space-y-6 p-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary/10">
        {reviewSubmitted
          ? <Clock className="h-8 w-8 text-brand-primary" aria-hidden="true" />
          : <BadgeCheck className="h-8 w-8 text-brand-primary" aria-hidden="true" />}
      </div>

      {reviewSubmitted ? (
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">검수 신청이 완료되었어요!</h2>
          <p className="text-sm text-muted-foreground">
            대표 배너와 작품 {REQUIRED_PORTFOLIOS}개를 모두 채워 검수 신청까지 끝났습니다.<br />
            관리자 승인 후 검색·추천에 노출되고 고객이 찾아올 수 있어요.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">샵이 등록되었어요!</h2>
          <p className="text-sm text-muted-foreground">
            지금까지 작품 {portfolioCount}개를 등록했어요.<br />
            작품을 <span className="font-semibold text-brand-primary">{remaining}개</span> 더 채우면(총 {REQUIRED_PORTFOLIOS}개)
            검수 신청이 가능해지고, 작품이 많을수록 상담 문의도 비례해서 늘어납니다.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/40 p-4 text-left">
        <p className="text-sm font-semibold text-foreground">다음 단계</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {reviewSubmitted ? (
            <li>• 마이페이지에서 승인 진행 상태를 확인할 수 있어요.</li>
          ) : (
            <li>• 마이페이지에서 작품을 더 추가하고 ‘등록 승인 신청’을 눌러주세요.</li>
          )}
          <li>• 샵 정보·이미지는 마이페이지 ‘마이숍 정보 수정’에서 언제든 바꿀 수 있어요.</li>
        </ul>
      </div>

      <button
        type="button"
        onClick={() => router.push("/mypage")}
        className="w-full rounded-md bg-brand-primary py-3.5 text-base font-bold text-white transition-colors hover:bg-brand-primary-hover focus-visible:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        마이페이지로 가기
      </button>
    </div>
  );
}
