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

function buildPayload(pathname: string, visitorId: string): string {
    return JSON.stringify({
        path: pathname,
        country: "",
        user_agent: globalThis.navigator?.userAgent?.substring(0, 255) ?? "",
        referer: globalThis.document?.referrer?.substring(0, 500) ?? "",
        ip: "",
        visitor_id: visitorId,
    });
}

function trySendBeacon(payload: string): boolean {
    const beacon = globalThis.navigator?.sendBeacon;
    if (typeof beacon !== "function") return false;
    try {
        const blob = new Blob([payload], { type: "application/json" });
        return beacon.call(globalThis.navigator, VISIT_API, blob);
    } catch {
        return false;
    }
}

function sendVisit(pathname: string, visitorId: string): void {
    const payload = buildPayload(pathname, visitorId);
    if (trySendBeacon(payload)) return;

    void fetch(VISIT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
    }).catch(() => { /* non-fatal */ });
}

function idle(cb: () => void): void {
    const ric = (globalThis as unknown as { requestIdleCallback?: (fn: () => void, opts?: { timeout?: number }) => number }).requestIdleCallback;
    if (ric) ric(cb, { timeout: 2000 });
    else globalThis.setTimeout(cb, 1500);
}

export function PageViewTracker(): null {
    const pathname = usePathname();
    const lastPath = useRef("");

    useEffect(() => {
        if (SKIP_PATTERN.test(pathname)) return;
        if (pathname === lastPath.current) return;
        lastPath.current = pathname;

        idle(() => {
            const visitorId = getOrCreateVisitorId();
            if (!visitorId) return;
            sendVisit(pathname, visitorId);
        });
    }, [pathname]);

    return null;
}
