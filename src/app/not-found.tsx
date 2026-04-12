import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다",
  description: "요청하신 페이지가 존재하지 않거나 이동되었습니다.",
  robots: { index: false, follow: false },
};

export default function NotFound(): React.ReactElement {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-[767px] flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-sm font-medium text-brand-primary">404</p>
      <h1 className="mt-3 text-2xl font-bold text-foreground md:text-3xl">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="mt-3 text-sm text-muted-foreground md:text-base">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          홈으로 이동
        </Link>
        <Link
          href="/artists"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          아티스트 둘러보기
        </Link>
      </div>
    </main>
  );
}
