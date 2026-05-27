// @client-reason: useState/useEffect for real-time countdown + IntersectionObserver for scroll-triggered activation
"use client";

import { useState, useEffect, useRef } from "react";

function getTimeLeft(endDate: string): { days: number; hours: number; minutes: number; seconds: number } | null {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
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
    setTimeLeft(getTimeLeft(endDate));
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(endDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [endDate, isVisible]);

  if (!timeLeft) return null;

  const pad = (n: number): string => String(n).padStart(2, "0");

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
      <span className="text-brand-primary">:</span>
      <span className="rounded bg-foreground px-1.5 py-0.5 text-background" suppressHydrationWarning>{pad(timeLeft.seconds)}</span>
    </div>
  );
}
