// @client-reason: requestIdleCallback / dynamic import — 첫 toast 호출 전에는 sonner를 다운로드/실행하지 않음
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { idle } from "@/lib/idle";

const Toaster = dynamic(() => import("sonner").then((m) => m.Toaster), { ssr: false });
const TOASTER_IDLE_TIMEOUT_MS = 3000;

export function IdleToaster(): React.ReactElement | null {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        idle(() => setReady(true), TOASTER_IDLE_TIMEOUT_MS);
    }, []);

    if (!ready) return null;
    return <Toaster position="top-center" richColors />;
}
