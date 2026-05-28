// @client-reason: useState/useEffect for real-time countdown + IntersectionObserver for scroll-triggered activation
"use client";

import { useState, useEffect, useRef } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const MS_PER_DAY = 86400000;
const MS_PER_HOUR = 3600000;
const MS_PER_MINUTE = 60000;
const MS_PER_SECOND = 1000;

function getTimeLeft(endDate: string): TimeLeft | null {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / MS_PER_DAY),
    hours: Math.floor((diff % MS_PER_DAY) / MS_PER_HOUR),
    minutes: Math.floor((diff % MS_PER_HOUR) / MS_PER_MINUTE),
    seconds: Math.floor((diff % MS_PER_MINUTE) / MS_PER_SECOND),
  };
}

// 시간(>1h) 이상 남으면 60초마다, 1시간 미만이면 매초 업데이트.
// 초 디스플레이가 정지되어 보이는 UX 문제를 피하기 위해 60초 모드에서는 seconds 숨김.
// 매초 setState 호출을 99% 감소시켜 홈페이지 Style&Layout 작업 부담 제거.
function isCoarseMode(t: TimeLeft): boolean {
  return t.days > 0 || t.hours > 0;
}

function getNextTickDelay(t: TimeLeft): number {
  return isCoarseMode(t) ? MS_PER_MINUTE : MS_PER_SECOND;
}

export function CountdownTimer({ endDate }: Readonly<{ endDate: string }>): React.ReactElement | null {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(endDate));
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const tick = (): void => {
      const next = getTimeLeft(endDate);
      setTimeLeft(next);
      if (!next) return;
      timeoutId = setTimeout(tick, getNextTickDelay(next));
    };

    tick();
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [endDate, isVisible]);

  if (!timeLeft) return null;

  const pad = (n: number): string => String(n).padStart(2, "0");
  const coarse = isCoarseMode(timeLeft);

  return (
    <div ref={ref} aria-label="타임세일 남은 시간" aria-live="polite" aria-atomic="true" className="flex items-center gap-1 text-sm font-mono font-bold tabular-nums" suppressHydrationWarning>
      {timeLeft.days > 0 && (
        <>
          <span className="rounded bg-foreground px-1.5 py-0.5 text-background" suppressHydrationWarning>{timeLeft.days}</span>
          <span className="text-muted-foreground">일</span>
        </>
      )}
      <span className="rounded bg-foreground px-1.5 py-0.5 text-background" suppressHydrationWarning>{pad(timeLeft.hours)}</span>
      <span className="text-brand-primary">:</span>
      <span className="rounded bg-foreground px-1.5 py-0.5 text-background" suppressHydrationWarning>{pad(timeLeft.minutes)}</span>
      {!coarse && (
        <>
          <span className="text-brand-primary">:</span>
          <span className="rounded bg-foreground px-1.5 py-0.5 text-background" suppressHydrationWarning>{pad(timeLeft.seconds)}</span>
        </>
      )}
    </div>
  );
}
