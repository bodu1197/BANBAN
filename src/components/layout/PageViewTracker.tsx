// @client-reason: Must run in browser to track actual page renders (not prefetch/RSC)
"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const VISITOR_KEY = "htv_id";
const VISIT_API = "/api/analytics/visit";
const SKIP_PATTERN = /\/admin/;

function generateId(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const buf = new Uint8Array(20);
    crypto.getRandomValues(buf);
    let id = "";
    for (const b of buf) id += chars[b % chars.length];
    return id;
}

function getOrCreateVisitorId(): string {
    if (typeof globalThis.localStorage === "undefined") return "";
    const existing = globalThis.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = generateId();
    globalThis.localStorage.setItem(VISITOR_KEY, id);
    return id;
}

function sendVisit(pathname: string, visitorId: string): void {
    void fetch(VISIT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            path: pathname,
            country: "",
            user_agent: globalThis.navigator?.userAgent?.substring(0, 255) ?? "",
            referer: globalThis.document?.referrer?.substring(0, 500) ?? "",
            ip: "",
            visitor_id: visitorId,
        }),
        keepalive: true,
    }).catch(() => { /* non-fatal */ });
}

export function PageViewTracker(): null {
    const pathname = usePathname();
    const lastPath = useRef("");

    useEffect(() => {
        if (SKIP_PATTERN.test(pathname)) return;
        if (pathname === lastPath.current) return;
        lastPath.current = pathname;

        const visitorId = getOrCreateVisitorId();
        if (!visitorId) return;

        sendVisit(pathname, visitorId);
    }, [pathname]);

    return null;
}
