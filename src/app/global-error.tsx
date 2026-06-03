"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Global Error Boundary — layout.tsx 자체가 throw 했을 때만 호출.
 * - 자체 <html>/<body> 가 필요 (root layout 이 mount 안 됨).
 * - 가능한 최소 의존성으로 작성 (tailwind 클래스만 사용, lib import 금지).
 */
export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>): React.ReactElement {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <main className="mx-auto flex min-h-screen w-full max-w-[1024px] flex-col items-center justify-center px-6 py-20 text-center">
          <p className="text-sm font-medium text-red-600">500</p>
          <h1 className="mt-3 text-2xl font-bold md:text-3xl">서비스 점검이 필요합니다</h1>
          <p className="mt-3 text-sm text-gray-600 md:text-base">
            예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>
          {error.digest ? (
            <p className="mt-2 font-mono text-xs text-gray-500">에러 ID: {error.digest}</p>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              다시 시도
            </button>
            <Link
              href="/"
              className="rounded-lg border px-5 py-2.5 text-sm font-semibold"
            >
              홈으로 이동
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
