// @client-reason: requestIdleCallback / dynamic import — 첫 toast 호출 전에는 sonner를 다운로드/실행하지 않음
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Toaster = dynamic(() => import("sonner").then((m) => m.Toaster), { ssr: false });

function idle(cb: () => void): void {
    // requestIdleCallback 은 Safari 등 미지원 환경 있음 → typed window 접근 + setTimeout fallback
    const ric = typeof window !== "undefined" ? window.requestIdleCallback : undefined;
    if (ric) ric(cb, { timeout: 3000 });
    else globalThis.setTimeout(cb, 2000);
}

export function IdleToaster(): React.ReactElement | null {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        idle(() => setReady(true));
    }, []);

    if (!ready) return null;
    return <Toaster position="top-center" richColors />;
}
