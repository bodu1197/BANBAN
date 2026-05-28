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

        let io: IntersectionObserver | null = null;
        let mo: MutationObserver | null = null;
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        // cancelled 는 cleanup 이 idle callback 보다 먼저 실행될 때 IO/MO 생성을 막는 race guard.
        let cancelled = false;

        idle(() => {
            if (cancelled) return;

            io = new IntersectionObserver(
                (entries) => {
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
                },
                { threshold: OBSERVER_THRESHOLD },
            );

            const observeLinks = (): void => {
                // cancelled guard: cleanup 이후 debounce 타이머가 fire 했을 때 disconnected IO 에 observe 호출 방지
                if (cancelled || !io) return;
                container.querySelectorAll('a[href^="/portfolios/"]').forEach((el) => io!.observe(el));
            };

            observeLinks();

            mo = new MutationObserver(() => {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(observeLinks, DEBOUNCE_MS);
            });
            mo.observe(container, { childList: true, subtree: true });
        }, IDLE_TIMEOUT_MS);

        return () => {
            cancelled = true;
            io?.disconnect();
            mo?.disconnect();
            if (debounceTimer) clearTimeout(debounceTimer);
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            flush();
        };
    }, [flush]);

    return containerRef;
}
