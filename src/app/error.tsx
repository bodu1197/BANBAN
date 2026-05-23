"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * 루트 segment Error Boundary.
 * - render / Server Component / route handler 에서 throw 된 에러를 catch.
 * - global-error.tsx 는 layout.tsx 자체가 실패할 때만 동작.
 */
export default function RootError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>): React.ReactElement {
  useEffect(() => {
    // eslint-disable-next-line no-console -- production 에서도 콘솔 보존 (next.config compiler.removeConsole exclude)
    console.error("[RootError]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-[1024px] flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-sm font-medium text-destructive">500</p>
      <h1 className="mt-3 text-2xl font-bold text-foreground md:text-3xl">
        문제가 발생했습니다
      </h1>
      <p className="mt-3 text-sm text-muted-foreground md:text-base">
        잠시 후 다시 시도해주세요. 문제가 계속되면 고객센터로 문의해주세요.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground/80">에러 ID: {error.digest}</p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          홈으로 이동
        </Link>
      </div>
    </main>
  );
}
