import Link from "next/link";
import { Lock, BookOpen } from "lucide-react";

/** 공부방 잠금 안내. hasShop=true(체험만료/미승인) vs false(샵 없음)로 CTA 분기. */
export function StudyLockedView({ hasShop }: Readonly<{ hasShop: boolean }>): React.ReactElement {
  const cta = hasShop
    ? { href: "/mypage", label: "마이페이지로" }
    : { href: "/register/artist", label: "샵 등록하기" };
  const message = hasShop
    ? "샵이 승인되면 문신사 공부방을 제한 없이 이용할 수 있어요. 무료 체험이 종료되었거나 승인 대기 중입니다."
    : "문신사 공부방은 샵을 등록한 회원이 이용할 수 있어요. 샵을 등록하면 7일 무료 체험이 시작됩니다.";

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
