import Link from "next/link";
import { Lock, BookOpen } from "lucide-react";

/** 공부방 잠금 사유 — 서버(layout)의 entitlement 판정과 함께 확정해 전달한다.
 *  컴포넌트는 표현만 담당하고 게이트 상태를 재추론하지 않는다(단일 진실 소스: entitlement). */
export type StudyLockReason = "no-shop" | "draft" | "hidden";

// 사유별 안내·CTA. '대표 배너 1장 + 작품 N개' 같은 최소 요건은 노출하지 않는다 —
// 반언니 활동 의사 없이 공부방만 노리고 조악한 이미지 1장으로 게이트를 통과하는 어뷰징을
// 유도하기 때문. '샵을 완성하여 정식 오픈'이라는 결과만 안내한다.
const LOCK_VIEW: Record<StudyLockReason, { message: string; cta: { href: string; label: string } }> = {
  "no-shop": {
    message: "문신사 공부방은 샵을 등록·오픈한 회원이 이용할 수 있어요. 샵을 만들어 정식 오픈하면 바로 이용할 수 있습니다.",
    cta: { href: "/register/artist", label: "샵 등록하기" },
  },
  draft: {
    message: "문신사 공부방은 정식 오픈된 샵만 이용할 수 있어요. 샵을 완성해 정식 오픈하면 공부방도 바로 열립니다.",
    cta: { href: "/mypage", label: "샵 완성하러 가기" },
  },
  hidden: {
    message: "샵이 비공개 처리되어 공부방도 잠겼어요. 마이페이지에서 사유를 확인하고 수정한 뒤 '재검토 요청'을 해주세요. 다시 공개되면 공부방도 열립니다.",
    cta: { href: "/mypage", label: "재검토 요청하러 가기" },
  },
};

export function StudyLockedView({ reason }: Readonly<{ reason: StudyLockReason }>): React.ReactElement {
  const { message, cta } = LOCK_VIEW[reason];

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-[480px] flex-col items-center justify-center px-4 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Lock className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="mt-4 flex items-center gap-1.5 text-lg font-bold text-foreground">
        <BookOpen className="h-5 w-5 text-brand-primary" aria-hidden="true" /> 문신사 공부방
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>
      <Link
        href={cta.href}
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {cta.label}
      </Link>
    </div>
  );
}
