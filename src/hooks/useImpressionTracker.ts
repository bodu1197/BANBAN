// @client-reason: IntersectionObserver + MutationObserver for viewport-based ad impression tracking
"use client";

import { useEffect, useRef, useCallback } from "react";
import { idle } from "@/lib/idle";

const BATCH_INTERVAL_MS = 3000;
const DEBOUNCE_MS = 500;
const OBSERVER_THRESHOLD = 0.5;
const MAX_SEEN = 5000;
const IDLE_TIMEOUT_MS = 3000;
const PORTFOLIO_HREF_RE = /^\/portfolios\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

type TrackingRefs = {
    seenRef: React.MutableRefObject<Set<string>>;
    pendingRef: React.MutableRefObject<Set<string>>;
    timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
};

/** IO 진입 항목에서 /portfolios/{id} 를 수집해 pending 에 적재(중복은 seen 으로 차단)하고 배치 타이머를 건다. */
function collectIntersectingEntries(
    entries: IntersectionObserverEntry[],
    refs: TrackingRefs,
    flush: () => void,
): void {
    const { seenRef, pendingRef, timerRef } = refs;
    for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (!(entry.target instanceof HTMLAnchorElement)) continue;
        const href = entry.target.getAttribute("href") ?? "";
        const match = href.match(PORTFOLIO_HREF_RE);
        if (!match) continue;
        const id = match[1];
        if (seenRef.current.has(id)) continue;
        seenRef.current.add(id);
        pendingRef.current.add(id);
    }

    // MAX_SEEN: long-lived 페이지(피드/검색)에서 Set 이 무제한 커지지 않도록 메모리 cap.
    if (seenRef.current.size > MAX_SEEN) {
        const keep = [...seenRef.current].slice(-MAX_SEEN);
        seenRef.current = new Set(keep);
    }

    if (pendingRef.current.size > 0 && !timerRef.current) {
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            flush();
        }, BATCH_INTERVAL_MS);
    }
}

/** 광고 클릭 비콘 — 클릭된 /portfolios/{id} 를 서버로 전송(서버가 광고 여부 판정). sendBeacon 은 페이지 이동 중에도 보장. */
function beaconAdClick(link: Element, placement: string): void {
    const match = (link.getAttribute("href") ?? "").match(PORTFOLIO_HREF_RE);
    if (!match) return;
    const pagePath = (globalThis.location?.pathname ?? "").split("?")[0];
    const payload = JSON.stringify({ portfolioIds: [match[1]], placement, pagePath });
    if (globalThis.navigator?.sendBeacon) {
        globalThis.navigator.sendBeacon("/api/ads/clicks", new Blob([payload], { type: "application/json" }));
        return;
    }
    fetch("/api/ads/clicks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
    }).catch(() => { /* non-fatal tracking */ });
}

type ObserverHandles = {
    io: IntersectionObserver;
    mo: MutationObserver;
    clearDebounce: () => void;
};

/** 컨테이너에 대해 IO(노출 수집) + MO(동적 링크 재관찰)를 설치한다. cancelled 게이트로 cleanup 이후 작동을 막는다. */
function setupObservers(
    container: HTMLDivElement,
    refs: TrackingRefs,
    flush: () => void,
    isCancelled: () => boolean,
): ObserverHandles {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const io = new IntersectionObserver(
        (entries) => collectIntersectingEntries(entries, refs, flush),
        { threshold: OBSERVER_THRESHOLD },
    );

    const observeLinks = (): void => {
        // cancelled guard: cleanup 이후 debounce 타이머가 fire 했을 때 disconnected IO 에 observe 호출 방지
        if (isCancelled()) return;
        container.querySelectorAll('a[href^="/portfolios/"]').forEach((el) => io.observe(el));
    };

    observeLinks();

    const mo = new MutationObserver(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(observeLinks, DEBOUNCE_MS);
    });
    mo.observe(container, { childList: true, subtree: true });

    return {
        io,
        mo,
        clearDebounce: () => {
            if (debounceTimer) clearTimeout(debounceTimer);
        },
    };
}

export function useImpressionTracker(placement: string): React.RefObject<HTMLDivElement | null> {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const seenRef = useRef(new Set<string>());
    const pendingRef = useRef(new Set<string>());
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const flush = useCallback(() => {
        const ids = [...pendingRef.current];
        pendingRef.current.clear();
        if (ids.length === 0) return;

        const pagePath = (globalThis.location?.pathname ?? "").split("?")[0];
        fetch("/api/ads/impressions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ portfolioIds: ids, placement, pagePath }),
            keepalive: true,
        }).catch(() => { /* non-fatal tracking */ });
    }, [placement]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const refs: TrackingRefs = { seenRef, pendingRef, timerRef };

        // 광고 클릭 기록: 컨테이너 내 /portfolios/{id} 링크 클릭을 비콘 전송(서버가 광고 여부 판정).
        const onClick = (e: MouseEvent): void => {
            const target = e.target instanceof Element ? e.target : null;
            const link = target?.closest('a[href^="/portfolios/"]');
            if (link) beaconAdClick(link, placement);
        };
        container.addEventListener("click", onClick, true);

        let handles: ObserverHandles | null = null;
        // cancelled 는 cleanup 이 idle callback 보다 먼저 실행될 때 IO/MO 생성을 막는 race guard.
        let cancelled = false;

        idle(() => {
            if (cancelled) return;
            handles = setupObservers(container, refs, flush, () => cancelled);
        }, IDLE_TIMEOUT_MS);

        return () => {
            cancelled = true;
            container.removeEventListener("click", onClick, true);
            handles?.io.disconnect();
            handles?.mo.disconnect();
            handles?.clearDebounce();
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            flush();
        };
    }, [flush, placement]);

    return containerRef;
}
