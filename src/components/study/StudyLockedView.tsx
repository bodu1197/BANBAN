import Link from "next/link";
import { Lock, BookOpen } from "lucide-react";

/** 공부방 잠금 안내(종용). 상황별 CTA·문구:
 *  - 샵 없음: 등록 유도. 승인됨+미완성: 완성만 하면 해제(재검수 불필요). 미승인: 완성 후 검수. */
export function StudyLockedView({ hasShop, approved }: Readonly<{ hasShop: boolean; approved?: boolean }>): React.ReactElement {
  const cta = hasShop
    ? { href: "/mypage", label: "샵 완성하러 가기" }
    : { href: "/register/artist", label: "샵 등록하기" };
  let message: string;
  if (!hasShop) {
    message = "문신사 공부방은 샵을 등록한 회원이 이용할 수 있어요. 샵을 등록하고 대표 배너 1장 + 작품(포트폴리오) 10개를 채워 검수를 통과하면 이용할 수 있습니다.";
  } else if (approved) {
    message = "공부방을 다시 이용하려면 샵을 완성해 주세요. 대표 배너 1장 + 작품(포트폴리오) 10개를 채우면 바로 열립니다.";
  } else {
    message = "문신사 공부방은 검수를 통과한 샵만 제한 없이 이용할 수 있어요. 대표 배너 1장 + 작품(포트폴리오) 10개를 채우고 '등록 승인 신청'으로 검수를 받으면 열립니다.";
  }

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
