// @client-reason: 검수 신청 버튼 — 서버 액션 호출 + 미달 시 안내·리다이렉트(브라우저 인터랙션)
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { requestShopReview } from "@/lib/actions/shop-review";
import { REQUIRED_PORTFOLIOS } from "@/lib/artist-status";

export function DraftReviewBanner(): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(): void {
    startTransition(async () => {
      const result = await requestShopReview().catch(() => null);
      if (!result) {
        globalThis.alert("요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      if (result.ok) {
        globalThis.alert("검수 신청이 완료되었습니다. 관리자 검토 후 정식 오픈됩니다.");
        router.refresh();
        return;
      }
      if (!result.hasBanner) {
        globalThis.alert("대표 배너 1장을 먼저 등록해야 검수를 신청할 수 있습니다.");
        router.push("/mypage/artist/edit");
        return;
      }
      // 포트폴리오 부족 — 강력 안내 후 작성 페이지로 이동.
      globalThis.alert(
        `작품(포트폴리오)을 ${REQUIRED_PORTFOLIOS}개 이상 등록해야 검수를 신청할 수 있습니다.\n` +
        `현재 ${result.portfolioCount}개 — 작품을 더 추가해 주세요.`,
      );
      router.push("/mypage/artist/portfolios/write");
    });
  }

  return (
    <div className="bg-background px-4 pt-4">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <p className="font-semibold text-amber-800">샵 작성 중 — 아직 검수 신청 전이에요</p>
        <p className="mt-0.5 text-sm text-amber-800">
          대표 배너 1장 + 작품(포트폴리오) {REQUIRED_PORTFOLIOS}개 이상을 채운 뒤 검수를 신청하면, 관리자 승인 후 정식 오픈됩니다.
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          aria-busy={pending}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand-primary"
        >
          <BadgeCheck className="h-4 w-4" aria-hidden="true" />
          {pending ? "신청 중…" : "등록 승인 신청"}
        </button>
      </div>
    </div>
  );
}
