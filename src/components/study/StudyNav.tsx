// @client-reason: 뒤로가기(history)/학습홈 내비 — 브라우저 history 접근
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Home } from "lucide-react";

const STUDY_HOME = "/mypage/study";

// 공부방 상단 보조 내비 — 딥링크 진입 시 사이트 이탈 방지(history 없으면 학습홈 폴백).
export function StudyNav(): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === STUDY_HOME;

  function goBack(): void {
    if (globalThis.history.length > 1) router.back();
    else router.push(STUDY_HOME);
  }

  const linkClass = "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <nav className="sticky top-0 z-30 -mx-4 mb-1 flex items-center justify-between gap-2 border-b border-border bg-background/85 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6">
      <button type="button" onClick={goBack} aria-label="이전 페이지로" className={`${linkClass} cursor-pointer`}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> 뒤로
      </button>
      <Link href={isHome ? "/mypage" : STUDY_HOME} className={linkClass}>
        <Home className="h-4 w-4" aria-hidden="true" /> {isHome ? "마이페이지" : "학습 홈"}
      </Link>
    </nav>
  );
}
